import type { RaceInput } from '../core/types';
import { WEATHER_ENGINE_VERSION, WEATHER_FORMULA_VERSION } from '../core/config';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';
import { ACADEMY_WEATHER_COMPOUNDS } from '../fixtures/academy-weather';

export function singleCarInput(seed = 'test-seed', lapCount = 20): RaceInput {
	const input = createAcademyRaceInput({ seed, entryCount: 1, lapCount });
	input.rules.mandatoryPitStops = 0;
	input.commands = [];
	input.entries[0].gridPosition = 1;
	return input;
}

export function twoCarInput(seed = 'test-seed', lapCount = 20): RaceInput {
	const input = createAcademyRaceInput({ seed, entryCount: 2, lapCount });
	input.rules.mandatoryPitStops = 0;
	input.commands = [];
	input.entries[0].gridPosition = 1;
	input.entries[1].gridPosition = 2;
	return input;
}

export function weatherRaceInput(seed = 'weather-test-seed', lapCount = 20): RaceInput {
	const input = singleCarInput(seed, lapCount);
	input.formulaVersion = WEATHER_FORMULA_VERSION;
	input.engineVersion = WEATHER_ENGINE_VERSION;
	input.weather = {
		enabled: true,
		forecastModelVersion: 'forecast-v3-ratings-0-100',
		scenario: {
			controlPointIntervalMs: 60_000,
			initialAirTempDeciC: 220,
			initialTrackTempDeciC: 310,
			initialRainIntensityBp: 0,
			initialRacingLineWetnessBp: 0,
			initialOffLineWetnessBp: 0,
			envelope: [
				{
					atMs: 60_000,
					rainIntensityMinBp: 0,
					rainIntensityMaxBp: 2_000,
					airTempMinDeciC: 210,
					airTempMaxDeciC: 220,
					trackTempMinDeciC: 290,
					trackTempMaxDeciC: 310
				}
			]
		}
	};
	input.rules.weather = {
		wetTyreWaivesDryCompoundRule: true,
		drsSuspendRainBp: 2_500,
		drsRestoreRainBp: 1_500,
		drsSuspendWetnessBp: 4_000,
		drsRestoreWetnessBp: 2_500,
		unsafeWetnessBp: 9_000
	};
	for (const segment of input.track.segments) {
		segment.drainagePpm = 1_000_000;
		segment.evaporationPpm = 1_000_000;
		segment.racingLineDryingPpm = 1_000_000;
		segment.offLineRetentionPpm = 1_100_000;
		segment.wetGripSensitivityPpm = 1_000_000;
	}
	for (const entry of input.entries) {
		entry.driver.wetPace = entry.driver.pace;
		entry.driver.adaptability = entry.driver.pace;
		entry.tyreSets = entry.tyreSets.map((tyreSet) => ({
			...tyreSet,
			compound: { ...ACADEMY_WEATHER_COMPOUNDS[tyreSet.compound.name] }
		}));
		entry.tyreSets.push(
			{
				id: `${entry.sessionEntryId}-intermediate`,
				compound: { ...ACADEMY_WEATHER_COMPOUNDS.intermediate }
			},
			{
				id: `${entry.sessionEntryId}-wet`,
				compound: { ...ACADEMY_WEATHER_COMPOUNDS.wet }
			}
		);
	}
	return input;
}
