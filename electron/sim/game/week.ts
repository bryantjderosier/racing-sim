import type { AppDb } from '../../db/node.js';
import type { CareerSummary } from '../career/store.js';
import { advanceWorldWeek, type WorldTickResult } from '../world/tick.js';
import { getHqSnapshot } from './hq.js';
import type {
	AdvanceWeekArgs,
	TickHqWeekResult,
	WeekAdvanceResult
} from './types.js';

export function trimWeekResult(r: WorldTickResult): WeekAdvanceResult {
	return {
		seasonYear: r.seasonYear,
		week: r.week,
		day: r.day,
		tickIndex: r.tickIndex,
		teamsUpdated: r.teamsUpdated,
		facilitiesDecayed: r.facilitiesDecayed,
		facilitiesMaintained: r.facilitiesMaintained,
		facilitiesCompleted: r.facilitiesCompleted.length,
		manufacturesCompleted: r.manufacturesCompleted,
		levelsGained: r.levelsGained,
		xpEventCount: r.xpEvents.length,
		scoutingTickCount: r.scoutingTicks.length,
		moraleUpdateCount: r.morale?.updates.length ?? 0,
		aiTeamsActed: r.ai?.teamsActed ?? 0
	};
}

/** Thin week advance (skips AI/morale/scouting) — harness / low-cost path. */
export async function advanceWeek(
	db: AppDb,
	playerTeamId: number,
	args: AdvanceWeekArgs = {}
): Promise<WeekAdvanceResult> {
	const result = await advanceWorldWeek(db, {
		maintainTeamIds: args.maintainFacilities ? [playerTeamId] : undefined,
		skipAi: true,
		skipMorale: true,
		skipScouting: true
	});
	return trimWeekResult(result);
}

/**
 * Full HQ week tick: world systems on, then refreshed hub snapshot.
 */
export async function tickHqWeek(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>,
	args: AdvanceWeekArgs = {}
): Promise<TickHqWeekResult> {
	const result = await advanceWorldWeek(db, {
		maintainTeamIds: args.maintainFacilities ? [career.playerTeamId] : undefined
	});
	const tick = trimWeekResult(result);
	const hq = await getHqSnapshot(db, career);
	return { tick, hq };
}
