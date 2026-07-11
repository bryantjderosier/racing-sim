import type { DuckDBConnection } from '@duckdb/node-api';
import { lit, run } from '../world/sql.js';

export type AdvanceStopReason =
	| 'INBOX'
	| 'PRACTICE'
	| 'QUALIFYING'
	| 'RACE'
	| 'PRE_SEASON_TEST'
	| 'PHASE'
	| 'END';

export type AdvanceResult = {
	ok: true;
	seasonYear: number;
	week: number;
	day: number;
	phase: string;
	daysAdvanced: number;
	stoppedOn: AdvanceStopReason | null;
	message: string;
};

type GameRow = {
	season_year: number;
	current_week: number;
	current_day: number;
	phase: string;
	player_team_id: number | null;
};

async function queryRows(conn: DuckDBConnection, sql: string): Promise<Record<string, unknown>[]> {
	const reader = await conn.runAndReadAll(sql);
	const cols = reader.columnNames();
	return reader.getRows().map((row) => {
		const out: Record<string, unknown> = {};
		cols.forEach((c, i) => {
			out[c] = row[i];
		});
		return out;
	});
}

async function getGame(conn: DuckDBConnection): Promise<GameRow> {
	const rows = await queryRows(
		conn,
		`SELECT season_year, current_week, current_day, phase, player_team_id FROM game_state WHERE id = 1`
	);
	const r = rows[0];
	if (!r) throw new Error('game_state missing');
	return {
		season_year: Number(r.season_year),
		current_week: Number(r.current_week),
		current_day: Number(r.current_day),
		phase: String(r.phase),
		player_team_id: r.player_team_id == null ? null : Number(r.player_team_id)
	};
}

async function playerSeriesId(conn: DuckDBConnection, teamId: number | null): Promise<number | null> {
	if (teamId == null) return null;
	const rows = await queryRows(conn, `SELECT tier_id FROM teams WHERE id = ${teamId}`);
	return rows[0] ? Number(rows[0].tier_id) : null;
}

async function hasUnreadStopInbox(conn: DuckDBConnection): Promise<boolean> {
	const rows = await queryRows(
		conn,
		`SELECT count(*) AS c FROM inbox_messages WHERE is_read = FALSE AND stops_clock = TRUE`
	);
	return Number(rows[0]?.c ?? 0) > 0;
}

async function eventTypeThisWeek(
	conn: DuckDBConnection,
	seriesId: number,
	season: number,
	week: number
): Promise<string | null> {
	const rows = await queryRows(
		conn,
		`SELECT event_type FROM calendar_events WHERE series_id = ${seriesId} AND season_id = ${season} AND week_id = ${week} LIMIT 1`
	);
	return rows[0] ? String(rows[0].event_type) : null;
}

function sessionStop(day: number, eventType: string | null): AdvanceStopReason | null {
	if (!eventType) return null;
	if (eventType === 'PRE_SEASON_TEST' && day === 5) return 'PRE_SEASON_TEST';
	if (eventType === 'RACE_WEEKEND') {
		if (day === 5) return 'PRACTICE';
		if (day === 6) return 'QUALIFYING';
		if (day === 7) return 'RACE';
	}
	return null;
}

async function tickProjects(conn: DuckDBConnection, teamId: number | null, season: number, week: number, day: number) {
	if (teamId == null) return;
	// Daily countdown stubs — complete → inbox stop
	await run(
		conn,
		`UPDATE development_projects SET days_remaining = days_remaining - 1,
			current_progress_points = least(target_points, current_progress_points + (target_points / greatest(target_days, 1)))
		 WHERE team_id = ${teamId} AND season_id = ${season} AND status IN ('DESIGNING') AND days_remaining > 0`
	);
	const doneDev = await queryRows(
		conn,
		`SELECT id, component_type FROM development_projects WHERE team_id = ${teamId} AND season_id = ${season} AND status = 'DESIGNING' AND days_remaining = 0`
	);
	for (const proj of doneDev) {
		await run(conn, `UPDATE development_projects SET status = 'COMPLETED' WHERE id = ${Number(proj.id)}`);
		const idRows = await queryRows(conn, `SELECT coalesce(max(id), 0) + 1 AS id FROM inbox_messages`);
		const mid = Number(idRows[0]?.id ?? 1);
		await run(
			conn,
			`INSERT INTO inbox_messages (id, message_type, stops_clock, title, body, created_season, created_week, created_day, is_read, payload) VALUES (${mid}, 'RD', TRUE, ${lit('R&D complete')}, ${lit(`Part project finished: ${proj.component_type}`)}, ${season}, ${week}, ${day}, FALSE, '{"projectId":${Number(proj.id)}}')`
		);
	}

	await run(
		conn,
		`UPDATE facility_projects SET days_remaining = days_remaining - 1
		 WHERE team_id = ${teamId} AND season_id = ${season} AND status = 'CONSTRUCTING' AND days_remaining > 0`
	);
	const doneFac = await queryRows(
		conn,
		`SELECT id, facility_type_id, target_level FROM facility_projects WHERE team_id = ${teamId} AND season_id = ${season} AND status = 'CONSTRUCTING' AND days_remaining = 0`
	);
	for (const proj of doneFac) {
		await run(conn, `UPDATE facility_projects SET status = 'COMPLETED' WHERE id = ${Number(proj.id)}`);
		await run(
			conn,
			`UPDATE team_facilities SET current_level = ${Number(proj.target_level)}
			 WHERE team_id = ${teamId} AND facility_type_id = ${Number(proj.facility_type_id)} AND season_id = ${season}`
		);
		const idRows = await queryRows(conn, `SELECT coalesce(max(id), 0) + 1 AS id FROM inbox_messages`);
		const mid = Number(idRows[0]?.id ?? 1);
		await run(
			conn,
			`INSERT INTO inbox_messages (id, message_type, stops_clock, title, body, created_season, created_week, created_day, is_read, payload) VALUES (${mid}, 'RD', TRUE, ${lit('Facility complete')}, ${lit(`Facility project finished (type ${proj.facility_type_id})`)}, ${season}, ${week}, ${day}, FALSE, '{"facilityProjectId":${Number(proj.id)}}')`
		);
	}
}

