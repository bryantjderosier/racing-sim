import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionFactory } from '../electron/db/session-factory.js';
import { createPersistedSessionDefinitionResolver } from '../electron/db/session-input-resolver.js';
import { materializeCurrentSession } from '../electron/db/race-input-materializer.js';
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
import { validateRaceInput } from '../src/lib/sim/core/validate.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-race-input-check-'));
const savePath = join(tempDir, 'race-input.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Race Input Check',
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
		now: '2030-01-01T00:00:00.000Z'
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		const materialized = await materializeCurrentSession(save.db);
		validateRaceInput(materialized.input);
		assert.equal(materialized.materialization.created, false);
		assert.equal(materialized.materialization.inputPersisted, true);
		assert.equal(materialized.input.entries.length, 20);
		assert.equal(materialized.input.track.segments.length, 15);
		assert.equal(materialized.input.rules.lapCount > 0, true);
		assert.equal(materialized.pointsSystemId, null);

		assert.equal((await save.db.select().from(schema.sessionEntry)).length, 20);
		assert.equal((await save.db.select().from(schema.resolvedPerformanceSnapshot)).length, 20);

		const resolver = createPersistedSessionDefinitionResolver({
			clock: () => '2030-01-01T00:00:00.000Z'
		});
		const resolved = await resolver(save.db);
		assert.ok(resolved);
		assert.equal(resolved.options.pointsSystemId, null);
		assert.deepEqual(resolved.input, materialized.input);

		const session = await new SessionFactory(resolver).createOrResume(save.db);
		assert.ok(session);
		await session.start();
		while (session.status === 'live') await session.step();
		assert.equal(session.status, 'finished');
		assert.equal((await save.db.select().from(schema.sessionResult)).length, 20);
		assert.equal((await save.db.select().from(schema.sessionPointAward)).length, 0);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Race input materialization valid: seeded FDC practice session ran to 20 persisted results.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
