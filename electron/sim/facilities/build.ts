import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { facilities, teams } from '../../db/schema.js';
import { spendCash } from '../finance/index.js';
import { ensureClock } from '../world/tick.js';
import {
	daysToWeeks,
	MAX_FACILITY_TIER,
	upgradeCost,
	type FacilityType
} from './costs.js';

async function nextFacilityId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${facilities.id}), 0)` })
		.from(facilities);
	return Number(row?.m ?? 0) + 1;
}

export type StartFacilityBuildInput = {
	teamId: number;
	facilityType: FacilityType;
	/** Defaults to currentTier + 1. */
	toTier?: number;
};

export type StartFacilityBuildResult = {
	facilityId: number;
	fromTier: number;
	toTier: number;
	cashSpent: number;
	weeks: number;
	finishTick: number;
};

/**
 * Begin break-ground or upgrade. Cash is outside cost cap. One project per facility at a time.
 */
export async function startFacilityBuild(
	db: AppDb,
	input: StartFacilityBuildInput
): Promise<StartFacilityBuildResult> {
	const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
	if (!team) throw new Error(`Team ${input.teamId} not found`);

	let [fac] = await db
		.select()
		.from(facilities)
		.where(
			and(eq(facilities.teamId, input.teamId), eq(facilities.facilityType, input.facilityType))
		)
		.limit(1);

	if (fac?.isUnderConstruction) {
		throw new Error(`${input.facilityType} is already under construction`);
	}

	const fromTier = fac?.tier ?? 0;
	const toTier = input.toTier ?? fromTier + 1;
	if (toTier !== fromTier + 1) {
		throw new Error(`Must upgrade one tier at a time (from ${fromTier} → ${fromTier + 1})`);
	}
	if (toTier > MAX_FACILITY_TIER) {
		throw new Error(`Already at max tier ${MAX_FACILITY_TIER}`);
	}
	if (fromTier >= MAX_FACILITY_TIER) {
		throw new Error(`Already at max tier ${MAX_FACILITY_TIER}`);
	}

	const cost = upgradeCost(input.facilityType, toTier);
	if (team.liquidCash < cost.cash) {
		throw new Error(
			`Insufficient cash for ${input.facilityType} T${toTier} (need ${(cost.cash / 1e6).toFixed(1)}M)`
		);
	}

	const clock = await ensureClock(db);
	const weeks = daysToWeeks(cost.days);
	const finishTick = clock.tickIndex + weeks;

	await spendCash(db, {
		teamId: input.teamId,
		amount: cost.cash,
		transactionType: 'facility_construction',
		isCostCapApplicable: false
	});

	if (!fac) {
		const id = await nextFacilityId(db);
		await db.insert(facilities).values({
			id,
			teamId: input.teamId,
			facilityType: input.facilityType,
			tier: 0,
			conditionPct: 100,
			constructionFinishDate: finishTick,
			isUnderConstruction: true,
			operationalCostAnnual: 0
		});
		fac = (
			await db.select().from(facilities).where(eq(facilities.id, id)).limit(1)
		)[0]!;
	} else {
		await db
			.update(facilities)
			.set({
				isUnderConstruction: true,
				constructionFinishDate: finishTick
			})
			.where(eq(facilities.id, fac.id));
	}

	return {
		facilityId: fac.id,
		fromTier,
		toTier,
		cashSpent: cost.cash,
		weeks,
		finishTick
	};
}

export type CompletedFacility = {
	facilityId: number;
	teamId: number;
	facilityType: string;
	newTier: number;
	operationalCostAnnual: number;
};

/**
 * Complete any builds whose finish tick has been reached.
 */
export async function completeFacilityBuilds(db: AppDb): Promise<CompletedFacility[]> {
	const clock = await ensureClock(db);
	const building = await db
		.select()
		.from(facilities)
		.where(eq(facilities.isUnderConstruction, true));

	const done: CompletedFacility[] = [];
	for (const f of building) {
		if (f.constructionFinishDate == null || f.constructionFinishDate > clock.tickIndex) {
			continue;
		}
		const newTier = Math.min(MAX_FACILITY_TIER, f.tier + 1);
		const cost = upgradeCost(f.facilityType as FacilityType, newTier);
		await db
			.update(facilities)
			.set({
				tier: newTier,
				isUnderConstruction: false,
				constructionFinishDate: null,
				conditionPct: 100,
				operationalCostAnnual: cost.operationalCostAnnual
			})
			.where(eq(facilities.id, f.id));
		done.push({
			facilityId: f.id,
			teamId: f.teamId,
			facilityType: f.facilityType,
			newTier,
			operationalCostAnnual: cost.operationalCostAnnual
		});
	}
	return done;
}

export async function getFacilityUpgradeQuote(
	facilityType: FacilityType,
	fromTier: number
) {
	const toTier = fromTier + 1;
	if (toTier > MAX_FACILITY_TIER) return null;
	const cost = upgradeCost(facilityType, toTier);
	return {
		fromTier,
		toTier,
		...cost,
		weeks: daysToWeeks(cost.days)
	};
}
