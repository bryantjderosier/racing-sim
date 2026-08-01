import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema.js';
import { BASE_CONTENT_PACK, type ContentPack, validateContentPack } from './content-pack.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type DatabaseExecutor =
	Pick<Database, 'select' | 'insert'> | Pick<Transaction, 'select' | 'insert'>;

const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));
const SAVE_SCHEMA_VERSION = 1;

export class SaveAlreadyExistsError extends Error {
	readonly code = 'SAVE_ALREADY_EXISTS' as const;

	constructor(path: string) {
		super(`A save already exists at ${path}.`);
		this.name = 'SaveAlreadyExistsError';
	}
}

export class SaveNotFoundError extends Error {
	readonly code = 'SAVE_NOT_FOUND' as const;

	constructor(path: string) {
		super(`No save exists at ${path}.`);
		this.name = 'SaveNotFoundError';
	}
}

export class ContentPackVersionMismatchError extends Error {
	readonly code = 'CONTENT_VERSION_MISMATCH' as const;

	constructor(existing: string, requested: string) {
		super(`Save is pinned to ${existing}; requested content version ${requested}.`);
		this.name = 'ContentPackVersionMismatchError';
	}
}

export class SaveMetadataMissingError extends Error {
	readonly code = 'SAVE_METADATA_MISSING' as const;

	constructor() {
		super('Save metadata is missing; content cannot be seeded into an uninitialized save.');
		this.name = 'SaveMetadataMissingError';
	}
}

export interface SaveDatabase {
	client: Client;
	db: Database;
	path: string;
}

export interface CreateSaveOptions {
	targetPath: string;
	displayName: string;
	gameVersion: string;
	worldDate: string;
	rngAlgorithm: string;
	rngState: Uint8Array;
	pack?: ContentPack;
	now?: string;
	migrationsFolder?: string;
}

export interface CreateSaveResult {
	path: string;
	saveId: string;
	contentDataVersion: string;
}

async function ensureTargetDoesNotExist(targetPath: string) {
	try {
		await stat(targetPath);
		throw new SaveAlreadyExistsError(targetPath);
	} catch (error) {
		if (error instanceof SaveAlreadyExistsError) throw error;
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
}

async function insertContentPackRows(executor: DatabaseExecutor, pack: ContentPack) {
	validateContentPack(pack);
	if (pack.championships.length > 0) {
		await executor
			.insert(schema.championship)
			.values([...pack.championships])
			.onConflictDoNothing();
	}
}

export async function seedContentPack(db: Database, pack: ContentPack) {
	validateContentPack(pack);
	return db.transaction(async (tx) => {
		const existing = await tx
			.select({ contentDataVersion: schema.saveGame.contentDataVersion })
			.from(schema.saveGame)
			.limit(1);
		const existingVersion = existing[0]?.contentDataVersion;
		if (!existingVersion) throw new SaveMetadataMissingError();
		if (existingVersion !== pack.manifest.contentDataVersion) {
			throw new ContentPackVersionMismatchError(existingVersion, pack.manifest.contentDataVersion);
		}
		return { seeded: false, contentDataVersion: existingVersion };
	});
}

export async function openSaveDatabase(options: {
	targetPath: string;
	migrationsFolder?: string;
}): Promise<SaveDatabase> {
	const path = resolve(options.targetPath);
	try {
		await stat(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new SaveNotFoundError(path);
		throw error;
	}

	const client = createClient({ url: pathToFileURL(path).href });
	const db = drizzle(client, { schema });
	try {
		await migrate(db, { migrationsFolder: options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER });
		const saves = await db.select({ id: schema.saveGame.id }).from(schema.saveGame).limit(1);
		if (saves.length !== 1) throw new SaveMetadataMissingError();
		return { client, db, path };
	} catch (error) {
		client.close();
		throw error;
	}
}

export function closeSaveDatabase(save: SaveDatabase) {
	save.client.close();
}

export async function createSaveDatabase(options: CreateSaveOptions): Promise<CreateSaveResult> {
	const targetPath = resolve(options.targetPath);
	const pack = options.pack ?? BASE_CONTENT_PACK;
	validateContentPack(pack);
	if (!options.displayName || !options.gameVersion || !options.worldDate || !options.rngAlgorithm) {
		throw new Error('Save metadata is incomplete.');
	}

	await ensureTargetDoesNotExist(targetPath);
	await mkdir(dirname(targetPath), { recursive: true });
	const tempPath = join(dirname(targetPath), `.${basename(targetPath)}.tmp-${randomUUID()}`);
	const saveId = randomUUID();
	const now = options.now ?? new Date().toISOString();
	const client = createClient({ url: pathToFileURL(tempPath).href });
	const db = drizzle(client, { schema });

	try {
		await migrate(db, { migrationsFolder: options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER });
		await db.transaction(async (tx) => {
			await insertContentPackRows(tx, pack);
			await tx.insert(schema.saveGame).values({
				id: saveId,
				singletonKey: 1,
				displayName: options.displayName,
				schemaVersion: SAVE_SCHEMA_VERSION,
				gameVersion: options.gameVersion,
				contentDataVersion: pack.manifest.contentDataVersion,
				worldDate: options.worldDate,
				rngAlgorithm: options.rngAlgorithm,
				rngState: Buffer.from(options.rngState),
				createdAt: now,
				updatedAt: now
			});
		});

		const saves = await db.select({ id: schema.saveGame.id }).from(schema.saveGame).limit(2);
		if (saves.length !== 1 || saves[0]?.id !== saveId) {
			throw new Error('Save integrity check failed after creation.');
		}
		client.close();
		await rename(tempPath, targetPath);
		return { path: targetPath, saveId, contentDataVersion: pack.manifest.contentDataVersion };
	} catch (error) {
		client.close();
		await rm(tempPath, { force: true });
		throw error;
	}
}
