import { describe, expect, test } from 'vitest';
import { validateRaceInput } from '../core/validate';
import { singleCarInput, weatherRaceInput } from './helpers';

describe('race input validation', () => {
	test('accepts the baseline contract', () => {
		expect(() => validateRaceInput(singleCarInput())).not.toThrow();
	});

	test('rejects invalid track distance and unissued tyres', () => {
		const invalidDistance = singleCarInput();
		invalidDistance.track.lapDistanceM += 1;
		expect(() => validateRaceInput(invalidDistance)).toThrow(/segment distances/);

		const invalidTyre = singleCarInput();
		invalidTyre.commands = [
			{
				sequence: 1,
				sessionEntryId: invalidTyre.entries[0].sessionEntryId,
				triggerLap: 5,
				triggerSegmentId: 'seg-14',
				action: { type: 'pit', tyreSetId: 'not-issued' }
			}
		];
		expect(() => validateRaceInput(invalidTyre)).toThrow(/was not issued/);
	});

	test('rejects insufficient fuel and an unmet pit-stop rule', () => {
		const lowFuel = singleCarInput();
		lowFuel.entries[0].startingFuelGrams = 1_000;
		expect(() => validateRaceInput(lowFuel)).toThrow(/starting fuel cannot complete/);

		const noStop = singleCarInput();
		noStop.rules.mandatoryPitStops = 1;
		expect(() => validateRaceInput(noStop)).toThrow(/mandatory pit-stop/);
	});

	test('rejects a formula version that does not match the active coefficients', () => {
		const input = singleCarInput();
		input.formulaVersion = 'academy-dry-v2';
		expect(() => validateRaceInput(input)).toThrow(/formulaVersion must be academy-dry-v4/);
	});

	test('accepts the weather foundation contract', () => {
		expect(() => validateRaceInput(weatherRaceInput())).not.toThrow();
	});

	test('rejects weather version and hysteresis mismatches', () => {
		const dryVersion = weatherRaceInput();
		dryVersion.formulaVersion = 'academy-dry-v4';
		expect(() => validateRaceInput(dryVersion)).toThrow(
			/formulaVersion must be academy-weather-v2/
		);

		const invalidHysteresis = weatherRaceInput();
		invalidHysteresis.rules.weather!.drsRestoreWetnessBp =
			invalidHysteresis.rules.weather!.drsSuspendWetnessBp;
		expect(() => validateRaceInput(invalidHysteresis)).toThrow(
			/DRS wetness restore threshold must be below/
		);
	});

	test('rejects weather points that do not align to the control interval', () => {
		const input = weatherRaceInput();
		if (!input.weather?.enabled) throw new Error('weather fixture must be enabled');
		input.weather.scenario.envelope[0].atMs += 1;
		expect(() => validateRaceInput(input)).toThrow(/align to the control-point interval/);
	});

	test('rejects zero off-line water retention', () => {
		const input = weatherRaceInput();
		input.track.segments[0].offLineRetentionPpm = 0;
		expect(() => validateRaceInput(input)).toThrow(/offLineRetentionPpm must be positive/);
	});
});
