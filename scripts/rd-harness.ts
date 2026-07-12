import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	attributes,
	blueprintFlaws,
	blueprints,
	facilities,
	parts,
	staff,
	teams
} from '../electron/db/schema.ts';
import {
	allocateTestingHours,
	applyBlueprintMileage,
	applyWinterRegression,
	completeManufacture,
	queueManufacture,
	startRdProject
} from '../electron/sim/rd/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { advanceWorldWeek, WEEKLY_CFD_CAP, WEEKLY_WT_CAP } from '../electron/sim/world/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'rd-pipeline.duckdb');
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

	// CFD lab + elite aero designer for team 1
	const [facMax] = await db
		.select({ m: sql<number>`coalesce(max(${facilities.id}), 0)` })
		.from(facilities);
	await db.insert(facilities).values({
		id: Number(facMax?.m ?? 0) + 1,
		teamId: 1,
		facilityType: 'cfd_lab',
		tier: 3,
		conditionPct: 95,
		isUnderConstruction: false,
		operationalCostAnnual: 900_000
	});

	const DESIGNER_ID = 201;
	await db.insert(staff).values({
		id: DESIGNER_ID,
		name: 'Elena Voss',
		nationalityCode: 'DEU',
		birthplace: 'Stuttgart',
		role: 'aero',
		teamId: 1,
		isScouted: true,
		morale: 72,
		ego: 55,
		loyalty: 60
	});

	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	let aid = Number(attrMax?.m ?? 0) + 1;
	const aeroAttrs: Record<string, number> = {
		efficiency: 88,
		packaging: 84,
		stability: 80,
		innovation: 86,
		cfd_mapping: 90
	};
	await db.insert(attributes).values(
		Object.entries(aeroAttrs).map(([attrName, currentValue]) => ({
			id: aid++,
			entityId: DESIGNER_ID,
			entityType: 'staff' as const,
			attrName,
			currentValue,
			ceiling: Math.min(99, currentValue + 5)
		}))
	);

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' R&D PIPELINE');
	console.log('══════════════════════════════════════════════════════════════');

	const [team0] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	console.log(
		`\nTeam 1 hours: WT ${team0.wtHoursRemaining}/${WEEKLY_WT_CAP[1]}  CFD ${team0.cfdHoursRemaining}/${WEEKLY_CFD_CAP[1]}`
	);

	const started = await startRdProject(db, {
		teamId: 1,
		slot: 'front_wing',
		leadDesignerId: DESIGNER_ID,
		focus: 'current_car'
	});
	console.log(`\n── Start project #${started.projectId} (${started.slot}) lead=${DESIGNER_ID}`);

	const rng = rngSeq(42);

	// Week 1: partial allocation
	const a1 = await allocateTestingHours(db, {
		projectId: started.projectId,
		wtHours: 25,
		cfdHours: 30,
		rng,
		autoComplete: true
	});
	console.log(
		`── Allocate W1: WT25/CFD30 → progress ${a1.progress.toFixed(1)}%  completed=${a1.completed}`
	);

	await advanceWorldWeek(db, { rng: () => 0.4,
		skipAi: true
	});
	const [team1] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	console.log(`── World tick → hours refreshed WT ${team1.wtHoursRemaining}/CFD ${team1.cfdHoursRemaining}`);

	// Week 2: finish
	const a2 = await allocateTestingHours(db, {
		projectId: started.projectId,
		wtHours: 30,
		cfdHours: 50,
		rng,
		autoComplete: true
	});
	console.log(
		`── Allocate W2: WT30/CFD50 → progress ${a2.progress.toFixed(1)}%  completed=${a2.completed} bp=${a2.blueprintId}`
	);

	if (!a2.blueprintId) throw new Error('Expected blueprint on completion');

	const [bp] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, a2.blueprintId))
		.limit(1);
	const flaws = await db
		.select()
		.from(blueprintFlaws)
		.where(eq(blueprintFlaws.blueprintId, a2.blueprintId));

	console.log(`\n── Blueprint #${bp.id} "${bp.name}"`);
	console.log(`   True PP:     ${bp.performancePoints} (hidden)`);
	console.log(
		`   Fog band:    ${bp.performanceKnownMin}–${bp.performanceKnownMax}  confidence ${bp.scoutConfidence}%`
	);
	console.log(
		`   Reliability: ${bp.baseReliability}  pitch ${bp.pitchSensitivity.toFixed(2)}  drag ${bp.dragCoefficient.toFixed(2)}  wt ${bp.weightKg}kg`
	);
	console.log(`   Flaws:       ${flaws.length} hidden`);
	for (const f of flaws) {
		console.log(`     - ${f.flawType} sev ${f.severity.toFixed(2)} revealed=${f.isRevealed}`);
	}

	// Mileage reveal
	const r1 = await applyBlueprintMileage(db, bp.id, 40, 80);
	console.log(
		`\n── Mileage +40 laps: band ${r1.knownMin}–${r1.knownMax}  conf ${r1.scoutConfidence.toFixed(0)}%  revealed=[${r1.flawsRevealed.join(', ')}]`
	);
	const r2 = await applyBlueprintMileage(db, bp.id, 80, 80);
	console.log(
		`── Mileage +80 laps: band ${r2.knownMin}–${r2.knownMax}  conf ${r2.scoutConfidence.toFixed(0)}%  revealed=[${r2.flawsRevealed.join(', ')}]`
	);

	const [bpAfter] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, bp.id))
		.limit(1);
	const trueInside =
		bpAfter.performanceKnownMin! <= bpAfter.performancePoints &&
		bpAfter.performancePoints <= bpAfter.performanceKnownMax!;
	if (!trueInside) throw new Error('True PP escaped fog band');

	// Manufacture
	const cashBefore = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	const q = await queueManufacture(db, {
		teamId: 1,
		blueprintId: bp.id,
		isLightweight: true
	});
	const m = await completeManufacture(db, q.queueId);
	const [part] = await db.select().from(parts).where(eq(parts.id, m.partId)).limit(1);
	const cashAfter = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	console.log(`\n── Manufacture lightweight part #${m.partId}`);
	console.log(
		`   Weight ${m.weightKg.toFixed(1)}kg  rel ${m.currentReliability}  ceiling ${m.maxConditionCeiling}`
	);
	console.log(`   Cash ${(cashBefore / 1e6).toFixed(2)}M → ${(cashAfter / 1e6).toFixed(2)}M (cost ${q.cost})`);
	console.log(`   Scrapped=${part.isScrapped} mounted=${part.mountedOnCarId}`);

	// Winter minor regression on this slot
	const winter = await applyWinterRegression(db, {
		impact: 'minor_tweak',
		affectedSlots: ['front_wing'],
		pivotCredit: 0.2
	});
	const [bpWinter] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, bp.id))
		.limit(1);
	console.log(`\n── Winter minor_tweak (pivot 0.2): touched ${winter.blueprintsTouched}`);
	console.log(`   PP ${bp.performancePoints} → ${bpWinter.performancePoints}`);

	if (!a2.completed) throw new Error('Project did not complete');
	if (bp.scoutConfidence < 5) throw new Error('Expected initial fog confidence');
	if (r2.scoutConfidence <= r1.scoutConfidence) throw new Error('Mileage should raise confidence');
	if (m.currentReliability >= bp.baseReliability) {
		throw new Error('Lightweight should cut reliability');
	}
	if (bpWinter.performancePoints >= bp.performancePoints) {
		throw new Error('Winter regression should cut PP');
	}

	console.log('\nAll R&D pipeline checks passed.');
} finally {
	await db.close();
}
