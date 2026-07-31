import { WEATHER_ENGINE_VERSION, WEATHER_FORMULA_VERSION } from '../core/config';
import type {
	RaceInput,
	WeatherEnvelopePoint,
	WeatherRaceRules,
	WeatherScenarioSpec
} from '../core/types';
import { createAcademyRaceInput } from './academy-baseline';
import { ACADEMY_WEATHER_COMPOUNDS } from './academy-weather';

export type WeatherCalibrationScenarioId =
	'W0' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8' | 'W9' | 'W10' | 'W11';

export interface WeatherCalibrationScenario {
	id: WeatherCalibrationScenarioId;
	name: string;
	forecastQualityComparison: boolean;
}

export const WEATHER_CALIBRATION_SCENARIOS: readonly WeatherCalibrationScenario[] = [
	{ id: 'W0', name: 'disabled dry regression', forecastQualityComparison: false },
	{ id: 'W1', name: 'static dry enabled', forecastQualityComparison: false },
	{ id: 'W2', name: 'dry to damp to wet', forecastQualityComparison: false },
	{ id: 'W3', name: 'sustained wet', forecastQualityComparison: false },
	{ id: 'W4', name: 'wet to drying', forecastQualityComparison: false },
	{ id: 'W5', name: 'brief shower', forecastQualityComparison: false },
	{ id: 'W6', name: 'drainage contrast', forecastQualityComparison: false },
	{ id: 'W7', name: 'DRS hysteresis', forecastQualityComparison: false },
	{ id: 'W8', name: 'unsafe-condition boundary', forecastQualityComparison: false },
	{ id: 'W9', name: 'forecast quality', forecastQualityComparison: true },
	{ id: 'W10', name: 'weather checkpoint', forecastQualityComparison: false },
	{ id: 'W11', name: 'gradual rain onset', forecastQualityComparison: true }
];

const DEFAULT_WEATHER_RULES: WeatherRaceRules = {
	wetTyreWaivesDryCompoundRule: true,
	drsSuspendRainBp: 2_500,
	drsRestoreRainBp: 1_500,
	drsSuspendWetnessBp: 4_000,
	drsRestoreWetnessBp: 2_500,
	unsafeWetnessBp: 9_000
};

function envelopePoint(
	atMs: number,
	rainIntensityBp: number,
	airTempDeciC: number,
	trackTempDeciC: number
): WeatherEnvelopePoint {
	return {
		atMs,
		rainIntensityMinBp: rainIntensityBp,
		rainIntensityMaxBp: rainIntensityBp,
		airTempMinDeciC: airTempDeciC,
		airTempMaxDeciC: airTempDeciC,
		trackTempMinDeciC: trackTempDeciC,
		trackTempMaxDeciC: trackTempDeciC
	};
}

function scenarioSpec(
	initialRainIntensityBp: number,
	initialRacingLineWetnessBp: number,
	initialOffLineWetnessBp: number,
	envelope: WeatherEnvelopePoint[]
): WeatherScenarioSpec {
	return {
		controlPointIntervalMs: 300_000,
		initialAirTempDeciC: 220,
		initialTrackTempDeciC: 310,
		initialRainIntensityBp,
		initialRacingLineWetnessBp,
		initialOffLineWetnessBp,
		envelope
	};
}

