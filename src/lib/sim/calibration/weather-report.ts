import { canonicalStringify } from '../core/canonicalize';
import { RaceSimulation } from '../core/engine';
import {
	WeatherStrategyController,
	type WeatherStrategyControllerOptions
} from '../core/weather-controller';
import {
	buildWeatherForecastSnapshot,
	resolveWeatherForecastCapability,
	scoreWeatherForecast
} from '../core/forecast';
import {
	applyWeatherStrategyPersistence,
	createWeatherStrategyPersistenceState,
	DEFAULT_WEATHER_STRATEGY_POLICY,
	decideWeatherStrategy,
	validateWeatherStrategyPolicy,
	type WeatherStrategyPolicy,
	type WeatherStrategyTarget
} from '../core/weather-strategy';
import { mean, roundHalfEven } from '../core/math';
import type {
	CompoundName,
	IssuedTyreSet,
	RaceInput,
	RaceRunResult,
	StrategyCommand,
	WeatherForecastScore,
	WeatherForecastSnapshot,
	WeatherRuntimeState
} from '../core/types';
import {
	WEATHER_CALIBRATION_SCENARIOS,
	createWeatherCalibrationInput,
	type WeatherCalibrationScenarioId
} from '../fixtures/weather-calibration';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';

export interface WeatherCalibrationOptions {
	runCount: number;
	entryCount: number;
	lapCount: number;
	seedPrefix: string;
	scenarios?: WeatherCalibrationScenarioId[];
	checkpointStep?: number;
	strategyPolicy?: WeatherStrategyPolicy;
}

export interface WeatherStrategySweepOptions extends WeatherCalibrationOptions {
	downgradeConfirmations: number[];
	minStintRefreshes: number[];
}

interface SurfaceHistorySample {
	weatherClockMs: number;
	racingLineWetnessBp: number;
	offLineWetnessBp: number;
}

const WETNESS_BANDS = [
	{ id: 'dry', maximumBp: 999 },
	{ id: 'damp', maximumBp: 3_999 },
	{ id: 'mixed', maximumBp: 6_999 },
	{ id: 'wet', maximumBp: 10_000 }
] as const;

const CONTROLLED_COMPOUNDS: readonly CompoundName[] = [
	'soft',
	'medium',
	'hard',
	'intermediate',
	'wet'
];

const CONTROLLED_WETNESS_POINTS = [
	{ band: 'dry', wetnessBp: 0 },
	{ band: 'slick-edge', wetnessBp: 800 },
	{ band: 'intermediate-low', wetnessBp: 1_800 },
	{ band: 'intermediate-mid', wetnessBp: 4_000 },
	{ band: 'intermediate-high', wetnessBp: 6_000 },
	{ band: 'wet-edge', wetnessBp: 7_500 },
	{ band: 'wet', wetnessBp: 9_000 }
] as const;

function wetnessBand(wetnessBp: number): string {
	return WETNESS_BANDS.find((band) => wetnessBp <= band.maximumBp)!.id;
}

function compoundForLap(input: RaceInput, entryId: string, tyreSetId: string): CompoundName {
	return input.entries
		.find((entry) => entry.sessionEntryId === entryId)!
		.tyreSets.find((set) => set.id === tyreSetId)!.compound.name;
}

function reportPaceByBand(
	values: Map<string, Map<CompoundName, number[]>>
): Record<string, Record<string, { entries: number; meanLapTimeMs: number }>> {
	return Object.fromEntries(
		[...values.entries()].map(([band, compounds]) => [
			band,
			Object.fromEntries(
				[...compounds.entries()].map(([compound, samples]) => [
					compound,
					{
						entries: samples.length,
						meanLapTimeMs: Math.round(mean(samples))
					}
				])
			)
		])
	);
}

function rankingsByBand(
	paceByBand: Record<string, Record<string, { entries: number; meanLapTimeMs: number }>>
): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(paceByBand).map(([band, values]) => [
			band,
			Object.entries(values)
				.sort(([, left], [, right]) => left.meanLapTimeMs - right.meanLapTimeMs)
				.map(([compound]) => compound)
		])
	);
}

function weatherClock(state: WeatherRuntimeState | undefined): number {
	return state?.weatherClockMs ?? 0;
}

function suspensionDurationMs(result: RaceRunResult, finalWeatherClockMs: number): number {
	let startedAt: number | null = null;
	let total = 0;
	for (const event of result.events) {
		if (event.type === 'drs_weather_suspended' && startedAt === null) {
			startedAt = event.simulationTimeMs;
		}
		if (event.type === 'drs_weather_restored' && startedAt !== null) {
			total += event.simulationTimeMs - startedAt;
			startedAt = null;
		}
	}
	return total + (startedAt === null ? 0 : Math.max(0, finalWeatherClockMs - startedAt));
}

function forecastQuality(
	timeline: WeatherRuntimeState['resolvedTimeline'],
	seed: string,
	issuedAtMs: number,
	sessionDurationMs: number
): {
	snapshots: Record<string, WeatherForecastSnapshot>;
	scores: Record<string, WeatherForecastScore>;
} {
	const capabilities = {
		low: resolveWeatherForecastCapability('forecast-low', {
			hqWeatherStationLevel: 0,
			weatherAnalystSkill: 0,
			tracksideToolsLevel: 0
		}),
		high: resolveWeatherForecastCapability('forecast-high', {
			hqWeatherStationLevel: 100,
			weatherAnalystSkill: 100,
			tracksideToolsLevel: 100
		})
	};
	const snapshots = Object.fromEntries(
		Object.entries(capabilities).map(([label, capability]) => [
			label,
			buildWeatherForecastSnapshot(timeline, capability, seed, issuedAtMs, sessionDurationMs)
		])
	) as Record<string, WeatherForecastSnapshot>;
	return {
		snapshots,
		scores: Object.fromEntries(
			Object.entries(snapshots).map(([label, snapshot]) => [
				label,
				scoreWeatherForecast(snapshot, timeline)
			])
		) as Record<string, WeatherForecastScore>
	};
}

