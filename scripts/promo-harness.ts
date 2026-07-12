import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	championshipStandings,
	suppliers,
	teams
} from '../electron/db/schema.ts';
import {
	applyPromotionRelegation,
	DIVISION_COST_CAP,
	initStandings
} from '../electron/sim/season/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const SEASON_YEAR = 2026;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'promo-releg.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	await db.insert(suppliers).values([
		{
			id: 1,
			name: 'Apex Works PU',
			powerCeiling: 112,
			annualLeaseFee: 0,
			isWorks: true
		},
		{
			id: 2,
			name: 'Chronos Customer',
			powerCeiling: 98,
			annualLeaseFee: 12_000_000,
			isWorks: false
		}
	]);

	// Split grid: teams 1–10 Div1, 11–20 Div2
	for (let id = 1; id <= 10; id++) {
		await db
			.update(teams)
			.set({
				division: 1,
				costCapLimit: DIVISION_COST_CAP[1],
				engineSupplierId: id >= 9 ? 1 : 2 // bottom of D1 on works engines
			})
			.where(eq(teams.id, id));
	}
	for (let id = 11; id <= 20; id++) {
		await db
			.update(teams)
			.set({
				division: 2,
				costCapLimit: DIVISION_COST_CAP[2],
				engineSupplierId: 2
			})
			.where(eq(teams.id, id));
	}

	await initStandings(db, SEASON_YEAR, 1);
	await initStandings(db, SEASON_YEAR, 2);

	// Rank D1 by team id (1 best … 10 worst); D2: 11 best … 20 worst
	const d1Rows = await db
		.select()
		.from(championshipStandings)
		.where(eq(championshipStandings.division, 1));
	for (const r of d1Rows) {
		if (r.entityType !== 'team') continue;
		const pos = r.entityId;
		await db
			.update(championshipStandings)
			.set({ position: pos, points: (11 - pos) * 25 })
			.where(eq(championshipStandings.id, r.id));
	}
	const d2Rows = await db
		.select()
		.from(championshipStandings)
		.where(eq(championshipStandings.division, 2));
	for (const r of d2Rows) {
		if (r.entityType !== 'team') continue;
		const pos = r.entityId - 10;
		await db
			.update(championshipStandings)
			.set({ position: pos, points: (11 - pos) * 20 })
			.where(eq(championshipStandings.id, r.id));
	}

	const [t9Before] = await db.select().from(teams).where(eq(teams.id, 9)).limit(1);
	const [t10Before] = await db.select().from(teams).where(eq(teams.id, 10)).limit(1);
	const [t11Before] = await db.select().from(teams).where(eq(teams.id, 11)).limit(1);
	const [t12Before] = await db.select().from(teams).where(eq(teams.id, 12)).limit(1);
	const cash9 = t9Before.liquidCash;
	const cash11 = t11Before.liquidCash;

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' PROMOTION / RELEGATION');
	console.log('══════════════════════════════════════════════════════════════');
	console.log('\n── Before');
	console.log(
		`  D1 P9–10 (relegate): #9 eng=${t9Before.engineSupplierId} cap=${(t9Before.costCapLimit / 1e6).toFixed(0)}M`
	);
	console.log(
		`  D1 P10:              #10 eng=${t10Before.engineSupplierId} cap=${(t10Before.costCapLimit / 1e6).toFixed(0)}M`
	);
	console.log(
		`  D2 P1–2 (promote):   #11 cash=${(cash11 / 1e6).toFixed(1)}M cap=${(t11Before.costCapLimit / 1e6).toFixed(0)}M`
	);
	console.log(
		`  D2 P2:               #12 eng=${t12Before.engineSupplierId}`
	);

	const result = await applyPromotionRelegation(db, {
		seasonYear: SEASON_YEAR,
		promoteCount: 2,
		relegateCount: 2
	});

	console.log(`\n── Moves: ${result.promoted} promoted, ${result.relegated} relegated`);
	for (const m of result.moves) {
		console.log(
			`  ${m.reason === 'promoted' ? '↑' : '↓'} ${m.teamName}  D${m.fromDivision}→D${m.toDivision}` +
				`  cap ${(m.costCapBefore / 1e6).toFixed(0)}→${(m.costCapAfter / 1e6).toFixed(0)}M` +
				`  cash ${(m.cashAfter / 1e6).toFixed(1)}M` +
				(m.engineForcedCustomer
					? `  engine ${m.engineBefore}→${m.engineAfter} (forced customer)`
					: '')
		);
	}

	const [t9] = await db.select().from(teams).where(eq(teams.id, 9)).limit(1);
	const [t10] = await db.select().from(teams).where(eq(teams.id, 10)).limit(1);
	const [t11] = await db.select().from(teams).where(eq(teams.id, 11)).limit(1);
	const [t12] = await db.select().from(teams).where(eq(teams.id, 12)).limit(1);

	console.log('\n── After');
	console.log(
		`  #9  div=${t9.division} cap=${(t9.costCapLimit / 1e6).toFixed(0)}M eng=${t9.engineSupplierId} cash=${(t9.liquidCash / 1e6).toFixed(1)}M`
	);
	console.log(
		`  #11 div=${t11.division} cap=${(t11.costCapLimit / 1e6).toFixed(0)}M cash=${(t11.liquidCash / 1e6).toFixed(1)}M`
	);

	if (result.promoted !== 2 || result.relegated !== 2) {
		throw new Error('Expected 2 up / 2 down between D1–D2');
	}
	if (t9.division !== 2 || t10.division !== 2) throw new Error('D1 bottom should relegate');
	if (t11.division !== 1 || t12.division !== 1) throw new Error('D2 top should promote');
	if (t9.liquidCash !== cash9 || t11.liquidCash !== cash11) {
		throw new Error('Cash must be unchanged (financial shock)');
	}
	if (t11.costCapLimit !== DIVISION_COST_CAP[1]) throw new Error('Promoted cap should be D1');
	if (t9.costCapLimit !== DIVISION_COST_CAP[2]) throw new Error('Relegated cap should be D2');
	if (t9.engineSupplierId !== 2 || t10.engineSupplierId !== 2) {
		throw new Error('Works engines must be stripped on relegation');
	}
	if (t9.costCapSpent !== 0) throw new Error('costCapSpent should reset');

	const d1Count = (
		await db.select({ c: sql<number>`count(*)` }).from(teams).where(eq(teams.division, 1))
	)[0].c;
	const d2Count = (
		await db.select({ c: sql<number>`count(*)` }).from(teams).where(eq(teams.division, 2))
	)[0].c;
	if (Number(d1Count) !== 10 || Number(d2Count) !== 10) {
		throw new Error('Division sizes should stay 10/10 after swap');
	}

	console.log('\nAll promotion/relegation checks passed.');
} finally {
	await db.close();
}
