import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { contracts, drivers, teams, worldClock } from '../../db/schema.js';
import {
	graduateEligibleProspects,
	tickFeederPool,
	type FeederTickResult,
	type GraduationResult
} from '../feeder/index.js';
import {
	payChampionshipPrizeMoney,
	settleAllCostCaps,
	type CostCapSettlement,
	type PrizePayout
} from '../finance/index.js';
import { ageSponsorContractsOneYear } from '../sponsors/index.js';
import {
	tickDriverMarket,
	tickStaffMarket,
	type MarketTickResult,
	type StaffMarketTickResult
} from '../market/index.js';
import { runWinterRegulations, type PlayerVote, type WinterRegsResult } from '../regs/index.js';
import { ensureClock } from '../world/index.js';
import { initSeason, nextIncompleteRound } from './calendar.js';
import type { PointsSchemeId } from './points.js';
import {
	applyPromotionRelegation,
	type PromotionRelegationResult
} from './promotion.js';
import { getStandingsTable } from './standings.js';

export type OffSeasonOptions = {
	fromSeasonYear: number;
	divisions?: number[];
	raceCountNext?: number;
	pointsSchemeNext?: PointsSchemeId;
	rdPivotRaceIndexNext?: number;
	playerTeamId?: number;
	playerVotes?: PlayerVote[];
	winterProposals?: Parameters<typeof runWinterRegulations>[1]['proposals'];
	promoteCount?: number;
	relegateCount?: number;
	marketMaxSignings?: number;
	skipPromotion?: boolean;
	skipWinterRegs?: boolean;
	skipMarket?: boolean;
	skipFeeder?: boolean;
	rng?: () => number;
};

export type OffSeasonResult = {
	fromSeasonYear: number;
	toSeasonYear: number;
	costCapSettlements: CostCapSettlement[];
	prizePayouts: PrizePayout[];
	promotion: PromotionRelegationResult | null;
	winter: WinterRegsResult | null;
	feederTicks: FeederTickResult[];
	graduations: GraduationResult[];
	contractsAged: number;
	sponsorsAged: { aged: number; expired: number };
	market: MarketTickResult | null;
	staffMarket: StaffMarketTickResult | null;
	seasonsInitialized: number[];
	standingsChampions: { division: number; teamId: number; points: number }[];
};

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

async function discoverDivisions(db: AppDb): Promise<number[]> {
	const rows = await db.select({ division: teams.division }).from(teams);
	return [...new Set(rows.map((r) => r.division))].sort((a, b) => a - b);
}

async function assertSeasonsComplete(db: AppDb, year: number) {
	const incomplete = await nextIncompleteRound(db, year);
	if (incomplete) {
		throw new Error(
			`Season ${year} still has incomplete race index ${incomplete.raceIndex} — finish the calendar first`
		);
	}
}

export async function ageContractsOneYear(db: AppDb): Promise<number> {
	const rows = await db.select().from(contracts).where(eq(contracts.isActive, true));
	let n = 0;
	for (const c of rows) {
		await db
			.update(contracts)
			.set({ yearsRemaining: Math.max(0, c.yearsRemaining - 1) })
			.where(eq(contracts.id, c.id));
		n++;
	}
	return n;
}

export async function ageDriversOneYear(db: AppDb): Promise<number> {
	const rows = await db.select().from(drivers);
	for (const d of rows) {
		await db.update(drivers).set({ age: d.age + 1 }).where(eq(drivers.id, d.id));
	}
	return rows.length;
}

async function resetTeamsForNewSeason(db: AppDb): Promise<void> {
	const rows = await db.select().from(teams);
	for (const t of rows) {
		await db
			.update(teams)
			.set({ rdPivotCurrent: 1, costCapSpent: 0 })
			.where(eq(teams.id, t.id));
	}
}

async function rolloverWorldClock(db: AppDb, toSeasonYear: number): Promise<void> {
	const clock = await ensureClock(db);
	await db
		.update(worldClock)
		.set({
			seasonYear: toSeasonYear,
			week: 1,
			day: 1,
			tickIndex: clock.tickIndex + 1
		})
		.where(eq(worldClock.id, 1));
}