function aggregateForecastScores(scores: WeatherForecastScore[]): WeatherForecastScore {
	const windowCount = scores.reduce((total, score) => total + score.windowCount, 0);
	if (windowCount === 0) {
		return {
			windowCount: 0,
			brierScore: 0,
			meanOnsetTimingErrorMs: 0,
			intensityIntervalCoverageBp: 0,
			meanIntensityIntervalWidthBp: 0
		};
	}
	const weighted = (selector: (score: WeatherForecastScore) => number) =>
		scores.reduce((total, score) => total + selector(score) * score.windowCount, 0) / windowCount;
	return {
		windowCount,
		brierScore: weighted((score) => score.brierScore),
		meanOnsetTimingErrorMs: weighted((score) => score.meanOnsetTimingErrorMs),
		intensityIntervalCoverageBp: roundHalfEven(
			weighted((score) => score.intensityIntervalCoverageBp)
		),
		meanIntensityIntervalWidthBp: roundHalfEven(
			weighted((score) => score.meanIntensityIntervalWidthBp)
		)
	};
}

function compoundForStrategyTarget(target: WeatherStrategyTarget): CompoundName {
	return target === 'wet' ? 'wet' : target === 'intermediate' ? 'intermediate' : 'medium';
}

function surfaceWetnessAt(history: SurfaceHistorySample[], weatherClockMs: number): number {
	return (
		history.findLast((sample) => sample.weatherClockMs <= weatherClockMs)?.racingLineWetnessBp ??
		history[0]?.racingLineWetnessBp ??
		0
	);
}

function weatherStrategyRefreshes(
	input: RaceInput,
	timeline: WeatherRuntimeState['resolvedTimeline'],
	surfaceHistory: Map<string, SurfaceHistorySample[]>,
	seed: string,
	sessionDurationMs: number
) {
	if (!input.weather?.enabled || timeline.length === 0 || sessionDurationMs <= 0) return null;
	const capabilities = {
		low: resolveWeatherForecastCapability('forecast-low', {
			hqWeatherStationLevel: 0,
			weatherAnalystSkill: 0,
			tracksideToolsLevel: 0
		}),
		high: resolveWeatherForecastCapability('forecast-high', {
			hqWeatherStationLevel: 100,
			weatherAnalystSkill: 100,
			tracksideToolsLevel: 100
		})
	};
	const history = surfaceHistory.get('seg-01') ?? [];
	const initialCompound = compoundForLap(
		input,
		input.entries[0].sessionEntryId,
		input.entries[0].startingTyreSetId
	);
	const runForCapability = (capability: (typeof capabilities)[keyof typeof capabilities]) => {
		const issuedAtMs: number[] = [];
		for (let issuedAt = 0; issuedAt < sessionDurationMs; issuedAt += capability.refreshIntervalMs)
			issuedAtMs.push(issuedAt);
		let currentCompound = initialCompound;
		let persistenceState = createWeatherStrategyPersistenceState();
		return issuedAtMs.map((issuedAt) => {
			const currentCompoundBeforeDecision = currentCompound;
			const snapshot = buildWeatherForecastSnapshot(
				timeline,
				capability,
				seed,
				issuedAt,
				sessionDurationMs
			);
			const candidateDecision = decideWeatherStrategy({
				currentCompound: currentCompoundBeforeDecision,
				observedRacingLineWetnessBp: surfaceWetnessAt(history, issuedAt),
				forecast: snapshot
			});
			const persisted = applyWeatherStrategyPersistence(
				candidateDecision,
				currentCompoundBeforeDecision,
				persistenceState
			);
			const decision = persisted.decision;
			persistenceState = persisted.state;
			const nextCompound =
				decision.action === 'pit'
					? compoundForStrategyTarget(decision.target)
					: currentCompoundBeforeDecision;
			currentCompound = nextCompound;
			return {
				issuedAtMs: issuedAt,
				currentCompound: currentCompoundBeforeDecision,
				observedRacingLineWetnessBp: surfaceWetnessAt(history, issuedAt),
				candidateDecision,
				decision,
				nextCompound,
				persistence: persistenceState
			};
		});
	};
	return {
		low: runForCapability(capabilities.low),
		high: runForCapability(capabilities.high)
	};
}

function triggerLapForWeatherClock(
	result: RaceRunResult,
	entryId: string,
	issuedAtMs: number,
	lapCount: number
): number {
	const telemetry = result.lapTelemetry
		.filter((lap) => lap.sessionEntryId === entryId)
		.sort((left, right) => left.lap - right.lap);
	return telemetry.find((lap) => lap.elapsedMs >= issuedAtMs)?.lap ?? lapCount;
}

function strategyStints(result: RaceRunResult, input: RaceInput, entryId: string): CompoundName[] {
	const entry = input.entries.find((candidate) => candidate.sessionEntryId === entryId)!;
	const stints: CompoundName[] = [compoundForLap(input, entryId, entry.startingTyreSetId)];
	for (const event of result.events) {
		if (event.type !== 'tyre_set_mounted' || !event.sessionEntryIds.includes(entryId)) continue;
		const compound = event.payload.compound;
		if (
			compound === 'soft' ||
			compound === 'medium' ||
			compound === 'hard' ||
			compound === 'intermediate' ||
			compound === 'wet'
		)
			stints.push(compound);
	}
	return stints;
}

