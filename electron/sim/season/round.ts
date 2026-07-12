import type { AppDb } from '../../db/node.js';
import { loadGridEntrants } from '../bridge/index.js';
import { simulateWeekend, type WeekendEntrant, type WeekendResult } from '../weekend/index.js';
import { commitWeekendRace } from './commit.js';
import { nextIncompleteRound } from './calendar.js';

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
	awards: { driverId: number; teamId: number; points: number }[];
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

	const gridByEntrant = new Map(
		weekend.qualifying.grid.map((g) => [g.entrantId, g.position] as const)
	);

	const committed = await commitWeekendRace(db, {
		seasonYear: options.seasonYear,
		division,
		playerTeamId: options.playerTeamId,
		playerPivotFraction: options.playerPivotFraction,
		trackId: round.trackId,
		raceResult: weekend.race,
		gridByEntrant,
		driverToTeam,
		poleEntrantId: weekend.qualifying.grid[0]?.entrantId ?? null,
		weeksAfterRace: options.weeksAfterRace ?? 2,
		maintainTeamIds: options.maintainTeamIds,
		seed: options.seed
	});

	const winnerRow = weekend.race.classification.find((c) => c.position === 1);
	const winner = winnerRow
		? {
				driverId: winnerRow.entrantId,
				name: winnerRow.name,
				points: committed.awards.find((a) => a.driverId === winnerRow.entrantId)?.points ?? 0
			}
		: null;

	return {
		raceIndex: committed.raceIndex,
		calendarId: committed.calendarId,
		trackId: committed.trackId,
		raceEventId: committed.raceEventId,
		weekend,
		awards: committed.awards,
		pivotApplied: committed.pivotApplied,
		weeksAdvanced: committed.weeksAdvanced,
		winner
	};
}
