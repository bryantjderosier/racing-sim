import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCurrentWeekend, getSessionResults } from '../electron/db/read-models.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-read-model-check-'));
const savePath = join(tempDir, 'read-model.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Read Model Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4])
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		assert.equal(await getCurrentWeekend(save.db), null);
		assert.deepEqual(await getSessionResults(save.db, 'missing-weekend-session'), []);
	} finally {
		closeSaveDatabase(save);
	}
	console.log('Read models valid: empty current-weekend and result queries passed.');
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
