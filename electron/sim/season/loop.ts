import type { AppDb } from '../../db/node.js';
import { getSeason, initSeason, nextIncompleteRound, type InitSeasonInput } from './calendar.js';
import { advanceSeasonRound, type RoundOptions, type RoundResult } from './round.js';
import { getStandingsTable } from './standings.js';

export type RunSeasonOptions = Omit<RoundOptions, 'seasonYear'> & {
	seasonYear: number;
	raceCount?: number;
	pointsScheme?: InitSeasonInput['pointsScheme'];
	rdPivotRaceIndex?: number;
	/** If season not initialized, create with this race count (default 4). */
	initIfMissing?: boolean;
	maxRounds?: number;
	onRound?: (result: RoundResult) => void;
};

export type SeasonLoopResult = {
	seasonYear: number;
	division: number;
	rounds: RoundResult[];
	complete: boolean;
	drivers: Awaited<ReturnType<typeof getStandingsTable>>;
	constructors: Awaited<ReturnType<typeof getStandingsTable>>;
};

/**
 * Run remaining (or all) calendar rounds until complete or maxRounds.
 */
export async function runSeason(db: AppDb, options: RunSeasonOptions): Promise<SeasonLoopResult> {
	const division = options.division ?? 1;
	let season = await getSeason(db, options.seasonYear, division);

	if (!season && options.initIfMissing !== false) {
		await initSeason(db, {
			seasonYear: options.seasonYear,
			division,
			raceCount: options.raceCount ?? 4,
			pointsScheme: options.pointsScheme ?? 'classic',
			rdPivotRaceIndex: options.rdPivotRaceIndex
		});
		season = await getSeason(db, options.seasonYear, division);
	}
	if (!season) throw new Error('Season not found — call initSeason first');

	const rounds: RoundResult[] = [];
	const max = options.maxRounds ?? 99;

	for (let i = 0; i < max; i++) {
		const next = await nextIncompleteRound(db, options.seasonYear);
		if (!next) break;

		const result = await advanceSeasonRound(db, {
			...options,
			seasonYear: options.seasonYear,
			division
		});
		if (!result) break;
		rounds.push(result);
		options.onRound?.(result);
	}

	const complete = (await nextIncompleteRound(db, options.seasonYear)) == null;

	return {
		seasonYear: options.seasonYear,
		division,
		rounds,
		complete,
		drivers: await getStandingsTable(db, options.seasonYear, division, 'driver'),
		constructors: await getStandingsTable(db, options.seasonYear, division, 'team')
	};
}
