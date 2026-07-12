import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../../db/node.js';
import { attributes, contracts, staff, teams, worldClock } from '../../../db/schema.js';
import { HEAT_WEEK_THRESHOLD } from '../constants.js';
import { CORE_STAFF_ROLES } from './constants.js';
import type { StaffRole } from './types.js';

export type MarketHeatReason = 'final_window' | 'free_agent' | 'open_role';

export type HotStaff = {
	staffId: number;
	name: string;
	role: StaffRole;
	teamId: number | null;
	reasons: MarketHeatReason[];
	contractId: number | null;
	yearsRemaining: number | null;
	salaryAnnual: number | null;
	buyoutFee: number | null;
};

export async function loadStaffAttrs(db: AppDb, staffId: number) {
	const rows = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, staffId), eq(attributes.entityType, 'staff')));
	const out: Record<string, number> = {};
	for (const r of rows) out[r.attrName] = r.currentValue;
	return out;
}

export async function scanStaffMarketHeat(db: AppDb): Promise<HotStaff[]> {
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const week = clock?.week ?? 1;

	const allStaff = await db.select().from(staff);
	const activeContracts = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.entityType, 'staff'), eq(contracts.isActive, true)));
	const contractBy = new Map(activeContracts.map((c) => [c.entityId, c]));

	const hot: HotStaff[] = [];
	for (const s of allStaff) {
		const reasons: MarketHeatReason[] = [];
		const c = contractBy.get(s.id) ?? null;

		if (s.teamId == null || c == null) {
			reasons.push('free_agent');
		} else if (c.yearsRemaining <= 0) {
			reasons.push('final_window');
		} else if (c.yearsRemaining === 1 && week >= HEAT_WEEK_THRESHOLD) {
			reasons.push('final_window');
		}

		if (reasons.length === 0) continue;

		hot.push({
			staffId: s.id,
			name: s.name,
			role: s.role as StaffRole,
			teamId: s.teamId,
			reasons,
			contractId: c?.id ?? null,
			yearsRemaining: c?.yearsRemaining ?? null,
			salaryAnnual: c?.salaryAnnual ?? null,
			buyoutFee: c?.buyoutFee ?? null
		});
	}

	return hot;
}

/** Teams missing at least one core staff role. */
export async function teamsMissingStaffRoles(
	db: AppDb
): Promise<{ teamId: number; missingRoles: StaffRole[] }[]> {
	const teamRows = await db.select().from(teams);
	const allStaff = await db.select().from(staff);
	const byTeam = new Map<number, Set<string>>();
	for (const s of allStaff) {
		if (s.teamId == null) continue;
		const set = byTeam.get(s.teamId) ?? new Set();
		set.add(s.role);
		byTeam.set(s.teamId, set);
	}

	const out: { teamId: number; missingRoles: StaffRole[] }[] = [];
	for (const t of teamRows) {
		const have = byTeam.get(t.id) ?? new Set();
		const missing = CORE_STAFF_ROLES.filter((r) => !have.has(r));
		if (missing.length) out.push({ teamId: t.id, missingRoles: missing });
	}
	return out;
}
