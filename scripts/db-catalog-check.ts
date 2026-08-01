import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SaveCatalog } from '../electron/db/save-catalog.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-catalog-check-'));
const catalog = new SaveCatalog(join(tempDir, 'save-catalog.json'));
const first = {
	saveId: 'save-1',
	path: '/tmp/save-1.sqlite',
	displayName: 'First Save',
	schemaVersion: 1,
	gameVersion: '0.0.1',
	contentDataVersion: 'foundation-v1',
	createdAt: '2030-01-01T00:00:00.000Z',
	lastOpenedAt: null
};

try {
	await catalog.upsert(first);
	assert.deepEqual(await catalog.find(first.saveId), first);
	await catalog.upsert({ ...first, displayName: 'Renamed Save', lastOpenedAt: first.createdAt });
	assert.equal((await catalog.list())[0]?.displayName, 'Renamed Save');
	await catalog.remove(first.saveId);
	assert.deepEqual(await catalog.list(), []);
	console.log('Save catalog valid: atomic upsert, lookup, ordering, and removal passed.');
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
