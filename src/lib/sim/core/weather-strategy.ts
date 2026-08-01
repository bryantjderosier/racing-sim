import type { CompoundName, WeatherForecastSnapshot } from './types';

const FORECAST_RAIN_PROBABILITY_TRIGGER_BP = 5_500;
const FORECAST_RAIN_INTENSITY_TRIGGER_BP = 2_500;
const FORECAST_CONFIDENCE_FLOOR_BP = 4_000;
const SLICK_MAX_WETNESS_BP = 1_200;
const INTERMEDIATE_MIN_WETNESS_BP = 1_800;
const INTERMEDIATE_MAX_WETNESS_BP = 6_500;
const WET_MIN_WETNESS_BP = 7_500;
const FORECAST_WET_INTENSITY_TRIGGER_BP = 6_000;
export const WEATHER_STRATEGY_DOWNGRADE_CONFIRMATIONS = 2;
export const WEATHER_STRATEGY_MIN_STINT_REFRESHES = 3;

export interface WeatherStrategyPolicy {
	downgradeConfirmations: number;
	minStintRefreshes: number;
}

export const DEFAULT_WEATHER_STRATEGY_POLICY: WeatherStrategyPolicy = {
	downgradeConfirmations: WEATHER_STRATEGY_DOWNGRADE_CONFIRMATIONS,
	minStintRefreshes: WEATHER_STRATEGY_MIN_STINT_REFRESHES
};

export type WeatherStrategyTarget = 'slicks' | 'intermediate' | 'wet';
export type WeatherStrategyUrgency = 'none' | 'planned' | 'urgent';

export interface WeatherStrategyDecisionInputs {
	currentCompound: CompoundName;
	observedRacingLineWetnessBp: number;
	forecast: WeatherForecastSnapshot;
}

export interface WeatherStrategyDecision {
	action: 'stay_out' | 'pit';
	target: WeatherStrategyTarget;
	urgency: WeatherStrategyUrgency;
	reason:
		| 'surface_dry_and_forecast_clear'
		| 'forecast_rain_trigger'
		| 'surface_damp'
		| 'surface_wet'
		| 'compound_already_suitable'
		| 'compound_hysteresis_hold';
	forecastRainProbabilityBp: number;
	forecastRainIntensityMaxBp: number;
	forecastConfidenceBp: number;
}

export interface WeatherStrategyPersistenceState {
	pendingTarget: WeatherStrategyTarget | null;
	pendingRefreshes: number;
	refreshesSinceCompoundChange: number | null;
}

export interface WeatherStrategyPersistenceResult {
	candidateDecision: WeatherStrategyDecision;
	decision: WeatherStrategyDecision;
	state: WeatherStrategyPersistenceState;
}

export function validateWeatherStrategyPolicy(policy: WeatherStrategyPolicy): void {
	if (
		!Number.isInteger(policy.downgradeConfirmations) ||
		policy.downgradeConfirmations < 1 ||
		!Number.isInteger(policy.minStintRefreshes) ||
		policy.minStintRefreshes < 1
	) {
		throw new Error('Invalid weather strategy policy');
	}
}

function targetCompound(compound: CompoundName): WeatherStrategyTarget {
	return compound === 'intermediate' ? 'intermediate' : compound === 'wet' ? 'wet' : 'slicks';
}

function targetMatchesCompound(target: WeatherStrategyTarget, compound: CompoundName): boolean {
	return target === targetCompound(compound);
}

function strategyRank(target: WeatherStrategyTarget): number {
	return target === 'slicks' ? 0 : target === 'intermediate' ? 1 : 2;
}

function isDowngrade(target: WeatherStrategyTarget, currentCompound: CompoundName): boolean {
	return strategyRank(target) < strategyRank(targetCompound(currentCompound));
}

export function createWeatherStrategyPersistenceState(): WeatherStrategyPersistenceState {
	return {
		pendingTarget: null,
		pendingRefreshes: 0,
		refreshesSinceCompoundChange: null
	};
}

function nextRefreshAge(refreshesSinceCompoundChange: number | null): number | null {
	return refreshesSinceCompoundChange === null ? null : refreshesSinceCompoundChange + 1;
}

