import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeCheckpoint } from '../electron/db/checkpoint-repository.js';
import { finalizeSession } from '../electron/db/result-repository.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const weekendSessionId = '00000000-0000-4000-8000-000000000100';
const firstEntryId = '00000000-0000-4000-8000-000000000101';
const secondEntryId = '00000000-0000-4000-8000-000000000102';
const pointsSystemId = '00000000-0000-4000-8000-000000000103';
const now = '2030-01-01T00:00:00.000Z';
const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-result-check-'));
const savePath = join(tempDir, 'result.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Result Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		now
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		await save.client.execute('PRAGMA foreign_keys = OFF');
		await save.client.execute({
			sql: `INSERT INTO weekend_session
				(id, event_session_definition_id, status, temp_c, rain_now, rain_in_minutes, track_wetness)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
			args: [weekendSessionId, 'fixture-session-definition', 'live', 22, 0, 0, 0]
		});
		await save.client.execute({
			sql: `INSERT INTO session_entry
				(id, weekend_session_id, event_entry_id, driver_id, grid_slot, start_status, resolved_performance_snapshot_id)
				VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
			args: [
				firstEntryId,
				weekendSessionId,
				'fixture-event-entry-1',
				'fixture-driver-1',
				1,
				'started',
				'fixture-snapshot-1',
				secondEntryId,
				weekendSessionId,
				'fixture-event-entry-2',
				'fixture-driver-2',
				2,
				'started',
				'fixture-snapshot-2'
			]
		});
		await save.client.execute('PRAGMA foreign_keys = ON');
		assert.equal((await save.client.execute('PRAGMA foreign_keys')).rows[0]?.foreign_keys, 1);
		await save.db.insert(schema.pointsSystem).values({
			id: pointsSystemId,
			code: 'fixture',
			version: 1,
			polePoints: 0,
			fastestLapPoints: 1,
			fastestLapMinFinishPosition: null,
			fastestLapRequiresClassified: false,
			shortenedRaceAllocationMode: 'none',
			shortenedRaceDistancePctThreshold: null,
			classificationRequirePctDistance: null,
			notes: null
		});

		await writeCheckpoint(save.db, {
			weekendSessionId,
			checkpointSeq: 1,
			simClockMs: 1_000,
			rngAlgorithm: 'xoshiro128ss',
			rngStates: { race: { s0: 1, s1: 2, s2: 3, s3: 4 } },
			phase: 'green',
			safetyCarState: { payload: { active: false }, schemaVersion: 'safety-v1' },
			resumeState: { payload: { step: 1 }, schemaVersion: 'resume-v1' },
			leaderSessionEntryId: firstEntryId,
			checkpointedAt: now,
			cars: [
				{
					sessionEntryId: firstEntryId,
					currentLap: 1,
					sectorIndex: 1,
					waypointProgress: 0.5,
					racePosition: 1,
					gapToLeaderMs: 0,
					intervalAheadMs: 0,
					currentLapTimeMs: 10_000,
					lastSectorTimeMs: null,
					sectorTimesMs: [],
					pitPhase: 'on_track',
					pitPhaseElapsedMs: 0,
					fuelKg: 20,
					mountedTyreSetId: null,
					ersChargePercent: 80,
					engineMode: 'balanced',
					pitStopsCompleted: 0,
					penalty: {},
					penaltySchemaVersion: 'penalty-v1',
					simulationState: {
						payload: { sessionEntryId: firstEntryId },
						schemaVersion: 'simulation-v1'
					},
					retirementState: 'running',
					retirementReason: null
				}
			]
		});

		const output = {
			metadata: {
				formulaVersion: 'test-v1',
				engineVersion: 'test-v1',
				rngAlgorithm: 'xoshiro128ss' as const,
				seed: 'result-check',
				inputHash: 'test-input'
			},
			sessionResults: [
				{
					sessionEntryId: firstEntryId,
					position: 1,
					gridPosition: 1,
					status: 'finished' as const,
					totalTimeMs: 100_000,
					gapToWinnerMs: 0,
					bestLapMs: 10_000,
					lapsCompleted: 10
				},
				{
					sessionEntryId: secondEntryId,
					position: 2,
					gridPosition: 2,
					status: 'finished' as const,
					totalTimeMs: 100_500,
					gapToWinnerMs: 500,
					bestLapMs: 10_050,
					lapsCompleted: 10
				}
			],
			raceDetails: [
				{ sessionEntryId: firstEntryId, pitStops: 1, lapsLed: 10, positionsGained: 0 },
				{ sessionEntryId: secondEntryId, pitStops: 1, lapsLed: 0, positionsGained: 0 }
			],
			pointAwards: [{ sessionEntryId: firstEntryId, reason: 'position' as const, points: 25 }],
			events: [
				{
					sequence: 1,
					type: 'segment_completed' as const,
					simulationTimeMs: 100,
					lap: 1,
					segmentId: 's1',
					sessionEntryIds: [firstEntryId],
					payload: {}
				},
				{
					sequence: 2,
					type: 'overtake_attempted' as const,
					simulationTimeMs: 200,
					lap: 1,
					segmentId: 's2',
					sessionEntryIds: [firstEntryId, secondEntryId],
					payload: {}
				},
				{
					sequence: 3,
					type: 'overtake_succeeded' as const,
					simulationTimeMs: 300,
					lap: 1,
					segmentId: 's2',
					sessionEntryIds: [firstEntryId, secondEntryId],
					payload: { passed: secondEntryId }
				},
				{
					sequence: 4,
					type: 'tyre_set_mounted' as const,
					simulationTimeMs: 400,
					lap: 1,
					segmentId: 'pit-exit',
					sessionEntryIds: [firstEntryId],
					payload: { tyreSetId: 'set-1' }
				},
				{
					sequence: 5,
					type: 'car_finished' as const,
					simulationTimeMs: 100_000,
					lap: 10,
					segmentId: 'finish',
					sessionEntryIds: [firstEntryId],
					payload: { position: 1 }
				},
				{
					sequence: 6,
					type: 'car_finished' as const,
					simulationTimeMs: 100_500,
					lap: 10,
					segmentId: 'finish',
					sessionEntryIds: [secondEntryId],
					payload: { position: 2 }
				}
			],
			lapTelemetry: [],
			sectorTelemetry: [],
			finalTyreWear: {},
			finalStateHash: 'result-check-hash'
		};
		const first = await finalizeSession(save.db, output, {
			weekendSessionId,
			pointsSystemId,
			finalizedAt: now,
			lapsBehindByEntry: { [secondEntryId]: 0 }
		});
		assert.equal(first.idempotent, false);
		assert.equal(Object.keys(first.sessionResultIds).length, 2);
		assert.equal(first.persistedEventCount, 4);
		const second = await finalizeSession(save.db, output, {
			weekendSessionId,
			pointsSystemId,
			finalizedAt: now
		});
		assert.equal(second.idempotent, true);
		assert.deepEqual(second.sessionResultIds, first.sessionResultIds);
		assert.equal(second.persistedEventCount, 4);
		assert.equal((await save.db.select().from(schema.sessionResult)).length, 2);
		assert.equal((await save.db.select().from(schema.raceResultDetail)).length, 2);
		assert.equal((await save.db.select().from(schema.sessionPointAward)).length, 1);
		assert.equal((await save.db.select().from(schema.sessionEvent)).length, 4);
		assert.equal((await save.db.select().from(schema.sessionCheckpoint)).length, 0);
		const session = await save.db.select().from(schema.weekendSession);
		assert.equal(session[0]?.status, 'finished');
		assert.equal(session[0]?.activeCheckpointId, null);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Result repository valid: idempotent finalization and compact event filtering passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