function strategyCommandReplay(
	input: RaceInput,
	baselineResult: RaceRunResult,
	entryId: string,
	trace: NonNullable<ReturnType<typeof weatherStrategyRefreshes>>['low'],
	mode: 'candidate' | 'effective'
) {
	const replayInput = structuredClone(input);
	replayInput.rules.mandatoryPitStops = 0;
	replayInput.commands = [];
	const entry = replayInput.entries.find((candidate) => candidate.sessionEntryId === entryId)!;
	const commands: StrategyCommand[] = [];
	let previousTriggerLap = 0;
	let droppedPitRecommendations = 0;
	for (const [index, refresh] of trace.entries()) {
		const recommendation = mode === 'candidate' ? refresh.candidateDecision : refresh.decision;
		if (recommendation.action !== 'pit') continue;
		const mappedLap = triggerLapForWeatherClock(
			baselineResult,
			entryId,
			refresh.issuedAtMs,
			replayInput.rules.lapCount
		);
		const triggerLap = Math.max(mappedLap, previousTriggerLap + 1);
		if (triggerLap > replayInput.rules.lapCount) {
			droppedPitRecommendations += 1;
			continue;
		}
		const compound = compoundForStrategyTarget(recommendation.target);
		const source = entry.tyreSets.find((set) => set.compound.name === compound);
		if (!source) throw new Error(`Missing validation tyre set for ${compound}`);
		const tyreSet: IssuedTyreSet = {
			id: `${entryId}-strategy-${mode}-${index}`,
			compound: structuredClone(source.compound)
		};
		entry.tyreSets.push(tyreSet);
		commands.push({
			sequence: index + 1,
			sessionEntryId: entryId,
			triggerLap,
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: tyreSet.id }
		});
		previousTriggerLap = triggerLap;
	}
	replayInput.commands = commands;
	const result = new RaceSimulation(replayInput).run();
	const sessionResult = result.sessionResults.find(
		(candidate) => candidate.sessionEntryId === entryId
	)!;
	const details = result.raceDetails.find((candidate) => candidate.sessionEntryId === entryId)!;
	return {
		totalTimeMs: sessionResult.totalTimeMs,
		pitStops: details.pitStops,
		stints: strategyStints(result, replayInput, entryId),
		scheduledPitRecommendations: commands.length,
		droppedPitRecommendations,
		triggerLaps: commands.map((command) => command.triggerLap)
	};
}

function strategyCommandValidation(
	scenarioId: WeatherCalibrationScenarioId,
	input: RaceInput,
	baselineResult: RaceRunResult,
	refreshes: NonNullable<ReturnType<typeof weatherStrategyRefreshes>>
) {
	if (!['W2', 'W5', 'W9', 'W11'].includes(scenarioId)) return null;
	const entryId = input.entries[0].sessionEntryId;
	return Object.fromEntries(
		(['low', 'high'] as const).map((capability) => {
			const raw = strategyCommandReplay(
				input,
				baselineResult,
				entryId,
				refreshes[capability],
				'candidate'
			);
			const hysteresis = strategyCommandReplay(
				input,
				baselineResult,
				entryId,
				refreshes[capability],
				'effective'
			);
			return [
				capability,
				{
					raw,
					hysteresis,
					deltaTotalTimeMs: hysteresis.totalTimeMs - raw.totalTimeMs,
					deltaPitStops: hysteresis.pitStops - raw.pitStops
				}
			];
		})
	) as Record<
		'low' | 'high',
		{
			raw: ReturnType<typeof strategyCommandReplay>;
			hysteresis: ReturnType<typeof strategyCommandReplay>;
			deltaTotalTimeMs: number;
			deltaPitStops: number;
		}
	>;
}

function closedLoopStrategyReplay(
	input: RaceInput,
	entryId: string,
	capability: 'low' | 'high',
	mode: 'candidate' | 'effective',
	sessionDurationMs: number,
	policy: WeatherStrategyPolicy,
	checkpointStep: number | null = 117
) {
	const replayInput = structuredClone(input);
	replayInput.rules.mandatoryPitStops = 0;
	replayInput.commands = [];
	const entry = replayInput.entries.find((candidate) => candidate.sessionEntryId === entryId)!;
	const capabilityConfig = resolveWeatherForecastCapability(
		`forecast-${capability}`,
		capability === 'low'
			? { hqWeatherStationLevel: 0, weatherAnalystSkill: 0, tracksideToolsLevel: 0 }
			: { hqWeatherStationLevel: 100, weatherAnalystSkill: 100, tracksideToolsLevel: 100 }
	);
	const pitEntry = replayInput.track.segments.find((segment) => segment.isPitEntry);
	if (!pitEntry) throw new Error('Weather strategy validation requires a pit entry segment');
	const maxRefreshes = Math.ceil(sessionDurationMs / capabilityConfig.refreshIntervalMs) + 1;
	const tyreSetIdsByCompound: Partial<Record<CompoundName, string[]>> = {};
	for (const compound of ['medium', 'intermediate', 'wet'] as const) {
		const source = entry.tyreSets.find((set) => set.compound.name === compound);
		if (!source) throw new Error(`Missing validation tyre set for ${compound}`);
		const ids = Array.from({ length: maxRefreshes }, (_, index) => {
			const id = `${entryId}-closed-loop-${mode}-${capability}-${compound}-${index}`;
			const tyreSet: IssuedTyreSet = { id, compound: structuredClone(source.compound) };
			entry.tyreSets.push(tyreSet);
			return id;
		});
		tyreSetIdsByCompound[compound] = ids;
	}
	const controllerOptions: WeatherStrategyControllerOptions = {
		targetEntryId: entryId,
		capability: capabilityConfig,
		mode,
		sessionDurationMs,
		pitEntrySegmentId: pitEntry.id,
		pitEntrySegmentSequence: pitEntry.sequence,
		lapCount: replayInput.rules.lapCount,
		tyreSetIdsByCompound,
		policy
	};
	const fullController = new WeatherStrategyController(controllerOptions);
	const result = new RaceSimulation(replayInput, undefined, fullController).run();
	let checkpointParity: boolean | null = null;
	if (checkpointStep !== null) {
		const checkpointSimulation = new RaceSimulation(
			structuredClone(replayInput),
			undefined,
			new WeatherStrategyController(controllerOptions)
		);
		const resolvedCheckpointStep = Math.min(
			checkpointStep,
			replayInput.rules.lapCount * replayInput.track.segments.length - 1
		);
		for (let step = 0; step < resolvedCheckpointStep; step += 1) checkpointSimulation.step();
		const resumed = new RaceSimulation(
			structuredClone(replayInput),
			checkpointSimulation.snapshot(),
			new WeatherStrategyController(controllerOptions)
		).run();
		checkpointParity = canonicalStringify(resumed) === canonicalStringify(result);
	}
	const sessionResult = result.sessionResults.find(
		(candidate) => candidate.sessionEntryId === entryId
	)!;
	const details = result.raceDetails.find((candidate) => candidate.sessionEntryId === entryId)!;
	const appliedCommands = result.events.filter(
		(event) => event.type === 'strategy_command_applied' && event.sessionEntryIds.includes(entryId)
	);
	return {
		completed: result.events.some((event) => event.type === 'car_finished'),
		checkpointParity,
		totalTimeMs: sessionResult.totalTimeMs,
		pitStops: details.pitStops,
		stints: strategyStints(result, replayInput, entryId),
		appliedStrategyCommands: appliedCommands.length,
		triggerLaps: appliedCommands.map((event) => event.lap),
		controllerState: fullController.snapshot()
	};
}

