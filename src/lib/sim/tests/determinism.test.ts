import { describe, expect, test } from 'vitest';
import { canonicalStringify } from '../core/canonicalize';
import { RaceSimulation, runRace, runRaceFromCheckpoint } from '../core/engine';
import { maximum, minimum, roundHalfEven } from '../core/math';
import { Xoshiro128ss } from '../core/rng';
import {
	advanceWeatherState,
	interpolateWeatherTruth,
	resolveWeatherTimeline
} from '../core/weather';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';
import { singleCarInput, weatherRaceInput } from './helpers';

describe('deterministic foundation', () => {
	test('uses stable canonical JSON and round-half-even', () => {
		expect(canonicalStringify({ z: 1, a: { d: 2, b: 3 } })).toBe('{"a":{"b":3,"d":2},"z":1}');
		expect(roundHalfEven(2.5)).toBe(2);
		expect(roundHalfEven(3.5)).toBe(4);
		expect(roundHalfEven(2.51)).toBe(3);
	});

	test('finds extrema in batch-sized arrays without argument spreading', () => {
		const values = Array.from({ length: 150_000 }, (_, index) => index - 75_000);
		expect(minimum(values)).toBe(-75_000);
		expect(maximum(values)).toBe(74_999);
	});

	test('has a golden RNG sequence and restores state', () => {
		const rng = new Xoshiro128ss('golden-seed');
		const sequence = Array.from({ length: 5 }, () => rng.nextUint32());
		expect(sequence).toEqual([1577623892, 1571230427, 1039460374, 1400319213, 1495230391]);
		const restored = new Xoshiro128ss(rng.serialize());
		expect(restored.nextUint32()).toBe(rng.nextUint32());
	});

	test('produces identical results for identical and reordered inputs', () => {
		const input = createAcademyRaceInput({ seed: 'determinism', entryCount: 6, lapCount: 12 });
		const first = runRace(input);
		const second = runRace(structuredClone(input));
		const reordered = structuredClone(input);
		reordered.entries.reverse();
		reordered.commands.reverse();
		expect(canonicalStringify(second)).toBe(canonicalStringify(first));
		expect(canonicalStringify(runRace(reordered))).toBe(canonicalStringify(first));
	});

	test('checkpoint and resume matches uninterrupted execution', () => {
		const input = createAcademyRaceInput({ seed: 'checkpoint', entryCount: 8, lapCount: 16 });
		const uninterrupted = runRace(input);
		const resumed = runRaceFromCheckpoint(input, 117);
		expect(canonicalStringify(resumed)).toBe(canonicalStringify(uninterrupted));
		expect(resumed.finalStateHash).toBe(uninterrupted.finalStateHash);
	});

	test('disabled weather is byte-identical to omitted weather', () => {
		const omitted = singleCarInput('disabled-weather-regression', 12);
		const disabled = structuredClone(omitted);
		disabled.weather = { enabled: false };
		expect(canonicalStringify(runRace(disabled))).toBe(canonicalStringify(runRace(omitted)));
	});

	test('checkpoints initial weather state without changing it', () => {
		const input = weatherRaceInput('weather-checkpoint', 12);
		const simulation = new RaceSimulation(input);
		simulation.step();
		const snapshot = simulation.snapshot();
		expect(snapshot.weatherState).toMatchObject({
			weatherClockMs: 0,
			rainIntensityBp: 0,
			airTempDeciC: 220,
			trackTempDeciC: 310
		});
		expect(snapshot.weatherState?.segments).toHaveLength(input.track.segments.length);
		expect(snapshot.weatherState?.resolvedTimeline).toHaveLength(2);
		const uninterrupted = runRace(input);
		const resumed = runRaceFromCheckpoint(input, 117);
		expect(canonicalStringify(resumed)).toBe(canonicalStringify(uninterrupted));
	});

	test('resolves hidden weather truth deterministically with fixed RNG advancement', () => {
		const input = weatherRaceInput('weather-truth', 12);
		if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
		const scenario = structuredClone(input.weather.scenario);
		scenario.envelope.push({
			atMs: 120_000,
			rainIntensityMinBp: 1_500,
			rainIntensityMaxBp: 1_500,
			airTempMinDeciC: 205,
			airTempMaxDeciC: 205,
			trackTempMinDeciC: 280,
			trackTempMaxDeciC: 280
		});
		const firstRng = new Xoshiro128ss('weather-truth:weather');
		const secondRng = new Xoshiro128ss('weather-truth:weather');
		const timeline = resolveWeatherTimeline(scenario, firstRng);
		expect(timeline).toEqual(resolveWeatherTimeline(scenario, secondRng));
		expect(timeline).toHaveLength(3);
		expect(timeline[1].rainIntensityBp).toBeGreaterThanOrEqual(0);
		expect(timeline[1].rainIntensityBp).toBeLessThanOrEqual(2_000);
		expect(timeline[2]).toEqual({
			atMs: 120_000,
			rainIntensityBp: 1_500,
			airTempDeciC: 205,
			trackTempDeciC: 280
		});

		const expectedAdvance = new Xoshiro128ss('weather-truth:weather');
		for (let draw = 0; draw < scenario.envelope.length * 3; draw += 1) {
			expectedAdvance.nextUint32();
		}
		expect(firstRng.serialize()).toEqual(expectedAdvance.serialize());
	});

	test('interpolates weather with integer round-half-even ties', () => {
		const timeline = [
			{ atMs: 0, rainIntensityBp: 0, airTempDeciC: 1, trackTempDeciC: -1 },
			{ atMs: 4, rainIntensityBp: 1, airTempDeciC: 2, trackTempDeciC: -2 }
		];
		expect(interpolateWeatherTruth(timeline, 2)).toEqual({
			atMs: 2,
			rainIntensityBp: 0,
			airTempDeciC: 2,
			trackTempDeciC: -2
		});
	});

	test('advances the shared weather clock without additional RNG draws', () => {
		const input = weatherRaceInput('weather-interpolation', 12);
		if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
		Object.assign(input.weather.scenario.envelope[0], {
			rainIntensityMinBp: 2_000,
			rainIntensityMaxBp: 2_000,
			airTempMinDeciC: 200,
			airTempMaxDeciC: 200,
			trackTempMinDeciC: 280,
			trackTempMaxDeciC: 280
		});
		const simulation = new RaceSimulation(input);
		const initialSnapshot = simulation.snapshot();
		simulation.step();
		simulation.step();
		const advancedSnapshot = simulation.snapshot();
		expect(advancedSnapshot.weatherState?.weatherClockMs).toBeGreaterThan(0);
		expect(advancedSnapshot.weatherState?.rainIntensityBp).toBeGreaterThan(0);
		expect(advancedSnapshot.weatherState?.airTempDeciC).toBeLessThan(220);
		expect(advancedSnapshot.weatherState?.trackTempDeciC).toBeLessThan(310);
		expect(advancedSnapshot.rngStates.weather).toEqual(initialSnapshot.rngStates.weather);

		const weatherState = structuredClone(advancedSnapshot.weatherState!);
		advanceWeatherState(weatherState, 60_000);
		expect(weatherState).toMatchObject({
			weatherClockMs: 60_000,
			nextTruthPointIndex: 2,
			rainIntensityBp: 2_000,
			airTempDeciC: 200,
			trackTempDeciC: 280
		});
		expect(() => advanceWeatherState(weatherState, 59_999)).toThrow(/cannot move backwards/);
	});
});
