import { describe, expect, test } from 'vitest';
import { canonicalStringify } from '../core/canonicalize';
import { resolveWeatherForecastCapability } from '../core/forecast';
import { RaceSimulation } from '../core/engine';
import { WeatherStrategyController } from '../core/weather-controller';
import type { CompoundName, RaceInput } from '../core/types';
import { createWeatherCalibrationInput } from '../fixtures/weather-calibration';

function controllerFor(
	input: RaceInput,
	mode: 'candidate' | 'effective'
): WeatherStrategyController {
	const entry = input.entries[0];
	const pitEntry = input.track.segments.find((segment) => segment.isPitEntry)!;
	const tyreSetIdsByCompound: Partial<Record<CompoundName, string[]>> = {};
	for (const compound of ['medium', 'intermediate', 'wet'] as const) {
		const source = entry.tyreSets.find((set) => set.compound.name === compound)!;
		const ids = Array.from({ length: 12 }, (_, index) => {
			const id = `${entry.sessionEntryId}-test-${mode}-${compound}-${index}`;
			if (!entry.tyreSets.some((set) => set.id === id))
				entry.tyreSets.push({ id, compound: structuredClone(source.compound) });
			return id;
		});
		tyreSetIdsByCompound[compound] = ids;
	}
	return new WeatherStrategyController({
		targetEntryId: entry.sessionEntryId,
		capability: resolveWeatherForecastCapability('controller-test', {
			hqWeatherStationLevel: 1,
			weatherAnalystSkill: 1,
			tracksideToolsLevel: 1
		}),
		mode,
		sessionDurationMs: 2_000_000,
		pitEntrySegmentId: pitEntry.id,
		pitEntrySegmentSequence: pitEntry.sequence,
		lapCount: input.rules.lapCount,
		tyreSetIdsByCompound
	});
}

describe('live weather strategy controller', () => {
	test('injects pit commands and restores controller state at a checkpoint', () => {
		const input = createWeatherCalibrationInput('W2', 'controller-checkpoint', 1, 20);
		input.rules.mandatoryPitStops = 0;
		input.commands = [];
		const uninterrupted = new RaceSimulation(input, undefined, controllerFor(input, 'effective'));
		const expected = uninterrupted.run();
		expect(expected.events.some((event) => event.type === 'strategy_command_applied')).toBe(true);

		const partial = new RaceSimulation(input, undefined, controllerFor(input, 'effective'));
		for (let step = 0; step < 150; step += 1) partial.step();
		const snapshot = partial.snapshot();
		expect(snapshot.liveCommands?.length).toBeGreaterThan(0);
		expect(snapshot.strategyControllerState?.refreshCount).toBeGreaterThan(0);

		const resumed = new RaceSimulation(input, snapshot, controllerFor(input, 'effective')).run();
		expect(canonicalStringify(resumed)).toBe(canonicalStringify(expected));
	});
});