function closedLoopStrategyValidation(
	scenarioId: WeatherCalibrationScenarioId,
	runs: readonly { input: RaceInput; sessionDurationMs: number; seed: string }[],
	policy: WeatherStrategyPolicy = DEFAULT_WEATHER_STRATEGY_POLICY,
	checkpointStep: number | null = 117,
	rawReplayCache?: Partial<Record<'low' | 'high', ReturnType<typeof closedLoopStrategyReplay>[]>>
) {
	if (!['W2', 'W5', 'W9', 'W11'].includes(scenarioId)) return null;
	const entryId = runs[0]?.input.entries[0]?.sessionEntryId;
	if (!entryId || runs.length === 0) return null;
	validateWeatherStrategyPolicy(policy);
	const roundedMean = (values: number[]) => Math.round(mean(values) * 1000) / 1000;
	const aggregate = (replays: ReturnType<typeof closedLoopStrategyReplay>[]) => {
		const triggerLapsByRun = replays.map((replay) => replay.triggerLaps);
		return {
			runs: replays.length,
			meanTotalTimeMs: Math.round(mean(replays.map((replay) => replay.totalTimeMs))),
			meanPitStops: roundedMean(replays.map((replay) => replay.pitStops)),
			meanAppliedStrategyCommands: roundedMean(
				replays.map((replay) => replay.appliedStrategyCommands)
			),
			meanRefreshCount: roundedMean(replays.map((replay) => replay.controllerState.refreshCount)),
			meanHeldDowngradeCount: roundedMean(
				replays.map((replay) => replay.controllerState.heldDowngradeCount)
			),
			meanRejectedCommandCount: roundedMean(
				replays.map((replay) => replay.controllerState.rejectedCommandCount)
			),
			completedRuns: replays.filter((replay) => replay.completed).length,
			checkpointParityRuns: replays.filter((replay) => replay.checkpointParity).length,
			zeroRejectedCommandRuns: replays.filter(
				(replay) => replay.controllerState.rejectedCommandCount === 0
			).length,
			noAdjacentTriggerRuns: replays.filter((replay) =>
				replay.triggerLaps.every(
					(lap, index) => index === 0 || lap > replay.triggerLaps[index - 1] + 1
				)
			).length,
			triggerLapsByRun,
			triggerSpacingByRun: triggerLapsByRun.map((triggerLaps) =>
				triggerLaps.slice(1).map((lap, index) => lap - triggerLaps[index])
			),
			stintSequencesByRun: replays.map((replay) => replay.stints),
			seeds: runs.map((run) => run.seed)
		};
	};
	return Object.fromEntries(
		(['low', 'high'] as const).map((capability) => {
			const rawReplays =
				rawReplayCache?.[capability] ??
				runs.map((run) =>
					closedLoopStrategyReplay(
						run.input,
						entryId,
						capability,
						'candidate',
						run.sessionDurationMs,
						policy,
						checkpointStep
					)
				);
			const hysteresisReplays = runs.map((run) =>
				closedLoopStrategyReplay(
					run.input,
					entryId,
					capability,
					'effective',
					run.sessionDurationMs,
					policy,
					checkpointStep
				)
			);
			const raw = aggregate(rawReplays);
			const hysteresis = aggregate(hysteresisReplays);
			return [
				capability,
				{
					raw,
					hysteresis,
					deltaTotalTimeMs: hysteresis.meanTotalTimeMs - raw.meanTotalTimeMs,
					deltaPitStops: roundedMean([hysteresis.meanPitStops - raw.meanPitStops])
				}
			];
		})
	) as Record<
		'low' | 'high',
		{
			raw: ReturnType<typeof aggregate>;
			hysteresis: ReturnType<typeof aggregate>;
			deltaTotalTimeMs: number;
			deltaPitStops: number;
		}
	>;
}

