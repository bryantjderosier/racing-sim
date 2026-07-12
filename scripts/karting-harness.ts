import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	attributes,
	drivers,
	facilities,
	staff,
	teams
} from '../electron/db/schema.ts';
import {
	evaluateGraduation,
	graduateEligibleProspects,
	GRADUATION_ATTR_THRESHOLD,
	scoutKartingPool,
	seedKartingPool,
	tickFeederPool
} from '../electron/sim/feeder/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'karting-feeder.duckdb');
const migrationsFolder = join(root, 'drizzle');

function rngSeq(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	// Scout + scouting HQ for team 1
	const SCOUT_ID = 401;
	await db.insert(staff).values({
		id: SCOUT_ID,
		name: 'Scout Reyes',
		nationalityCode: 'ESP',
		birthplace: 'Madrid',
		role: 'scout',
		teamId: 1,
		isScouted: true,
		morale: 70,
		ego: 35,
		loyalty: 60
	});
	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	let aid = Number(attrMax?.m ?? 0) + 1;
	for (const [attrName, currentValue] of Object.entries({
		detection: 85,
		accuracy: 80,
		appraisal: 78,
		leverage: 70,
		coverage: 75
	})) {
		await db.insert(attributes).values({
			id: aid++,
			entityId: SCOUT_ID,
			entityType: 'staff',
			attrName,
			currentValue,
			ceiling: 95
		});
	}
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
		operationalCostAnnual: 600_000
	});

	// One Div 3 academy team
	await db.update(teams).set({ division: 3 }).where(eq(teams.id, 20));

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' KARTING / FEEDER');
	console.log('══════════════════════════════════════════════════════════════');

	const seeded = await seedKartingPool(db, {
		count: 12,
		minAge: 13,
		maxAge: 15,
		rng: rngSeq(11)
	});
	console.log(`\n── Seeded ${seeded.length} prospects`);
	const tiers = seeded.reduce(
		(acc, p) => {
			acc[p.potentialTier] = (acc[p.potentialTier] ?? 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
	console.log(`  Tiers: ${JSON.stringify(tiers)}`);

	const before = await evaluateGraduation(db, seeded[0].driverId);
	console.log(
		`── Sample ${before.name}: age ${before.age} pace ${before.paceAggregate.toFixed(1)} eligible=${before.eligible} (${before.blockReason})`
	);

	// Force one near-graduation prospect: age 15, boost pace attrs
	const star = seeded.find((p) => p.potentialTier === 'gold' || p.potentialTier === 'elite') ?? seeded[0];
	await db.update(drivers).set({ age: 15 }).where(eq(drivers.id, star.driverId));
	const paceNames = [
		'braking',
		'cornering',
		'traction',
		'qualifying',
		'tyre_management',
		'consistency',
		'focus'
	];
	for (const name of paceNames) {
		await db
			.update(attributes)
			.set({ currentValue: 48 })
			.where(
				and(
					eq(attributes.entityId, star.driverId),
					eq(attributes.entityType, 'driver'),
					eq(attributes.attrName, name)
				)
			);
	}

	const ticks = await tickFeederPool(db, rngSeq(22));
	const starTick = ticks.find((t) => t.driverId === star.driverId);
	console.log(
		`\n── Feeder season tick: ${ticks.length} prospects  star growth=${starTick?.totalGrowth ?? 0} quality=${starTick?.resultQuality.toFixed(2)}`
	);

	await db.update(drivers).set({ age: 16 }).where(eq(drivers.id, star.driverId));
	const ready = await evaluateGraduation(db, star.driverId);
	console.log(
		`── After age-up ${ready.name}: pace ${ready.paceAggregate.toFixed(1)} (need ${GRADUATION_ATTR_THRESHOLD}) eligible=${ready.eligible}`
	);

	const weak = seeded.find((p) => p.driverId !== star.driverId)!;
	await db.update(drivers).set({ age: 16 }).where(eq(drivers.id, weak.driverId));
	const weakEv = await evaluateGraduation(db, weak.driverId);
	console.log(
		`── Weak ${weakEv.name} at 16: pace ${weakEv.paceAggregate.toFixed(1)} eligible=${weakEv.eligible} (${weakEv.blockReason})`
	);

	const grads = await graduateEligibleProspects(db, {
		academyTeamIds: [20],
		rng: () => 0.2
	});
	console.log(`\n── Graduations: ${grads.length}`);
	for (const g of grads) {
		console.log(`  ${g.name} → ${g.destination} academy=${g.academyTeamId}`);
	}

	const discoveries = await scoutKartingPool(db, 1, { maxTargets: 8, rng: rngSeq(33) });
	console.log(`\n── Scout discoveries: ${discoveries.length}`);
	for (const d of discoveries.slice(0, 5)) {
		console.log(
			`  ${d.name}: conf ${d.confidenceLevel}% estimate=${d.tierEstimate} true=${d.potentialTier ?? 'fogged'}`
		);
	}

	const stillKarting = await db.select().from(drivers).where(eq(drivers.isKarting, true));
	const [gradRow] = await db.select().from(drivers).where(eq(drivers.id, star.driverId)).limit(1);

	if (seeded.length !== 12) throw new Error('Seed count');
	if (!ready.eligible) throw new Error('Star should be eligible at 16 with pace ≥ threshold');
	if (weakEv.eligible) throw new Error('Weak prospect should fail attr threshold');
	if (grads.length < 1) throw new Error('Expected graduation');
	if (gradRow.isKarting) throw new Error('Graduate must clear is_karting');
	if (stillKarting.length >= seeded.length) throw new Error('Pool should shrink');
	if (discoveries.length < 1) throw new Error('Expected scout finds');

	console.log('\nAll karting/feeder checks passed.');
} finally {
	await db.close();
}
