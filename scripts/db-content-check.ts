import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';
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
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK,
		now: '2030-01-01T00:00:00.000Z'
	});
	const opened = await openSaveDatabase({ targetPath: savePath });
	try {
		const saves = await opened.db.select().from(schema.saveGame);
		const championships = await opened.db.select().from(schema.championship);
		const nationalities = await opened.db.select().from(schema.nationality);
		const teams = await opened.db.select().from(schema.team);
		if (saves.length !== 1) throw new Error('Expected one SaveGame row.');
		if (championships.length !== BASE_CONTENT_PACK.championships.length) {
			throw new Error('Expected all foundation championships to be seeded.');
		}
		if (nationalities.length !== BASE_CONTENT_PACK.nationalities.length) {
			throw new Error('Expected all foundation nationalities to be seeded.');
		}
		if (teams.length !== BASE_CONTENT_PACK.teams.length) {
			throw new Error('Expected all foundation teams to be seeded.');
		}
		if (
			saves[0]?.managerFirstName !== 'Test' ||
			saves[0]?.managerLastName !== 'Manager' ||
			saves[0]?.playerTeamId !== FOUNDATION_FDC_TEAMS[0].id
		) {
			throw new Error('Expected manager and player team to be persisted on SaveGame.');
		}
		const repeat = await seedContentPack(opened.db, BASE_CONTENT_PACK);
		if (repeat.seeded) throw new Error('Same-version content seeding was not idempotent.');
		const nextPack = {
			...BASE_CONTENT_PACK,
			manifest: {
				...BASE_CONTENT_PACK.manifest,
				contentDataVersion: `${BASE_CONTENT_PACK.manifest.contentDataVersion}-next`
			}
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
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
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
		`Content pack valid: ${created.contentDataVersion}, ${BASE_CONTENT_PACK.championships.length} championships, ${BASE_CONTENT_PACK.nationalities.length} nationalities, ${BASE_CONTENT_PACK.teams.length} teams seeded.`
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