function controlledCompoundSweep(seed: string, lapCount: number) {
	const sampleLapCount = Math.max(5, lapCount);
	const freshLapCount = Math.min(5, sampleLapCount);
	const postWarmupStartLap = 4;
	const postWarmupStartIndex = postWarmupStartLap - 1;
	const postWarmupLapCount = Math.min(5, Math.max(1, sampleLapCount - postWarmupStartIndex));
	return Object.fromEntries(
		CONTROLLED_WETNESS_POINTS.map(({ band, wetnessBp }) => {
			const base = createWeatherCalibrationInput(
				'W1',
				`${seed}:controlled:${band}`,
				1,
				sampleLapCount
			);
			const weather = base.weather;
			if (!weather?.enabled) throw new Error('weather input is required');
			weather.scenario.initialRacingLineWetnessBp = wetnessBp;
			weather.scenario.initialOffLineWetnessBp = wetnessBp;
			weather.scenario.initialTrackTempDeciC = 310;
			weather.scenario.envelope = weather.scenario.envelope.map((point) => ({
				...point,
				rainIntensityMinBp: 0,
				rainIntensityMaxBp: 0,
				airTempMinDeciC: 220,
				airTempMaxDeciC: 220,
				trackTempMinDeciC: 310,
				trackTempMaxDeciC: 310
			}));
			base.rules.mandatoryPitStops = 0;
			base.commands = [];
			for (const segment of base.track.segments) {
				segment.drainagePpm = 0;
				segment.evaporationPpm = 0;
				segment.racingLineDryingPpm = 0;
			}
			const compounds = Object.fromEntries(
				CONTROLLED_COMPOUNDS.map((compound) => {
					const input = structuredClone(base);
					const entry = input.entries[0];
					entry.startingTyreSetId = `${entry.sessionEntryId}-${compound}`;
					const result = new RaceSimulation(input).run();
					const telemetry = result.lapTelemetry.filter(
						(lap) => lap.sessionEntryId === entry.sessionEntryId
					);
					const tyreSetId = entry.startingTyreSetId;
					const freshLaps = telemetry.slice(0, freshLapCount);
					const postWarmupLaps = telemetry.slice(
						postWarmupStartIndex,
						postWarmupStartIndex + postWarmupLapCount
					);
					const lateLaps = telemetry.slice(-freshLapCount);
					return [
						compound,
						{
							laps: telemetry.length,
							meanLapTimeMs: Math.round(mean(telemetry.map((lap) => lap.lapTimeMs))),
							meanFreshLapTimeMs: Math.round(mean(freshLaps.map((lap) => lap.lapTimeMs))),
							meanPostWarmupLapTimeMs: Math.round(mean(postWarmupLaps.map((lap) => lap.lapTimeMs))),
							meanLateLapTimeMs: Math.round(mean(lateLaps.map((lap) => lap.lapTimeMs))),
							degradationDeltaMs:
								Math.round(mean(lateLaps.map((lap) => lap.lapTimeMs))) -
								Math.round(mean(postWarmupLaps.map((lap) => lap.lapTimeMs))),
							postWarmupStartLap,
							finalTyreWearBp: result.finalTyreWear[entry.sessionEntryId][tyreSetId]
						}
					];
				})
			) as Record<
				CompoundName,
				{
					laps: number;
					meanLapTimeMs: number;
					meanFreshLapTimeMs: number;
					meanPostWarmupLapTimeMs: number;
					meanLateLapTimeMs: number;
					degradationDeltaMs: number;
					postWarmupStartLap: number;
					finalTyreWearBp: number;
				}
			>;
			const ranking = Object.entries(compounds)
				.sort(([, left], [, right]) => left.meanLapTimeMs - right.meanLapTimeMs)
				.map(([compound]) => compound);
			return [band, { wetnessBp, trackTempDeciC: 310, compounds, ranking }];
		})
	);
}

function driverSensitivity(
	scenarioId: WeatherCalibrationScenarioId,
	seed: string,
	lapCount: number
) {
	if (scenarioId === 'W0') return null;
	const wetPaceLow = createWeatherCalibrationInput(scenarioId, `${seed}:wet-low`, 1, lapCount);
	const wetPaceHigh = structuredClone(wetPaceLow);
	wetPaceLow.entries[0].driver.wetPace = 6;
	wetPaceHigh.entries[0].driver.wetPace = 19;
	const adaptabilityLow = createWeatherCalibrationInput(
		scenarioId,
		`${seed}:adapt-low`,
		1,
		lapCount
	);
	const adaptabilityHigh = structuredClone(adaptabilityLow);
	adaptabilityLow.entries[0].driver.adaptability = 1;
	adaptabilityHigh.entries[0].driver.adaptability = 20;
	const wetLowResult = new RaceSimulation(wetPaceLow).run();
	const wetHighResult = new RaceSimulation(wetPaceHigh).run();
	const adaptLowResult = new RaceSimulation(adaptabilityLow).run();
	const adaptHighResult = new RaceSimulation(adaptabilityHigh).run();
	return {
		wetPaceImprovementMs:
			wetLowResult.sessionResults[0].totalTimeMs - wetHighResult.sessionResults[0].totalTimeMs,
		adaptabilityTransitionImprovementMs:
			adaptLowResult.sessionResults[0].totalTimeMs - adaptHighResult.sessionResults[0].totalTimeMs
	};
}

function strategyComparison(
	scenarioId: WeatherCalibrationScenarioId,
	seed: string,
	lapCount: number
) {
	if (scenarioId === 'W0') return null;
	const base = createWeatherCalibrationInput(scenarioId, `${seed}:strategy`, 1, lapCount);
	const entryId = base.entries[0].sessionEntryId;
	const variants = ['configured', 'early', 'late', 'missed'] as const;
	const totalTimeMs = Object.fromEntries(
		variants.map((variant) => {
			const input = structuredClone(base);
			const commands = input.commands.filter((command) => command.sessionEntryId === entryId);
			if (variant === 'early') {
				commands.forEach((command, index) => {
					command.triggerLap = Math.max(5, Math.round(lapCount * (0.25 + index * 0.1)));
				});
			}
			if (variant === 'late') {
				commands.forEach((command, index) => {
					command.triggerLap = Math.max(5, Math.round(lapCount * (0.72 + index * 0.08)));
				});
			}
			if (variant === 'missed') {
				input.rules.mandatoryPitStops = 0;
				input.commands = input.commands.filter((command) => command.sessionEntryId !== entryId);
			}
			if (variant !== 'missed')
				input.commands = input.commands
					.filter((command) => command.sessionEntryId !== entryId)
					.concat(commands);
			return [variant, new RaceSimulation(input).run().sessionResults[0].totalTimeMs];
		})
	) as Record<(typeof variants)[number], number>;
	return {
		totalTimeMs,
		timeDeltaVsConfiguredMs: Object.fromEntries(
			variants
				.filter((variant) => variant !== 'configured')
				.map((variant) => [variant, totalTimeMs[variant] - totalTimeMs.configured])
		)
	};
}