async function tickMondayPayroll(_conn: DuckDBConnection, _teamId: number | null) {
	// Stub — salary / upkeep wired later
}

async function resolveBackgroundRace(
	conn: DuckDBConnection,
	season: number,
	week: number,
	playerSeries: number | null
) {
	// Stub: mark other series Sunday race weekends resolved
	if (playerSeries == null) {
		await run(
			conn,
			`UPDATE calendar_events SET status = 'RESOLVED'
			 WHERE season_id = ${season} AND week_id = ${week} AND event_type = 'RACE_WEEKEND' AND status = 'SCHEDULED'`
		);
		return;
	}
	await run(
		conn,
		`UPDATE calendar_events SET status = 'RESOLVED'
		 WHERE season_id = ${season} AND week_id = ${week} AND event_type = 'RACE_WEEKEND'
		   AND series_id <> ${playerSeries} AND status = 'SCHEDULED'`
	);
}

function nextDay(week: number, day: number, phase: string): { week: number; day: number; phase: string; stopPhase?: AdvanceStopReason } {
	let w = week;
	let d = day + 1;
	let p = phase;
	if (d > 7) {
		d = 1;
		w += 1;
	}
	if (w > 52) {
		return { week: 52, day: 7, phase: 'OFF_SEASON', stopPhase: 'END' };
	}
	// Crude phase bands from season-calendar
	if (w <= 3) p = 'PRE_SEASON';
	else if (w <= 48) p = 'IN_SEASON';
	else if (w <= 50) p = 'END_OF_SEASON';
	else p = 'OFF_SEASON';
	return { week: w, day: d, phase: p };
}

/**
 * Advance time day-by-day until a stop event, or `maxDays` safety cap.
 */
export async function advanceDays(
	conn: DuckDBConnection,
	options?: { maxDays?: number; singleDay?: boolean }
): Promise<AdvanceResult> {
	const maxDays = options?.singleDay ? 1 : (options?.maxDays ?? 120);
	let game = await getGame(conn);
	const seriesId = await playerSeriesId(conn, game.player_team_id);
	let daysAdvanced = 0;
	let stoppedOn: AdvanceStopReason | null = null;
	let message = '';

	if (await hasUnreadStopInbox(conn)) {
		return {
			ok: true,
			seasonYear: game.season_year,
			week: game.current_week,
			day: game.current_day,
			phase: game.phase,
			daysAdvanced: 0,
			stoppedOn: 'INBOX',
			message: 'Unread priority inbox message — acknowledge before advancing.'
		};
	}

	while (daysAdvanced < maxDays) {
		const nxt = nextDay(game.current_week, game.current_day, game.phase);
		if (nxt.stopPhase === 'END') {
			stoppedOn = 'END';
			message = 'Season calendar end reached.';
			break;
		}

		game = {
			...game,
			current_week: nxt.week,
			current_day: nxt.day,
			phase: nxt.phase
		};
		daysAdvanced += 1;

		await run(
			conn,
			`UPDATE game_state SET current_week = ${game.current_week}, current_day = ${game.current_day}, phase = '${game.phase}' WHERE id = 1`
		);

		if (game.current_day === 1) {
			await tickMondayPayroll(conn, game.player_team_id);
		}

		await tickProjects(conn, game.player_team_id, game.season_year, game.current_week, game.current_day);

		if (await hasUnreadStopInbox(conn)) {
			stoppedOn = 'INBOX';
			message = 'Project or inbox stop.';
			break;
		}

		const ev = seriesId
			? await eventTypeThisWeek(conn, seriesId, game.season_year, game.current_week)
			: null;
		const session = sessionStop(game.current_day, ev);
		if (session) {
			stoppedOn = session;
			message = `Stopped for ${session.replaceAll('_', ' ').toLowerCase()}.`;
			if (session === 'RACE') {
				await resolveBackgroundRace(conn, game.season_year, game.current_week, seriesId);
				// Stub: mark player event resolved too for now
				if (seriesId != null) {
					await run(
						conn,
						`UPDATE calendar_events SET status = 'RESOLVED'
						 WHERE series_id = ${seriesId} AND season_id = ${game.season_year} AND week_id = ${game.current_week}`
					);
				}
			}
			break;
		}

		if (options?.singleDay) break;
	}

	if (!stoppedOn && daysAdvanced > 0) {
		message = `Advanced ${daysAdvanced} day(s).`;
	}

	return {
		ok: true,
		seasonYear: game.season_year,
		week: game.current_week,
		day: game.current_day,
		phase: game.phase,
		daysAdvanced,
		stoppedOn,
		message: message || 'No advance.'
	};
}
