import { FORMULA_CONFIG } from '../core/config';
import { runRace } from '../core/engine';
import { maximum, mean, minimum, variance } from '../core/math';
import type {
	CompoundName,
	LapTelemetry,
	RaceInput,
	RaceRunResult,
	SimulationEntry
} from '../core/types';
import { createAcademyRaceInput, type AcademyGridMode } from '../fixtures/academy-baseline';
import { FICTIONAL_TRACK } from '../fixtures/fictional-track';

export interface CalibrationOptions {
	runCount: number;
	entryCount: number;
	lapCount: number;
	seedPrefix: string;
	gridModes: AcademyGridMode[];
	controlledRunCount?: number;
}

interface Distribution {
	mean: number;
	standardDeviation: number;
	min: number;
	p05: number;
	p50: number;
	p95: number;
	max: number;
}

interface CompoundAccumulator {
	wearByStintLap: Map<number, number[]>;
	fuelCorrectedPaceByStintLap: Map<number, number[]>;
}

function percentile(values: number[], quantile: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	const position = (sorted.length - 1) * quantile;
	const lowerIndex = Math.floor(position);
	const upperIndex = Math.ceil(position);
	if (lowerIndex === upperIndex) return sorted[lowerIndex];
	const weight = position - lowerIndex;
	return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

function distribution(values: number[]): Distribution {
	if (values.length === 0) {
		return { mean: 0, standardDeviation: 0, min: 0, p05: 0, p50: 0, p95: 0, max: 0 };
	}
	return {
		mean: mean(values),
		standardDeviation: Math.sqrt(variance(values)),
		min: minimum(values),
		p05: percentile(values, 0.05),
		p50: percentile(values, 0.5),
		p95: percentile(values, 0.95),
		max: maximum(values)
	};
}

function roundedDistribution(values: number[]): Distribution {
	const raw = distribution(values);
	return Object.fromEntries(
		Object.entries(raw).map(([key, value]) => [key, Math.round(value)])
	) as unknown as Distribution;
}

function correlation(pairs: Array<[number, number]>): number {
	if (pairs.length < 2) return 0;
	const xs = pairs.map(([x]) => x);
	const ys = pairs.map(([, y]) => y);
	const meanX = mean(xs);
	const meanY = mean(ys);
	const numerator = pairs.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
	const denominator = Math.sqrt(
		pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0) *
			pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0)
	);
	return denominator === 0 ? 0 : numerator / denominator;
}

function entryCarScore(entry: SimulationEntry): number {
	return (
		(entry.car.topSpeed +
			entry.car.acceleration +
			entry.car.corneringHigh +
			entry.car.corneringLow +
			entry.car.brakingStability) /
		5
	);
}

function compoundForLap(entry: SimulationEntry, lap: LapTelemetry): CompoundName {
	return entry.tyreSets.find((tyreSet) => tyreSet.id === lap.tyreSetId)!.compound.name;
}

function getCompoundAccumulator(
	accumulators: Map<CompoundName, CompoundAccumulator>,
	compound: CompoundName
): CompoundAccumulator {
	const existing = accumulators.get(compound);
	if (existing) return existing;
	const created = {
		wearByStintLap: new Map<number, number[]>(),
		fuelCorrectedPaceByStintLap: new Map<number, number[]>()
	};
	accumulators.set(compound, created);
	return created;
}

function appendSample(samples: Map<number, number[]>, key: number, value: number): void {
	const values = samples.get(key) ?? [];
	values.push(value);
	samples.set(key, values);
}

function pitLapsByEntry(result: RaceRunResult): Map<string, Set<number>> {
	const pitLaps = new Map<string, Set<number>>();
	for (const event of result.events) {
		if (event.type !== 'pit_service') continue;
		const entryId = event.sessionEntryIds[0];
		const laps = pitLaps.get(entryId) ?? new Set<number>();
		laps.add(event.lap);
		pitLaps.set(entryId, laps);
	}
	return pitLaps;
}

function cleanLapsForEntry(laps: LapTelemetry[], pitLaps: Set<number>): LapTelemetry[] {
	const outLaps = new Set([...pitLaps].map((lap) => lap + 1));
	return laps.filter((lap) => lap.lap > 1 && !pitLaps.has(lap.lap) && !outLaps.has(lap.lap));
}

