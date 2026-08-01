import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAcademyRaceInput } from '../src/lib/sim/fixtures/academy-baseline.js';
import { SessionFactory } from '../electron/db/session-factory.js';
import {
	createPersistedSessionDefinitionResolver,
	SessionInputResolverError
} from '../electron/db/session-input-resolver.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-session-factory-check-'));
const savePath = join(tempDir, 'session-factory.sqlite');
const input = createAcademyRaceInput({
	seed: 'session-factory-check',
	entryCount: 1,
	lapCount: 10
});

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Session Factory Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4])
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		const emptyFactory = new SessionFactory(async () => null);
		assert.equal(await emptyFactory.createOrResume(save.db), null);
		const weekendSessionId = 'factory-weekend';
		const eventSessionDefinitionId = 'factory-session-definition';
		const pointsSystemId = 'factory-points';
		await save.client.execute('PRAGMA foreign_keys = OFF');
		await save.client.execute({
			sql: `INSERT INTO event_session_definition
				(id, championship_event_id, source_slot_id, sequence, session_kind, scheduled_start,
				scheduled_laps, scheduled_minutes, drs_enabled_override, grid_source_session_definition_id,
				reverse_grid_count, mandatory_pit_stops, required_compound_rule_id, points_system_id,
				fastest_lap_point_eligible, parc_ferme_from_previous)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				eventSessionDefinitionId,
				'factory-event',
				'factory-slot',
				1,
				'feature_race',
				'2030-01-01T12:00:00.000Z',
				10,
				null,
				null,
				null,
				0,
				0,
				null,
				pointsSystemId,
				false,
				false
			]
		});
		await save.client.execute('PRAGMA foreign_keys = ON');
		const resolver = createPersistedSessionDefinitionResolver({
			clock: () => '2030-01-01T00:00:00.000Z'
		});
		const sessionFactory = new SessionFactory(resolver);
		const created = await sessionFactory.createFromMaterialization(save.db, {
			weekendSessionId,
			eventSessionDefinitionId,
			input,
			conditions: { tempC: 22, trackWetness: 0 }
		});
		assert.equal(created.materialization.created, true);
		assert.equal(created.materialization.inputPersisted, true);
		const resolved = await resolver(save.db);
		assert.ok(resolved);
		assert.equal(resolved.input.seed, input.seed);
		assert.equal(resolved.options.weekendSessionId, weekendSessionId);
		const session = created.session;
		assert.equal(session.status, 'idle');
		await session.close();
		assert.equal(session.status, 'closed');
		const reopened = await sessionFactory.createFromMaterialization(save.db, {
			weekendSessionId,
			eventSessionDefinitionId,
			input
		});
		assert.equal(reopened.materialization.created, false);
		await reopened.session.close();
		await save.client.execute({
			sql: `UPDATE weekend_session SET simulation_input_payload = ? WHERE id = ?`,
			args: ['{}', weekendSessionId]
		});
		await assert.rejects(
			() => resolver(save.db),
			(error: unknown) => error instanceof SessionInputResolverError
		);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Session factory valid: resolver-driven idle creation and no-definition handling passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