function strategyTimingSweep(
	scenarioId: WeatherCalibrationScenarioId,
	seed: string,
	lapCount: number
) {
	if (scenarioId === 'W0') return null;
	const base = createWeatherCalibrationInput(scenarioId, `${seed}:timing-sweep`, 1, lapCount);
	const entryId = base.entries[0].sessionEntryId;
	const configuredTimeMs = new RaceSimulation(structuredClone(base)).run().sessionResults[0]
		.totalTimeMs;
	const fractions = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
	const samples = fractions.map((fraction) => {
		const input = structuredClone(base);
		const commands = input.commands.filter((command) => command.sessionEntryId === entryId);
		input.commands = input.commands
			.filter((command) => command.sessionEntryId !== entryId)
			.concat(
				commands.map((command, index) => ({
					...command,
					triggerLap: Math.max(5, Math.round(lapCount * (fraction + index * 0.1)))
				}))
			);
		const totalTimeMs = new RaceSimulation(input).run().sessionResults[0].totalTimeMs;
		const triggerLaps = commands.map((_, index) =>
			Math.max(5, Math.round(lapCount * (fraction + index * 0.1)))
		);
		return {
			fraction,
			triggerLap: triggerLaps[0],
			triggerLaps,
			totalTimeMs,
			deltaVsConfiguredMs: totalTimeMs - configuredTimeMs
		};
	});
	const best = samples.reduce((current, sample) =>
		sample.totalTimeMs < current.totalTimeMs ? sample : current
	);
	return {
		samples,
		bestFraction: best.fraction,
		bestDeltaVsConfiguredMs: best.deltaVsConfiguredMs
	};
}

