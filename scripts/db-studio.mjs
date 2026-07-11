#!/usr/bin/env node
/**
 * Open the local racing-manager DuckDB in the official DuckDB UI.
 *
 *   pnpm db:studio
 *
 * Requires network once to download the `ui` extension. Keep this process
 * running while you use the UI (Ctrl+C to stop).
 *
 * Close the Electron app (and any other db:studio) first — DuckDB allows
 * only one writer lock on the file.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';

const dbPath = process.env.XDG_CONFIG_HOME
	? join(process.env.XDG_CONFIG_HOME, 'racing-manager', 'racing-manager.duckdb')
	: join(homedir(), '.config', 'racing-manager', 'racing-manager.duckdb');

let instance;
let conn;

try {
	instance = await DuckDBInstance.create(dbPath);
	conn = await instance.connect();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes('Conflicting lock') || message.includes('Could not set lock')) {
		const pidMatch = message.match(/PID (\d+)/);
		const pid = pidMatch?.[1];
		console.error(`DuckDB file is locked${pid ? ` by PID ${pid}` : ''}:`);
		console.error(`  ${dbPath}`);
		console.error('');
		console.error('Close Electron / another db:studio session, or run:');
		if (pid) {
			console.error(`  kill ${pid}`);
		} else {
			console.error('  pkill -f "scripts/db-studio.mjs"');
		}
		process.exit(1);
	}
	throw error;
}

await conn.run(`INSTALL ui; LOAD ui;`);

const started = await conn.runAndReadAll(`CALL start_ui();`);
const [[message] = []] = started.getRows();
console.log(message ?? 'DuckDB UI started.');
console.log(`Database: ${dbPath}`);
console.log('Leave this process running. Press Ctrl+C to stop the UI server.');

const shutdown = () => {
	try {
		conn.closeSync();
	} catch {
		// already closed
	}
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

setInterval(() => {}, 1 << 30);
