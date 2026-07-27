import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let client: Client | null = null;
let db: AppDb | null = null;

export function getDbPath() {
	return join(app.getPath('userData'), 'racing-manager.sqlite');
}

export function getDb() {
	if (db) return db;

	client = createClient({ url: pathToFileURL(getDbPath()).href });
	db = drizzle(client, { schema });
	return db;
}

export async function closeDb() {
	if (client) {
		client.close();
		client = null;
		db = null;
	}
}

export async function resetDb() {
	await closeDb();

	const dbPath = getDbPath();
	for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
		try {
			await unlink(path);
		} catch {
			// file may not exist
		}
	}
}