function collectStints(
	entry: SimulationEntry,
	laps: LapTelemetry[],
	pitLaps: Set<number>,
	compounds: Map<CompoundName, CompoundAccumulator>,
	withinStintDeviation: number[]
): void {
	let currentTyreSetId = '';
	let stintLap = 0;
	let currentStintTimes: number[] = [];
	const finishStint = () => {
		if (currentStintTimes.length >= 3) {
			withinStintDeviation.push(Math.sqrt(variance(currentStintTimes)));
		}
		currentStintTimes = [];
	};

	for (const lap of laps) {
		if (pitLaps.has(lap.lap)) {
			finishStint();
			currentTyreSetId = lap.tyreSetId;
			stintLap = 0;
			continue;
		}
		if (lap.tyreSetId !== currentTyreSetId) {
			finishStint();
			currentTyreSetId = lap.tyreSetId;
			stintLap = 1;
		} else {
			stintLap += 1;
		}
		const compound = compoundForLap(entry, lap);
		const accumulator = getCompoundAccumulator(compounds, compound);
		const fuelCorrectedLapMs =
			lap.lapTimeMs - (lap.fuelGrams / 1_000) * FORMULA_CONFIG.fuelPenaltyMsPerKgPerLap;
		appendSample(accumulator.wearByStintLap, stintLap, lap.tyreWearBp);
		appendSample(accumulator.fuelCorrectedPaceByStintLap, stintLap, fuelCorrectedLapMs);
		if (stintLap > 1) currentStintTimes.push(fuelCorrectedLapMs);
	}
	finishStint();
}

function effectivePitLosses(laps: LapTelemetry[], pitLaps: Set<number>): number[] {
	const losses: number[] = [];
	for (const pitLap of pitLaps) {
		const pitSample = laps.find((lap) => lap.lap === pitLap);
		if (!pitSample) continue;
		const reference = laps.filter(
			(lap) =>
				(lap.lap === pitLap - 2 ||
					lap.lap === pitLap - 1 ||
					lap.lap === pitLap + 2 ||
					lap.lap === pitLap + 3) &&
				!pitLaps.has(lap.lap)
		);
		if (reference.length >= 2) {
			losses.push(pitSample.lapTimeMs - mean(reference.map((lap) => lap.lapTimeMs)));
		}
	}
	return losses;
}

function compoundReport(accumulator: CompoundAccumulator) {
	const wear = Object.fromEntries(
		[...accumulator.wearByStintLap.entries()]
			.sort(([left], [right]) => left - right)
			.map(([lap, values]) => [lap, Math.round(mean(values))])
	);
	const pace = Object.fromEntries(
		[...accumulator.fuelCorrectedPaceByStintLap.entries()]
			.sort(([left], [right]) => left - right)
			.map(([lap, values]) => [lap, Math.round(mean(values))])
	);
	const early = accumulator.fuelCorrectedPaceByStintLap.get(3) ?? [];
	const late = accumulator.fuelCorrectedPaceByStintLap.get(12) ?? [];
	return {
		meanWearBpByStintLap: wear,
		meanFuelCorrectedLapMsByStintLap: pace,
		lap12VsLap3DeltaMs:
			early.length > 0 && late.length > 0 ? Math.round(mean(late) - mean(early)) : null
	};
}

function strategyReport(
	groups: Map<number, { totalTimes: number[]; positions: number[]; wins: number }>
) {
	return Object.fromEntries(
		[...groups.entries()]
			.sort(([left], [right]) => left - right)
			.map(([stops, values]) => [
				`${stops}-stop`,
				{
					entries: values.totalTimes.length,
					meanTotalTimeMs: Math.round(mean(values.totalTimes)),
					meanFinishPosition: mean(values.positions),
					wins: values.wins
				}
			])
	);
}