async function initNextSeasons(
	db: AppDb,
	to: number,
	options: OffSeasonOptions
): Promise<number[]> {
	const seasonsInitialized: number[] = [];
	for (const d of await discoverDivisions(db)) {
		const teamCount = (
			await db.select({ c: sql<number>`count(*)` }).from(teams).where(eq(teams.division, d))
		)[0]?.c;
		if (Number(teamCount ?? 0) === 0) continue;
		await initSeason(db, {
			seasonYear: to,
			division: d,
			raceCount: options.raceCountNext ?? 4,
			pointsScheme: options.pointsSchemeNext ?? 'classic',
			rdPivotRaceIndex: options.rdPivotRaceIndexNext
		});
		seasonsInitialized.push(d);
	}
	return seasonsInitialized;
}

/**
 * Career off-season:
 * promo → winter regs → feeder tick → age → graduate → market → rollover.
 */
export async function runOffSeason(
	db: AppDb,
	options: OffSeasonOptions
): Promise<OffSeasonResult> {
	const rng = options.rng ?? mulberry32(options.fromSeasonYear * 13_337);
	const from = options.fromSeasonYear;
	const to = from + 1;
	const divisions = options.divisions ?? (await discoverDivisions(db));

	await assertSeasonsComplete(db, from);

	const costCapSettlements = await settleAllCostCaps(db, from);
	const prizePayouts = await payChampionshipPrizeMoney(db, from);

	const standingsChampions: OffSeasonResult['standingsChampions'] = [];
	for (const d of divisions) {
		const constructors = await getStandingsTable(db, from, d, 'team');
		if (constructors[0]) {
			standingsChampions.push({
				division: d,
				teamId: constructors[0].entityId,
				points: constructors[0].points
			});
		}
	}

	let promotion: PromotionRelegationResult | null = null;
	if (!options.skipPromotion) {
		promotion = await applyPromotionRelegation(db, {
			seasonYear: from,
			promoteCount: options.promoteCount,
			relegateCount: options.relegateCount
		});
	}

	let winter: WinterRegsResult | null = null;
	if (!options.skipWinterRegs) {
		winter = await runWinterRegulations(db, {
			seasonYear: from,
			applyToSeasonYear: to,
			playerTeamId: options.playerTeamId,
			playerVotes: options.playerVotes,
			proposals: options.winterProposals,
			rng
		});
	}

	let feederTicks: FeederTickResult[] = [];
	let graduations: GraduationResult[] = [];
	if (!options.skipFeeder) {
		feederTicks = await tickFeederPool(db, rng);
	}

	const contractsAged = await ageContractsOneYear(db);
	const sponsorsAged = await ageSponsorContractsOneYear(db);
	await ageDriversOneYear(db);

	if (!options.skipFeeder) {
		graduations = await graduateEligibleProspects(db, { rng });
	}

	let market: MarketTickResult | null = null;
	let staffMarket: StaffMarketTickResult | null = null;
	if (!options.skipMarket) {
		await db.update(worldClock).set({ week: 48 }).where(eq(worldClock.id, 1));
		market = await tickDriverMarket(db, {
			playerTeamId: options.playerTeamId,
			rng,
			maxSignings: options.marketMaxSignings ?? 4
		});
		staffMarket = await tickStaffMarket(db, {
			playerTeamId: options.playerTeamId,
			rng,
			maxSignings: options.marketMaxSignings ?? 4
		});
	}

	await resetTeamsForNewSeason(db);
	await rolloverWorldClock(db, to);
	const seasonsInitialized = await initNextSeasons(db, to, options);

	return {
		fromSeasonYear: from,
		toSeasonYear: to,
		costCapSettlements,
		prizePayouts,
		promotion,
		winter,
		feederTicks,
		graduations,
		contractsAged,
		sponsorsAged,
		market,
		staffMarket,
		seasonsInitialized,
		standingsChampions
	};
}
