import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { seasonCalendar, teams, tracks } from '../../db/schema.js';
import { ensureClock } from '../world/tick.js';
import { getSeason, initSeason, nextIncompleteRound } from '../season/calendar.js';
import type { EnsureSeasonArgs, EnsureSeasonResult, NextRoundView } from './types.js';

export async function getNextRoundView(
	db: AppDb,
	seasonYear?: number
): Promise<NextRoundView> {
	const clock = await ensureClock(db);
	const year = seasonYear ?? clock.seasonYear;
	const round = await nextIncompleteRound(db, year);
	if (!round) return null;

	const [track] = await db
		.select({ name: tracks.name })
		.from(tracks)
		.where(eq(tracks.id, round.trackId))
		.limit(1);

	return {
		raceIndex: round.raceIndex,
		calendarId: round.id,
		trackId: round.trackId,
		trackName: track?.name ?? `Track ${round.trackId}`
	};
}

/**
 * Ensure a season row + calendar exist for the clock year and player division.
 */
export async function ensureSeason(
	db: AppDb,
	playerTeamId: number,
	args: EnsureSeasonArgs = {}
): Promise<EnsureSeasonResult> {
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const division = team.division;
	const existing = await getSeason(db, clock.seasonYear, division);
	let created = false;
	let raceCount = args.raceCount ?? 22;

	if (!existing) {
		const trackCount = (await db.select({ id: tracks.id }).from(tracks)).length;
		if (trackCount === 0) throw new Error('No tracks seeded');
		// Full grid seed only has 1 track — keep raceCount modest for harnesses.
		raceCount = args.raceCount ?? Math.min(22, Math.max(1, trackCount));
		const result = await initSeason(db, {
			seasonYear: clock.seasonYear,
			division,
			raceCount
		});
		raceCount = result.raceCount;
		created = true;
	} else {
		const rows = await db
			.select()
			.from(seasonCalendar)
			.where(eq(seasonCalendar.seasonYear, clock.seasonYear));
		raceCount = rows.length || raceCount;
	}

	return {
		seasonYear: clock.seasonYear,
		division,
		raceCount,
		created,
		nextRound: await getNextRoundView(db, clock.seasonYear)
	};
}