function analyzeWeatherScenario(
	options: WeatherCalibrationOptions,
	scenarioId: WeatherCalibrationScenarioId
) {
	const firstSeed = `${options.seedPrefix}:${scenarioId}:0001`;
	let truthTimeline: WeatherRuntimeState['resolvedTimeline'] = [];
	const surfaceHistory = new Map<string, SurfaceHistorySample[]>();
	let firstResult: RaceRunResult | null = null;
	let firstInput: RaceInput | null = null;
	let firstFinalWeatherClockMs = 0;
	let checkpointMatches = true;
	let forecastSnapshots: Record<string, WeatherForecastSnapshot> | null = null;
	const closedLoopRuns: { input: RaceInput; sessionDurationMs: number; seed: string }[] = [];
	const forecastScores = new Map<string, WeatherForecastScore[]>();
	const paceByBand = new Map<string, Map<CompoundName, number[]>>();
	const finalWetnessBySegment = new Map<
		string,
		{ racingLineWetnessBp: number; offLineWetnessBp: number }
	>();
	const controlCounts = new Map<string, number>();
	let totalSuspensionMs = 0;
	const allFinalTimes: number[] = [];

	for (let run = 0; run < options.runCount; run += 1) {
		const seed = `${options.seedPrefix}:${scenarioId}:${String(run + 1).padStart(4, '0')}`;
		const input = createWeatherCalibrationInput(
			scenarioId,
			seed,
			options.entryCount,
			options.lapCount
		);
		if (run === 0) firstInput = input;
		const simulation = new RaceSimulation(input);
		let checkpointSnapshot: ReturnType<RaceSimulation['snapshot']> | null = null;
		while (!simulation.isComplete()) {
			simulation.step();
			const snapshot = simulation.snapshot();
			if (run === 0 && snapshot.weatherState) {
				truthTimeline = snapshot.weatherState.resolvedTimeline;
				for (const surface of snapshot.weatherState.segments) {
					const history = surfaceHistory.get(surface.segmentId) ?? [];
					history.push({
						weatherClockMs: snapshot.weatherState.weatherClockMs,
						racingLineWetnessBp: surface.racingLineWetnessBp,
						offLineWetnessBp: surface.offLineWetnessBp
					});
					surfaceHistory.set(surface.segmentId, history);
				}
			}
			if (options.checkpointStep !== undefined && snapshot.step === options.checkpointStep) {
				checkpointSnapshot = snapshot;
			}
		}
		const result = simulation.run();
		if (run === 0) firstResult = result;
		allFinalTimes.push(...result.sessionResults.map((entry) => entry.totalTimeMs));
		const finalState = simulation.snapshot().weatherState;
		if (finalState) {
			closedLoopRuns.push({
				input: structuredClone(input),
				sessionDurationMs: finalState.weatherClockMs,
				seed
			});
			if (run === 0) firstFinalWeatherClockMs = finalState.weatherClockMs;
			if (run === 0) {
				const quality = forecastQuality(
					finalState.resolvedTimeline,
					seed,
					0,
					finalState.weatherClockMs
				);
				forecastSnapshots = quality.snapshots;
				for (const [label, score] of Object.entries(quality.scores))
					forecastScores.set(label, [score]);
			} else {
				const quality = forecastQuality(
					finalState.resolvedTimeline,
					seed,
					0,
					finalState.weatherClockMs
				);
				for (const [label, score] of Object.entries(quality.scores))
					forecastScores.set(label, [...(forecastScores.get(label) ?? []), score]);
			}
			for (const surface of finalState.segments) {
				finalWetnessBySegment.set(surface.segmentId, {
					racingLineWetnessBp: surface.racingLineWetnessBp,
					offLineWetnessBp: surface.offLineWetnessBp
				});
			}
		}
		for (const event of result.events) {
			if (
				event.type === 'drs_weather_suspended' ||
				event.type === 'drs_weather_restored' ||
				event.type === 'unsafe_conditions_detected' ||
				event.type === 'unsafe_conditions_cleared'
			) {
				controlCounts.set(event.type, (controlCounts.get(event.type) ?? 0) + 1);
			}
		}
		totalSuspensionMs += suspensionDurationMs(result, weatherClock(finalState));
		for (const lap of result.lapTelemetry) {
			if (lap.racingLineWetnessBp === undefined) continue;
			const band = wetnessBand(lap.racingLineWetnessBp);
			const compound = compoundForLap(input, lap.sessionEntryId, lap.tyreSetId);
			const compounds = paceByBand.get(band) ?? new Map<CompoundName, number[]>();
			const samples = compounds.get(compound) ?? [];
			samples.push(lap.lapTimeMs);
			compounds.set(compound, samples);
			paceByBand.set(band, compounds);
		}
		if (checkpointSnapshot) {
			const resumed = new RaceSimulation(input, checkpointSnapshot).run();
			checkpointMatches =
				checkpointMatches && canonicalStringify(resumed) === canonicalStringify(result);
		}
	}

	if (scenarioId === 'W0') {
		const omitted = createAcademyRaceInput({
			seed: `${options.seedPrefix}:W0:regression`,
			entryCount: options.entryCount,
			lapCount: options.lapCount,
			gridMode: 'performance'
		});
		const disabled = structuredClone(omitted);
		disabled.weather = { enabled: false };
		checkpointMatches =
			canonicalStringify(new RaceSimulation(disabled).run()) ===
			canonicalStringify(new RaceSimulation(omitted).run());
	}

	const paceReport = reportPaceByBand(paceByBand);
	const rankings = rankingsByBand(paceReport);
	const compoundCrossoverTransitions = WETNESS_BANDS.slice(1).flatMap((band, index) => {
		const fromBand = WETNESS_BANDS[index].id;
		const fromLeader = rankings[fromBand]?.[0];
		const toLeader = rankings[band.id]?.[0];
		return fromLeader && toLeader && fromLeader !== toLeader
			? [{ fromBand, toBand: band.id, fromLeader, toLeader }]
			: [];
	});
	const strategyRefreshTrace =
		firstInput && truthTimeline.length > 0
			? weatherStrategyRefreshes(
					firstInput,
					truthTimeline,
					surfaceHistory,
					firstSeed,
					firstFinalWeatherClockMs
				)
			: null;
	return {
		name: WEATHER_CALIBRATION_SCENARIOS.find((scenario) => scenario.id === scenarioId)!.name,
		runs: options.runCount,
		meanTotalTimeMs: Math.round(mean(allFinalTimes)),
		truthTimeline,
		surfaceHistory: Object.fromEntries(surfaceHistory),
		finalWetnessBySegment: Object.fromEntries(finalWetnessBySegment),
		compoundPaceByWetnessBand: paceReport,
		compoundRankingByWetnessBand: rankings,
		compoundCrossoverTransitions,
		controls: {
			drsSuspendedEvents: controlCounts.get('drs_weather_suspended') ?? 0,
			drsRestoredEvents: controlCounts.get('drs_weather_restored') ?? 0,
			unsafeDetectedEvents: controlCounts.get('unsafe_conditions_detected') ?? 0,
			unsafeClearedEvents: controlCounts.get('unsafe_conditions_cleared') ?? 0,
			meanSuspensionDurationMs: Math.round(totalSuspensionMs / options.runCount)
		},
		forecast:
			forecastSnapshots === null
				? null
				: {
						snapshots: forecastSnapshots,
						scores: Object.fromEntries(
							[...forecastScores.entries()].map(([label, scores]) => [
								label,
								aggregateForecastScores(scores)
							])
						) as Record<string, WeatherForecastScore>
					},
		controlledCompoundSweep: controlledCompoundSweep(firstSeed, options.lapCount),
		driverSensitivity: driverSensitivity(scenarioId, firstSeed, options.lapCount),
		strategyComparison: strategyComparison(scenarioId, firstSeed, options.lapCount),
		strategyTimingSweep: strategyTimingSweep(scenarioId, firstSeed, options.lapCount),
		weatherStrategyDecision:
			firstInput && forecastSnapshots
				? {
						currentCompound: compoundForLap(
							firstInput,
							firstInput.entries[0].sessionEntryId,
							firstInput.entries[0].startingTyreSetId
						),
						observedRacingLineWetnessBp: firstInput.weather?.enabled
							? firstInput.weather.scenario.initialRacingLineWetnessBp
							: 0,
						low: decideWeatherStrategy({
							currentCompound: compoundForLap(
								firstInput,
								firstInput.entries[0].sessionEntryId,
								firstInput.entries[0].startingTyreSetId
							),
							observedRacingLineWetnessBp: firstInput.weather?.enabled
								? firstInput.weather.scenario.initialRacingLineWetnessBp
								: 0,
							forecast: forecastSnapshots.low
						}),
						high: decideWeatherStrategy({
							currentCompound: compoundForLap(
								firstInput,
								firstInput.entries[0].sessionEntryId,
								firstInput.entries[0].startingTyreSetId
							),
							observedRacingLineWetnessBp: firstInput.weather?.enabled
								? firstInput.weather.scenario.initialRacingLineWetnessBp
								: 0,
							forecast: forecastSnapshots.high
						})
					}
				: null,
		weatherStrategyRefreshes: strategyRefreshTrace,
		strategyCommandValidation:
			firstInput && firstResult && strategyRefreshTrace
				? strategyCommandValidation(scenarioId, firstInput, firstResult, strategyRefreshTrace)
				: null,
		closedLoopStrategyValidation:
			closedLoopRuns.length > 0
				? closedLoopStrategyValidation(
						scenarioId,
						closedLoopRuns,
						options.strategyPolicy ?? DEFAULT_WEATHER_STRATEGY_POLICY,
						options.checkpointStep ?? 117
					)
				: null,
		checkpointMatches,
		allRunsHaveWeatherState: scenarioId !== 'W0' && Boolean(firstResult)
	};
}

