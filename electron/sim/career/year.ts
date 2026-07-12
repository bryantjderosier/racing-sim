import type { AppDb } from '../../db/node.js';
import { runOffSeason, type OffSeasonOptions, type OffSeasonResult } from '../season/offseason.js';
import { runSeason, type RunSeasonOptions, type SeasonLoopResult } from '../season/loop.js';

export type CareerYearOptions = RunSeasonOptions &
	Omit<OffSeasonOptions, 'fromSeasonYear'> & {
		seasonYear: number;
		/** Run off-season after the calendar completes (default true). */
		runOffseason?: boolean;
	};

export type CareerYearResult = {
	season: SeasonLoopResult;
	offseason: OffSeasonResult | null;
};

/**
 * Full career year: race calendar then off-season glue into the next year.
 */
export async function runCareerYear(
	db: AppDb,
	options: CareerYearOptions
): Promise<CareerYearResult> {
	const season = await runSeason(db, options);
	if (!season.complete) {
		return { season, offseason: null };
	}
	if (options.runOffseason === false) {
		return { season, offseason: null };
	}

	const offseason = await runOffSeason(db, {
		fromSeasonYear: options.seasonYear,
		divisions: options.divisions,
		raceCountNext: options.raceCountNext ?? options.raceCount,
		pointsSchemeNext: options.pointsSchemeNext ?? options.pointsScheme,
		rdPivotRaceIndexNext: options.rdPivotRaceIndexNext ?? options.rdPivotRaceIndex,
		playerTeamId: options.playerTeamId,
		playerVotes: options.playerVotes,
		winterProposals: options.winterProposals,
		promoteCount: options.promoteCount,
		relegateCount: options.relegateCount,
		marketMaxSignings: options.marketMaxSignings,
		skipPromotion: options.skipPromotion,
		skipWinterRegs: options.skipWinterRegs,
		skipMarket: options.skipMarket,
		skipFeeder: options.skipFeeder,
		rng: options.rng
	});

	return { season, offseason };
}
