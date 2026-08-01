import {
	applyWeatherStrategyPersistence,
	createWeatherStrategyPersistenceState,
	decideWeatherStrategy,
	DEFAULT_WEATHER_STRATEGY_POLICY,
	type WeatherStrategyPersistenceState,
	type WeatherStrategyPolicy,
	type WeatherStrategyTarget
} from './weather-strategy';
import { buildWeatherForecastSnapshot } from './forecast';
import type {
	CompoundName,
	LiveStrategyController,
	LiveStrategyControllerContext,
	SimulationEntry,
	StrategyCommand,
	WeatherForecastCapability,
	WeatherStrategyControllerState
} from './types';

export interface WeatherStrategyControllerOptions {
	targetEntryId: string;
	capability: WeatherForecastCapability;
	mode: 'candidate' | 'effective';
	sessionDurationMs: number;
	pitEntrySegmentId: string;
	pitEntrySegmentSequence: number;
	lapCount: number;
	tyreSetIdsByCompound: Partial<Record<CompoundName, string[]>>;
	policy?: WeatherStrategyPolicy;
}

function compoundForTarget(target: WeatherStrategyTarget): CompoundName {
	return target === 'wet' ? 'wet' : target === 'intermediate' ? 'intermediate' : 'medium';
}

function targetCompound(entry: SimulationEntry, tyreSetId: string): CompoundName | null {
	return entry.tyreSets.find((set) => set.id === tyreSetId)?.compound.name ?? null;
}

function persistenceFromState(
	state: WeatherStrategyControllerState
): WeatherStrategyPersistenceState {
	return {
		pendingTarget: state.pendingTarget,
		pendingRefreshes: state.pendingRefreshes,
		refreshesSinceCompoundChange: state.refreshesSinceCompoundChange
	};
}

export class WeatherStrategyController implements LiveStrategyController {
	private readonly targetEntryId: string;
	private readonly capability: WeatherForecastCapability;
	private readonly mode: 'candidate' | 'effective';
	private readonly sessionHorizonMs: number;
	private readonly pitEntrySegmentId: string;
	private readonly pitEntrySegmentSequence: number;
	private readonly lapCount: number;
	private readonly tyreSetIdsByCompound: Partial<Record<CompoundName, string[]>>;
	private readonly policy: WeatherStrategyPolicy;
	private nextRefreshAtMs = 0;
	private currentCompound: CompoundName | null = null;
	private persistenceState = createWeatherStrategyPersistenceState();
	private refreshCount = 0;
	private heldDowngradeCount = 0;
	private rejectedCommandCount = 0;
	private nextSequence = 1;
	private lastScheduledTriggerLap: number | null = null;
	private nextTyreSetIndexByCompound: Partial<Record<CompoundName, number>> = {};

	constructor(options: WeatherStrategyControllerOptions) {
		this.targetEntryId = options.targetEntryId;
		this.capability = options.capability;
		this.mode = options.mode;
		this.sessionHorizonMs = options.sessionDurationMs;
		this.pitEntrySegmentId = options.pitEntrySegmentId;
		this.pitEntrySegmentSequence = options.pitEntrySegmentSequence;
		this.lapCount = options.lapCount;
		this.tyreSetIdsByCompound = options.tyreSetIdsByCompound;
		this.policy = options.policy ?? DEFAULT_WEATHER_STRATEGY_POLICY;
	}

