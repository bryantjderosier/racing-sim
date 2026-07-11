import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { app } from 'electron';
import { drizzle } from '@duckdbfan/drizzle-duckdb';
import * as schema from './schema.js';

let db: Awaited<ReturnType<typeof drizzle<typeof schema>>> | null = null;

export function getDbPath() {
	return join(app.getPath('userData'), 'racing-manager.duckdb');
}

export async function getDb() {
	if (db) return db;

	db = await drizzle(getDbPath(), { schema });
	return db;
}

export async function closeDb() {
	if (db) {
		await db.close();
		db = null;
	}
}

export async function resetDb() {
	await closeDb();

	const dbPath = getDbPath();
	for (const path of [dbPath, `${dbPath}.wal`]) {
		try {
			await unlink(path);
		} catch {
			// file may not exist
		}
	}
}
