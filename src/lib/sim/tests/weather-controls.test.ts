import { describe, expect, test } from 'vitest';
import { RaceSimulation, runRace } from '../core/engine';
import { Xoshiro128ss } from '../core/rng';
import {
	createInitialWeatherState,
	updateWeatherControls,
	weatherSurfaceExtrema
} from '../core/weather';
import { weatherRaceInput } from './helpers';

function controlState() {
	const input = weatherRaceInput('weather-controls', 4);
	if (!input.weather?.enabled || !input.rules.weather) {
		throw new Error('weather fixture must be enabled');
	}
	return {
		input,
		state: createInitialWeatherState(
			input.weather.scenario,
			input.track,
			new Xoshiro128ss('weather-controls:weather')
		),
		rules: input.rules.weather
	};
}

describe('weather DRS and unsafe-condition controls', () => {
	test('suspends DRS at the upper threshold and restores only below the lower threshold', () => {
		const { input, state, rules } = controlState();
		state.rainIntensityBp = rules.drsSuspendRainBp;
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(true);
		expect(state.drsWeatherSuspended).toBe(true);

		state.rainIntensityBp = rules.drsRestoreRainBp;
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(false);
		expect(state.drsWeatherSuspended).toBe(true);

		state.rainIntensityBp = rules.drsRestoreRainBp - 1;
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(true);
		expect(state.drsWeatherSuspended).toBe(false);
	});

	test('uses only DRS activation segments for wetness suspension and restoration', () => {
		const { input, state, rules } = controlState();
		state.rainIntensityBp = 0;
		for (const surface of state.segments) surface.racingLineWetnessBp = 0;
		const activationIds = input.track.segments
			.filter((segment) => segment.isDrsActivation)
			.map((segment) => segment.id);
		state.segments.find((surface) => surface.segmentId === activationIds[0])!.racingLineWetnessBp =
			rules.drsSuspendWetnessBp;
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(true);

		state.segments.find((surface) => surface.segmentId === activationIds[0])!.racingLineWetnessBp =
			rules.drsRestoreWetnessBp;
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(false);
		state.segments.find((surface) => surface.segmentId === activationIds[0])!.racingLineWetnessBp =
			rules.drsRestoreWetnessBp - 1;
		for (const id of activationIds.slice(1)) {
			state.segments.find((surface) => surface.segmentId === id)!.racingLineWetnessBp =
				rules.drsRestoreWetnessBp - 1;
		}
		expect(updateWeatherControls(state, input.track, rules).drsWeatherSuspendedChanged).toBe(true);
		expect(state.drsWeatherSuspended).toBe(false);
	});

	test('detects unsafe wetness on either channel and clears only below the boundary', () => {
		const { input, state, rules } = controlState();
		const target = state.segments[3];
		target.offLineWetnessBp = rules.unsafeWetnessBp;
		expect(updateWeatherControls(state, input.track, rules).unsafeConditionsActiveChanged).toBe(
			true
		);
		expect(state.unsafeConditionsActive).toBe(true);

		target.offLineWetnessBp = rules.unsafeWetnessBp - 1;
		state.segments[4].racingLineWetnessBp = rules.unsafeWetnessBp;
		expect(updateWeatherControls(state, input.track, rules).unsafeConditionsActiveChanged).toBe(
			false
		);
		state.segments[4].racingLineWetnessBp = rules.unsafeWetnessBp - 1;
		expect(updateWeatherControls(state, input.track, rules).unsafeConditionsActiveChanged).toBe(
			true
		);
		expect(state.unsafeConditionsActive).toBe(false);
	});

	test('emits one event per weather-control transition and records surface extrema', () => {
		const input = weatherRaceInput('weather-control-events', 2);
		if (!input.weather?.enabled || !input.rules.weather) {
			throw new Error('weather fixture must be enabled');
		}
		input.rules.weather.drsSuspendWetnessBp = 9_000;
		input.rules.weather.drsRestoreWetnessBp = 8_990;
		input.weather.scenario.initialRainIntensityBp = input.rules.weather.drsSuspendRainBp;
		input.weather.scenario.initialRacingLineWetnessBp = input.rules.weather.unsafeWetnessBp;
		input.weather.scenario.initialOffLineWetnessBp = input.rules.weather.unsafeWetnessBp;
		Object.assign(input.weather.scenario.envelope[0], {
			rainIntensityMinBp: 0,
			rainIntensityMaxBp: 0
		});
		const simulation = new RaceSimulation(input);
		for (let step = 0; step < 20; step += 1) simulation.step();
		const result = runRace(input);
		expect(result.events.filter((event) => event.type === 'drs_weather_suspended')).toHaveLength(1);
		expect(
			result.events.filter((event) => event.type === 'unsafe_conditions_detected')
		).toHaveLength(1);
		expect(result.events.filter((event) => event.type === 'drs_weather_restored')).toHaveLength(1);
		expect(
			result.events.filter((event) => event.type === 'unsafe_conditions_cleared')
		).toHaveLength(1);
		const extrema = weatherSurfaceExtrema(simulation.snapshot().weatherState!);
		expect(extrema.maximumRacingLineWetnessBp).toBeGreaterThanOrEqual(0);
		expect(extrema.maximumOffLineWetnessBp).toBeGreaterThanOrEqual(0);
	});
});
