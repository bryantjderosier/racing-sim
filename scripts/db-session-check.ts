import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAcademyRaceInput } from '../src/lib/sim/fixtures/academy-baseline.js';
import { SessionLifecycleError, SessionOrchestrator } from '../electron/db/session-orchestrator.js';
import { SessionFactory } from '../electron/db/session-factory.js';
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

const input = createAcademyRaceInput({ seed: 'session-orchestration', entryCount: 2, lapCount: 2 });
input.commands = [];
const weekendSessionId = '00000000-0000-4000-8000-000000000200';
const pointsSystemId = '00000000-0000-4000-8000-000000000201';
const now = '2030-01-01T00:00:00.000Z';
const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-session-check-'));
const savePath = join(tempDir, 'session.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Session Check',
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
				VALUES ${input.entries.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
			args: input.entries.flatMap((entry, index) => [
				entry.sessionEntryId,
				weekendSessionId,
				`fixture-event-entry-${index}`,
				`fixture-driver-${index}`,
				entry.gridPosition,
				'started',
				`fixture-snapshot-${index}`
			])
		});
		await save.client.execute({
			sql: `INSERT INTO tyre_set
				(id, event_entry_id, tyre_compound_spec_id, set_index, wear_percent, status)
				VALUES ${input.entries.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
			args: input.entries.flatMap((entry, index) => [
				entry.startingTyreSetId,
				`fixture-event-entry-${index}`,
				`fixture-compound-spec-${index}`,
				0,
				0,
				'available'
			])
		});
		await save.client.execute('PRAGMA foreign_keys = ON');
		await save.db.insert(schema.pointsSystem).values({
			id: pointsSystemId,
			code: 'session_fixture',
			version: 1,
			polePoints: 0,
			fastestLapPoints: 0,
			fastestLapMinFinishPosition: null,
			fastestLapRequiresClassified: false,
			shortenedRaceAllocationMode: 'none',
			shortenedRaceDistancePctThreshold: null,
			classificationRequirePctDistance: null,
			notes: null
		});

		const checkpointReasons: string[] = [];
		const orchestrationOptions = {
			weekendSessionId,
			pointsSystemId,
			clock: () => now,
			checkpointContext: (snapshot, reason, checkpointSeq) => {
				checkpointReasons.push(reason);
				return {
					weekendSessionId,
					checkpointSeq,
					simClockMs: Math.max(...snapshot.states.map((state) => state.elapsedMs)),
					rngAlgorithm: 'xoshiro128ss',
					phase: reason === 'finish' ? 'chequered' : 'green',
					safetyCarState: { payload: { active: false }, schemaVersion: 'safety-v1' },
					resumeStateSchemaVersion: 'resume-v1',
					simulationStateSchemaVersion: 'simulation-v1',
					leaderSessionEntryId: input.entries[0]?.sessionEntryId ?? null,
					checkpointedAt: now,
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
			}
		};
		const orchestrator = new SessionOrchestrator(save.db, input, orchestrationOptions);
		await orchestrator.start();
		assert.equal(orchestrator.status, 'live');
		assert.equal(
			await orchestrator.issueStrategy({
				sequence: 90,
				sessionEntryId: input.entries[0]!.sessionEntryId,
				triggerLap: 1,
				triggerSegmentId: input.track.segments[0]!.id,
				action: { type: 'set_mode', mode: 'attack' }
			}),
			true
		);
		await orchestrator.pause();
		assert.equal(orchestrator.status, 'paused');
		await assert.rejects(
			() => orchestrator.step(),
			(error: unknown) => error instanceof SessionLifecycleError
		);
		await orchestrator.close();
		assert.equal(orchestrator.status, 'closed');
		const sessionFactory = new SessionFactory(async () => ({
			input,
			options: orchestrationOptions
		}));
		const resumed = await sessionFactory.createOrResume(save.db);
		assert.ok(resumed);
		assert.equal(resumed.status, 'paused');
		await resumed.resume();
		while (resumed.status === 'live') await resumed.step();
		assert.equal(resumed.status, 'finished');
		assert.equal(checkpointReasons[0], 'start');
		assert.ok(checkpointReasons.includes('manual'));
		assert.ok(checkpointReasons.includes('pause'));
		assert.ok(checkpointReasons.includes('lap'));
		assert.equal(checkpointReasons.at(-1), 'finish');
		assert.equal((await save.db.select().from(schema.sessionResult)).length, input.entries.length);
		assert.equal((await save.db.select().from(schema.sessionCheckpoint)).length, 0);
		const session = await save.db.select().from(schema.weekendSession);
		assert.equal(session[0]?.status, 'finished');
		await assert.rejects(
			() => resumed.step(),
			(error: unknown) => error instanceof SessionLifecycleError
		);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Session orchestration valid: lifecycle checkpoints and automatic finalization passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
