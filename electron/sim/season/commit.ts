import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { raceEvents, raceResults, seasonCalendar } from '../../db/schema.js';
import type { RaceResult } from '../race/feature.js';
import { payAllRaceSponsors } from '../sponsors/index.js';
import { advanceWorldWeek } from '../world/index.js';
import { getSeason, nextIncompleteRound } from './calendar.js';
import { pointsForResult, type PointsSchemeId } from './points.js';
import { applyPivotGate } from './pivot.js';
import { applyPointsAwards, type PointsAward } from './standings.js';

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

export type CommitWeekendRaceInput = {
	division?: number;
	seasonYear?: number;
	playerTeamId?: number;
	playerPivotFraction?: number;
	trackId: number;
	raceResult: RaceResult;
	/** entrantId → grid position (1 = pole). */
	gridByEntrant: Map<number, number>;
	driverToTeam: Map<number, number>;
	poleEntrantId?: number | null;
	weeksAfterRace?: number;
	maintainTeamIds?: number[];
	seed?: number;
};

export type CommitWeekendRaceResult = {
	raceIndex: number;
	calendarId: number;
	trackId: number;
	raceEventId: number;
	awards: PointsAward[];
	pivotApplied: boolean;
	weeksAdvanced: number;
};

/**
 * Persist an already-simulated feature race against the next incomplete calendar round.
 */
export async function commitWeekendRace(
	db: AppDb,
	input: CommitWeekendRaceInput
): Promise<CommitWeekendRaceResult> {
	const division = input.division ?? 1;

	let seasonYear = input.seasonYear;
	if (seasonYear == null) {
		const calRows = await db.select().from(seasonCalendar);
		const match = calRows.find((c) => !c.isCompleted && c.trackId === input.trackId);
		const next = calRows.find((c) => !c.isCompleted);
		seasonYear = match?.seasonYear ?? next?.seasonYear ?? calRows[0]?.seasonYear;
	}
	if (seasonYear == null) throw new Error('No season calendar found');

	const season = await getSeason(db, seasonYear, division);
	if (!season) throw new Error(`Season ${seasonYear} div ${division} not initialized`);

	const round = await nextIncompleteRound(db, seasonYear);
	if (!round) throw new Error('No incomplete calendar round to commit');
	if (round.trackId !== input.trackId) {
		throw new Error(
			`Weekend track ${input.trackId} does not match next round track ${round.trackId}`
		);
	}

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
		.where(eq(seasonCalendar.seasonYear, seasonYear));
	const maxIndex = Math.max(...calendarRows.map((c) => c.raceIndex));
	const isFinale = round.raceIndex === maxIndex;
	const poleId = input.poleEntrantId ?? null;
	const flId = fastestLapEntrantId(input.raceResult);

	const awards: PointsAward[] = [];
	let resultId = await nextRaceResultId(db);

	for (const c of input.raceResult.classification) {
		const teamId = input.driverToTeam.get(c.entrantId);
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
			gridPosition: input.gridByEntrant.get(c.entrantId) ?? null,
			status
		});
	}

	await applyPointsAwards(db, seasonYear, division, awards);

	const bestFinishByTeam: Record<number, number | null> = {};
	for (const c of input.raceResult.classification) {
		const teamId = input.driverToTeam.get(c.entrantId);
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
			seasonYear,
			division,
			playerTeamId: input.playerTeamId,
			playerCurrentFraction: input.playerPivotFraction
		});
		pivotApplied = true;
	}

	const mileageByDriverId: Record<number, number> = {};
	for (const c of input.raceResult.classification) {
		mileageByDriverId[c.entrantId] = c.lapsCompleted;
	}

	const weeks = input.weeksAfterRace ?? 0;
	for (let w = 0; w < weeks; w++) {
		await advanceWorldWeek(db, {
			mileageByDriverId: w === 0 ? mileageByDriverId : undefined,
			maintainTeamIds: input.maintainTeamIds,
			rng: () => ((input.seed ?? 1) * 0.017 + round.raceIndex * 0.03 + w * 0.11) % 1
		});
	}

	return {
		raceIndex: round.raceIndex,
		calendarId: round.id,
		trackId: round.trackId,
		raceEventId,
		awards,
		pivotApplied,
		weeksAdvanced: weeks
	};
}
