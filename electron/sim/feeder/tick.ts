import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, drivers } from '../../db/schema.js';
import {
	FEEDER_GROWTH_BASE,
	PACE_ATTRS_FOR_GRAD,
	TIER_CEILING,
	type PotentialTier
} from './constants.js';

export type FeederTickResult = {
	driverId: number;
	name: string;
	resultQuality: number;
	attrsGrown: number;
	totalGrowth: number;
};

/**
 * Lightweight probability season for one karting prospect — not a full weekend sim.
 * resultQuality ∈ [0,1] drives attr growth toward ceilings (volatile by tier).
 */
export function rollFeederResult(
	paceAvg: number,
	tier: PotentialTier,
	rng: () => number
): number {
	const vol = TIER_CEILING[tier].volatility;
	const skill = paceAvg / 100;
	// Skill shifts mean; volatility widens swing (elite boom/bust)
	const noise = (rng() - 0.5) * vol;
	return Math.max(0, Math.min(1, 0.35 + skill * 0.45 + noise));
}

export async function tickFeederProspect(
	db: AppDb,
	driverId: number,
	rng: () => number = Math.random
): Promise<FeederTickResult | null> {
	const [d] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
	if (!d?.isKarting) return null;

	const rows = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, driverId), eq(attributes.entityType, 'driver')));

	let paceSum = 0;
	let paceN = 0;
	for (const a of rows) {
		if ((PACE_ATTRS_FOR_GRAD as readonly string[]).includes(a.attrName)) {
			paceSum += a.currentValue;
			paceN++;
		}
	}
	const paceAvg = paceN ? paceSum / paceN : 40;
	const tier = (d.potentialTier ?? 'bronze') as PotentialTier;
	const quality = rollFeederResult(paceAvg, tier, rng);

	const growthBudget = FEEDER_GROWTH_BASE * (0.4 + quality * 1.2) * (0.85 + tier === 'elite' ? 0.25 : 0);
	let remaining = growthBudget;
	let attrsGrown = 0;
	let totalGrowth = 0;

	// Prefer pace attrs, then random others below ceiling
	const growable = rows
		.filter((a) => a.currentValue < a.ceiling)
		.sort((a, b) => {
			const ap = (PACE_ATTRS_FOR_GRAD as readonly string[]).includes(a.attrName) ? 0 : 1;
			const bp = (PACE_ATTRS_FOR_GRAD as readonly string[]).includes(b.attrName) ? 0 : 1;
			return ap - bp || rng() - 0.5;
		});

	for (const a of growable) {
		if (remaining < 0.35) break;
		const room = a.ceiling - a.currentValue;
		const gain = Math.min(room, Math.max(1, Math.round(remaining * (0.35 + rng() * 0.4))));
		if (gain <= 0) continue;
		await db
			.update(attributes)
			.set({ currentValue: a.currentValue + gain })
			.where(eq(attributes.id, a.id));
		remaining -= gain;
		attrsGrown++;
		totalGrowth += gain;
	}

	return {
		driverId,
		name: d.name,
		resultQuality: quality,
		attrsGrown,
		totalGrowth
	};
}

/**
 * Run one abstract feeder season tick for the whole karting pool.
 */
export async function tickFeederPool(
	db: AppDb,
	rng: () => number = Math.random
): Promise<FeederTickResult[]> {
	const pool = await db.select().from(drivers).where(eq(drivers.isKarting, true));
	const out: FeederTickResult[] = [];
	for (const d of pool) {
		const r = await tickFeederProspect(db, d.id, rng);
		if (r) out.push(r);
	}
	return out;
}
