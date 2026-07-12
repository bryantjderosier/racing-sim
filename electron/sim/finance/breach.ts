import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { championshipStandings, teams } from '../../db/schema.js';
import {
	MAJOR_BREACH_FINE_OF_OVERAGE,
	MAJOR_BREACH_POINTS_PENALTY,
	MAJOR_BREACH_WT_MULT,
	MINOR_BREACH_FINE_OF_OVERAGE,
	MINOR_BREACH_WT_MULT
} from './constants.js';
import { spendCash } from './ledger.js';
import { classifyCostCapBreach, type CostCapBreachLevel } from './status.js';
import { recomputePositions } from '../season/standings.js';

export type CostCapSettlement = {
	teamId: number;
	seasonYear: number;
	breach: CostCapBreachLevel;
	spent: number;
	limit: number;
	overage: number;
	fine: number;
	pointsDeducted: number;
	wtHoursCapMult: number;
};

/**
 * End-of-season cost-cap audit: fine, WT mult for next year, major points strip.
 * Does not reset costCapSpent (caller resets after prize/payroll as needed).
 */
export async function settleTeamCostCap(
	db: AppDb,
	args: { teamId: number; seasonYear: number; division: number }
): Promise<CostCapSettlement> {
	const [team] = await db.select().from(teams).where(eq(teams.id, args.teamId)).limit(1);
	if (!team) throw new Error(`Team ${args.teamId} not found`);

	const breach = classifyCostCapBreach(team.costCapSpent, team.costCapLimit);
	const overage = Math.max(0, team.costCapSpent - team.costCapLimit);
	let fine = 0;
	let pointsDeducted = 0;
	let wtHoursCapMult = 1;

	if (breach === 'minor') {
		fine = Math.round(overage * MINOR_BREACH_FINE_OF_OVERAGE);
		wtHoursCapMult = MINOR_BREACH_WT_MULT;
	} else if (breach === 'major') {
		fine = Math.round(overage * MAJOR_BREACH_FINE_OF_OVERAGE);
		wtHoursCapMult = MAJOR_BREACH_WT_MULT;
		pointsDeducted = MAJOR_BREACH_POINTS_PENALTY;
	}

	if (fine > 0) {
		await spendCash(db, {
			teamId: args.teamId,
			amount: fine,
			transactionType: 'fine',
			isCostCapApplicable: false,
			allowNegativeCash: true
		});
	}

	if (pointsDeducted > 0) {
		const [row] = await db
			.select()
			.from(championshipStandings)
			.where(
				and(
					eq(championshipStandings.seasonYear, args.seasonYear),
					eq(championshipStandings.division, args.division),
					eq(championshipStandings.entityType, 'team'),
					eq(championshipStandings.entityId, args.teamId)
				)
			)
			.limit(1);
		if (row) {
			await db
				.update(championshipStandings)
				.set({ points: Math.max(0, row.points - pointsDeducted) })
				.where(eq(championshipStandings.id, row.id));
			await recomputePositions(db, args.seasonYear, args.division);
		}
	}

	await db
		.update(teams)
		.set({ wtHoursCapMult })
		.where(eq(teams.id, args.teamId));

	return {
		teamId: args.teamId,
		seasonYear: args.seasonYear,
		breach,
		spent: team.costCapSpent,
		limit: team.costCapLimit,
		overage,
		fine,
		pointsDeducted,
		wtHoursCapMult
	};
}

export async function settleAllCostCaps(
	db: AppDb,
	seasonYear: number
): Promise<CostCapSettlement[]> {
	const rows = await db.select().from(teams);
	const out: CostCapSettlement[] = [];
	for (const t of rows) {
		out.push(
			await settleTeamCostCap(db, {
				teamId: t.id,
				seasonYear,
				division: t.division
			})
		);
	}
	return out;
}
