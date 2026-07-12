import { migrate } from '@duckdbfan/drizzle-duckdb';
import { app } from 'electron';
import { join } from 'node:path';
import { closeDb, getActiveDbPath, getDb, resetDb } from './index.js';

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === '1';

export function defaultMigrationsFolder(): string {
	return join(app.getAppPath(), 'drizzle');
}

async function applyMigrations(migrationsFolder: string) {
	if (!getActiveDbPath()) {
		throw new Error('Cannot migrate: no active career database path.');
	}
	const db = await getDb();
	await migrate(db, { migrationsFolder });
}

/** Migrate the currently active career DB. */
export async function runMigrations(migrationsFolder = defaultMigrationsFolder()) {
	try {
		await applyMigrations(migrationsFolder);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const isStaleSchema =
			message.includes('already exists') || message.includes('Duplicate key');

		if (!isDev || !isStaleSchema) {
			throw error;
		}

		console.warn('[db] Stale local database detected — resetting and re-running migrations.');
		await resetDb();
		await applyMigrations(migrationsFolder);
	}
}

export async function shutdownDb() {
	await closeDb();
}
