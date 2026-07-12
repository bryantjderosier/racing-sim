import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	blueprints,
	championshipStandings,
	contracts,
	financialLedger,
	teams
} from '../electron/db/schema.ts';
import {
	classifyCostCapBreach,
	DIVISION_COST_CAP,
	getCostCapStatus,
	MAJOR_BREACH_POINTS_PENALTY,
	MAJOR_BREACH_WT_MULT,
	MINOR_BREACH_WT_MULT,
	payChampionshipPrizeMoney,
	payWeeklyPayroll,
	rdTestingCashCost,
	settleTeamCostCap,
	spendCash
} from '../electron/sim/finance/index.ts';
import { FABRICATION_COST_BASE } from '../electron/sim/rd/constants.ts';
import { allocateTestingHours, queueManufacture, startRdProject } from '../electron/sim/rd/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { advanceWorldWeek } from '../electron/sim/world/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'finance.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	await db
		.update(teams)
		.set({
			liquidCash: 80_000_000,
			costCapLimit: DIVISION_COST_CAP[1],
			costCapSpent: 0,
			wtHoursCapMult: 1
		})
		.where(eq(teams.id, 1));

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' FINANCE / COST CAP');
	console.log('══════════════════════════════════════════════════════════════');

	const status0 = await getCostCapStatus(db, 1);
	console.log(
		`\n── Cap: limit=${(status0.limit / 1e6).toFixed(0)}M spent=${(status0.spent / 1e6).toFixed(2)}M`
	);

	await spendCash(db, {
		teamId: 1,
		amount: 5_000_000,
		transactionType: 'facility_construction',
		isCostCapApplicable: false
	});
	assert((await getCostCapStatus(db, 1)).spent === 0, 'facility outside cap');

	const [bpRow] = await db.select().from(blueprints).where(eq(blueprints.teamId, 1)).limit(1);
	assert(bpRow != null, 'blueprint exists');

	const mfg = await queueManufacture(db, { teamId: 1, blueprintId: bpRow!.id });
	assert((await getCostCapStatus(db, 1)).spent === mfg.cost, 'fabrication inside cap');
	assert(mfg.cost === FABRICATION_COST_BASE, 'base fab cost');

	const proj = await startRdProject(db, { teamId: 1, slot: 'front_wing' });
	await db
		.update(teams)
		.set({ wtHoursRemaining: 10, cfdHoursRemaining: 20 })
		.where(eq(teams.id, 1));
	const cashBeforeRd = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	await allocateTestingHours(db, {
		projectId: proj.projectId,
		wtHours: 10,
		cfdHours: 20,
		autoComplete: false
	});
	const expectedRd = rdTestingCashCost(10, 20);
	const cashAfterRd = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	assert(cashBeforeRd - cashAfterRd === expectedRd, 'RD testing cash');
	const afterRd = await getCostCapStatus(db, 1);
	assert(afterRd.spent === mfg.cost + expectedRd, 'RD inside cap');
	console.log(
		`── Fab ${(mfg.cost / 1e3).toFixed(0)}k + RD ${(expectedRd / 1e3).toFixed(0)}k → spent ${(afterRd.spent / 1e6).toFixed(3)}M`
	);

	await db.insert(contracts).values([
		{
			id: 9001,
			entityId: 1,
			entityType: 'driver',
			teamId: 1,
			salaryAnnual: 5_200_000,
			yearsRemaining: 2,
			buyoutFee: 0,
			isNumberOne: true,
			isActive: true
		},
		{
			id: 9002,
			entityId: 101,
			entityType: 'staff',
			teamId: 1,
			salaryAnnual: 2_080_000,
			yearsRemaining: 2,
			buyoutFee: 0,
			isNumberOne: false,
			isActive: true
		},
		{
			id: 9003,
			entityId: 102,
			entityType: 'staff',
			teamId: 1,
			salaryAnnual: 1_560_000,
			yearsRemaining: 2,
			buyoutFee: 0,
			isNumberOne: false,
			isActive: true
		},
		{
			id: 9004,
			entityId: 103,
			entityType: 'staff',
			teamId: 1,
			salaryAnnual: 1_040_000,
			yearsRemaining: 2,
			buyoutFee: 0,
			isNumberOne: false,
			isActive: true
		},
		{
			id: 9005,
			entityId: 104,
			entityType: 'staff',
			teamId: 1,
			salaryAnnual: 520_000,
			yearsRemaining: 2,
			buyoutFee: 0,
			isNumberOne: false,
			isActive: true
		}
	]);

	const spentBeforePay = (await getCostCapStatus(db, 1)).spent;
	const pay = await payWeeklyPayroll(db, 1);
	assert(pay.lines.length === 5, '5 payroll lines');
	assert(pay.capApplicablePaid === Math.round(520_000 / 52), 'only lowest staff inside cap');
	assert(
		(await getCostCapStatus(db, 1)).spent - spentBeforePay === pay.capApplicablePaid,
		'payroll cap delta'
	);
	console.log(
		`── Payroll weekly=${(pay.totalPaid / 1e3).toFixed(0)}k capShare=${(pay.capApplicablePaid / 1e3).toFixed(1)}k`
	);

	const [t1] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	await db.update(teams).set({ costCapSpent: t1.costCapLimit * 1.03 }).where(eq(teams.id, 1));
	assert(classifyCostCapBreach(t1.costCapLimit * 1.03, t1.costCapLimit) === 'minor', 'minor class');

	const minor = await settleTeamCostCap(db, { teamId: 1, seasonYear: 2026, division: 1 });
	assert(minor.breach === 'minor', 'minor settle');
	assert(minor.wtHoursCapMult === MINOR_BREACH_WT_MULT, 'minor WT mult');
	assert(minor.fine > 0, 'minor fine');
	console.log(
		`── Minor breach: fine=${(minor.fine / 1e6).toFixed(2)}M wtMult=${minor.wtHoursCapMult}`
	);

	await advanceWorldWeek(db, { skipPayroll: true, rng: () => 0.4,
		skipAi: true
	});
	const [afterTick] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	assert(
		Math.abs(afterTick.wtHoursRemaining - 40 * MINOR_BREACH_WT_MULT) < 0.01,
		'WT refresh uses mult'
	);

	await db
		.update(teams)
		.set({ costCapSpent: afterTick.costCapLimit * 1.1 })
		.where(eq(teams.id, 1));

	const [teamStanding] = await db
		.select()
		.from(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, 2026),
				eq(championshipStandings.division, 1),
				eq(championshipStandings.entityType, 'team'),
				eq(championshipStandings.entityId, 1)
			)
		)
		.limit(1);

	if (teamStanding) {
		await db
			.update(championshipStandings)
			.set({ points: 100 })
			.where(eq(championshipStandings.id, teamStanding.id));
	} else {
		const { sql } = await import('drizzle-orm');
		const [maxRow] = await db
			.select({ m: sql<number>`coalesce(max(${championshipStandings.id}), 0)` })
			.from(championshipStandings);
		await db.insert(championshipStandings).values({
			id: Number(maxRow?.m ?? 0) + 1,
			seasonYear: 2026,
			division: 1,
			entityId: 1,
			entityType: 'team',
			teamId: 1,
			points: 100,
			position: 1
		});
	}

	const major = await settleTeamCostCap(db, { teamId: 1, seasonYear: 2026, division: 1 });
	assert(major.breach === 'major', 'major settle');
	assert(major.wtHoursCapMult === MAJOR_BREACH_WT_MULT, 'major WT');
	assert(major.pointsDeducted === MAJOR_BREACH_POINTS_PENALTY, 'points strip');

	const [afterPts] = await db
		.select()
		.from(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, 2026),
				eq(championshipStandings.division, 1),
				eq(championshipStandings.entityType, 'team'),
				eq(championshipStandings.entityId, 1)
			)
		)
		.limit(1);
	assert(afterPts.points === 100 - MAJOR_BREACH_POINTS_PENALTY, 'points applied');

	const prizes = await payChampionshipPrizeMoney(db, 2026);
	assert(prizes.some((p) => p.teamId === 1 && p.amount > 0), 'prize paid');

	const ledger = await db.select().from(financialLedger).where(eq(financialLedger.teamId, 1));
	assert(ledger.some((l) => l.transactionType === 'prize_money'), 'prize ledger');
	assert(ledger.some((l) => l.transactionType === 'fine'), 'fine ledger');
	assert(
		ledger.filter((l) => l.transactionType === 'part_fabrication')[0]?.isCostCapApplicable ===
			true,
		'fab capped'
	);
	assert(
		ledger.filter((l) => l.transactionType === 'facility_construction')[0]
			?.isCostCapApplicable === false,
		'facility uncapped'
	);

	console.log(
		`── Major: fine=${(major.fine / 1e6).toFixed(2)}M pts-${major.pointsDeducted}  prizes=${prizes.length}`
	);
	console.log('\n── PASS');
} finally {
	await db.close();
}
