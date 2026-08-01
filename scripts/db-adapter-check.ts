import { strict as assert } from 'node:assert';
import { RaceSimulation } from '../src/lib/sim/core/engine.js';
import { createAcademyRaceInput } from '../src/lib/sim/fixtures/academy-baseline.js';
import {
	checkpointWriteFromSnapshot,
	SimulationAdapterError
} from '../electron/db/simulation-persistence-adapter.js';

const input = createAcademyRaceInput({ seed: 'persistence-adapter', entryCount: 2, lapCount: 6 });
const simulation = new RaceSimulation(input);
simulation.step();
const snapshot = simulation.snapshot();
const context = {
	weekendSessionId: 'fixture-session',
	checkpointSeq: 1,
	simClockMs: 1_000,
	rngAlgorithm: 'xoshiro128ss',
	phase: 'green' as const,
	safetyCarState: { payload: { active: false }, schemaVersion: 'safety-v1' },
	leaderSessionEntryId: input.entries[0]?.sessionEntryId ?? null,
	checkpointedAt: '2030-01-01T00:00:00.000Z',
	weatherStateSchemaVersion: undefined,
	strategyStateSchemaVersion: undefined,
	resumeStateSchemaVersion: 'resume-v1',
	simulationStateSchemaVersion: 'simulation-v1',
	carContexts: Object.fromEntries(
		snapshot.states.map((state) => [
			state.sessionEntryId,
			{
				currentLap: 1,
				sectorIndex: 1,
				waypointProgress: 0,
				racePosition: state.gridPosition,
				gapToLeaderMs: 0,
				intervalAheadMs: 0,
				lastSectorTimeMs: null,
				sectorTimesMs: [],
				pitPhase: 'on_track' as const,
				pitPhaseElapsedMs: 0,
				ersChargePercent: 100,
				penalty: {},
				penaltySchemaVersion: 'penalty-v1',
				retirementState: 'running' as const,
				retirementReason: null
			}
		])
	)
};
const checkpoint = checkpointWriteFromSnapshot(snapshot, context);
assert.deepEqual(checkpoint.rngStates, snapshot.rngStates);
assert.equal(checkpoint.cars.length, snapshot.states.length);
assert.equal(checkpoint.cars[0]?.currentLapTimeMs, snapshot.states[0]?.currentLapTimeMs);
assert.equal(checkpoint.cars[0]?.fuelKg, (snapshot.states[0]?.fuelGrams ?? 0) / 1_000);

const missingContext = { ...context, carContexts: {} };
assert.throws(
	() => checkpointWriteFromSnapshot(snapshot, missingContext),
	(error: unknown) => error instanceof SimulationAdapterError
);
console.log(
	'Simulation persistence adapter valid: snapshot mapping and context validation passed.'
);
