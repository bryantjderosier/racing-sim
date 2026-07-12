import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { attributes, facilities, teams, worldClock } from '../electron/db/schema.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import {
	advanceWorldWeek,
	WEEKLY_CFD_CAP,
	WEEKLY_WT_CAP,
	type WorldTickOptions,
	type WorldTickResult
} from '../electron/sim/world/index.ts';
import type { AppDb } from '../electron/db/node.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'world-tick.duckdb');
const migrationsFolder = join(root, 'drizzle');

async function snapshotTeam1(db: AppDb) {
	const [team] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	const facs = await db.select().from(facilities).where(eq(facilities.teamId, 1));
	const sim = facs.find((f) => f.facilityType === 'simulator');
	const academy = facs.find((f) => f.facilityType === 'staff_academy');
	const wt = facs.find((f) => f.facilityType === 'wind_tunnel');
	const braking = (
		await db.select().from(attributes).where(eq(attributes.entityId, 1))
	).find((a) => a.attrName === 'braking')?.currentValue;
	return { team, sim, academy, wt, braking, facs };
}

async function runTick(
	db: AppDb,
	label: string,
	options: WorldTickOptions
): Promise<WorldTickResult> {
	const before = await snapshotTeam1(db);
	const cashBefore = before.team?.liquidCash ?? 0;

	const result = await advanceWorldWeek(db, options);
	const after = await snapshotTeam1(db);

	console.log(`\n── TICK ${result.tickIndex} · ${result.seasonYear} W${result.week} D${result.day} — ${label}`);
	console.log(
		`  Hours:   WT ${before.team?.wtHoursRemaining}→${after.team?.wtHoursRemaining} (cap ${WEEKLY_WT_CAP[1]})  |  CFD ${before.team?.cfdHoursRemaining}→${after.team?.cfdHoursRemaining} (cap ${WEEKLY_CFD_CAP[1]})`
	);
	console.log(
		`  Sim:     ${before.sim?.conditionPct.toFixed(2)}% → ${after.sim?.conditionPct.toFixed(2)}%  (tier ${after.sim?.tier})`
	);
	console.log(
		`  Academy: ${before.academy?.conditionPct.toFixed(2)}% → ${after.academy?.conditionPct.toFixed(2)}%`
	);
	console.log(
		`  WT fac:  ${before.wt?.conditionPct.toFixed(2)}% → ${after.wt?.conditionPct.toFixed(2)}%`
	);
	console.log(
		`  Fac:     decayed ${result.facilitiesDecayed}  maintained ${result.facilitiesMaintained}`
	);
	if (result.facilitiesMaintained > 0) {
		console.log(
			`  Cash:    ${(cashBefore / 1e6).toFixed(2)}M → ${((after.team?.liquidCash ?? 0) / 1e6).toFixed(2)}M`
		);
	}
	console.log(
		`  XP:      ${result.xpEvents.length} grants  |  levels +${result.levelsGained}  |  driver1 braking ${before.braking}→${after.braking}`
	);
	const levels = result.xpEvents.filter((e) => e.leveledTo != null);
	for (const ev of levels.slice(0, 8)) {
		console.log(
			`           ↑ ${ev.entityType}#${ev.entityId} ${ev.attrName} → ${ev.leveledTo}`
		);
	}
	if (levels.length > 8) console.log(`           … +${levels.length - 8} more level-ups`);

	return result;
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	await db
		.update(teams)
		.set({ wtHoursRemaining: 12, cfdHoursRemaining: 20 })
		.where(eq(teams.id, 1));

	const brakingStart = (
		await db.select().from(attributes).where(eq(attributes.entityId, 1))
	).find((a) => a.attrName === 'braking')?.currentValue;

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' WORLD TICK — per-week log');
	console.log('══════════════════════════════════════════════════════════════');

	const [clock0] = await db.select().from(worldClock).where(eq(worldClock.id, 1));
	console.log(
		`\nStart: ${clock0.seasonYear} W${clock0.week} D${clock0.day}  |  Team1 hours spent to 12/20  |  braking ${brakingStart}`
	);

	await runTick(db, 'race mileage, no maintenance', {
		mileageByDriverId: { 1: 18, 2: 18, 3: 12 },
		rng: () => 0.42
	});

	await runTick(db, 'decay', { rng: () => 0.3 });
	await runTick(db, 'decay', { rng: () => 0.4 });
	await runTick(db, 'decay', { rng: () => 0.5 });

	const t5 = await runTick(db, 'MAINTAIN team 1 + mileage', {
		maintainTeamIds: [1],
		maintenanceCostPerFacility: 250_000,
		mileageByDriverId: { 1: 20 },
		rng: () => 0.55
	});

	for (let w = 0; w < 8; w++) {
		await runTick(db, `training week ${w + 1}/8 (maintain + mileage)`, {
			mileageByDriverId: { 1: 25 },
			maintainTeamIds: [1],
			rng: () => (w * 0.037) % 1
		});
	}

	const [clockEnd] = await db.select().from(worldClock).where(eq(worldClock.id, 1));
	const brakingEnd = (
		await db.select().from(attributes).where(eq(attributes.entityId, 1))
	).find((a) => a.attrName === 'braking')?.currentValue;
	const [teamEnd] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	const simEnd = (
		await db.select().from(facilities).where(eq(facilities.teamId, 1))
	).find((f) => f.facilityType === 'simulator');

	console.log('\n══════════════════════════════════════════════════════════════');
	console.log(' SUMMARY');
	console.log('══════════════════════════════════════════════════════════════');
	console.log(`  Calendar:     ${clockEnd.seasonYear} W${clockEnd.week} (${clockEnd.tickIndex} ticks)`);
	console.log(`  Driver1 brake:${brakingStart} → ${brakingEnd}`);
	console.log(`  WT/CFD:       ${teamEnd.wtHoursRemaining}/${teamEnd.cfdHoursRemaining}`);
	console.log(`  Simulator:    ${simEnd?.conditionPct.toFixed(1)}%`);

	if (teamEnd.wtHoursRemaining !== WEEKLY_WT_CAP[1]) {
		throw new Error('WT hours did not refresh to cap');
	}
	if ((simEnd?.conditionPct ?? 0) < 99) {
		throw new Error('Maintenance did not keep simulator near 100%');
	}
	if (t5.facilitiesMaintained < 1) {
		throw new Error('Expected maintenance on tick 5');
	}

	console.log('\nAll world-tick checks passed.');
} finally {
	await db.close();
}
