#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const root = fileURLToPath(new URL('..', import.meta.url));
const migrationsFolder = join(root, 'drizzle');
const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-db-check-'));
const dbPath = join(tempDir, 'schema-check.sqlite');
const client = createClient({ url: pathToFileURL(dbPath).href });

const requiredTables = [
	'save_game',
	'save_migration_history',
	'championship',
	'driver',
	'team',
	'event_session_definition',
	'weekend_session',
	'session_result',
	'session_checkpoint',
	'session_event',
	'session_telemetry_archive',
	'calendar_transition',
	'daily_phase_execution'
];

try {
	await migrate(drizzle(client), { migrationsFolder });
	const tables = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '__drizzle_%'"
	);
	const tableNames = new Set(tables.rows.map((row) => String(row.name)));
	const missingTables = requiredTables.filter((table) => !tableNames.has(table));
	if (missingTables.length > 0)
		throw new Error(`Missing required tables: ${missingTables.join(', ')}`);

	const foreignKeys = await client.execute('PRAGMA foreign_keys');
	if (foreignKeys.rows[0]?.foreign_keys !== 1) throw new Error('SQLite foreign keys are disabled');

	const saveGame = await client.execute(
		"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'save_game'"
	);
	if (!String(saveGame.rows[0]?.sql).includes('save_game_singleton_key_check')) {
		throw new Error('SaveGame singleton constraint is missing');
	}

	const driverColumns = await client.execute('PRAGMA table_info(driver)');
	const driverColumnNames = new Set(driverColumns.rows.map((row) => String(row.name)));
	if (
		driverColumnNames.has('ers_management') ||
		driverColumnNames.has('ers_management_potential')
	) {
		throw new Error('Deprecated ERS driver columns are still present');
	}

	console.log(`Database schema valid: ${tableNames.size} tables, foreign keys enabled.`);
} finally {
	client.close();
	await rm(tempDir, { recursive: true, force: true });
}
