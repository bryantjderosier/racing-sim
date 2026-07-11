import { migrate } from '@duckdbfan/drizzle-duckdb';
import { app } from 'electron';
import { join } from 'node:path';
import { closeDb, getDb, resetDb } from './index.js';

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === '1';

async function applyMigrations() {
	const db = await getDb();
	const migrationsFolder = join(app.getAppPath(), 'drizzle');
	await migrate(db, { migrationsFolder });
}

export async function runMigrations() {
	try {
		await applyMigrations();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const isStaleSchema =
			message.includes('already exists') || message.includes('Duplicate key');

		if (!isDev || !isStaleSchema) {
			throw error;
		}

		console.warn('[db] Stale local database detected — resetting and re-running migrations.');
		await resetDb();
		await applyMigrations();
	}
}

export async function shutdownDb() {
	await closeDb();
}
