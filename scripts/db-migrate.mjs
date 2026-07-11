#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle, migrate } from '@duckdbfan/drizzle-duckdb';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbDir = process.env.XDG_CONFIG_HOME
	? join(process.env.XDG_CONFIG_HOME, 'racing-manager')
	: join(homedir(), '.config', 'racing-manager');
const dbPath = join(dbDir, 'racing-manager.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dbDir, { recursive: true });
const db = await drizzle(dbPath);
try {
	await migrate(db, { migrationsFolder });
	console.log(`Migrated: ${dbPath}`);
} finally {
	await db.close();
}
