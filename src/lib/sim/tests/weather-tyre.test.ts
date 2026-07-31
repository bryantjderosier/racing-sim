import { describe, expect, test } from 'vitest';
import { FORMULA_CONFIG, WEATHER_TYRE_CONFIG } from '../core/config';
import { runRace } from '../core/engine';
import { ACADEMY_WEATHER_COMPOUNDS } from '../fixtures/academy-weather';
import { FICTIONAL_TRACK } from '../fixtures/fictional-track';
import {
	weatherAdjustedTyreWearBp,
	weatherTyreFactor,
	weatherTyreTemperatureDeciC
} from '../formulas/weather-tyre';
import { weatherRaceInput } from './helpers';

const segment = {
	...FICTIONAL_TRACK.segments[6],
	wetGripSensitivityPpm: 1_000_000
};

function weatherRaceTimeMs(compound: 'medium' | 'intermediate' | 'wet', wetnessBp: number): number {
	const input = weatherRaceInput(`weather-compound-${wetnessBp}`, 1);
	if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
	input.weather.scenario.initialRacingLineWetnessBp = wetnessBp;
	input.weather.scenario.initialOffLineWetnessBp = wetnessBp;
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
	input.entries[0].startingTyreSetId = `${input.entries[0].sessionEntryId}-${compound}`;
	return runRace(input).sessionResults[0].totalTimeMs;
}

describe('weather tyre compounds and temperature', () => {
	test('issues overlapping intermediate and wet operating ranges', () => {
		expect(ACADEMY_WEATHER_COMPOUNDS.intermediate.name).toBe('intermediate');
		expect(ACADEMY_WEATHER_COMPOUNDS.wet.name).toBe('wet');
		expect(ACADEMY_WEATHER_COMPOUNDS.intermediate.optimalWetnessMaxBp).toBeGreaterThan(
			ACADEMY_WEATHER_COMPOUNDS.wet.optimalWetnessMinBp!
		);
	});

	test('keeps wetness penalties continuous at compound range boundaries', () => {
		const compound = ACADEMY_WEATHER_COMPOUNDS.intermediate;
		const atBoundary = weatherTyreFactor(compound, 750, 6_000, segment, WEATHER_TYRE_CONFIG);
		const justInside = weatherTyreFactor(compound, 750, 5_999, segment, WEATHER_TYRE_CONFIG);
		const justOutside = weatherTyreFactor(compound, 750, 6_001, segment, WEATHER_TYRE_CONFIG);
		expect(atBoundary).toBe(justInside);
		expect(justOutside - atBoundary).toBeGreaterThan(0);
		expect(justOutside - atBoundary).toBeLessThan(0.000_1);
	});

	test('moves temperature toward heat on a dry line and toward water cooling in heavy wet', () => {
		const compound = ACADEMY_WEATHER_COMPOUNDS.medium;
		const dryTemperature = weatherTyreTemperatureDeciC(
			compound,
			800,
			'balanced',
			'normal',
			segment,
			0,
			310,
			WEATHER_TYRE_CONFIG
		);
		const wetTemperature = weatherTyreTemperatureDeciC(
			compound,
			800,
			'balanced',
			'normal',
			segment,
			9_000,
			310,
			WEATHER_TYRE_CONFIG
		);
		expect(dryTemperature).toBeGreaterThan(800);
		expect(wetTemperature).toBeLessThan(800);
	});

	test('makes the intended compound fastest in dry, mixed, and heavy-wet conditions', () => {
		expect(weatherRaceTimeMs('medium', 0)).toBeLessThan(weatherRaceTimeMs('intermediate', 0));
		expect(weatherRaceTimeMs('intermediate', 3_500)).toBeLessThan(
			weatherRaceTimeMs('medium', 3_500)
		);
		expect(weatherRaceTimeMs('wet', 7_500)).toBeLessThan(weatherRaceTimeMs('intermediate', 7_500));
	});

	test('increases wet-compound wear continuously on a dry, overheated line', () => {
		const compound = ACADEMY_WEATHER_COMPOUNDS.wet;
		const wetWear = weatherAdjustedTyreWearBp(
			compound,
			0,
			100,
			650,
			7_500,
			FORMULA_CONFIG.wearLimitBp,
			WEATHER_TYRE_CONFIG
		);
		const dryWear = weatherAdjustedTyreWearBp(
			compound,
			0,
			100,
			900,
			0,
			FORMULA_CONFIG.wearLimitBp,
			WEATHER_TYRE_CONFIG
		);
		expect(dryWear).toBeGreaterThan(wetWear * 3);
	});

	test('adds tyre temperature and surface wetness to weather lap telemetry', () => {
		const result = runRace(weatherRaceInput('weather-tyre-telemetry', 1));
		expect(result.lapTelemetry[0].temperatureDeciC).toEqual(expect.any(Number));
		expect(result.lapTelemetry[0].racingLineWetnessBp).toEqual(expect.any(Number));
	});
});
