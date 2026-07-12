import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, contracts, drivers, teams, worldClock } from '../../db/schema.js';
import { quitRiskScore } from '../morale/index.js';
import { HEAT_WEEK_THRESHOLD } from './constants.js';

export type MarketHeatReason =
	| 'final_window'
	| 'free_agent'
	| 'retirement'
	| 'open_seat'
	| 'morale_quit';

export type HotDriver = {
	driverId: number;
	name: string;
	teamId: number | null;
	age: number;
	longevity: number;
	reasons: MarketHeatReason[];
	contractId: number | null;
	yearsRemaining: number | null;
	salaryAnnual: number | null;
	buyoutFee: number | null;
	releaseClause: number | null;
};

async function loadAttrsMap(db: AppDb, driverId: number) {
	const rows = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, driverId), eq(attributes.entityType, 'driver')));
	const out: Record<string, number> = {};
	for (const r of rows) out[r.attrName] = r.currentValue;
	return out;
}

export { loadAttrsMap };

/**
 * Drivers in market heat: final contract window, free agents, or retirements.
 */
export async function scanMarketHeat(db: AppDb): Promise<HotDriver[]> {
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const week = clock?.week ?? 1;

	const allDrivers = await db.select().from(drivers).where(eq(drivers.isKarting, false));
	const activeContracts = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.entityType, 'driver'), eq(contracts.isActive, true)));
	const contractByDriver = new Map(activeContracts.map((c) => [c.entityId, c]));

	const hot: HotDriver[] = [];

	for (const d of allDrivers) {
		const reasons: MarketHeatReason[] = [];
		const c = contractByDriver.get(d.id) ?? null;

		if (d.teamId == null || c == null) {
			reasons.push('free_agent');
		} else if (c.yearsRemaining <= 0) {
			reasons.push('final_window');
		} else if (c.yearsRemaining === 1 && week >= HEAT_WEEK_THRESHOLD) {
			reasons.push('final_window');
		}

		if (d.age >= d.longevity) {
			reasons.push('retirement');
		}

		const quit = quitRiskScore({ morale: d.morale });
		if (quit >= 0.45 && d.teamId != null) {
			reasons.push('morale_quit');
		}

		if (reasons.length === 0) continue;

		hot.push({
			driverId: d.id,
			name: d.name,
			teamId: d.teamId,
			age: d.age,
			longevity: d.longevity,
			reasons,
			contractId: c?.id ?? null,
			yearsRemaining: c?.yearsRemaining ?? null,
			salaryAnnual: c?.salaryAnnual ?? null,
			buyoutFee: c?.buyoutFee ?? null,
			releaseClause: c?.releaseClause ?? null
		});
	}

	return hot;
}

export async function teamsWithOpenSeats(db: AppDb): Promise<number[]> {
	const allDrivers = await db.select().from(drivers).where(eq(drivers.isKarting, false));
	const teamRows = await db.select().from(teams);
	const count = new Map<number, number>();
	for (const d of allDrivers) {
		if (d.teamId == null) continue;
		count.set(d.teamId, (count.get(d.teamId) ?? 0) + 1);
	}
	return teamRows.filter((t) => (count.get(t.id) ?? 0) < 1).map((t) => t.id);
}
