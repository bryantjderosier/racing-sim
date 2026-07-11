import type { DuckDBConnection } from '@duckdb/node-api';
import type { DuckDBClientLike } from '@duckdbfan/drizzle-duckdb';
import { getDb } from '../db/index.js';
import { advanceDays, type AdvanceResult } from './advance.js';

function isPool(
	client: DuckDBClientLike
): client is { acquire(): Promise<DuckDBConnection>; release(c: DuckDBConnection): void | Promise<void> } {
	return typeof (client as { acquire?: unknown }).acquire === 'function';
}

async function withConn<T>(fn: (conn: DuckDBConnection) => Promise<T>): Promise<T> {
	const db = await getDb();
	const client = db.$client;
	if (isPool(client)) {
		const conn = await client.acquire();
		try {
			return await fn(conn);
		} finally {
			await client.release(conn);
		}
	}
	return fn(client as DuckDBConnection);
}

export async function runAdvance(options?: { maxDays?: number; singleDay?: boolean }): Promise<AdvanceResult> {
	return withConn((conn) => advanceDays(conn, options));
}

export async function getClock() {
	return withConn(async (conn) => {
		const reader = await conn.runAndReadAll(
			`SELECT season_year, current_week, current_day, phase, player_display_name, player_team_id, player_status FROM game_state WHERE id = 1`
		);
		const cols = reader.columnNames();
		const row = reader.getRows()[0];
		if (!row) throw new Error('game_state missing');
		const out: Record<string, unknown> = {};
		cols.forEach((c, i) => {
			out[c] = row[i];
		});
		return {
			seasonYear: Number(out.season_year),
			week: Number(out.current_week),
			day: Number(out.current_day),
			phase: String(out.phase),
			playerDisplayName: String(out.player_display_name),
			playerTeamId: out.player_team_id == null ? null : Number(out.player_team_id),
			playerStatus: String(out.player_status)
		};
	});
}

export type { AdvanceResult };
