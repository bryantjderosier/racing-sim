import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	getCareerIdentity,
	getCurrentWeekend,
	getSessionResults
} from '../electron/db/read-models.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-read-model-check-'));
const savePath = join(tempDir, 'read-model.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Read Model Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4])
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		assert.equal(await getCurrentWeekend(save.db), null);
		assert.deepEqual(await getSessionResults(save.db, 'missing-weekend-session'), []);
		const identity = await getCareerIdentity(save.db);
		assert.ok(identity);
		assert.equal(identity.displayName, 'Read Model Check');
		assert.equal(identity.managerFirstName, 'Test');
		assert.equal(identity.managerLastName, 'Manager');
		assert.equal(identity.team?.id, FOUNDATION_FDC_TEAMS[0].id);
	} finally {
		closeSaveDatabase(save);
	}
	console.log('Read models valid: identity, empty current-weekend, and result queries passed.');
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
