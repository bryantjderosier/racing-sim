import { describe, expect, test } from 'vitest';
import { canonicalStringify } from '../core/canonicalize';
import { RaceSimulation } from '../core/engine';
import {
	buildWeatherForecastSnapshot,
	resolveWeatherForecastCapability,
	scoreWeatherForecast
} from '../core/forecast';
import type { WeatherForecastCapability, WeatherTruthPoint } from '../core/types';
import { weatherRaceInput } from './helpers';

const timeline: WeatherTruthPoint[] = [
	{ atMs: 0, rainIntensityBp: 0, airTempDeciC: 220, trackTempDeciC: 310 },
	{ atMs: 300_000, rainIntensityBp: 0, airTempDeciC: 220, trackTempDeciC: 310 },
	{ atMs: 900_000, rainIntensityBp: 8_000, airTempDeciC: 205, trackTempDeciC: 280 },
	{ atMs: 1_800_000, rainIntensityBp: 10_000, airTempDeciC: 200, trackTempDeciC: 270 },
	{ atMs: 3_600_000, rainIntensityBp: 0, airTempDeciC: 220, trackTempDeciC: 310 }
];

const exactCapability: WeatherForecastCapability = {
	teamId: 'team-exact',
	refreshIntervalMs: 60_000,
	usefulHorizonMs: 3_600_000,
	onsetTimingErrorMs: 0,
	intensityErrorBp: 0,
	probabilityNoiseBp: 0,
	confidenceCeilingBp: 9_000
};

describe('weather forecast snapshots', () => {
	test('maps HQ, analyst, and trackside ratings into bounded capability', () => {
		const low = resolveWeatherForecastCapability('team-low', {
			hqWeatherStationLevel: 1,
			weatherAnalystSkill: 1,
			tracksideToolsLevel: 1
		});
		const high = resolveWeatherForecastCapability('team-high', {
			hqWeatherStationLevel: 20,
			weatherAnalystSkill: 20,
			tracksideToolsLevel: 20
		});
		expect(high.refreshIntervalMs).toBeLessThan(low.refreshIntervalMs);
		expect(high.usefulHorizonMs).toBeGreaterThan(low.usefulHorizonMs);
		expect(high.onsetTimingErrorMs).toBeLessThan(low.onsetTimingErrorMs);
		expect(high.intensityErrorBp).toBeLessThan(low.intensityErrorBp);
		expect(high.probabilityNoiseBp).toBeLessThan(low.probabilityNoiseBp);
		expect(high.confidenceCeilingBp).toBeGreaterThan(low.confidenceCeilingBp);
		expect(high.confidenceCeilingBp).toBeLessThan(10_000);
	});

	test('creates deterministic rolling windows and omits unavailable long horizons', () => {
		const snapshot = buildWeatherForecastSnapshot(
			timeline,
			exactCapability,
			'session-forecast',
			0,
			20 * 60_000,
			[{ segmentId: 'seg-01', racingLineWetnessBp: 120, offLineWetnessBp: 180 }]
		);
		expect(snapshot.windows.map((window) => [window.startOffsetMs, window.endOffsetMs])).toEqual([
			[0, 300_000],
			[300_000, 900_000]
		]);
		expect(snapshot).toEqual(
			buildWeatherForecastSnapshot(timeline, exactCapability, 'session-forecast', 0, 20 * 60_000, [
				{ segmentId: 'seg-01', racingLineWetnessBp: 120, offLineWetnessBp: 180 }
			])
		);
	});

	test('exact capability scores truth without forecast error', () => {
		const snapshot = buildWeatherForecastSnapshot(
			timeline,
			exactCapability,
			'session-forecast',
			0,
			3_600_000
		);
		const score = scoreWeatherForecast(snapshot, timeline);
		expect(score.windowCount).toBe(4);
		expect(score.brierScore).toBe(0);
		expect(score.meanOnsetTimingErrorMs).toBe(0);
		expect(score.intensityIntervalCoverageBp).toBe(10_000);
		expect(score.meanIntensityIntervalWidthBp).toBeGreaterThan(0);
	});

	test('capability levels share forecast error while narrowing intensity intervals', () => {
		const low = resolveWeatherForecastCapability('forecast-low', {
			hqWeatherStationLevel: 1,
			weatherAnalystSkill: 1,
			tracksideToolsLevel: 1
		});
		const high = resolveWeatherForecastCapability('forecast-high', {
			hqWeatherStationLevel: 20,
			weatherAnalystSkill: 20,
			tracksideToolsLevel: 20
		});
		const lowSnapshot = buildWeatherForecastSnapshot(timeline, low, 'paired-errors', 0, 3_600_000);
		const highSnapshot = buildWeatherForecastSnapshot(
			timeline,
			high,
			'paired-errors',
			0,
			3_600_000
		);
		expect(highSnapshot.windows).toHaveLength(lowSnapshot.windows.length);
		expect(scoreWeatherForecast(highSnapshot, timeline).meanIntensityIntervalWidthBp).toBeLessThan(
			scoreWeatherForecast(lowSnapshot, timeline).meanIntensityIntervalWidthBp
		);
	});

	test('forecast requests do not mutate engine state or RNG', () => {
		const input = weatherRaceInput('forecast-immutability', 12);
		const simulation = new RaceSimulation(input);
		simulation.step();
		const before = simulation.snapshot();
		buildWeatherForecastSnapshot(
			before.weatherState!.resolvedTimeline,
			exactCapability,
			input.seed,
			before.weatherState!.weatherClockMs,
			input.rules.lapCount * input.track.segments.length * 10_000
		);
		const after = simulation.snapshot();
		expect(canonicalStringify(after)).toBe(canonicalStringify(before));
	});

	test('exposes observed surface state without sharing mutable references', () => {
		const observed = [{ segmentId: 'seg-01', racingLineWetnessBp: 800, offLineWetnessBp: 1_200 }];
		const snapshot = buildWeatherForecastSnapshot(
			timeline,
			exactCapability,
			'session-forecast',
			0,
			20 * 60_000,
			observed
		);
		observed[0].racingLineWetnessBp = 0;
		expect(snapshot.observed.segments[0].racingLineWetnessBp).toBe(800);
	});
});