function analyzeScenario(options: CalibrationOptions, gridMode: AcademyGridMode) {
	const allLapTimes: number[] = [];
	const cleanLapTimes: number[] = [];
	const fieldSpreads: number[] = [];
	const withinDriverDeviation: number[] = [];
	const withinStintDeviation: number[] = [];
	const effectivePitLoss: number[] = [];
	const gridMovement: number[] = [];
	const gridFinishPairs: Array<[number, number]> = [];
	const pacePairs: Array<[number, number]> = [];
	const carPairs: Array<[number, number]> = [];
	const attemptsPerRace: number[] = [];
	const successesPerRace: number[] = [];
	const uniquePairsPerRace: number[] = [];
	const repeatPassesPerRace: number[] = [];
	const immediatePassBacksPerRace: number[] = [];
	const laterRepassesPerRace: number[] = [];
	const netPassesPerRace: number[] = [];
	const compounds = new Map<CompoundName, CompoundAccumulator>();
	const passesBySegment = new Map<string, number>();
	const strategyGroups = new Map<
		number,
		{ totalTimes: number[]; positions: number[]; wins: number }
	>();
	let attempts = 0;
	let successes = 0;
	let drsPasses = 0;

	for (let run = 0; run < options.runCount; run += 1) {
		const input = createAcademyRaceInput({
			entryCount: options.entryCount,
			lapCount: options.lapCount,
			gridMode,
			seed: `${options.seedPrefix}:${gridMode}:${String(run + 1).padStart(4, '0')}`
		});
		const result = runRace(input);
		const pitLaps = pitLapsByEntry(result);
		const raceAttempts = result.events.filter((event) => event.type === 'overtake_attempted');
		const racePasses = result.events.filter((event) => event.type === 'overtake_succeeded');
		attempts += raceAttempts.length;
		successes += racePasses.length;
		attemptsPerRace.push(raceAttempts.length);
		successesPerRace.push(racePasses.length);
		const passCountsByPair = new Map<string, number>();
		const signedPassesByPair = new Map<string, number>();
		const lastPassByPair = new Map<string, { attackerId: string; lap: number }>();
		let immediatePassBacks = 0;
		let laterRepasses = 0;
		for (const event of racePasses) {
			const attackerId = String(event.payload.attackerId);
			const defenderId = String(event.payload.defenderId);
			const [first, second] = [attackerId, defenderId].sort();
			const pair = `${first}|${second}`;
			const previousPass = lastPassByPair.get(pair);
			if (previousPass) {
				if (previousPass.attackerId === defenderId && event.lap - previousPass.lap <= 2) {
					immediatePassBacks += 1;
				} else {
					laterRepasses += 1;
				}
			}
			lastPassByPair.set(pair, { attackerId, lap: event.lap });
			passCountsByPair.set(pair, (passCountsByPair.get(pair) ?? 0) + 1);
			const direction = attackerId === first ? 1 : -1;
			signedPassesByPair.set(pair, (signedPassesByPair.get(pair) ?? 0) + direction);
			if (event.payload.drsUsed === true) drsPasses += 1;
			passesBySegment.set(event.segmentId, (passesBySegment.get(event.segmentId) ?? 0) + 1);
		}
		uniquePairsPerRace.push(passCountsByPair.size);
		repeatPassesPerRace.push(
			[...passCountsByPair.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0)
		);
		immediatePassBacksPerRace.push(immediatePassBacks);
		laterRepassesPerRace.push(laterRepasses);
		netPassesPerRace.push(
			[...signedPassesByPair.values()].reduce((sum, count) => sum + Math.abs(count), 0)
		);
		fieldSpreads.push(
			result.sessionResults[result.sessionResults.length - 1].totalTimeMs -
				result.sessionResults[0].totalTimeMs
		);
		allLapTimes.push(...result.lapTelemetry.map((lap) => lap.lapTimeMs));

		for (const entry of input.entries) {
			const laps = result.lapTelemetry.filter((lap) => lap.sessionEntryId === entry.sessionEntryId);
			const entryPitLaps = pitLaps.get(entry.sessionEntryId) ?? new Set<number>();
			const cleanLaps = cleanLapsForEntry(laps, entryPitLaps);
			const cleanTimes = cleanLaps.map((lap) => lap.lapTimeMs);
			cleanLapTimes.push(...cleanTimes);
			if (cleanTimes.length >= 3) {
				withinDriverDeviation.push(Math.sqrt(variance(cleanTimes)));
			}
			collectStints(entry, laps, entryPitLaps, compounds, withinStintDeviation);
			effectivePitLoss.push(...effectivePitLosses(laps, entryPitLaps));
			const output = result.sessionResults.find(
				(candidate) => candidate.sessionEntryId === entry.sessionEntryId
			)!;
			const detail = result.raceDetails.find(
				(candidate) => candidate.sessionEntryId === entry.sessionEntryId
			)!;
			gridMovement.push(detail.positionsGained);
			gridFinishPairs.push([entry.gridPosition, output.position]);
			if (cleanTimes.length > 0) {
				pacePairs.push([entry.driver.pace, mean(cleanTimes)]);
				carPairs.push([entryCarScore(entry), mean(cleanTimes)]);
			}
			const strategy = strategyGroups.get(detail.pitStops) ?? {
				totalTimes: [],
				positions: [],
				wins: 0
			};
			strategy.totalTimes.push(output.totalTimeMs);
			strategy.positions.push(output.position);
			if (output.position === 1) strategy.wins += 1;
			strategyGroups.set(detail.pitStops, strategy);
		}
	}

	const topTenRetained = gridFinishPairs.filter(
		([gridPosition, finishPosition]) => gridPosition <= 10 && finishPosition <= 10
	).length;
	const topTenStarts = gridFinishPairs.filter(([gridPosition]) => gridPosition <= 10).length;

	return {
		gridMode,
		lapTime: {
			all: roundedDistribution(allLapTimes),
			clean: roundedDistribution(cleanLapTimes)
		},
		variability: {
			withinDriverStandardDeviationMs: roundedDistribution(withinDriverDeviation),
			withinStintFuelCorrectedStandardDeviationMs: roundedDistribution(withinStintDeviation)
		},
		fieldSpreadMs: roundedDistribution(fieldSpreads),
		degradationByCompound: Object.fromEntries(
			[...compounds.entries()]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([compound, accumulator]) => [compound, compoundReport(accumulator)])
		),
		pitStops: {
			configuredLossMs: FORMULA_CONFIG.pitServiceMs + FICTIONAL_TRACK.pitLaneLossMs,
			effectiveLossMs: roundedDistribution(effectivePitLoss),
			observedStrategyGroups: strategyReport(strategyGroups)
		},
		overtaking: {
			attempts,
			successes,
			successRate: attempts === 0 ? 0 : successes / attempts,
			attemptsPerRace: roundedDistribution(attemptsPerRace),
			successesPerRace: roundedDistribution(successesPerRace),
			uniquePassingPairsPerRace: roundedDistribution(uniquePairsPerRace),
			repeatPassesPerRace: roundedDistribution(repeatPassesPerRace),
			immediatePassBacksPerRace: roundedDistribution(immediatePassBacksPerRace),
			laterRepassesPerRace: roundedDistribution(laterRepassesPerRace),
			netPassesPerRace: roundedDistribution(netPassesPerRace),
			drsPasses,
			nonDrsPasses: successes - drsPasses,
			passesBySegment: Object.fromEntries(
				[...passesBySegment.entries()].sort(([left], [right]) => left.localeCompare(right))
			)
		},
		gridToFinish: {
			meanAbsoluteMovement: mean(gridMovement.map(Math.abs)),
			maxGain: maximum(gridMovement),
			maxLoss: minimum(gridMovement),
			gridFinishRankCorrelation: correlation(gridFinishPairs),
			topTenRetentionRate: topTenStarts === 0 ? 0 : topTenRetained / topTenStarts
		},
		correlations: {
			driverPaceVsCleanLap: correlation(pacePairs),
			carPerformanceVsCleanLap: correlation(carPairs)
		}
	};
}