function baseWeatherInput(seed: string, entryCount: number, lapCount: number): RaceInput {
	const input = createAcademyRaceInput({ seed, entryCount, lapCount, gridMode: 'performance' });
	input.formulaVersion = WEATHER_FORMULA_VERSION;
	input.engineVersion = WEATHER_ENGINE_VERSION;
	input.weather = {
		enabled: true,
		forecastModelVersion: 'forecast-v2',
		scenario: scenarioSpec(0, 0, 0, [
			envelopePoint(300_000, 0, 220, 310),
			envelopePoint(600_000, 0, 220, 310),
			envelopePoint(900_000, 0, 220, 310),
			envelopePoint(1_800_000, 0, 220, 310),
			envelopePoint(3_600_000, 0, 220, 310)
		])
	};
	input.rules.weather = structuredClone(DEFAULT_WEATHER_RULES);
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
		entry.tyreSets = entry.tyreSets.map((set) => ({
			...set,
			compound: { ...ACADEMY_WEATHER_COMPOUNDS[set.compound.name] }
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

function setStartingCompound(input: RaceInput, compound: 'medium' | 'intermediate' | 'wet'): void {
	for (const entry of input.entries)
		entry.startingTyreSetId = `${entry.sessionEntryId}-${compound}`;
}

function setPitCompound(input: RaceInput, compound: 'hard' | 'intermediate' | 'wet'): void {
	for (const command of input.commands) {
		if (command.action.type === 'pit') {
			command.action.tyreSetId = `${command.sessionEntryId}-${compound}`;
		}
	}
}

function configureWeatherScenario(input: RaceInput, id: WeatherCalibrationScenarioId): void {
	if (!input.weather?.enabled || !input.rules.weather) throw new Error('weather input is required');
	const scenario = input.weather.scenario;
	const point = (atMs: number, rain: number, track: number) =>
		envelopePoint(atMs, rain, track - 20, track);
	switch (id) {
		case 'W1':
			scenario.envelope = [point(300_000, 0, 310), point(3_600_000, 0, 310)];
			break;
		case 'W2':
			scenario.envelope = [
				point(300_000, 0, 310),
				point(600_000, 2_500, 300),
				point(1_200_000, 6_000, 280),
				point(1_800_000, 8_500, 270),
				point(2_700_000, 2_000, 295),
				point(3_600_000, 0, 310)
			];
			setPitCompound(input, 'intermediate');
			setStartingCompound(input, 'medium');
			break;
		case 'W3':
			scenario.initialRainIntensityBp = 7_000;
			scenario.initialRacingLineWetnessBp = 7_000;
			scenario.initialOffLineWetnessBp = 7_000;
			scenario.envelope = [point(300_000, 7_000, 275), point(3_600_000, 7_000, 275)];
			setStartingCompound(input, 'wet');
			setPitCompound(input, 'wet');
			break;
		case 'W4':
			scenario.initialRainIntensityBp = 7_000;
			scenario.initialRacingLineWetnessBp = 8_000;
			scenario.initialOffLineWetnessBp = 8_000;
			scenario.envelope = [
				point(300_000, 7_000, 275),
				point(900_000, 0, 290),
				point(1_800_000, 0, 305),
				point(3_600_000, 0, 320)
			];
			setStartingCompound(input, 'wet');
			setPitCompound(input, 'intermediate');
			break;
		case 'W5':
			scenario.envelope = [
				point(300_000, 0, 310),
				point(600_000, 5_000, 295),
				point(900_000, 5_000, 290),
				point(1_200_000, 0, 310),
				point(3_600_000, 0, 310)
			];
			setPitCompound(input, 'intermediate');
			break;
		case 'W6':
			scenario.envelope = [point(300_000, 8_000, 275), point(3_600_000, 8_000, 275)];
			input.track.segments.forEach((segment, index) => {
				segment.drainagePpm = index % 2 === 0 ? 1_800_000 : 400_000;
			});
			setStartingCompound(input, 'wet');
			setPitCompound(input, 'wet');
			break;
		case 'W7':
			input.rules.weather.drsSuspendRainBp = 3_000;
			input.rules.weather.drsRestoreRainBp = 1_500;
			input.rules.weather.drsSuspendWetnessBp = 5_000;
			input.rules.weather.drsRestoreWetnessBp = 2_500;
			scenario.envelope = [
				point(300_000, 3_200, 285),
				point(600_000, 1_200, 300),
				point(900_000, 3_200, 285),
				point(1_200_000, 1_200, 300),
				point(3_600_000, 0, 310)
			];
			break;
		case 'W8':
			scenario.initialRacingLineWetnessBp = 9_000;
			scenario.initialOffLineWetnessBp = 9_000;
			scenario.envelope = [point(300_000, 0, 310), point(3_600_000, 0, 310)];
			break;
		case 'W9':
			configureWeatherScenario(input, 'W2');
			break;
		case 'W10':
			configureWeatherScenario(input, 'W4');
			break;
		case 'W11':
			scenario.envelope = [
				point(300_000, 0, 310),
				point(600_000, 500, 308),
				point(900_000, 1_500, 305),
				point(1_200_000, 3_000, 300),
				point(1_500_000, 5_000, 292),
				point(1_800_000, 7_000, 285),
				point(2_700_000, 7_000, 280),
				point(3_600_000, 0, 310)
			];
			setPitCompound(input, 'intermediate');
			setStartingCompound(input, 'medium');
			break;
		case 'W0':
			break;
	}
}

export function createWeatherCalibrationInput(
	scenarioId: WeatherCalibrationScenarioId,
	seed: string,
	entryCount: number,
	lapCount: number
): RaceInput {
	const input =
		scenarioId === 'W0'
			? createAcademyRaceInput({ seed, entryCount, lapCount, gridMode: 'performance' })
			: baseWeatherInput(seed, entryCount, lapCount);
	if (scenarioId !== 'W0') configureWeatherScenario(input, scenarioId);
	return input;
}
