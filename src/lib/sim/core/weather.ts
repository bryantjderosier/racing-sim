import { WEATHER_SURFACE_CONFIG } from './config';
import type { Xoshiro128ss } from './rng';
import type {
	SimulationTrack,
	TrackSegment,
	WeatherRuntimeState,
	WeatherRaceRules,
	WeatherScenarioSpec,
	WeatherSurfaceConfig,
	WeatherTruthPoint
} from './types';

const PPM = 1_000_000n;
const BASIS_POINTS = 10_000n;
const MINUTE_MS = 60_000n;

export interface WeatherControlTransitions {
	drsWeatherSuspendedChanged: boolean;
	unsafeConditionsActiveChanged: boolean;
}

function drawInclusive(rng: Xoshiro128ss, minimum: number, maximum: number): number {
	const draw = rng.nextUint32();
	const width = BigInt(maximum - minimum + 1);
	return minimum + Number((BigInt(draw) * width) >> 32n);
}

export function resolveWeatherTimeline(
	scenario: WeatherScenarioSpec,
	rng: Xoshiro128ss
): WeatherRuntimeState['resolvedTimeline'] {
	return [
		{
			atMs: 0,
			rainIntensityBp: scenario.initialRainIntensityBp,
			airTempDeciC: scenario.initialAirTempDeciC,
			trackTempDeciC: scenario.initialTrackTempDeciC
		},
		...scenario.envelope.map((point) => ({
			atMs: point.atMs,
			rainIntensityBp: drawInclusive(rng, point.rainIntensityMinBp, point.rainIntensityMaxBp),
			airTempDeciC: drawInclusive(rng, point.airTempMinDeciC, point.airTempMaxDeciC),
			trackTempDeciC: drawInclusive(rng, point.trackTempMinDeciC, point.trackTempMaxDeciC)
		}))
	];
}

function divideRoundHalfEven(numerator: bigint, denominator: bigint): bigint {
	const negative = numerator < 0n;
	const absolute = negative ? -numerator : numerator;
	const quotient = absolute / denominator;
	const remainder = absolute % denominator;
	const doubledRemainder = remainder * 2n;
	const rounded =
		doubledRemainder > denominator || (doubledRemainder === denominator && quotient % 2n === 1n)
			? quotient + 1n
			: quotient;
	return negative ? -rounded : rounded;
}

function interpolateInteger(
	start: number,
	end: number,
	elapsedMs: number,
	durationMs: number
): number {
	if (elapsedMs <= 0 || start === end) return start;
	if (elapsedMs >= durationMs) return end;
	const duration = BigInt(durationMs);
	const numerator = BigInt(start) * duration + BigInt(end - start) * BigInt(elapsedMs);
	return Number(divideRoundHalfEven(numerator, duration));
}

export function interpolateWeatherTruth(
	timeline: WeatherTruthPoint[],
	weatherClockMs: number
): WeatherTruthPoint {
	if (timeline.length === 0) throw new Error('Weather timeline cannot be empty');
	if (weatherClockMs <= timeline[0].atMs) return { ...timeline[0], atMs: weatherClockMs };
	const nextIndex = timeline.findIndex((point) => point.atMs >= weatherClockMs);
	if (nextIndex < 0) return { ...timeline[timeline.length - 1], atMs: weatherClockMs };
	const previous = timeline[nextIndex - 1];
	const next = timeline[nextIndex];
	const elapsedMs = weatherClockMs - previous.atMs;
	const durationMs = next.atMs - previous.atMs;
	return {
		atMs: weatherClockMs,
		rainIntensityBp: interpolateInteger(
			previous.rainIntensityBp,
			next.rainIntensityBp,
			elapsedMs,
			durationMs
		),
		airTempDeciC: interpolateInteger(
			previous.airTempDeciC,
			next.airTempDeciC,
			elapsedMs,
			durationMs
		),
		trackTempDeciC: interpolateInteger(
			previous.trackTempDeciC,
			next.trackTempDeciC,
			elapsedMs,
			durationMs
		)
	};
}