function controlledBase(seed: string, lapCount: number): RaceInput {
	const input = createAcademyRaceInput({
		seed,
		entryCount: 1,
		lapCount,
		gridMode: 'performance'
	});
	input.rules.mandatoryPitStops = 0;
	input.commands = [];
	input.entries[0].gridPosition = 1;
	input.entries[0].startingTyreSetId = `${input.entries[0].sessionEntryId}-hard`;
	return input;
}

function controlledOneStopBase(seed: string, lapCount: number): RaceInput {
	const input = controlledBase(seed, lapCount);
	const entryId = input.entries[0].sessionEntryId;
	input.entries[0].startingTyreSetId = `${entryId}-medium`;
	input.commands = [
		{
			sequence: 1,
			sessionEntryId: entryId,
			triggerLap: Math.round(lapCount * 0.42),
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: `${entryId}-hard` }
		}
	];
	return input;
}

function setMatchedStrategy(
	input: RaceInput,
	entryId: string,
	strategy: 'one-stop' | 'two-stop'
): void {
	const lapCount = input.rules.lapCount;
	input.commands = input.commands.filter((command) => command.sessionEntryId !== entryId);
	if (strategy === 'one-stop') {
		input.entries.find((entry) => entry.sessionEntryId === entryId)!.startingTyreSetId =
			`${entryId}-medium`;
		input.commands.push({
			sequence: 90_001,
			sessionEntryId: entryId,
			triggerLap: Math.round(lapCount * 0.42),
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: `${entryId}-hard` }
		});
		return;
	}
	input.entries.find((entry) => entry.sessionEntryId === entryId)!.startingTyreSetId =
		`${entryId}-soft`;
	input.commands.push(
		{
			sequence: 90_001,
			sessionEntryId: entryId,
			triggerLap: Math.round(lapCount * 0.3),
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: `${entryId}-medium` }
		},
		{
			sequence: 90_002,
			sessionEntryId: entryId,
			triggerLap: Math.round(lapCount * 0.64),
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: `${entryId}-hard` }
		}
	);
}

