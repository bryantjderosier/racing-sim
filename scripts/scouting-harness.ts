import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { attributes, drivers, facilities, staff, teams } from '../electron/db/schema.ts';
import {
	assignScoutTarget,
	getFoggedProfile,
	parallelScoutSlots,
	tickTeamScouting
} from '../electron/sim/scouting/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { advanceWorldWeek } from '../electron/sim/world/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'scouting.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	const SCOUT_ID = 501;
	const [facMax] = await db
		.select({ m: sql<number>`coalesce(max(${facilities.id}), 0)` })
		.from(facilities);
	await db.insert(facilities).values({
		id: Number(facMax?.m ?? 0) + 1,
		teamId: 1,
		facilityType: 'scouting_hq',
		tier: 3,
		conditionPct: 95,
		isUnderConstruction: false,
		operationalCostAnnual: 400_000
	});

	await db.insert(staff).values({
		id: SCOUT_ID,
		name: 'Scout Master',
		nationalityCode: 'GBR',
		birthplace: 'London',
		role: 'scout',
		teamId: 1,
		isScouted: true,
		morale: 70,
		ego: 50,
		loyalty: 60,
		fatiguePct: 0
	});

	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	let aid = Number(attrMax?.m ?? 0) + 1;
	for (const [attrName, currentValue] of Object.entries({
		detection: 80,
		accuracy: 75,
		appraisal: 70,
		leverage: 55,
		coverage: 72
	})) {
		await db.insert(attributes).values({
			id: aid++,
			entityId: SCOUT_ID,
			entityType: 'staff',
			attrName,
			currentValue,
			ceiling: Math.min(99, currentValue + 10)
		});
	}

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' PERSONNEL SCOUTING VEIL');
	console.log('══════════════════════════════════════════════════════════════');

	const slots = parallelScoutSlots(72, 3);
	assert(slots >= 2, 'coverage+HQ slots');
	console.log(`\n── Scout slots (cov 72 / HQ T3): ${slots}`);

	// Own driver fully revealed
	const own = await getFoggedProfile(db, {
		viewingTeamId: 1,
		entityId: 1,
		entityType: 'driver'
	});
	assert(own.isOwnTeam && own.fullyRevealed, 'own driver revealed');
	assert(own.attrs.every((a) => a.trueValue != null), 'own attrs exact');
	console.log(`── Own driver ${own.name}: conf=${own.confidenceLevel} attrs=${own.attrs.length}`);

	// Rival driver (team 2 driver id = 2 in grid seed?)
	const rivalDrivers = await db.select().from(drivers).where(eq(drivers.teamId, 2)).limit(1);
	const rivalId = rivalDrivers[0]?.id;
	assert(rivalId != null, 'rival driver');

	const fog0 = await getFoggedProfile(db, {
		viewingTeamId: 1,
		entityId: rivalId!,
		entityType: 'driver'
	});
	assert(!fog0.fullyRevealed && fog0.confidenceLevel === 0, 'rival fogged at 0');
	const braking = fog0.attrs.find((a) => a.attrName === 'braking')!;
	assert(braking.knownMin < braking.knownMax, 'band width at conf 0');
	assert(braking.trueValue == null, 'true hidden');
	assert(fog0.meta.length >= 2, 'meta fogged');
	console.log(
		`── Rival ${fog0.name} braking band ${braking.knownMin}–${braking.knownMax} (conf 0)`
	);

	const asg = await assignScoutTarget(db, {
		teamId: 1,
		entityId: rivalId!,
		entityType: 'driver'
	});
	assert(asg.assigned, 'assign rival');
	console.log(`── Assigned: slots ${asg.slotsUsed}/${asg.slotsMax}`);

	const ownBlock = await assignScoutTarget(db, {
		teamId: 1,
		entityId: 1,
		entityType: 'driver'
	});
	assert(!ownBlock.assigned && ownBlock.reason === 'own_team', 'cannot scout own');

	// Fill remaining slots then overflow
	const otherRivals = await db
		.select()
		.from(drivers)
		.where(and(eq(drivers.isKarting, false), sql`${drivers.teamId} > 2`))
		.limit(10);
	let filled = 1;
	for (const d of otherRivals) {
		if (filled >= asg.slotsMax) break;
		const r = await assignScoutTarget(db, {
			teamId: 1,
			entityId: d.id,
			entityType: 'driver'
		});
		if (r.assigned) filled++;
	}
	const overflow = await assignScoutTarget(db, {
		teamId: 1,
		entityId: otherRivals[otherRivals.length - 1]!.id,
		entityType: 'driver'
	});
	assert(!overflow.assigned && overflow.reason === 'slots_full', 'slots full');

	let conf = 0;
	let weeks = 0;
	while (conf < 100 && weeks < 20) {
		const tick = await tickTeamScouting(db, 1);
		const row = tick.progress.find((p) => p.entityId === rivalId);
		conf = row?.confidenceAfter ?? conf;
		weeks++;
	}
	assert(conf >= 100, 'revealed within 20 weeks');
	console.log(`── Rival revealed after ${weeks} weekly ticks (conf ${conf})`);

	const fogDone = await getFoggedProfile(db, {
		viewingTeamId: 1,
		entityId: rivalId!,
		entityType: 'driver'
	});
	assert(fogDone.fullyRevealed, 'profile fully revealed');
	const b2 = fogDone.attrs.find((a) => a.attrName === 'braking')!;
	assert(b2.trueValue === b2.knownMin && b2.knownMin === b2.knownMax, 'exact braking');
	assert(fogDone.meta.every((m) => m.trueValue != null), 'meta revealed');

	// Staff veil via world tick path
	const [rivalRe] = await db.select().from(staff).where(eq(staff.teamId, 2)).limit(1);
	assert(rivalRe != null, 'rival RE');
	const staffFog = await getFoggedProfile(db, {
		viewingTeamId: 1,
		entityId: rivalRe!.id,
		entityType: 'staff'
	});
	assert(staffFog.confidenceLevel === 0, 'staff fogged');
	const staffAsg = await assignScoutTarget(db, {
		teamId: 1,
		entityId: rivalRe!.id,
		entityType: 'staff'
	});
	assert(staffAsg.assigned, 'assign staff');

	const week = await advanceWorldWeek(db, {
		skipPayroll: true,
		rng: () => 0.4,
		skipAi: true
	});
	assert(
		week.scoutingTicks.some((t) =>
			t.progress.some((p) => p.entityId === rivalRe!.id && p.confidenceAfter > 0)
		),
		'world tick advances scouting'
	);

	const cash = (await db.select().from(teams).where(eq(teams.id, 1)))[0];
	void cash;
	console.log('\n── PASS');
} finally {
	await db.close();
}