function collectClosedLoopRuns(
	options: WeatherCalibrationOptions,
	scenarioId: WeatherCalibrationScenarioId
): { input: RaceInput; sessionDurationMs: number; seed: string }[] {
	const runs: { input: RaceInput; sessionDurationMs: number; seed: string }[] = [];
	for (let run = 0; run < options.runCount; run += 1) {
		const seed = `${options.seedPrefix}:${scenarioId}:${String(run + 1).padStart(4, '0')}`;
		const input = createWeatherCalibrationInput(
			scenarioId,
			seed,
			options.entryCount,
			options.lapCount
		);
		const simulation = new RaceSimulation(input);
		simulation.run();
		const weatherState = simulation.snapshot().weatherState;
		if (weatherState) {
			runs.push({
				input: structuredClone(input),
				sessionDurationMs: weatherState.weatherClockMs,
				seed
			});
		}
	}
	return runs;
}

export function runWeatherStrategySweep(options: WeatherStrategySweepOptions) {
	const confirmations = [...new Set(options.downgradeConfirmations)].sort((a, b) => a - b);
	const minStintRefreshes = [...new Set(options.minStintRefreshes)].sort((a, b) => a - b);
	if (confirmations.length === 0 || minStintRefreshes.length === 0) {
		throw new Error('Weather strategy sweep requires at least one value for each policy dimension');
	}
	for (const value of [...confirmations, ...minStintRefreshes]) {
		if (!Number.isInteger(value) || value < 1) {
			throw new Error('Weather strategy sweep values must be positive integers');
		}
	}
	const scenarioIds = ['W2', 'W5', 'W9', 'W11'] as const;
	const policies = confirmations.flatMap((downgradeConfirmations) =>
		minStintRefreshes.map((minStintRefreshes) => ({
			downgradeConfirmations,
			minStintRefreshes
		}))
	);
	const sweepCheckpointStep = policies.length === 1 ? (options.checkpointStep ?? 117) : null;
	const runsByScenario = Object.fromEntries(
		scenarioIds.map((scenarioId) => [scenarioId, collectClosedLoopRuns(options, scenarioId)])
	) as Record<(typeof scenarioIds)[number], ReturnType<typeof collectClosedLoopRuns>>;
	const rawReplayCacheByScenario = Object.fromEntries(
		scenarioIds.map((scenarioId) => {
			const runs = runsByScenario[scenarioId];
			const entryId = runs[0]?.input.entries[0]?.sessionEntryId;
			if (!entryId) throw new Error(`Missing sweep input for ${scenarioId}`);
			return [
				scenarioId,
				Object.fromEntries(
					(['low', 'high'] as const).map((capability) => [
						capability,
						runs.map((run) =>
							closedLoopStrategyReplay(
								run.input,
								entryId,
								capability,
								'candidate',
								run.sessionDurationMs,
								DEFAULT_WEATHER_STRATEGY_POLICY,
								sweepCheckpointStep
							)
						)
					])
				)
			];
		})
	) as Record<
		(typeof scenarioIds)[number],
		Partial<Record<'low' | 'high', ReturnType<typeof closedLoopStrategyReplay>[]>>
	>;
	return {
		version: 'weather-strategy-sweep-v1',
		seedPrefix: options.seedPrefix,
		strategyValidation: {
			mode: 'closed_loop_policy_sweep',
			controllerVersion: 'weather-strategy-controller-v1',
			baselinePolicy: DEFAULT_WEATHER_STRATEGY_POLICY,
			checkpointValidation:
				policies.length === 1 ? 'enabled_single_policy' : 'disabled_in_multi_policy_sweep'
		},
		runsPerScenario: options.runCount,
		entriesPerRun: options.entryCount,
		lapsPerRun: options.lapCount,
		strategySweep: {
			downgradeConfirmations: confirmations,
			minStintRefreshes,
			scenarios: scenarioIds,
			policies: policies.map((policy) => ({
				policy,
				scenarios: Object.fromEntries(
					scenarioIds.map((scenarioId) => [
						scenarioId,
						closedLoopStrategyValidation(
							scenarioId,
							runsByScenario[scenarioId],
							policy,
							sweepCheckpointStep,
							rawReplayCacheByScenario[scenarioId]
						)
					])
				)
			}))
		}
	};
}

export function runWeatherCalibration(options: WeatherCalibrationOptions) {
	const scenarioIds =
		options.scenarios ?? WEATHER_CALIBRATION_SCENARIOS.map((scenario) => scenario.id);
	return {
		version: 'weather-calibration-v11',
		seedPrefix: options.seedPrefix,
		strategyValidation: {
			mode: 'closed_loop',
			controllerVersion: 'weather-strategy-controller-v1',
			policy: options.strategyPolicy ?? DEFAULT_WEATHER_STRATEGY_POLICY
		},
		runsPerScenario: options.runCount,
		entriesPerRun: options.entryCount,
		lapsPerRun: options.lapCount,
		scenarios: Object.fromEntries(
			scenarioIds.map((scenarioId) => [scenarioId, analyzeWeatherScenario(options, scenarioId)])
		)
	};
}
