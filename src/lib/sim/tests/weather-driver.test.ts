import { describe, expect, test } from 'vitest';
import { FORMULA_CONFIG, WEATHER_DRIVER_CONFIG } from '../core/config';
import { runRace } from '../core/engine';
import type { DriverRatings } from '../core/types';
import { FICTIONAL_TRACK } from '../fixtures/fictional-track';
import { driverFactor } from '../formulas/driver';
import {
	weatherDriverFactor,
	weatherTransitionPenaltyPpm,
	wetPaceBlendBp
} from '../formulas/weather-driver';
import { weatherRaceInput } from './helpers';

const segment = FICTIONAL_TRACK.segments[6];
const driver: DriverRatings = {
	pace: 60,
	raceCraft: 60,
	consistency: 60,
	tyreManagement: 60,
	fuelManagement: 60,
	starts: 60,
	focus: 60,
	aggression: 60,
	composure: 60,
	feedback: 60,
	wetPace: 90,
	adaptability: 60
};

function stableWetInput(wetPace: number) {
	const input = weatherRaceInput('stable-wet-driver', 2);
	if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
	input.weather.scenario.initialRacingLineWetnessBp = 7_500;
	input.weather.scenario.initialOffLineWetnessBp = 7_500;
	Object.assign(input.weather.scenario.envelope[0], {
		rainIntensityMinBp: 0,
		rainIntensityMaxBp: 0,
		airTempMinDeciC: 220,
		airTempMaxDeciC: 220,
		trackTempMinDeciC: 310,
		trackTempMaxDeciC: 310
	});
	for (const trackSegment of input.track.segments) {
		trackSegment.drainagePpm = 0;
		trackSegment.evaporationPpm = 0;
		trackSegment.racingLineDryingPpm = 0;
	}
	input.entries[0].driver.pace = 60;
	input.entries[0].driver.wetPace = wetPace;
	input.entries[0].startingTyreSetId = `${input.entries[0].sessionEntryId}-wet`;
	return input;
}

function changingWeatherInput(adaptability: number) {
	const input = weatherRaceInput('changing-weather-driver', 3);
	if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
	Object.assign(input.weather.scenario.envelope[0], {
		rainIntensityMinBp: 10_000,
		rainIntensityMaxBp: 10_000,
		airTempMinDeciC: 180,
		airTempMaxDeciC: 180,
		trackTempMinDeciC: 180,
		trackTempMaxDeciC: 180
	});
	input.entries[0].driver.wetPace = input.entries[0].driver.pace;
	input.entries[0].driver.adaptability = adaptability;
	return input;
}

describe('weather driver pace and adaptability', () => {
	test('blends wet pace continuously from dry to fully wet', () => {
		expect(wetPaceBlendBp(0)).toBe(0);
		expect(wetPaceBlendBp(5_000)).toBe(5_000);
		expect(wetPaceBlendBp(10_000)).toBe(10_000);
		const dry = weatherDriverFactor(
			driver,
			segment,
			0,
			0,
			310,
			310,
			FORMULA_CONFIG,
			WEATHER_DRIVER_CONFIG
		);
		const mixed = weatherDriverFactor(
			driver,
			segment,
			5_000,
			5_000,
			310,
			310,
			FORMULA_CONFIG,
			WEATHER_DRIVER_CONFIG
		);
		const wet = weatherDriverFactor(
			driver,
			segment,
			10_000,
			10_000,
			310,
			310,
			FORMULA_CONFIG,
			WEATHER_DRIVER_CONFIG
		);
		expect(dry).toBeCloseTo(driverFactor(driver, segment, FORMULA_CONFIG), 12);
		expect(mixed).toBeLessThan(dry);
		expect(wet).toBeLessThan(mixed);
	});

	test('does not apply adaptability in stable conditions', () => {
		const low = weatherTransitionPenaltyPpm(
			{ ...driver, adaptability: 0 },
			7_500,
			7_500,
			260,
			260,
			WEATHER_DRIVER_CONFIG
		);
		const high = weatherTransitionPenaltyPpm(
			{ ...driver, adaptability: 100 },
			7_500,
			7_500,
			260,
			260,
			WEATHER_DRIVER_CONFIG
		);
		expect(low).toBe(0);
		expect(high).toBe(0);
	});

	test('reduces rapid weather-transition loss for adaptable drivers', () => {
		const low = weatherTransitionPenaltyPpm(
			{ ...driver, adaptability: 0 },
			4_000,
			3_500,
			280,
			290,
			WEATHER_DRIVER_CONFIG
		);
		const high = weatherTransitionPenaltyPpm(
			{ ...driver, adaptability: 100 },
			4_000,
			3_500,
			280,
			290,
			WEATHER_DRIVER_CONFIG
		);
		expect(low).toBeGreaterThan(high);
		expect(high).toBeGreaterThan(0);
	});

	test('makes higher wet pace faster in a stable wet engine run', () => {
		const low = runRace(stableWetInput(25));
		const high = runRace(stableWetInput(95));
		expect(high.sessionResults[0].totalTimeMs).toBeLessThan(low.sessionResults[0].totalTimeMs);
	});

	test('makes higher adaptability faster through an engine weather transition', () => {
		const low = runRace(changingWeatherInput(0));
		const high = runRace(changingWeatherInput(100));
		expect(high.sessionResults[0].totalTimeMs).toBeLessThan(low.sessionResults[0].totalTimeMs);
	});
});
