import { drizzle } from '@duckdbfan/drizzle-duckdb';
import { migrate } from '@duckdbfan/drizzle-duckdb';
import * as schema from '../db/schema.js';
import type { AppDb } from './connection.js';

export type { AppDb } from './connection.js';

/** Open DuckDB at an arbitrary path (scripts / tests; no Electron app required). */
export async function openDbAt(dbPath: string, options?: { migrateFolder?: string }): Promise<AppDb> {
	const db = await drizzle(dbPath, { schema });
	if (options?.migrateFolder) {
		await migrate(db, { migrationsFolder: options.migrateFolder });
	}
	return db;
}
