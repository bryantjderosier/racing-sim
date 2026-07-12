import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { contracts, drivers, staff, teams } from '../electron/db/schema.ts';
import {
	moraleFeedbackMult,
	moraleXpMult,
	quitRiskScore,
	tickMorale
} from '../electron/sim/morale/index.ts';
import { scanMarketHeat } from '../electron/sim/market/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { advanceWorldWeek } from '../electron/sim/world/index.ts';
import { generateEngineeringBrief } from '../electron/sim/practice/brief.ts';
import type { SetupVector } from '../electron/sim/lap/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'morale.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const baseSetup: SetupVector = {
	frontWingAngle: 5,
	rearWingAngle: 8,
	frontArb: 4,
	rearArb: 5,
	frontRideHeightMm: 22,
	rearRideHeightMm: 28,
	frontCamber: -2.5,
	rearCamber: -1.5,
	frontToe: 0.1,
	rearToe: 0.2,
	brakeBias: 55
};

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	await db.insert(contracts).values({
		id: 8001,
		entityId: 1,
		entityType: 'driver',
		teamId: 1,
		salaryAnnual: 1_500_000, // underpaid vs D1 baseline 4M
		yearsRemaining: 2,
		buyoutFee: 0,
		isNumberOne: true,
		isActive: true
	});

	await db.update(drivers).set({ morale: 50 }).where(eq(drivers.id, 1));
	await db
		.update(staff)
		.set({ ego: 88, morale: 55, loyalty: 50 })
		.where(eq(staff.teamId, 1));

	await db.insert(staff).values({
		id: 777,
		name: 'Toxic Aero',
		nationalityCode: 'ITA',
		birthplace: 'Milan',
		role: 'aero',
		teamId: 1,
		isScouted: true,
		morale: 50,
		ego: 90,
		loyalty: 40,
		fatiguePct: 0
	});

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' MORALE / EGO / LOYALTY');
	console.log('══════════════════════════════════════════════════════════════');

	assert(moraleXpMult(25) < moraleXpMult(75), 'XP mult scales with morale');
	assert(moraleFeedbackMult(20) < moraleFeedbackMult(80), 'feedback mult scales');

	const tick = await tickMorale(db, {
		raceResultsByDriverId: { 1: { position: 2, gridSize: 20 } },
		teamOrdersByDriverId: { 1: 'sacrificed' }
	});
	const dUpdate = tick.updates.find((u) => u.entityType === 'driver' && u.entityId === 1);
	assert(dUpdate != null, 'driver updated');
	assert(dUpdate!.reasons.includes('race_p2'), 'podium reason');
	assert(dUpdate!.reasons.includes('order_sacrificed'), 'sacrifice');
	assert(dUpdate!.reasons.includes('underpaid'), 'underpaid');
	console.log(
		`\n── Driver1: ${dUpdate!.moraleBefore.toFixed(1)} → ${dUpdate!.moraleAfter.toFixed(1)} [${dUpdate!.reasons}]`
	);

	const staffToxic = tick.updates.filter(
		(u) => u.entityType === 'staff' && u.reasons.includes('toxic_staff')
	);
	assert(staffToxic.length >= 1, 'toxic staff pairing');
	console.log(`── Toxic staff updates: ${staffToxic.length}`);

	await db.update(drivers).set({ morale: 15 }).where(eq(drivers.id, 1));
	const risk = quitRiskScore({ morale: 15 });
	assert(risk >= 0.45, 'quit risk high');
	const heat = await scanMarketHeat(db);
	assert(
		heat.some((h) => h.driverId === 1 && h.reasons.includes('morale_quit')),
		'morale_quit heat'
	);
	console.log(`── Quit risk=${risk.toFixed(2)}  heat reasons include morale_quit`);

	const briefHigh = generateEngineeringBrief(baseSetup, { ...baseSetup, frontWingAngle: 8 }, {
		driverFeedback: 70,
		engineerSetup: 70,
		engineerAnalysis: 70,
		driverMorale: 90
	});
	const briefLow = generateEngineeringBrief(baseSetup, { ...baseSetup, frontWingAngle: 8 }, {
		driverFeedback: 70,
		engineerSetup: 70,
		engineerAnalysis: 70,
		driverMorale: 15
	});
	assert(briefHigh.qualityScore > briefLow.qualityScore, 'morale affects brief quality');
	console.log(`── Brief quality high-morale=${briefHigh.qualityScore} low=${briefLow.qualityScore}`);

	const week = await advanceWorldWeek(db, {
		skipPayroll: true,
		skipScouting: true,
		skipAi: true,
		raceResultsByDriverId: { 1: { position: 18 } },
		rng: () => 0.4
	});
	assert(week.morale != null && week.morale.updates.length > 0, 'world tick morale');
	const [d1] = await db.select().from(drivers).where(eq(drivers.id, 1)).limit(1);
	console.log(`── After world tick (P18): morale=${d1.morale.toFixed(1)}`);

	void teams;
	console.log('\n── PASS');
} finally {
	await db.close();
}
