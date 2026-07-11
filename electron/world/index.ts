import type { DuckDBConnection } from '@duckdb/node-api';
import type { DuckDBClientLike } from '@duckdbfan/drizzle-duckdb';
import { getDb } from '../db/index.js';
import { generateWorld, type NewGameOptions, TEAMS } from './generate.js';

function isPool(
	client: DuckDBClientLike
): client is { acquire(): Promise<DuckDBConnection>; release(c: DuckDBConnection): void | Promise<void> } {
	return typeof (client as { acquire?: unknown }).acquire === 'function';
}

export async function runNewGame(options: NewGameOptions) {
	const db = await getDb();
	const client = db.$client;
	if (isPool(client)) {
		const conn = await client.acquire();
		try {
			await generateWorld(conn, options);
		} finally {
			await client.release(conn);
		}
		return;
	}
	await generateWorld(client as DuckDBConnection, options);
}

export { TEAMS, type NewGameOptions };