function controlledStintDegradationMs(result: RaceRunResult): number {
	const fuelCorrectedLapTimes = result.lapTelemetry.map(
		(lap) => lap.lapTimeMs - (lap.fuelGrams / 1_000) * FORMULA_CONFIG.fuelPenaltyMsPerKgPerLap
	);
	return mean(fuelCorrectedLapTimes.slice(-3)) - mean(fuelCorrectedLapTimes.slice(2, 5));
}

function controlledEndWearBp(input: RaceInput, result: RaceRunResult): number {
	const entry = input.entries[0];
	return result.finalTyreWear[entry.sessionEntryId][entry.startingTyreSetId];
}

function controlledMeanUsedTyreWearBp(result: RaceRunResult): number {
	const entryId = result.sessionResults[0].sessionEntryId;
	const usedTyreSetIds = new Set(
		result.lapTelemetry.filter((lap) => lap.sessionEntryId === entryId).map((lap) => lap.tyreSetId)
	);
	return mean([...usedTyreSetIds].map((tyreSetId) => result.finalTyreWear[entryId][tyreSetId]));
}

function controlledSensitivity(options: CalibrationOptions) {
	const runCount = options.controlledRunCount ?? Math.min(options.runCount, 20);
	const preservingSetupSweepFactorsPpm = [
		997_000, 997_250, 997_500, 997_750, 998_000, 998_500, 999_000
	];
	const driverGainMsPerLap: number[] = [];
	const carGainMsPerLap: number[] = [];
	const tyreManagementWearReductionBp: number[] = [];
	const tyreManagementDegradationReductionMs: number[] = [];
	const tyreManagementTotalTimeGainMs: number[] = [];
	const tyreManagementOneStopWearReductionBp: number[] = [];
	const tyreManagementOneStopTotalTimeGainMs: number[] = [];
	const preservingSetupWearReductionBp: number[] = [];
	const preservingSetupDegradationReductionMs: number[] = [];
	const peakPaceSetupTotalTimeGainMs: number[] = [];
	const preservingSetupOneStopWearReductionBp: number[] = [];
	const preservingSetupOneStopTotalTimeDeltaMs: number[] = [];
	const preservingSetupSweep = new Map(
		preservingSetupSweepFactorsPpm.map((factor) => [factor, [] as number[]])
	);
	const bestTwoStopVsBestOneStopMs: number[] = [];
	const bestOneStopWindows = new Map<string, number>();
	const bestTwoStopWindows = new Map<string, number>();
	const matchedTwoStopVsOneStopMs: number[] = [];
	const matchedTwoStopVsOneStopPositions: number[] = [];
	let matchedTwoStopFasterRuns = 0;
	let matchedTwoStopBetterFinishRuns = 0;
	const lapCount = Math.max(20, options.lapCount);

	for (let run = 0; run < runCount; run += 1) {
		const seed = `${options.seedPrefix}:controlled:${String(run + 1).padStart(4, '0')}`;
		const slowDriver = controlledBase(seed, lapCount);
		const fastDriver = structuredClone(slowDriver);
		slowDriver.entries[0].driver.pace = 8;
		fastDriver.entries[0].driver.pace = 19;
		driverGainMsPerLap.push(
			(runRace(slowDriver).sessionResults[0].totalTimeMs -
				runRace(fastDriver).sessionResults[0].totalTimeMs) /
				lapCount
		);

		const slowCar = controlledBase(seed, lapCount);
		const fastCar = structuredClone(slowCar);
		for (const factor of [
			'topSpeed',
			'acceleration',
			'corneringHigh',
			'corneringLow',
			'brakingStability'
		] as const) {
			slowCar.entries[0].car[factor] = 0.97;
			fastCar.entries[0].car[factor] = 1.03;
		}
		carGainMsPerLap.push(
			(runRace(slowCar).sessionResults[0].totalTimeMs -
				runRace(fastCar).sessionResults[0].totalTimeMs) /
				lapCount
		);

		const poorTyreManager = controlledBase(seed, lapCount);
		const strongTyreManager = structuredClone(poorTyreManager);
		poorTyreManager.entries[0].driver.tyreManagement = 8;
		strongTyreManager.entries[0].driver.tyreManagement = 19;
		const poorTyreManagerResult = runRace(poorTyreManager);
		const strongTyreManagerResult = runRace(strongTyreManager);
		tyreManagementWearReductionBp.push(
			controlledEndWearBp(poorTyreManager, poorTyreManagerResult) -
				controlledEndWearBp(strongTyreManager, strongTyreManagerResult)
		);
		tyreManagementDegradationReductionMs.push(
			controlledStintDegradationMs(poorTyreManagerResult) -
				controlledStintDegradationMs(strongTyreManagerResult)
		);
		tyreManagementTotalTimeGainMs.push(
			poorTyreManagerResult.sessionResults[0].totalTimeMs -
				strongTyreManagerResult.sessionResults[0].totalTimeMs
		);

		const poorTyreManagerOneStop = controlledOneStopBase(seed, lapCount);
		const strongTyreManagerOneStop = structuredClone(poorTyreManagerOneStop);
		poorTyreManagerOneStop.entries[0].driver.tyreManagement = 8;
		strongTyreManagerOneStop.entries[0].driver.tyreManagement = 19;
		const poorTyreManagerOneStopResult = runRace(poorTyreManagerOneStop);
		const strongTyreManagerOneStopResult = runRace(strongTyreManagerOneStop);
		tyreManagementOneStopWearReductionBp.push(
			controlledMeanUsedTyreWearBp(poorTyreManagerOneStopResult) -
				controlledMeanUsedTyreWearBp(strongTyreManagerOneStopResult)
		);
		tyreManagementOneStopTotalTimeGainMs.push(
			poorTyreManagerOneStopResult.sessionResults[0].totalTimeMs -
				strongTyreManagerOneStopResult.sessionResults[0].totalTimeMs
		);

		const peakPaceSetup = controlledBase(seed, lapCount);
		const preservingSetup = structuredClone(peakPaceSetup);
		peakPaceSetup.entries[0].setupFactorPpm = 997_000;
		peakPaceSetup.entries[0].tyreWearSetupPpm = 1_040_000;
		preservingSetup.entries[0].setupFactorPpm = 1_003_000;
		preservingSetup.entries[0].tyreWearSetupPpm = 960_000;
		const peakPaceSetupResult = runRace(peakPaceSetup);
		const preservingSetupResult = runRace(preservingSetup);
		preservingSetupWearReductionBp.push(
			controlledEndWearBp(peakPaceSetup, peakPaceSetupResult) -
				controlledEndWearBp(preservingSetup, preservingSetupResult)
		);
		preservingSetupDegradationReductionMs.push(
			controlledStintDegradationMs(peakPaceSetupResult) -
				controlledStintDegradationMs(preservingSetupResult)
		);
		peakPaceSetupTotalTimeGainMs.push(
			preservingSetupResult.sessionResults[0].totalTimeMs -
				peakPaceSetupResult.sessionResults[0].totalTimeMs
		);

		const peakPaceSetupOneStop = controlledOneStopBase(seed, lapCount);
		peakPaceSetupOneStop.entries[0].setupFactorPpm = 997_000;
		peakPaceSetupOneStop.entries[0].tyreWearSetupPpm = 1_040_000;
		const peakPaceSetupOneStopResult = runRace(peakPaceSetupOneStop);
		const preservingSetupOneStop = structuredClone(peakPaceSetupOneStop);
		preservingSetupOneStop.entries[0].setupFactorPpm = 998_000;
		preservingSetupOneStop.entries[0].tyreWearSetupPpm = 960_000;
		const preservingSetupOneStopResult = runRace(preservingSetupOneStop);
		preservingSetupOneStopWearReductionBp.push(
			controlledMeanUsedTyreWearBp(peakPaceSetupOneStopResult) -
				controlledMeanUsedTyreWearBp(preservingSetupOneStopResult)
		);
		preservingSetupOneStopTotalTimeDeltaMs.push(
			preservingSetupOneStopResult.sessionResults[0].totalTimeMs -
				peakPaceSetupOneStopResult.sessionResults[0].totalTimeMs
		);
		for (const factor of preservingSetupSweepFactorsPpm) {
			const candidate = structuredClone(peakPaceSetupOneStop);
			candidate.entries[0].setupFactorPpm = factor;
			candidate.entries[0].tyreWearSetupPpm = 960_000;
			const candidateResult = runRace(candidate);
			preservingSetupSweep
				.get(factor)!
				.push(
					candidateResult.sessionResults[0].totalTimeMs -
						peakPaceSetupOneStopResult.sessionResults[0].totalTimeMs
				);
		}

		const strategyBase = controlledBase(seed, lapCount);
		const entryId = strategyBase.entries[0].sessionEntryId;
		const oneStopCandidates = [0.42, 0.46, 0.5, 0.54, 0.58].map((fraction) => {
			const pitLap = Math.round(lapCount * fraction);
			const input = structuredClone(strategyBase);
			input.entries[0].startingTyreSetId = `${entryId}-medium`;
			input.commands = [
				{
					sequence: 1,
					sessionEntryId: entryId,
					triggerLap: pitLap,
					triggerSegmentId: 'seg-14',
					action: { type: 'pit' as const, tyreSetId: `${entryId}-hard` }
				}
			];
			return { label: String(pitLap), timeMs: runRace(input).sessionResults[0].totalTimeMs };
		});
		const twoStopCandidates = [
			[0.26, 0.58],
			[0.3, 0.64],
			[0.32, 0.68],
			[0.36, 0.72]
		].map(([firstFraction, secondFraction]) => {
			const firstLap = Math.round(lapCount * firstFraction);
			const secondLap = Math.round(lapCount * secondFraction);
			const input = structuredClone(strategyBase);
			input.entries[0].startingTyreSetId = `${entryId}-soft`;
			input.commands = [
				{
					sequence: 1,
					sessionEntryId: entryId,
					triggerLap: firstLap,
					triggerSegmentId: 'seg-14',
					action: { type: 'pit' as const, tyreSetId: `${entryId}-medium` }
				},
				{
					sequence: 2,
					sessionEntryId: entryId,
					triggerLap: secondLap,
					triggerSegmentId: 'seg-14',
					action: { type: 'pit' as const, tyreSetId: `${entryId}-hard` }
				}
			];
			return {
				label: `${firstLap}/${secondLap}`,
				timeMs: runRace(input).sessionResults[0].totalTimeMs
			};
		});
		const bestOneStop = oneStopCandidates.reduce((best, candidate) =>
			candidate.timeMs < best.timeMs ? candidate : best
		);
		const bestTwoStop = twoStopCandidates.reduce((best, candidate) =>
			candidate.timeMs < best.timeMs ? candidate : best
		);
		bestOneStopWindows.set(bestOneStop.label, (bestOneStopWindows.get(bestOneStop.label) ?? 0) + 1);
		bestTwoStopWindows.set(bestTwoStop.label, (bestTwoStopWindows.get(bestTwoStop.label) ?? 0) + 1);
		bestTwoStopVsBestOneStopMs.push(bestTwoStop.timeMs - bestOneStop.timeMs);

		const matchedBase = createAcademyRaceInput({
			seed: `${seed}:matched`,
			entryCount: options.entryCount,
			lapCount,
			gridMode: run % 2 === 0 ? 'performance' : 'scrambled'
		});
		const matchedEntryId = matchedBase.entries[run % matchedBase.entries.length].sessionEntryId;
		const matchedOneStop = structuredClone(matchedBase);
		const matchedTwoStop = structuredClone(matchedBase);
		setMatchedStrategy(matchedOneStop, matchedEntryId, 'one-stop');
		setMatchedStrategy(matchedTwoStop, matchedEntryId, 'two-stop');
		const oneStopResult = runRace(matchedOneStop).sessionResults.find(
			(result) => result.sessionEntryId === matchedEntryId
		)!;
		const twoStopResult = runRace(matchedTwoStop).sessionResults.find(
			(result) => result.sessionEntryId === matchedEntryId
		)!;
		const timeDelta = twoStopResult.totalTimeMs - oneStopResult.totalTimeMs;
		const positionDelta = twoStopResult.position - oneStopResult.position;
		matchedTwoStopVsOneStopMs.push(timeDelta);
		matchedTwoStopVsOneStopPositions.push(positionDelta);
		if (timeDelta < 0) matchedTwoStopFasterRuns += 1;
		if (positionDelta < 0) matchedTwoStopBetterFinishRuns += 1;
	}

	return {
		runs: runCount,
		driverPace: {
			comparison: 'pace 19 versus pace 8; positive is faster',
			gainMsPerLap: roundedDistribution(driverGainMsPerLap)
		},
		carPerformance: {
			comparison: 'five relevant factors at 1.03 versus 0.97; positive is faster',
			gainMsPerLap: roundedDistribution(carGainMsPerLap)
		},
		driverTyreManagement: {
			comparison: 'tyre management 19 versus 8; positive values favor stronger management',
			stressTestContext: 'uninterrupted 50-lap hard stint',
			endWearReductionBp: roundedDistribution(tyreManagementWearReductionBp),
			lateStintDegradationReductionMs: roundedDistribution(tyreManagementDegradationReductionMs),
			totalTimeGainMs: roundedDistribution(tyreManagementTotalTimeGainMs),
			representativeOneStopRace: {
				comparison: 'medium-to-hard one-stop; positive values favor stronger management',
				meanUsedTyreWearReductionBp: roundedDistribution(tyreManagementOneStopWearReductionBp),
				totalTimeGainMs: roundedDistribution(tyreManagementOneStopTotalTimeGainMs)
			}
		},
		setupTradeoff: {
			comparison:
				'preserving setup 1.003 pace/0.960 wear versus peak-pace setup 0.997 pace/1.040 wear',
			stressTestContext: 'uninterrupted 50-lap hard stint',
			preservingSetupEndWearReductionBp: roundedDistribution(preservingSetupWearReductionBp),
			preservingSetupLateStintDegradationReductionMs: roundedDistribution(
				preservingSetupDegradationReductionMs
			),
			peakPaceSetupTotalTimeGainMs: roundedDistribution(peakPaceSetupTotalTimeGainMs),
			representativeOneStopRace: {
				comparison:
					'preserving setup 0.998 pace/0.960 wear minus peak-pace setup 0.997 pace/1.040 wear; positive time means preserving is slower',
				meanUsedTyreWearReductionBp: roundedDistribution(preservingSetupOneStopWearReductionBp),
				preservingMinusPeakTotalTimeMs: roundedDistribution(preservingSetupOneStopTotalTimeDeltaMs),
				targetPreservingDisadvantageMs: { minimum: 0, maximum: 3_000 }
			},
			preservingPaceSweep: {
				comparison:
					'preserving setup at 0.960 wear minus peak-pace setup 0.997 pace/1.040 wear in a medium-to-hard one-stop race',
				candidates: [...preservingSetupSweep.entries()].map(([setupFactorPpm, values]) => ({
					setupFactorPpm,
					preservingMinusPeakTotalTimeMs: roundedDistribution(values),
					runsWithinTarget: values.filter((value) => value >= 0 && value <= 3_000).length
				}))
			}
		},
		strategy: {
			comparison: 'best two-stop minus best one-stop total time; positive favors one-stop',
			bestTwoStopMinusBestOneStopMs: roundedDistribution(bestTwoStopVsBestOneStopMs),
			bestOneStopPitLapFrequency: Object.fromEntries(
				[...bestOneStopWindows.entries()].sort(([left], [right]) =>
					left.localeCompare(right, undefined, { numeric: true })
				)
			),
			bestTwoStopPitWindowFrequency: Object.fromEntries(
				[...bestTwoStopWindows.entries()].sort(([left], [right]) =>
					left.localeCompare(right, undefined, { numeric: true })
				)
			),
			matchedRaceComparison: {
				comparison:
					'two-stop minus one-stop for the same driver, car, grid, rivals, and seed; positive favors one-stop',
				twoStopMinusOneStopTotalTimeMs: roundedDistribution(matchedTwoStopVsOneStopMs),
				twoStopMinusOneStopFinishPositions: roundedDistribution(matchedTwoStopVsOneStopPositions),
				twoStopFasterRuns: matchedTwoStopFasterRuns,
				twoStopBetterFinishRuns: matchedTwoStopBetterFinishRuns
			}
		}
	};
}

export function runCalibration(options: CalibrationOptions) {
	return {
		version: 'academy-calibration-v4',
		runsPerGridScenario: options.runCount,
		entriesPerRun: options.entryCount,
		lapsPerRun: options.lapCount,
		gridScenarios: Object.fromEntries(
			options.gridModes.map((gridMode) => [gridMode, analyzeScenario(options, gridMode)])
		),
		controlledSensitivity: controlledSensitivity(options)
	};
}
