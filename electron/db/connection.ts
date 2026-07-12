import { unlink } from 'node:fs/promises';
import { drizzle } from '@duckdbfan/drizzle-duckdb';
import * as schema from './schema.js';

export type AppDb = Awaited<ReturnType<typeof drizzle<typeof schema>>>;

let activeDbPath: string | null = null;
let db: AppDb | null = null;

export function getActiveDbPath(): string | null {
	return activeDbPath;
}

/** Set the DuckDB file used by getDb(). Pass null to clear (after close). */
export function setActiveDbPath(path: string | null): void {
	activeDbPath = path;
}

export async function getDb(): Promise<AppDb> {
	if (db) return db;
	if (!activeDbPath) {
		throw new Error('No active career database. Open or create a career first.');
	}
	db = await drizzle(activeDbPath, { schema });
	return db;
}

export async function closeDb(): Promise<void> {
	if (db) {
		await db.close();
		db = null;
	}
}

/** Close and delete the active DB files (dev reset). */
export async function resetActiveDbFiles(): Promise<void> {
	await closeDb();
	if (!activeDbPath) return;
	const dbPath = activeDbPath;
	for (const path of [dbPath, `${dbPath}.wal`]) {
		try {
			await unlink(path);
		} catch {
			// may not exist
		}
	}
}
