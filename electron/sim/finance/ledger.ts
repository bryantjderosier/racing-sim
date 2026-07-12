import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { financialLedger, teams, worldClock } from '../../db/schema.js';

export type LedgerTransactionType =
	| 'sponsor_payout'
	| 'sponsor_bonus'
	| 'prize_money'
	| 'part_fabrication'
	| 'rd_testing'
	| 'salary'
	| 'staff_salary'
	| 'buyout_fee'
	| 'engine_lease'
	| 'engine_supply_fee'
	| 'facility_construction'
	| 'freight_travel'
	| 'marketing'
	| 'fine'
	| 'emergency_procurement'
	| 'hospitality';

export type PostLedgerInput = {
	teamId: number;
	/** Signed amount: positive = income, negative = spend. */
	amount: number;
	transactionType: LedgerTransactionType;
	isCostCapApplicable: boolean;
	/** Allow cash to go negative (fines). Default false for spends. */
	allowNegativeCash?: boolean;
};

export type PostLedgerResult = {
	ledgerId: number;
	cashAfter: number;
	costCapSpentAfter: number;
};

async function nextLedgerId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${financialLedger.id}), 0)` })
		.from(financialLedger);
	return Number(row?.m ?? 0) + 1;
}

async function clockMeta(db: AppDb): Promise<{ seasonYear: number; tickIndex: number }> {
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	return {
		seasonYear: clock?.seasonYear ?? 2026,
		tickIndex: clock?.tickIndex ?? 0
	};
}

/**
 * Single write path for cash + optional cost-cap pool + ledger row.
 * Cap overspend is allowed (settled at season end); cash is not unless allowNegativeCash.
 */
export async function postLedger(
	db: AppDb,
	input: PostLedgerInput
): Promise<PostLedgerResult> {
	const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
	if (!team) throw new Error(`Team ${input.teamId} not found`);

	const cashAfter = team.liquidCash + input.amount;
	if (input.amount < 0 && cashAfter < 0 && !input.allowNegativeCash) {
		throw new Error(
			`Insufficient cash (have ${(team.liquidCash / 1e6).toFixed(2)}M, need ${(Math.abs(input.amount) / 1e6).toFixed(2)}M)`
		);
	}

	const capDelta = input.isCostCapApplicable && input.amount < 0 ? -input.amount : 0;
	const costCapSpentAfter = team.costCapSpent + capDelta;

	await db
		.update(teams)
		.set({
			liquidCash: cashAfter,
			costCapSpent: costCapSpentAfter
		})
		.where(eq(teams.id, team.id));

	const meta = await clockMeta(db);
	const ledgerId = await nextLedgerId(db);
	await db.insert(financialLedger).values({
		id: ledgerId,
		teamId: input.teamId,
		amount: input.amount,
		transactionType: input.transactionType,
		isCostCapApplicable: input.isCostCapApplicable,
		seasonIndex: meta.seasonYear,
		timestamp: meta.tickIndex
	});

	return { ledgerId, cashAfter, costCapSpentAfter };
}

export async function spendCash(
	db: AppDb,
	args: {
		teamId: number;
		amount: number;
		transactionType: LedgerTransactionType;
		isCostCapApplicable: boolean;
		allowNegativeCash?: boolean;
	}
): Promise<PostLedgerResult> {
	if (args.amount < 0) throw new Error('spendCash amount must be ≥ 0');
	return postLedger(db, {
		teamId: args.teamId,
		amount: -args.amount,
		transactionType: args.transactionType,
		isCostCapApplicable: args.isCostCapApplicable,
		allowNegativeCash: args.allowNegativeCash
	});
}

export async function receiveCash(
	db: AppDb,
	args: {
		teamId: number;
		amount: number;
		transactionType: LedgerTransactionType;
	}
): Promise<PostLedgerResult> {
	if (args.amount < 0) throw new Error('receiveCash amount must be ≥ 0');
	return postLedger(db, {
		teamId: args.teamId,
		amount: args.amount,
		transactionType: args.transactionType,
		isCostCapApplicable: false
	});
}
