import { getDb } from '../../db/connection.js';
import { ensureSeason, getHqSnapshot } from '../game/index.js';
import type { EnsureSeasonResult, HqHubSnapshot } from '../game/types.js';
import {
	listNewCareerTeamOptions,
	NEW_CAREER_TEAM_OPTIONS
} from '../seed/grid-fixture.js';
import type { CareerStore, CareerSummary } from './store.js';

export type BootstrapCareerOptions = {
	displayName: string;
	/** Must be a catalog id (1..20). Defaults to 1. */
	playerTeamId?: number;
	raceCount?: number;
};

export type BootstrapCareerResult = {
	career: CareerSummary;
	hq: HqHubSnapshot;
	season: EnsureSeasonResult;
};

function assertValidPlayerTeamId(playerTeamId: number): void {
	const ok = NEW_CAREER_TEAM_OPTIONS.some((t) => t.id === playerTeamId);
	if (!ok) {
		throw new Error(
			`Invalid playerTeamId ${playerTeamId}. Choose one of: ${NEW_CAREER_TEAM_OPTIONS.map((t) => t.id).join(', ')}`
		);
	}
}

/**
 * One-shot new career: seed world, start season, return HQ hub snapshot.
 */
export async function bootstrapCareer(
	store: CareerStore,
	opts: BootstrapCareerOptions
): Promise<BootstrapCareerResult> {
	const playerTeamId = opts.playerTeamId ?? 1;
	assertValidPlayerTeamId(playerTeamId);

	const career = await store.createCareer({
		displayName: opts.displayName,
		playerTeamId
	});

	const db = await getDb();
	const season = await ensureSeason(db, playerTeamId, {
		raceCount: opts.raceCount
	});
	const hq = await getHqSnapshot(db, career);

	return { career, hq, season };
}

export { listNewCareerTeamOptions, NEW_CAREER_TEAM_OPTIONS };
