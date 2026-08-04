import { describe, expect, test } from 'vitest';
import { runRace } from '../core/engine';
import { overtakeOpportunityProbability, overtakeProbability } from '../formulas/overtaking';
import { FORMULA_CONFIG } from '../core/config';
import { FICTIONAL_TRACK } from '../fixtures/fictional-track';
import { ACADEMY_COMPOUNDS } from '../fixtures/academy-baseline';
import { mean, variance } from '../core/math';
import { singleCarInput, twoCarInput } from './helpers';
import { tyreFactor } from '../formulas/tyre';

describe('fuel, tyres, cars, drivers, and race interaction', () => {
	test('excess starting fuel is slower on the opening lap', () => {
		const light = singleCarInput('fuel', 12);
		const heavy = structuredClone(light);
		light.entries[0].startingFuelGrams = 25_000;
		heavy.entries[0].startingFuelGrams = 45_000;
		const lightLap = runRace(light).lapTelemetry[0].lapTimeMs;
		const heavyLap = runRace(heavy).lapTelemetry[0].lapTimeMs;
		expect(heavyLap).toBeGreaterThan(lightLap);
	});

	test('tyre management reduces wear and a justified stop beats staying out', () => {
		const poor = singleCarInput('tyres', 20);
		const strong = structuredClone(poor);
		poor.entries[0].driver.tyreManagement = 30;
		strong.entries[0].driver.tyreManagement = 95;
		const poorResult = runRace(poor);
		const strongResult = runRace(strong);
		const tyreId = poor.entries[0].startingTyreSetId;
		expect(strongResult.finalTyreWear[strong.entries[0].sessionEntryId][tyreId]).toBeLessThan(
			poorResult.finalTyreWear[poor.entries[0].sessionEntryId][tyreId]
		);

		const stayOut = singleCarInput('pit-value', 50);
		stayOut.entries[0].startingTyreSetId = `${stayOut.entries[0].sessionEntryId}-soft`;
		const soft = stayOut.entries[0].tyreSets.find((set) => set.compound.name === 'soft')!;
		soft.compound.baseWearPerLapBp = 450;
		soft.compound.wearTimeLossMsPerLap = 5_000;
		const stop = structuredClone(stayOut);
		stop.commands = [
			{
				sequence: 1,
				sessionEntryId: stop.entries[0].sessionEntryId,
				triggerLap: 22,
				triggerSegmentId: 'seg-14',
				action: { type: 'pit', tyreSetId: `${stop.entries[0].sessionEntryId}-medium` }
			}
		];
		expect(runRace(stop).sessionResults[0].totalTimeMs).toBeLessThan(
			runRace(stayOut).sessionResults[0].totalTimeMs
		);
	});

	test('adds a stronger performance penalty after the compound wear knee', () => {
		const compound = ACADEMY_COMPOUNDS.soft;
		const beforeKneeDelta =
			tyreFactor(compound, compound.wearKneeBp, 8) -
			tyreFactor(compound, compound.wearKneeBp - 1_000, 8);
		const afterKneeDelta =
			tyreFactor(compound, compound.wearKneeBp + 1_000, 8) -
			tyreFactor(compound, compound.wearKneeBp, 8);
		expect(afterKneeDelta).toBeGreaterThan(beforeKneeDelta);
	});

	test('tyre-preserving setup trades peak pace for lower wear', () => {
		const paceSetup = singleCarInput('setup-tradeoff', 20);
		const preservingSetup = structuredClone(paceSetup);
		paceSetup.entries[0].setupFactorPpm = 997_000;
		paceSetup.entries[0].tyreWearSetupPpm = 1_040_000;
		preservingSetup.entries[0].setupFactorPpm = 1_003_000;
		preservingSetup.entries[0].tyreWearSetupPpm = 960_000;
		const paceResult = runRace(paceSetup);
		const preservingResult = runRace(preservingSetup);
		const tyreId = paceSetup.entries[0].startingTyreSetId;
		expect(preservingResult.lapTelemetry[0].lapTimeMs).toBeGreaterThan(
			paceResult.lapTelemetry[0].lapTimeMs
		);
		expect(
			preservingResult.finalTyreWear[preservingSetup.entries[0].sessionEntryId][tyreId]
		).toBeLessThan(paceResult.finalTyreWear[paceSetup.entries[0].sessionEntryId][tyreId]);
	});

	test('pace and relevant car performance improve timing', () => {
		const slowerDriver = singleCarInput('pace', 15);
		const fasterDriver = structuredClone(slowerDriver);
		slowerDriver.entries[0].driver.pace = 25;
		fasterDriver.entries[0].driver.pace = 95;
		expect(runRace(fasterDriver).sessionResults[0].totalTimeMs).toBeLessThan(
			runRace(slowerDriver).sessionResults[0].totalTimeMs
		);

		const baseCar = singleCarInput('car', 8);
		const improvedCar = structuredClone(baseCar);
		baseCar.entries[0].car.corneringHigh = 0.96;
		improvedCar.entries[0].car.corneringHigh = 1.06;
		expect(runRace(improvedCar).sessionResults[0].totalTimeMs).toBeLessThan(
			runRace(baseCar).sessionResults[0].totalTimeMs
		);
	});

	test('consistency reduces seeded finishing-time variance', () => {
		const totals = (consistency: number) =>
			Array.from({ length: 24 }, (_, index) => {
				const input = singleCarInput(`consistency-${index}`, 12);
				input.entries[0].driver.consistency = consistency;
				return runRace(input).sessionResults[0].totalTimeMs;
			});
		expect(variance(totals(95))).toBeLessThan(variance(totals(25)));
	});

	test('faster attackers have a higher pass probability and can pass in-engine', () => {
		const input = twoCarInput('overtaking', 20);
		const attacker = input.entries[1];
		const defender = input.entries[0];
		const segment = FICTIONAL_TRACK.segments[14];
		const faster = overtakeProbability(
			attacker.driver,
			defender.driver,
			7_500,
			8_100,
			'high',
			true,
			segment
		);
		const slower = overtakeProbability(
			attacker.driver,
			defender.driver,
			8_300,
			8_100,
			'normal',
			false,
			segment
		);
		expect(faster).toBeGreaterThan(slower);
		expect(
			overtakeOpportunityProbability(500, 7_500, 8_100, true, segment, FORMULA_CONFIG)
		).toBeGreaterThan(
			overtakeOpportunityProbability(1_100, 8_100, 8_100, false, segment, FORMULA_CONFIG)
		);
		attacker.driver.pace = 100;
		attacker.driver.raceCraft = 100;
		defender.driver.pace = 0;
		defender.driver.raceCraft = 0;
		const result = runRace(input);
		expect(
			result.events.filter(
				(event) =>
					event.type === 'overtake_succeeded' &&
					event.payload.attackerId === attacker.sessionEntryId
			).length
		).toBeGreaterThan(0);
	});

	test('lap distributions remain race-shaped', () => {
		const result = runRace(singleCarInput('distribution', 20));
		const times = result.lapTelemetry.map((lap) => lap.lapTimeMs);
		expect(mean(times)).toBeGreaterThan(85_000);
		expect(mean(times)).toBeLessThan(100_000);
		expect(Math.sqrt(variance(times))).toBeLessThan(4_000);
	});
});
