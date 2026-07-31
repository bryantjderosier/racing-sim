import { describe, expect, test } from 'vitest';
import {
	applyWeatherStrategyPersistence,
	createWeatherStrategyPersistenceState,
	decideWeatherStrategy,
	type WeatherStrategyPersistenceState
} from '../core/weather-strategy';
import type { WeatherForecastSnapshot } from '../core/types';

function forecast(
	rainProbabilityBp: number,
	rainIntensityMaxBp: number,
	confidenceBp = 8_000
): WeatherForecastSnapshot {
	return {
		forecastModelVersion: 'forecast-v2',
		teamId: 'strategy-test',
		issuedAtMs: 0,
		validUntilMs: 120_000,
		observed: {
			atMs: 0,
			rainIntensityBp: 0,
			airTempDeciC: 220,
			trackTempDeciC: 310,
			segments: []
		},
		windows: [
			{
				startOffsetMs: 0,
				endOffsetMs: 300_000,
				rainProbabilityBp,
				rainIntensityMinBp: 0,
				rainIntensityMaxBp,
				confidenceBp,
				predictedOnsetOffsetMs: 120_000
			}
		]
	};
}

describe('weather-aware strategy decisions', () => {
	test('stays on slicks when dry and clear', () => {
		expect(
			decideWeatherStrategy({
				currentCompound: 'medium',
				observedRacingLineWetnessBp: 0,
				forecast: forecast(1_000, 500)
			})
		).toMatchObject({ action: 'stay_out', target: 'slicks', urgency: 'none' });
	});

	test('switches early to intermediates on a confident rain forecast', () => {
		expect(
			decideWeatherStrategy({
				currentCompound: 'medium',
				observedRacingLineWetnessBp: 0,
				forecast: forecast(7_000, 4_000)
			})
		).toMatchObject({ action: 'pit', target: 'intermediate', urgency: 'urgent' });
	});

	test('switches from intermediate to wet at saturated surface', () => {
		expect(
			decideWeatherStrategy({
				currentCompound: 'intermediate',
				observedRacingLineWetnessBp: 8_000,
				forecast: forecast(8_000, 7_000)
			})
		).toMatchObject({ action: 'pit', target: 'wet', reason: 'surface_wet' });
	});

	test('keeps wets when heavy rain is forecast on a dry racing line', () => {
		expect(
			decideWeatherStrategy({
				currentCompound: 'wet',
				observedRacingLineWetnessBp: 0,
				forecast: forecast(8_000, 8_000)
			})
		).toMatchObject({
			action: 'stay_out',
			target: 'wet',
			urgency: 'none',
			reason: 'compound_already_suitable'
		});
	});

	test('holds a downgrade through confirmation and minimum-stint hysteresis', () => {
		const candidate = decideWeatherStrategy({
			currentCompound: 'intermediate',
			observedRacingLineWetnessBp: 0,
			forecast: forecast(500, 500)
		});
		let state: WeatherStrategyPersistenceState = {
			...createWeatherStrategyPersistenceState(),
			refreshesSinceCompoundChange: 0
		};
		const first = applyWeatherStrategyPersistence(candidate, 'intermediate', state);
		state = first.state;
		expect(first.decision).toMatchObject({
			action: 'stay_out',
			target: 'intermediate',
			reason: 'compound_hysteresis_hold'
		});
		const second = applyWeatherStrategyPersistence(candidate, 'intermediate', state);
		state = second.state;
		const third = applyWeatherStrategyPersistence(candidate, 'intermediate', state);
		state = third.state;
		expect(third.decision).toMatchObject({
			action: 'stay_out',
			target: 'intermediate',
			reason: 'compound_hysteresis_hold'
		});
		const fourth = applyWeatherStrategyPersistence(candidate, 'intermediate', state);
		expect(fourth.decision).toMatchObject({ action: 'pit', target: 'slicks' });
	});
});