export function applyWeatherStrategyPersistence(
	candidateDecision: WeatherStrategyDecision,
	currentCompound: CompoundName,
	state: WeatherStrategyPersistenceState,
	policy: WeatherStrategyPolicy = DEFAULT_WEATHER_STRATEGY_POLICY
): WeatherStrategyPersistenceResult {
	validateWeatherStrategyPolicy(policy);
	const currentTarget = targetCompound(currentCompound);
	if (!isDowngrade(candidateDecision.target, currentCompound)) {
		return {
			candidateDecision,
			decision: candidateDecision,
			state: {
				pendingTarget: null,
				pendingRefreshes: 0,
				refreshesSinceCompoundChange:
					candidateDecision.action === 'pit'
						? 0
						: nextRefreshAge(state.refreshesSinceCompoundChange)
			}
		};
	}
	const pendingRefreshes =
		state.pendingTarget === candidateDecision.target ? state.pendingRefreshes + 1 : 1;
	const stintHoldSatisfied =
		state.refreshesSinceCompoundChange === null ||
		state.refreshesSinceCompoundChange >= policy.minStintRefreshes;
	const confirmationSatisfied = pendingRefreshes >= policy.downgradeConfirmations;
	if (stintHoldSatisfied && confirmationSatisfied) {
		return {
			candidateDecision,
			decision: candidateDecision,
			state: {
				pendingTarget: null,
				pendingRefreshes: 0,
				refreshesSinceCompoundChange: 0
			}
		};
	}
	return {
		candidateDecision,
		decision: {
			...candidateDecision,
			action: 'stay_out',
			target: currentTarget,
			urgency: 'none',
			reason: 'compound_hysteresis_hold'
		},
		state: {
			pendingTarget: candidateDecision.target,
			pendingRefreshes,
			refreshesSinceCompoundChange: nextRefreshAge(state.refreshesSinceCompoundChange)
		}
	};
}

export function decideWeatherStrategy(
	inputs: WeatherStrategyDecisionInputs
): WeatherStrategyDecision {
	const window = inputs.forecast.windows.find((candidate) => candidate.startOffsetMs === 0);
	const forecastRainProbabilityBp = window?.rainProbabilityBp ?? 0;
	const forecastRainIntensityMaxBp = window?.rainIntensityMaxBp ?? 0;
	const forecastConfidenceBp = window?.confidenceBp ?? 0;
	const forecastRainTrigger =
		forecastRainProbabilityBp >= FORECAST_RAIN_PROBABILITY_TRIGGER_BP &&
		forecastRainIntensityMaxBp >= FORECAST_RAIN_INTENSITY_TRIGGER_BP &&
		forecastConfidenceBp >= FORECAST_CONFIDENCE_FLOOR_BP;
	const forecastWetTrigger =
		forecastRainTrigger && forecastRainIntensityMaxBp >= FORECAST_WET_INTENSITY_TRIGGER_BP;
	const wetness = Math.max(0, Math.min(10_000, inputs.observedRacingLineWetnessBp));
	const target =
		wetness >= WET_MIN_WETNESS_BP ||
		wetness > INTERMEDIATE_MAX_WETNESS_BP ||
		(inputs.currentCompound === 'wet' && forecastWetTrigger)
			? 'wet'
			: wetness >= INTERMEDIATE_MIN_WETNESS_BP
				? 'intermediate'
				: forecastRainTrigger
					? 'intermediate'
					: wetness <= SLICK_MAX_WETNESS_BP
						? 'slicks'
						: 'intermediate';
	const compoundMatches = targetMatchesCompound(target, inputs.currentCompound);
	const action = compoundMatches ? 'stay_out' : 'pit';
	const urgency: WeatherStrategyUrgency = compoundMatches
		? 'none'
		: target === 'wet' || (target === 'intermediate' && forecastRainTrigger)
			? 'urgent'
			: 'planned';
	const reason = compoundMatches
		? 'compound_already_suitable'
		: target === 'wet'
			? 'surface_wet'
			: target === 'intermediate' && forecastRainTrigger
				? 'forecast_rain_trigger'
				: target === 'intermediate'
					? 'surface_damp'
					: 'surface_dry_and_forecast_clear';
	return {
		action,
		target,
		urgency,
		reason,
		forecastRainProbabilityBp,
		forecastRainIntensityMaxBp,
		forecastConfidenceBp
	};
}
