import { describe, expect, test } from 'vitest';
import { RaceSimulation } from '../core/engine';
import { Xoshiro128ss } from '../core/rng';
import {
	applyRacingLineDrying,
	createInitialWeatherState,
	updateSegmentSurfaces
} from '../core/weather';
import { weatherRaceInput } from './helpers';

function controlledSurfaceState(initialWetnessBp: number) {
	const input = weatherRaceInput('surface-formulas', 12);
	if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
	input.weather.scenario.initialRacingLineWetnessBp = initialWetnessBp;
	input.weather.scenario.initialOffLineWetnessBp = initialWetnessBp;
	const state = createInitialWeatherState(
		input.weather.scenario,
		input.track,
		new Xoshiro128ss('surface-formulas:weather')
	);
	state.weatherClockMs = 60_000;
	state.lastUpdateMs = 0;
	return { input, state };
}

describe('weather surface evolution', () => {
	test('accumulates rain and clamps saturated surfaces', () => {
		const { input, state } = controlledSurfaceState(9_500);
		state.previousRainIntensityBp = 10_000;
		state.rainIntensityBp = 10_000;
		for (const segment of input.track.segments) {
			segment.drainagePpm = 0;
			segment.evaporationPpm = 0;
		}
		updateSegmentSurfaces(state, input.track);
		expect(state.segments[0]).toMatchObject({
			racingLineWetnessBp: 10_000,
			offLineWetnessBp: 10_000,
			previousRacingLineWetnessBp: 9_500
		});
	});

	test('applies drainage, temperature evaporation, and off-line retention', () => {
		const { input, state } = controlledSurfaceState(5_000);
		state.previousRainIntensityBp = 0;
		state.rainIntensityBp = 0;
		state.trackTempDeciC = 300;
		updateSegmentSurfaces(state, input.track);
		expect(state.segments[0].racingLineWetnessBp).toBe(4_475);
		expect(state.segments[0].offLineWetnessBp).toBe(4_522);
	});

	test('preserves segment drainage differences under shared rain', () => {
		const { input, state } = controlledSurfaceState(5_000);
		state.previousRainIntensityBp = 0;
		state.rainIntensityBp = 0;
		state.trackTempDeciC = 150;
		input.track.segments[0].drainagePpm = 1_000_000;
		input.track.segments[1].drainagePpm = 500_000;
		input.track.segments[0].offLineRetentionPpm = 1_000_000;
		input.track.segments[1].offLineRetentionPpm = 1_000_000;
		updateSegmentSurfaces(state, input.track);
		expect(state.segments[0].racingLineWetnessBp).toBe(4_700);
		expect(state.segments[1].racingLineWetnessBp).toBe(4_850);
	});

	test('dries only the racing line when cars traverse a segment', () => {
		const { input, state } = controlledSurfaceState(5_000);
		const segment = input.track.segments[0];
		applyRacingLineDrying(state, segment, 30);
		expect(state.segments[0].racingLineWetnessBp).toBe(4_850);
		expect(state.segments[0].offLineWetnessBp).toBe(5_000);
	});

	test('updates every surface before drying the current segment', () => {
		const input = weatherRaceInput('surface-integration', 12);
		if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
		input.weather.scenario.initialRacingLineWetnessBp = 5_000;
		input.weather.scenario.initialOffLineWetnessBp = 5_000;
		Object.assign(input.weather.scenario.envelope[0], {
			rainIntensityMinBp: 10_000,
			rainIntensityMaxBp: 10_000
		});
		const simulation = new RaceSimulation(input);
		simulation.step();
		simulation.step();
		const surfaces = simulation.snapshot().weatherState!.segments;
		const currentSegment = surfaces.find((surface) => surface.segmentId === 'seg-02')!;
		const otherSegment = surfaces.find((surface) => surface.segmentId === 'seg-03')!;
		expect(currentSegment.racingLineWetnessBp).toBeLessThan(currentSegment.offLineWetnessBp);
		expect(otherSegment.racingLineWetnessBp).toBeLessThanOrEqual(otherSegment.offLineWetnessBp);
		expect(otherSegment.racingLineWetnessBp).toBeGreaterThan(0);
	});
});
