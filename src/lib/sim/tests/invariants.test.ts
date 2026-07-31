import { describe, expect, test } from 'vitest';
import { runRace } from '../core/engine';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';

describe('full-field invariants and schema output', () => {
	test('completes the 30-car Academy baseline with coherent outputs', () => {
		const input = createAcademyRaceInput({ seed: 'full-field-invariants' });
		const result = runRace(input);
		expect(result.sessionResults).toHaveLength(30);
		expect(result.raceDetails).toHaveLength(30);
		expect(result.lapTelemetry).toHaveLength(30 * 50);
		expect(result.sectorTelemetry).toHaveLength(30 * 50 * 3);
		expect(result.sessionResults.map((entry) => entry.position)).toEqual(
			Array.from({ length: 30 }, (_, index) => index + 1)
		);
		expect(new Set(result.sessionResults.map((entry) => entry.sessionEntryId)).size).toBe(30);
		expect(result.lapTelemetry.every((lap) => lap.lapTimeMs > 0 && lap.fuelGrams >= 0)).toBe(true);
		expect(
			Object.values(result.finalTyreWear).every((sets) =>
				Object.values(sets).every((wear) => wear >= 0 && wear <= 10_000)
			)
		).toBe(true);
		for (const entry of result.sessionResults) {
			const finalLap = result.lapTelemetry
				.filter((lap) => lap.sessionEntryId === entry.sessionEntryId)
				.at(-1)!;
			expect(finalLap.elapsedMs).toBe(entry.totalTimeMs);
			expect(
				result.raceDetails.find((detail) => detail.sessionEntryId === entry.sessionEntryId)!
					.pitStops
			).toBeGreaterThanOrEqual(1);
		}
		const positionPoints = input.rules.points.reduce((sum, points) => sum + points, 0);
		expect(result.pointAwards.reduce((sum, award) => sum + award.points, 0)).toBe(
			positionPoints + input.rules.fastestLapPoint
		);
	});
});
