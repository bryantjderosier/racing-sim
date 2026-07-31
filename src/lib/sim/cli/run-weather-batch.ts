import {
	runWeatherCalibration,
	type WeatherCalibrationOptions
} from '../calibration/weather-report';
import type { WeatherCalibrationScenarioId } from '../fixtures/weather-calibration';
import { argumentValue, integerArgument } from './arguments';

function scenarioArgument(): WeatherCalibrationScenarioId[] | undefined {
	const value = argumentValue('scenario', 'all');
	if (value === 'all') return undefined;
	const scenarios = value.split(',') as WeatherCalibrationScenarioId[];
	if (scenarios.some((scenario) => !/^W(?:11|10|[0-9])$/.test(scenario))) {
		throw new Error('--scenario must be all or a comma-separated W0–W11 list');
	}
	return scenarios;
}

const options: WeatherCalibrationOptions = {
	runCount: integerArgument('runs', 5),
	entryCount: integerArgument('entries', 8),
	lapCount: integerArgument('laps', 50),
	seedPrefix: argumentValue('seed', 'weather-calibration'),
	scenarios: scenarioArgument(),
	checkpointStep: integerArgument('checkpoint-step', 117)
};

process.stdout.write(`${JSON.stringify(runWeatherCalibration(options), null, 2)}\n`);
