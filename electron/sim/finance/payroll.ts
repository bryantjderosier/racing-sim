import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { contracts, teams } from '../../db/schema.js';
import { PAYROLL_WEEKS_PER_YEAR, TOP_STAFF_SALARY_EXEMPT } from './constants.js';
import { spendCash } from './ledger.js';

export type PayrollLine = {
	entityId: number;
	entityType: 'driver' | 'staff';
	weeklyAmount: number;
	isCostCapApplicable: boolean;
};

export type PayrollResult = {
	teamId: number;
	totalPaid: number;
	capApplicablePaid: number;
	lines: PayrollLine[];
};

/**
 * Weekly payroll: drivers + non-top-3 staff outside/inside per design.
 * Top 3 staff by annual salary are outside the cost cap; remaining staff inside.
 */
export async function payWeeklyPayroll(db: AppDb, teamId: number): Promise<PayrollResult> {
	const rows = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.teamId, teamId), eq(contracts.isActive, true)));

	const drivers = rows.filter((c) => c.entityType === 'driver');
	const staff = rows
		.filter((c) => c.entityType === 'staff')
		.sort((a, b) => b.salaryAnnual - a.salaryAnnual);

	const lines: PayrollLine[] = [];

	for (const c of drivers) {
		lines.push({
			entityId: c.entityId,
			entityType: 'driver',
			weeklyAmount: c.salaryAnnual / PAYROLL_WEEKS_PER_YEAR,
			isCostCapApplicable: false
		});
	}

	staff.forEach((c, i) => {
		lines.push({
			entityId: c.entityId,
			entityType: 'staff',
			weeklyAmount: c.salaryAnnual / PAYROLL_WEEKS_PER_YEAR,
			isCostCapApplicable: i >= TOP_STAFF_SALARY_EXEMPT
		});
	});

	let totalPaid = 0;
	let capApplicablePaid = 0;

	for (const line of lines) {
		const amount = Math.round(line.weeklyAmount);
		if (amount <= 0) continue;
		await spendCash(db, {
			teamId,
			amount,
			transactionType: line.entityType === 'driver' ? 'salary' : 'staff_salary',
			isCostCapApplicable: line.isCostCapApplicable
		});
		totalPaid += amount;
		if (line.isCostCapApplicable) capApplicablePaid += amount;
	}

	return { teamId, totalPaid, capApplicablePaid, lines };
}

export async function payAllTeamsWeeklyPayroll(db: AppDb): Promise<PayrollResult[]> {
	const teamRows = await db.select({ id: teams.id }).from(teams);
	const out: PayrollResult[] = [];
	for (const t of teamRows) {
		out.push(await payWeeklyPayroll(db, t.id));
	}
	return out;
}
