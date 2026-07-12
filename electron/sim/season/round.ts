import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { raceEvents, raceResults, seasonCalendar } from '../../db/schema.js';
import { loadGridEntrants } from '../bridge/index.js';
import type { RaceResult } from '../race/index.js';
import { simulateWeekend, type WeekendEntrant, type WeekendResult } from '../weekend/index.js';
import { advanceWorldWeek } from '../world/index.js';
import { getSeason, nextIncompleteRound } from './calendar.js';
import { pointsForResult, type PointsSchemeId } from './points.js';
import { applyPivotGate } from './pivot.js';
import { applyPointsAwards, type PointsAward } from './standings.js';
import { payAllRaceSponsors } from '../sponsors/index.js';

async function nextRaceEventId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${raceEvents.id}), 0)` })
		.from(raceEvents);
	return Number(row?.m ?? 0) + 1;
}

async function nextRaceResultId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${raceResults.id}), 0)` })
		.from(raceResults);
	return Number(row?.m ?? 0) + 1;
}

function fastestLapEntrantId(race: RaceResult): number | null {
	let best = Infinity;
	let id: number | null = null;
	for (const line of race.lines) {
		if (line.retired || line.pitted) continue;
		if (line.lapTimeMs < best) {
			best = line.lapTimeMs;
			id = line.entrantId;
		}
	}
	return id;
}

export type RoundOptions = {
	seasonYear: number;
	division?: number;
	raceLaps?: number;
	practiceStints?: number;
	practiceLapsPerStint?: number;
	chaos?: boolean;
	seed?: number;
	/** World weeks to advance after the race. */
	weeksAfterRace?: number;
	playerTeamId?: number;
	playerPivotFraction?: number;
	maintainTeamIds?: number[];
};

export type RoundResult = {
	raceIndex: number;
	calendarId: number;
	trackId: number;
	raceEventId: number;
	weekend: WeekendResult;
	awards: PointsAward[];
	pivotApplied: boolean;
	weeksAdvanced: number;
	winner: { driverId: number; name: string; points: number } | null;
};

/**
 * Run the next incomplete calendar race: weekend → persist → points → optional pivot → world ticks.
 */
export async function advanceSeasonRound(
	db: AppDb,
	options: RoundOptions
): Promise<RoundResult | null> {
	const division = options.division ?? 1;
	const season = await getSeason(db, options.seasonYear, division);
	if (!season) throw new Error(`Season ${options.seasonYear} div ${division} not initialized`);

	const round = await nextIncompleteRound(db, options.seasonYear);
	if (!round) return null;

	const loaded = await loadGridEntrants(db, { trackId: round.trackId, division });
	const field: WeekendEntrant[] = loaded.entrants.map((e, i) => ({
		id: e.driverId,
		name: e.driverName,
		car: e.car,
		driver: e.driver,
		personnel: e.personnel,
		reliability: 88 + (i % 5),
		raceFuelKg: Math.max(20, (options.raceLaps ?? 12) * 2.1),
		racePace: 'push' as const
	}));

	const driverToTeam = new Map(loaded.entrants.map((e) => [e.driverId, e.teamId]));

	const weekend = simulateWeekend(field, {
		track: loaded.track,
		format: 'div1_knockout',
		raceLaps: options.raceLaps ?? 12,
		practiceStints: options.practiceStints ?? 1,
		practiceLapsPerStint: options.practiceLapsPerStint ?? 2,
		seed: options.seed ?? options.seasonYear * 1000 + round.raceIndex,
		qualiCutoffs: { q1Eliminate: 5, q2Eliminate: 5 },
		chaos: options.chaos !== false
	});

	const raceEventId = await nextRaceEventId(db);
	await db.insert(raceEvents).values({
		id: raceEventId,
		calendarId: round.id,
		trackId: round.trackId,
		sessionType: 'race',
		moisture: 'dry',
		safetyCarState: 'none',
		trackGripMultiplier: 1,
		isCompleted: true
	});

	const scheme = season.pointsScheme as PointsSchemeId;
	const calendarRows = await db
		.select()
		.from(seasonCalendar)
		.where(eq(seasonCalendar.seasonYear, options.seasonYear));
	const maxIndex = Math.max(...calendarRows.map((c) => c.raceIndex));
	const isFinale = round.raceIndex === maxIndex;
	const poleId = weekend.qualifying.grid[0]?.entrantId ?? null;
	const flId = fastestLapEntrantId(weekend.race);

	const awards: PointsAward[] = [];
	let resultId = await nextRaceResultId(db);

	for (const c of weekend.race.classification) {
		const teamId = driverToTeam.get(c.entrantId);
		if (teamId == null) continue;
		const status = c.status === 'finished' ? 'finished' : 'dnf';
		const pts = pointsForResult({
			schemeId: scheme,
			finishingPosition: c.position,
			status,
			isFinale,
			earnedPole: c.entrantId === poleId,
			earnedFastestLap: c.entrantId === flId
		});
		awards.push({ driverId: c.entrantId, teamId, points: pts });
		await db.insert(raceResults).values({
			id: resultId++,
			raceEventId,
			driverId: c.entrantId,
			teamId,
			finishingPosition: c.position,
			pointsEarned: pts,
			gridPosition:
				weekend.qualifying.grid.find((g) => g.entrantId === c.entrantId)?.position ?? null,
			status
		});
	}

	await applyPointsAwards(db, options.seasonYear, division, awards);

	const bestFinishByTeam: Record<number, number | null> = {};
	for (const c of weekend.race.classification) {
		const teamId = driverToTeam.get(c.entrantId);
		if (teamId == null) continue;
		if (c.status !== 'finished') {
			if (bestFinishByTeam[teamId] === undefined) bestFinishByTeam[teamId] = null;
			continue;
		}
		const prev = bestFinishByTeam[teamId];
		if (prev == null || c.position < prev) bestFinishByTeam[teamId] = c.position;
	}
	await payAllRaceSponsors(db, bestFinishByTeam);

	await db
		.update(seasonCalendar)
		.set({ isCompleted: true })
		.where(eq(seasonCalendar.id, round.id));

	let pivotApplied = false;
	if (round.raceIndex >= season.rdPivotRaceIndex && !season.rdPivotLocked) {
		await applyPivotGate(db, {
			seasonYear: options.seasonYear,
			division,
			playerTeamId: options.playerTeamId,
			playerCurrentFraction: options.playerPivotFraction
		});
		pivotApplied = true;
	}

	const mileageByDriverId: Record<number, number> = {};
	for (const c of weekend.race.classification) {
		mileageByDriverId[c.entrantId] = c.lapsCompleted;
	}

	const weeks = options.weeksAfterRace ?? 2;
	for (let w = 0; w < weeks; w++) {
		await advanceWorldWeek(db, {
			mileageByDriverId: w === 0 ? mileageByDriverId : undefined,
			maintainTeamIds: options.maintainTeamIds,
			rng: () => ((options.seed ?? 1) * 0.017 + round.raceIndex * 0.03 + w * 0.11) % 1
		});
	}

	const winnerRow = weekend.race.classification.find((c) => c.position === 1);
	const winner = winnerRow
		? {
				driverId: winnerRow.entrantId,
				name: winnerRow.name,
				points: awards.find((a) => a.driverId === winnerRow.entrantId)?.points ?? 0
			}
		: null;

	return {
		raceIndex: round.raceIndex,
		calendarId: round.id,
		trackId: round.trackId,
		raceEventId,
		weekend,
		awards,
		pivotApplied,
		weeksAdvanced: weeks,
		winner
	};
}