	onSegmentStart(context: LiveStrategyControllerContext): StrategyCommand[] {
		if (!context.weatherState || context.weatherState.resolvedTimeline.length === 0) return [];
		const state = context.states.find(
			(candidate) => candidate.sessionEntryId === this.targetEntryId
		);
		const entry = context.entries.find(
			(candidate) => candidate.sessionEntryId === this.targetEntryId
		);
		if (!state || !entry || state.finished) return [];
		const mountedCompound = targetCompound(entry, state.mountedTyreSetId);
		if (mountedCompound && mountedCompound !== this.currentCompound) {
			if (this.currentCompound !== null)
				this.persistenceState = createWeatherStrategyPersistenceState();
			this.currentCompound = mountedCompound;
		}
		const issuedAtMs = context.weatherState.weatherClockMs;
		if (issuedAtMs < this.nextRefreshAtMs || this.nextRefreshAtMs >= this.sessionHorizonMs)
			return [];

		let latestCommand: StrategyCommand | null = null;
		while (this.nextRefreshAtMs <= issuedAtMs && this.nextRefreshAtMs < this.sessionHorizonMs) {
			const forecast = buildWeatherForecastSnapshot(
				context.weatherState.resolvedTimeline,
				this.capability,
				context.seed,
				this.nextRefreshAtMs,
				this.sessionHorizonMs,
				context.weatherState.segments.map((surface) => ({
					segmentId: surface.segmentId,
					racingLineWetnessBp: surface.racingLineWetnessBp,
					offLineWetnessBp: surface.offLineWetnessBp
				}))
			);
			const candidateDecision = decideWeatherStrategy({
				currentCompound: this.currentCompound ?? mountedCompound ?? 'medium',
				observedRacingLineWetnessBp:
					context.weatherState.segments.find((surface) => surface.segmentId === 'seg-01')
						?.racingLineWetnessBp ?? 0,
				forecast
			});
			const decision =
				this.mode === 'effective'
					? (() => {
							const persisted = applyWeatherStrategyPersistence(
								candidateDecision,
								this.currentCompound ?? mountedCompound ?? 'medium',
								this.persistenceState,
								this.policy
							);
							this.persistenceState = persisted.state;
							return persisted.decision;
						})()
					: candidateDecision;
			this.refreshCount += 1;
			if (decision.reason === 'compound_hysteresis_hold') this.heldDowngradeCount += 1;
			if (decision.action === 'pit') {
				const compound = compoundForTarget(decision.target);
				const tyreSetIds = this.tyreSetIdsByCompound[compound] ?? [];
				const index = this.nextTyreSetIndexByCompound[compound] ?? 0;
				const tyreSetId = tyreSetIds[index];
				if (tyreSetId && entry.tyreSets.some((set) => set.id === tyreSetId)) {
					const triggerLap =
						context.segment.sequence <= this.pitEntrySegmentSequence
							? context.lap
							: context.lap + 1;
					if (
						triggerLap <= this.lapCount &&
						(this.lastScheduledTriggerLap === null || triggerLap > this.lastScheduledTriggerLap + 1)
					) {
						this.nextTyreSetIndexByCompound[compound] = index + 1;
						this.lastScheduledTriggerLap = triggerLap;
						latestCommand = {
							sequence: this.nextSequence++,
							sessionEntryId: this.targetEntryId,
							triggerLap,
							triggerSegmentId: this.pitEntrySegmentId,
							action: { type: 'pit', tyreSetId }
						};
					}
				}
			}
			this.nextRefreshAtMs += this.capability.refreshIntervalMs;
		}
		return latestCommand ? [latestCommand] : [];
	}

	recordCommandResult(accepted: boolean): void {
		if (!accepted) this.rejectedCommandCount += 1;
	}

	sessionDurationMs(): number {
		return this.sessionHorizonMs;
	}

	snapshot(): WeatherStrategyControllerState {
		return {
			nextRefreshAtMs: this.nextRefreshAtMs,
			currentCompound: this.currentCompound,
			pendingTarget: this.persistenceState.pendingTarget,
			pendingRefreshes: this.persistenceState.pendingRefreshes,
			refreshesSinceCompoundChange: this.persistenceState.refreshesSinceCompoundChange,
			refreshCount: this.refreshCount,
			heldDowngradeCount: this.heldDowngradeCount,
			rejectedCommandCount: this.rejectedCommandCount,
			nextSequence: this.nextSequence,
			lastScheduledTriggerLap: this.lastScheduledTriggerLap,
			nextTyreSetIndexByCompound: { ...this.nextTyreSetIndexByCompound }
		};
	}

	restore(state: WeatherStrategyControllerState): void {
		this.nextRefreshAtMs = state.nextRefreshAtMs;
		this.currentCompound = state.currentCompound;
		this.persistenceState = persistenceFromState(state);
		this.refreshCount = state.refreshCount;
		this.heldDowngradeCount = state.heldDowngradeCount;
		this.rejectedCommandCount = state.rejectedCommandCount;
		this.nextSequence = state.nextSequence;
		this.lastScheduledTriggerLap = state.lastScheduledTriggerLap;
		this.nextTyreSetIndexByCompound = { ...state.nextTyreSetIndexByCompound };
	}
}
