import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { teams } from '../../db/schema.js';
import { MINOR_BREACH_MAX_OVERAGE } from './constants.js';

export type CostCapBreachLevel = 'none' | 'minor' | 'major';

export type CostCapStatus = {
	teamId: number;
	limit: number;
	spent: number;
	remaining: number;
	utilization: number;
	overage: number;
	overagePct: number;
	breach: CostCapBreachLevel;
	wtHoursCapMult: number;
};

export function classifyCostCapBreach(spent: number, limit: number): CostCapBreachLevel {
	if (limit <= 0) return spent > 0 ? 'major' : 'none';
	if (spent <= limit) return 'none';
	const overPct = (spent - limit) / limit;
	if (overPct <= MINOR_BREACH_MAX_OVERAGE) return 'minor';
	return 'major';
}

export function costCapStatusFromTeam(team: {
	id: number;
	costCapLimit: number;
	costCapSpent: number;
	wtHoursCapMult: number;
}): CostCapStatus {
	const limit = team.costCapLimit;
	const spent = team.costCapSpent;
	const overage = Math.max(0, spent - limit);
	const remaining = Math.max(0, limit - spent);
	return {
		teamId: team.id,
		limit,
		spent,
		remaining,
		utilization: limit > 0 ? spent / limit : 0,
		overage,
		overagePct: limit > 0 ? overage / limit : 0,
		breach: classifyCostCapBreach(spent, limit),
		wtHoursCapMult: team.wtHoursCapMult
	};
}

export async function getCostCapStatus(db: AppDb, teamId: number): Promise<CostCapStatus> {
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
	if (!team) throw new Error(`Team ${teamId} not found`);
	return costCapStatusFromTeam(team);
}