export function advanceWeatherState(state: WeatherRuntimeState, weatherClockMs: number): void {
	if (weatherClockMs < state.weatherClockMs) throw new Error('Weather clock cannot move backwards');
	const sample = interpolateWeatherTruth(state.resolvedTimeline, weatherClockMs);
	state.lastUpdateMs = state.weatherClockMs;
	state.weatherClockMs = weatherClockMs;
	state.previousRainIntensityBp = state.rainIntensityBp;
	state.previousTrackTempDeciC = state.trackTempDeciC;
	state.rainIntensityBp = sample.rainIntensityBp;
	state.airTempDeciC = sample.airTempDeciC;
	state.trackTempDeciC = sample.trackTempDeciC;
	while (
		state.nextTruthPointIndex < state.resolvedTimeline.length &&
		state.resolvedTimeline[state.nextTruthPointIndex].atMs <= weatherClockMs
	) {
		state.nextTruthPointIndex += 1;
	}
}

function scaledRoundHalfEven(factors: number[], denominator: bigint): number {
	const numerator = factors.reduce((product, factor) => product * BigInt(factor), 1n);
	return Number(divideRoundHalfEven(numerator, denominator));
}

function atmosphericLossBp(
	wetnessBp: number,
	ratePpmPerMinute: number,
	segmentFactorPpm: number,
	deltaMs: number,
	retentionPpm: number
): number {
	return scaledRoundHalfEven(
		[wetnessBp, ratePpmPerMinute, segmentFactorPpm, deltaMs],
		PPM * MINUTE_MS * BigInt(retentionPpm)
	);
}

function nextSurfaceWetnessBp(
	currentWetnessBp: number,
	rainGainBp: number,
	drainageLossBp: number,
	evaporationLossBp: number
): number {
	return Math.max(
		0,
		Math.min(10_000, currentWetnessBp + rainGainBp - drainageLossBp - evaporationLossBp)
	);
}

function maximumSurfaceWetness(
	state: WeatherRuntimeState,
	channel: 'racingLineWetnessBp' | 'offLineWetnessBp'
): number {
	return state.segments.reduce((maximum, segment) => Math.max(maximum, segment[channel]), 0);
}

export function updateWeatherControls(
	state: WeatherRuntimeState,
	track: SimulationTrack,
	rules: WeatherRaceRules
): WeatherControlTransitions {
	const activationSegmentIds = new Set(
		track.segments.filter((segment) => segment.isDrsActivation).map((segment) => segment.id)
	);
	const activationWetness = state.segments.filter((segment) =>
		activationSegmentIds.has(segment.segmentId)
	);
	const drsSuspensionCondition =
		state.rainIntensityBp >= rules.drsSuspendRainBp ||
		activationWetness.some((segment) => segment.racingLineWetnessBp >= rules.drsSuspendWetnessBp);
	const drsRestoreCondition =
		state.rainIntensityBp < rules.drsRestoreRainBp &&
		activationWetness.every((segment) => segment.racingLineWetnessBp < rules.drsRestoreWetnessBp);
	const nextDrsSuspended = state.drsWeatherSuspended
		? !drsRestoreCondition
		: drsSuspensionCondition;
	const unsafeCondition = state.segments.some(
		(segment) =>
			segment.racingLineWetnessBp >= rules.unsafeWetnessBp ||
			segment.offLineWetnessBp >= rules.unsafeWetnessBp
	);
	const unsafeClearCondition = state.segments.every(
		(segment) =>
			segment.racingLineWetnessBp < rules.unsafeWetnessBp &&
			segment.offLineWetnessBp < rules.unsafeWetnessBp
	);
	const nextUnsafeActive = state.unsafeConditionsActive ? !unsafeClearCondition : unsafeCondition;
	const transitions = {
		drsWeatherSuspendedChanged: nextDrsSuspended !== state.drsWeatherSuspended,
		unsafeConditionsActiveChanged: nextUnsafeActive !== state.unsafeConditionsActive
	};
	state.drsWeatherSuspended = nextDrsSuspended;
	state.unsafeConditionsActive = nextUnsafeActive;
	return transitions;
}

export function weatherSurfaceExtrema(state: WeatherRuntimeState): {
	maximumRacingLineWetnessBp: number;
	maximumOffLineWetnessBp: number;
} {
	return {
		maximumRacingLineWetnessBp: maximumSurfaceWetness(state, 'racingLineWetnessBp'),
		maximumOffLineWetnessBp: maximumSurfaceWetness(state, 'offLineWetnessBp')
	};
}

