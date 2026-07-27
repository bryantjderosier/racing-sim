#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbDir = process.env.XDG_CONFIG_HOME
	? join(process.env.XDG_CONFIG_HOME, 'racing-manager')
	: join(homedir(), '.config', 'racing-manager');
const dbPath = join(dbDir, 'racing-manager.sqlite');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dbDir, { recursive: true });
const client = createClient({ url: pathToFileURL(dbPath).href });
const db = drizzle(client);
try {
	await migrate(db, { migrationsFolder });
	console.log(`Migrated: ${dbPath}`);
} finally {
	client.close();
}
