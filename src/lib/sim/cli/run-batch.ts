import { runCalibration, type CalibrationOptions } from '../calibration/report';
import type { AcademyGridMode } from '../fixtures/academy-baseline';
import { argumentValue, integerArgument } from './arguments';

function gridModesArgument(): AcademyGridMode[] {
	const value = argumentValue('grid', 'both');
	if (value === 'both') return ['performance', 'scrambled'];
	if (value === 'performance' || value === 'scrambled') return [value];
	throw new Error('--grid must be performance, scrambled, or both');
}

const runCount = integerArgument('runs', 20);
const options: CalibrationOptions = {
	runCount,
	entryCount: integerArgument('entries', 30),
	lapCount: integerArgument('laps', 50),
	seedPrefix: argumentValue('seed', 'academy-batch'),
	gridModes: gridModesArgument(),
	controlledRunCount: integerArgument('controlled-runs', Math.min(runCount, 20))
};

process.stdout.write(`${JSON.stringify(runCalibration(options), null, 2)}\n`);
