import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema.js';
import {
	BASE_CONTENT_PACK,
	isPackTeamId,
	type ContentPack,
	validateContentPack
} from './content-pack.js';
import { findManagerBackstory } from '../../src/lib/content/manager-backstories.js';
import {
	MANAGER_AVATAR_SCHEMA_VERSION,
	parseManagerAvatar,
	serializeManagerAvatar
} from '../../src/lib/content/manager-avatar.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type DatabaseExecutor =
	Pick<Database, 'select' | 'insert'> | Pick<Transaction, 'select' | 'insert'>;

const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));
export const SAVE_SCHEMA_VERSION = 5;

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

export class InvalidSaveCreateError extends Error {
	readonly code = 'INVALID_COMMAND' as const;

	constructor(message: string) {
		super(message);
		this.name = 'InvalidSaveCreateError';
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
	managerFirstName: string;
	managerLastName: string;
	managerNationalityId: string;
	managerBackstoryCode: string;
	managerAvatarPayload: string;
	managerAvatarSchemaVersion?: string;
	playerTeamId: string;
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
	const foundation = pack.foundation;
	if (pack.championships.length > 0) {
		await executor
			.insert(schema.championship)
			.values([...pack.championships])
			.onConflictDoNothing();
	}
	if (pack.nationalities.length > 0) {
		await executor
			.insert(schema.nationality)
			.values([...pack.nationalities])
			.onConflictDoNothing();
	}
	if (pack.teams.length > 0) {
		await executor
			.insert(schema.team)
			.values([...pack.teams])
			.onConflictDoNothing();
	}
	await executor.insert(schema.weekendFormatTemplate).values(foundation.weekendFormat);
	await executor.insert(schema.pointsSystem).values([...foundation.pointsSystems]);
	await executor.insert(schema.pointsSystemPlacePoint).values([...foundation.placePoints]);
	await executor.insert(schema.tyreCompound).values([...foundation.tyreCompounds]);
	await executor.insert(schema.tyreCompoundSpec).values([...foundation.tyreCompoundSpecs]);
	await executor.insert(schema.championshipSeasonRuleset).values(foundation.ruleset);
	await executor.insert(schema.weekendFormatSessionSlot).values([...foundation.sessionSlots]);
	await executor
		.insert(schema.rulesetSupplyContractTier)
		.values([...foundation.rulesetSupplyTiers]);
	await executor.insert(schema.rulesetPartCategoryRule).values([...foundation.partCategoryRules]);
	await executor.insert(schema.championshipSeason).values(foundation.season);
	await executor.insert(schema.circuit).values([...foundation.circuits]);
	await executor.insert(schema.circuitLayoutVersion).values([...foundation.layouts]);
	await executor.insert(schema.championshipEvent).values([...foundation.events]);
	await executor.insert(schema.driver).values([...foundation.drivers]);
	await executor.insert(schema.driverHealth).values([...foundation.driverHealth]);
	await executor.insert(schema.teamSeasonEntry).values([...foundation.teamSeasonEntries]);
	await executor.insert(schema.seatAssignment).values([...foundation.seatAssignments]);
	await executor.insert(schema.partDesignVersion).values([...foundation.partDesigns]);
	await executor.insert(schema.chassisInstance).values([...foundation.chassis]);
	await executor
		.insert(schema.eventSessionDefinition)
		.values([...foundation.eventSessionDefinitions]);
	await executor.insert(schema.eventEntry).values([...foundation.eventEntries]);
	await executor.insert(schema.weekendSession).values([...foundation.weekendSessions]);
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
	const managerFirstName = options.managerFirstName?.trim();
	const managerLastName = options.managerLastName?.trim();
	const managerNationalityId = options.managerNationalityId?.trim();
	const managerBackstoryCode = options.managerBackstoryCode?.trim();
	const playerTeamId = options.playerTeamId?.trim();
	const avatar = parseManagerAvatar(options.managerAvatarPayload);
	if (
		!options.displayName ||
		!options.gameVersion ||
		!options.worldDate ||
		!options.rngAlgorithm ||
		!managerFirstName ||
		!managerLastName ||
		!managerNationalityId ||
		!managerBackstoryCode ||
		!playerTeamId ||
		!avatar
	) {
		throw new InvalidSaveCreateError('Save metadata is incomplete.');
	}
	if (!pack.nationalities.some((row) => row.id === managerNationalityId)) {
		throw new InvalidSaveCreateError('managerNationalityId is not a valid nationality.');
	}
	if (!findManagerBackstory(managerBackstoryCode)) {
		throw new InvalidSaveCreateError('managerBackstoryCode is not a valid backstory.');
	}
	if (!isPackTeamId(pack, playerTeamId)) {
		throw new InvalidSaveCreateError('playerTeamId is not a valid career-start team.');
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
				managerFirstName,
				managerLastName,
				managerNationalityId,
				managerBackstoryCode,
				managerAvatarPayload: serializeManagerAvatar(avatar),
				managerAvatarSchemaVersion:
					options.managerAvatarSchemaVersion ?? MANAGER_AVATAR_SCHEMA_VERSION,
				playerTeamId,
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
