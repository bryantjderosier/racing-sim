import { describe, expect, test } from 'vitest';
import { runWeatherCalibration } from '../calibration/weather-report';
import {
	createWeatherCalibrationInput,
	type WeatherCalibrationScenarioId
} from '../fixtures/weather-calibration';
import { validateRaceInput } from '../core/validate';

describe('weather calibration fixtures and reports', () => {
	test('validates each W0–W11 fixture', () => {
		for (let index = 0; index <= 11; index += 1) {
			const scenarioId = `W${index}` as WeatherCalibrationScenarioId;
			expect(() =>
				validateRaceInput(createWeatherCalibrationInput(scenarioId, `fixture-${scenarioId}`, 2, 8))
			).not.toThrow();
		}
	});

	test('reports weather truth, crossover bands, controls, and checkpoint parity', () => {
		const report = runWeatherCalibration({
			runCount: 2,
			entryCount: 2,
			lapCount: 8,
			seedPrefix: 'weather-report-test',
			scenarios: ['W0', 'W2', 'W6', 'W8', 'W11'],
			checkpointStep: 5
		});
		expect(report.version).toBe('weather-calibration-v9');
		expect(report.scenarios.W0.checkpointMatches).toBe(true);
		expect(report.scenarios.W2.truthTimeline.length).toBeGreaterThan(1);
		expect(report.scenarios.W2.compoundRankingByWetnessBand).toBeDefined();
		expect(report.scenarios.W2.forecast?.scores.low).toBeDefined();
		expect(report.scenarios.W2.forecast?.scores.low.meanIntensityIntervalWidthBp).toBeDefined();
		expect(report.scenarios.W2.forecast?.snapshots.high).toBeDefined();
		expect(report.scenarios.W2.forecast?.scores.low.windowCount).toBe(
			(report.scenarios.W2.forecast?.snapshots.low.windows.length ?? 0) * 2
		);
		expect(report.scenarios.W2.controlledCompoundSweep).toBeDefined();
		expect(
			report.scenarios.W2.controlledCompoundSweep['slick-edge'].compounds.soft.meanFreshLapTimeMs
		).toBeDefined();
		expect(
			report.scenarios.W2.controlledCompoundSweep.dry.compounds.soft.degradationDeltaMs
		).toBeDefined();
		expect(
			report.scenarios.W2.controlledCompoundSweep.dry.compounds.hard.meanPostWarmupLapTimeMs
		).toBeDefined();
		expect(report.scenarios.W2.strategyComparison?.timeDeltaVsConfiguredMs).toBeDefined();
		expect(report.scenarios.W2.strategyTimingSweep?.samples.length).toBe(7);
		expect(report.scenarios.W2.strategyTimingSweep?.samples[0].triggerLaps).toEqual([5]);
		expect(report.scenarios.W2.strategyTimingSweep?.samples[0].triggerLap).toBe(5);
		expect(report.scenarios.W2.weatherStrategyDecision?.low).toBeDefined();
		expect(report.scenarios.W2.weatherStrategyRefreshes?.low.length).toBeGreaterThan(1);
		expect(report.scenarios.W2.weatherStrategyRefreshes?.high.length).toBeGreaterThan(
			report.scenarios.W2.weatherStrategyRefreshes?.low.length ?? 0
		);
		expect(report.scenarios.W2.strategyCommandValidation?.low.raw).toBeDefined();
		expect(report.scenarios.W2.strategyCommandValidation?.low.hysteresis).toBeDefined();
		expect(report.scenarios.W6.weatherStrategyDecision?.low).toMatchObject({
			action: 'stay_out',
			target: 'wet'
		});
		expect(report.scenarios.W11.weatherStrategyRefreshes?.high.length).toBeGreaterThan(1);
		expect(report.scenarios.W11.weatherStrategyRefreshes?.high[0].candidateDecision).toBeDefined();
		expect(report.scenarios.W11.weatherStrategyRefreshes?.high[0].persistence).toBeDefined();
		expect(report.scenarios.W8.controls.unsafeDetectedEvents).toBeGreaterThan(0);
	});
});
