import { DuckDBInstance } from '@duckdb/node-api';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { advanceDays } from './advance.js';

const path = process.env.XDG_CONFIG_HOME
	? join(process.env.XDG_CONFIG_HOME, 'racing-manager', 'racing-manager.duckdb')
	: join(homedir(), '.config', 'racing-manager', 'racing-manager.duckdb');

const single = process.argv.includes('--day');
const conn = await (await DuckDBInstance.create(path)).connect();
try {
	const result = await advanceDays(conn, single ? { singleDay: true } : undefined);
	console.log(JSON.stringify(result, null, 2));
} finally {
	conn.closeSync();
}
