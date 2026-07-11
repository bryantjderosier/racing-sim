import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { generateWorld, TEAMS } from './generate.js';

function dbPath() {
	return process.env.XDG_CONFIG_HOME
		? join(process.env.XDG_CONFIG_HOME, 'racing-manager', 'racing-manager.duckdb')
		: join(homedir(), '.config', 'racing-manager', 'racing-manager.duckdb');
}

function arg(name: string, fallback?: string): string | undefined {
	const idx = process.argv.indexOf(`--${name}`);
	if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
	return fallback;
}

const playerTeamId = Number(arg('team', '1'));
const playerDisplayName = arg('name', 'Player')!;
const seed = arg('seed') ? Number(arg('seed')) : undefined;

if (!TEAMS.some((t) => t.id === playerTeamId)) {
	console.error(`Invalid --team ${playerTeamId}`);
	process.exit(1);
}

const path = dbPath();
await mkdir(join(path, '..'), { recursive: true });

const instance = await DuckDBInstance.create(path);
const conn = await instance.connect();
try {
	await generateWorld(conn, { playerDisplayName, playerTeamId, seed });
	console.log(`World generated: team ${playerTeamId}, principal ${playerDisplayName}`);
	console.log(`Database: ${path}`);
} finally {
	conn.closeSync();
}
