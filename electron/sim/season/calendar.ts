import { and, asc, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { seasonCalendar, seasons, tracks } from '../../db/schema.js';
import { WEEKLY_CFD_CAP, WEEKLY_WT_CAP } from '../world/constants.js';
import type { PointsSchemeId } from './points.js';
import { seedPointsCatalog } from './points.js';
import { initStandings } from './standings.js';

async function nextCalendarId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${seasonCalendar.id}), 0)` })
		.from(seasonCalendar);
	return Number(row?.m ?? 0) + 1;
}

export type InitSeasonInput = {
	seasonYear: number;
	division?: number;
	raceCount: number;
	trackIds?: number[];
	pointsScheme?: PointsSchemeId;
	rdPivotRaceIndex?: number;
};

export type InitSeasonResult = {
	seasonYear: number;
	division: number;
	raceCount: number;
	calendarIds: number[];
	standings: { drivers: number; constructors: number };
};

/**
 * Create season row + standings for a division.
 * Shared season_calendar is created once per year (not per division).
 */
export async function initSeason(db: AppDb, input: InitSeasonInput): Promise<InitSeasonResult> {
	const division = input.division ?? 1;
	const scheme = input.pointsScheme ?? 'classic';
	const pivotAt = input.rdPivotRaceIndex ?? Math.max(1, Math.ceil(input.raceCount / 2));

	await seedPointsCatalog(db);

	await db
		.delete(seasons)
		.where(and(eq(seasons.seasonYear, input.seasonYear), eq(seasons.division, division)));

	await db.insert(seasons).values({
		seasonYear: input.seasonYear,
		division,
		pointsScheme: scheme,
		rdPivotRaceIndex: pivotAt,
		rdPivotLocked: false,
		wtHoursWeeklyCap: WEEKLY_WT_CAP[division] ?? WEEKLY_WT_CAP[1],
		cfdHoursWeeklyCap: WEEKLY_CFD_CAP[division] ?? WEEKLY_CFD_CAP[1]
	});

	const existingCal = await db
		.select()
		.from(seasonCalendar)
		.where(eq(seasonCalendar.seasonYear, input.seasonYear));

	let calendarIds = existingCal.map((c) => c.id);

	if (existingCal.length === 0) {
		const allTracks = await db.select().from(tracks);
		if (allTracks.length === 0) throw new Error('No tracks seeded');

		const trackIds =
			input.trackIds ??
			Array.from({ length: input.raceCount }, (_, i) => allTracks[i % allTracks.length].id);

		let calId = await nextCalendarId(db);
		calendarIds = [];
		for (let i = 0; i < input.raceCount; i++) {
			const id = calId++;
			calendarIds.push(id);
			await db.insert(seasonCalendar).values({
				id,
				seasonYear: input.seasonYear,
				raceIndex: i + 1,
				trackId: trackIds[i] ?? allTracks[0].id,
				isCompleted: false
			});
		}
	}

	const standings = await initStandings(db, input.seasonYear, division);

	return {
		seasonYear: input.seasonYear,
		division,
		raceCount: calendarIds.length,
		calendarIds,
		standings
	};
}

export async function nextIncompleteRound(db: AppDb, seasonYear: number) {
	const [row] = await db
		.select()
		.from(seasonCalendar)
		.where(and(eq(seasonCalendar.seasonYear, seasonYear), eq(seasonCalendar.isCompleted, false)))
		.orderBy(asc(seasonCalendar.raceIndex))
		.limit(1);
	return row ?? null;
}

export async function getSeason(db: AppDb, seasonYear: number, division: number) {
	const [row] = await db
		.select()
		.from(seasons)
		.where(and(eq(seasons.seasonYear, seasonYear), eq(seasons.division, division)))
		.limit(1);
	return row ?? null;
}
