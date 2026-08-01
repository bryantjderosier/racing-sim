import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import {
	closeSaveDatabase,
	ContentPackVersionMismatchError,
	createSaveDatabase,
	openSaveDatabase,
	SaveAlreadyExistsError,
	seedContentPack
} from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-content-check-'));
const savePath = join(tempDir, 'foundation.sqlite');

try {
	const created = await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Content Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK,
		now: '2030-01-01T00:00:00.000Z'
	});
	const opened = await openSaveDatabase({ targetPath: savePath });
	try {
		const saves = await opened.db.select().from(schema.saveGame);
		const championships = await opened.db.select().from(schema.championship);
		if (saves.length !== 1) throw new Error('Expected one SaveGame row.');
		if (championships.length !== BASE_CONTENT_PACK.championships.length) {
			throw new Error('Expected all foundation championships to be seeded.');
		}
		const repeat = await seedContentPack(opened.db, BASE_CONTENT_PACK);
		if (repeat.seeded) throw new Error('Same-version content seeding was not idempotent.');
		const nextPack = {
			...BASE_CONTENT_PACK,
			manifest: { ...BASE_CONTENT_PACK.manifest, contentDataVersion: 'foundation-v2' }
		};
		await seedContentPack(opened.db, nextPack).then(
			() => {
				throw new Error('Mismatched content version was accepted.');
			},
			(error: unknown) => {
				if (!(error instanceof ContentPackVersionMismatchError)) throw error;
			}
		);
	} finally {
		closeSaveDatabase(opened);
	}

	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Duplicate',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK
	}).then(
		() => {
			throw new Error('Existing save target was overwritten.');
		},
		(error: unknown) => {
			if (!(error instanceof SaveAlreadyExistsError)) throw error;
		}
	);

	console.log(
		`Content pack valid: ${created.contentDataVersion}, ${BASE_CONTENT_PACK.championships.length} championships seeded.`
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