export function updateSegmentSurfaces(
	state: WeatherRuntimeState,
	track: SimulationTrack,
	config: Readonly<WeatherSurfaceConfig> = WEATHER_SURFACE_CONFIG
): void {
	const deltaMs = state.weatherClockMs - state.lastUpdateMs;
	if (deltaMs <= 0) return;
	const meanRainIntensityBp = Number(
		divideRoundHalfEven(BigInt(state.previousRainIntensityBp + state.rainIntensityBp), 2n)
	);
	const rainGainBp = scaledRoundHalfEven(
		[meanRainIntensityBp, config.rainAccumulationBpPerMinuteAtMaximum, deltaMs],
		BASIS_POINTS * MINUTE_MS
	);
	const evaporationRatePpmPerMinute =
		Math.max(0, state.trackTempDeciC - config.evaporationReferenceTempDeciC) *
		config.evaporationPpmPerDeciCPerMinute;

	for (const segment of track.segments) {
		const surface = state.segments.find((candidate) => candidate.segmentId === segment.id)!;
		surface.previousRacingLineWetnessBp = surface.racingLineWetnessBp;
		const racingLineDrainageLossBp = atmosphericLossBp(
			surface.racingLineWetnessBp,
			config.baseDrainagePpmPerMinute,
			segment.drainagePpm!,
			deltaMs,
			1_000_000
		);
		const racingLineEvaporationLossBp = atmosphericLossBp(
			surface.racingLineWetnessBp,
			evaporationRatePpmPerMinute,
			segment.evaporationPpm!,
			deltaMs,
			1_000_000
		);
		const offLineDrainageLossBp = atmosphericLossBp(
			surface.offLineWetnessBp,
			config.baseDrainagePpmPerMinute,
			segment.drainagePpm!,
			deltaMs,
			segment.offLineRetentionPpm!
		);
		const offLineEvaporationLossBp = atmosphericLossBp(
			surface.offLineWetnessBp,
			evaporationRatePpmPerMinute,
			segment.evaporationPpm!,
			deltaMs,
			segment.offLineRetentionPpm!
		);
		surface.racingLineWetnessBp = nextSurfaceWetnessBp(
			surface.racingLineWetnessBp,
			rainGainBp,
			racingLineDrainageLossBp,
			racingLineEvaporationLossBp
		);
		surface.offLineWetnessBp = nextSurfaceWetnessBp(
			surface.offLineWetnessBp,
			rainGainBp,
			offLineDrainageLossBp,
			offLineEvaporationLossBp
		);
	}
}

export function applyRacingLineDrying(
	state: WeatherRuntimeState,
	segment: TrackSegment,
	carCount: number,
	config: Readonly<WeatherSurfaceConfig> = WEATHER_SURFACE_CONFIG
): void {
	if (carCount <= 0) return;
	const surface = state.segments.find((candidate) => candidate.segmentId === segment.id)!;
	const dryingLossBp = scaledRoundHalfEven(
		[
			surface.racingLineWetnessBp,
			config.carDryingPpmPerPass,
			carCount,
			segment.racingLineDryingPpm!
		],
		PPM * PPM
	);
	surface.racingLineWetnessBp = Math.max(0, surface.racingLineWetnessBp - dryingLossBp);
}

export function createInitialWeatherState(
	scenario: WeatherScenarioSpec,
	track: SimulationTrack,
	rng: Xoshiro128ss
): WeatherRuntimeState {
	const resolvedTimeline = resolveWeatherTimeline(scenario, rng);
	return {
		weatherClockMs: 0,
		lastUpdateMs: 0,
		resolvedTimeline,
		nextTruthPointIndex: 1,
		rainIntensityBp: scenario.initialRainIntensityBp,
		airTempDeciC: scenario.initialAirTempDeciC,
		trackTempDeciC: scenario.initialTrackTempDeciC,
		previousRainIntensityBp: scenario.initialRainIntensityBp,
		previousTrackTempDeciC: scenario.initialTrackTempDeciC,
		segments: track.segments.map((segment) => ({
			segmentId: segment.id,
			racingLineWetnessBp: scenario.initialRacingLineWetnessBp,
			offLineWetnessBp: scenario.initialOffLineWetnessBp,
			previousRacingLineWetnessBp: scenario.initialRacingLineWetnessBp
		})),
		drsWeatherSuspended: false,
		unsafeConditionsActive: false
	};
}
