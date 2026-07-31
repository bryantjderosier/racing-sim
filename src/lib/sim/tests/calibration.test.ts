import { describe, expect, test } from 'vitest';
import { runCalibration } from '../calibration/report';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';

describe('calibration report v4', () => {
	test('creates unique performance and scrambled grids', () => {
		const performance = createAcademyRaceInput({
			seed: 'grid-scenarios',
			entryCount: 12,
			lapCount: 12,
			gridMode: 'performance'
		});
		const scrambled = createAcademyRaceInput({
			seed: 'grid-scenarios',
			entryCount: 12,
			lapCount: 12,
			gridMode: 'scrambled'
		});
		const performanceOrder = [...performance.entries]
			.sort((left, right) => left.gridPosition - right.gridPosition)
			.map((entry) => entry.sessionEntryId);
		const scrambledOrder = [...scrambled.entries]
			.sort((left, right) => left.gridPosition - right.gridPosition)
			.map((entry) => entry.sessionEntryId);
		expect(new Set(performance.entries.map((entry) => entry.gridPosition)).size).toBe(12);
		expect(new Set(scrambled.entries.map((entry) => entry.gridPosition)).size).toBe(12);
		expect(scrambledOrder).not.toEqual(performanceOrder);
	});

	test('assigns one two-stop entry per complete team without locking it to one seat', () => {
		const strategyAssignments = (seed: string) => {
			const input = createAcademyRaceInput({
				seed,
				entryCount: 30,
				lapCount: 50,
				gridMode: 'performance'
			});
			return input.entries
				.filter(
					(entry) =>
						input.commands.filter((command) => command.sessionEntryId === entry.sessionEntryId)
							.length === 2
				)
				.map((entry) => entry.sessionEntryId);
		};
		const first = strategyAssignments('strategy-rotation-a');
		const second = strategyAssignments('strategy-rotation-b');
		expect(first).toHaveLength(10);
		expect(second).toHaveLength(10);
		expect(second).not.toEqual(first);
	});

	test('separates scenario, clean-lap, stint, pass, and controlled metrics', () => {
		const report = runCalibration({
			runCount: 1,
			entryCount: 6,
			lapCount: 12,
			seedPrefix: 'calibration-v4-test',
			gridModes: ['performance', 'scrambled'],
			controlledRunCount: 1
		});
		expect(report.version).toBe('academy-calibration-v4');
		for (const scenarioName of ['performance', 'scrambled']) {
			const scenario = report.gridScenarios[scenarioName];
			expect(scenario.lapTime.all.mean).toBeGreaterThan(0);
			expect(scenario.lapTime.clean.mean).toBeGreaterThan(0);
			expect(scenario.variability.withinDriverStandardDeviationMs.mean).toBeGreaterThan(0);
			expect(scenario.degradationByCompound).toHaveProperty('medium');
			expect(scenario.pitStops.configuredLossMs).toBe(21_650);
			expect(scenario.overtaking.successes).toBeGreaterThanOrEqual(0);
			expect(scenario.overtaking.immediatePassBacksPerRace.mean).toBeGreaterThanOrEqual(0);
			expect(scenario.overtaking.laterRepassesPerRace.mean).toBeGreaterThanOrEqual(0);
			expect(scenario.gridToFinish.topTenRetentionRate).toBeGreaterThanOrEqual(0);
		}
		expect(report.controlledSensitivity.driverPace.gainMsPerLap.mean).toBeGreaterThan(0);
		expect(report.controlledSensitivity.carPerformance.gainMsPerLap.mean).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.driverTyreManagement.endWearReductionBp.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.driverTyreManagement.lateStintDegradationReductionMs.mean
		).toBeGreaterThan(0);
		expect(report.controlledSensitivity.driverTyreManagement.totalTimeGainMs.mean).toBeGreaterThan(
			0
		);
		expect(
			report.controlledSensitivity.driverTyreManagement.representativeOneStopRace
				.meanUsedTyreWearReductionBp.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.driverTyreManagement.representativeOneStopRace.totalTimeGainMs
				.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.preservingSetupEndWearReductionBp.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.preservingSetupLateStintDegradationReductionMs.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.peakPaceSetupTotalTimeGainMs.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.representativeOneStopRace
				.meanUsedTyreWearReductionBp.mean
		).toBeGreaterThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.representativeOneStopRace
				.preservingMinusPeakTotalTimeMs.mean
		).toBeGreaterThanOrEqual(0);
		expect(
			report.controlledSensitivity.setupTradeoff.representativeOneStopRace
				.preservingMinusPeakTotalTimeMs.mean
		).toBeLessThanOrEqual(3_000);
		expect(
			report.controlledSensitivity.setupTradeoff.preservingPaceSweep.candidates[0]
				.preservingMinusPeakTotalTimeMs.mean
		).toBeLessThan(0);
		expect(
			report.controlledSensitivity.setupTradeoff.preservingPaceSweep.candidates.at(-1)!
				.preservingMinusPeakTotalTimeMs.mean
		).toBeGreaterThan(0);
		expect(report.controlledSensitivity.strategy.bestTwoStopMinusBestOneStopMs.mean).not.toBe(0);
		expect(
			report.controlledSensitivity.strategy.matchedRaceComparison.twoStopMinusOneStopTotalTimeMs
				.mean
		).not.toBe(0);
	});
});
