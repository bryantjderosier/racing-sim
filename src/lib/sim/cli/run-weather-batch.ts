import {
	runWeatherCalibration,
	runWeatherStrategySweep,
	type WeatherCalibrationOptions,
	type WeatherStrategySweepOptions
} from '../calibration/weather-report';
import type { WeatherCalibrationScenarioId } from '../fixtures/weather-calibration';
import { argumentValue, integerArgument } from './arguments';

function positiveIntegerListArgument(name: string): number[] | undefined {
	const flag = `--${name}`;
	const index = process.argv.indexOf(flag);
	if (index < 0) return undefined;
	const raw = process.argv[index + 1];
	if (!raw) throw new Error(`--${name} requires a comma-separated positive integer list`);
	const values = raw.split(',').map((value) => Number.parseInt(value, 10));
	if (values.some((value) => !Number.isInteger(value) || value < 1)) {
		throw new Error(`--${name} must be a comma-separated positive integer list`);
	}
	return values;
}

function scenarioArgument(): WeatherCalibrationScenarioId[] | undefined {
	const value = argumentValue('scenario', 'all');
	if (value === 'all') return undefined;
	const scenarios = value.split(',') as WeatherCalibrationScenarioId[];
	if (scenarios.some((scenario) => !/^W(?:11|10|[0-9])$/.test(scenario))) {
		throw new Error('--scenario must be all or a comma-separated W0–W11 list');
	}
	return scenarios;
}

const baseOptions: WeatherCalibrationOptions = {
	runCount: integerArgument('runs', 5),
	entryCount: integerArgument('entries', 8),
	lapCount: integerArgument('laps', 50),
	seedPrefix: argumentValue('seed', 'weather-calibration'),
	scenarios: scenarioArgument(),
	checkpointStep: integerArgument('checkpoint-step', 117)
};

const downgradeConfirmations = positiveIntegerListArgument('strategy-confirmations');
const minStintRefreshes = positiveIntegerListArgument('strategy-min-stint-refreshes');
if (Boolean(downgradeConfirmations) !== Boolean(minStintRefreshes)) {
	throw new Error(
		'--strategy-confirmations and --strategy-min-stint-refreshes must be provided together'
	);
}

const output =
	downgradeConfirmations && minStintRefreshes
		? runWeatherStrategySweep({
				...baseOptions,
				downgradeConfirmations,
				minStintRefreshes
			} satisfies WeatherStrategySweepOptions)
		: runWeatherCalibration(baseOptions);

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
