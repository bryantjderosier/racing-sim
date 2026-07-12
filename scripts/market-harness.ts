import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	aiTeamProfiles,
	attributes,
	contracts,
	drivers,
	staff,
	teams,
	worldClock
} from '../electron/db/schema.ts';
import {
	buyoutDriver,
	marketRateAnnual,
	previewDriverOffer,
	scanMarketHeat,
	seedDriverContracts,
	signDriverContract,
	tickDriverMarket,
	buildDriverProfile
} from '../electron/sim/market/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'driver-market.duckdb');
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

	const allDrivers = await db.select().from(drivers);
	const contractRows = allDrivers.map((d, i) => ({
		driverId: d.id,
		teamId: d.teamId!,
		salaryAnnual: 1_800_000 + i * 40_000,
		// 0 = expired/final window now; 1 = heats after week 27; else quiet
		yearsRemaining: i === 4 || i === 7 ? 0 : i === 11 || i === 14 ? 1 : 3,
		buyoutFee: 2_500_000 + i * 50_000,
		isNumberOne: true
	}));
	await seedDriverContracts(db, contractRows);

	// Scout with high leverage for team 1
	const SCOUT_ID = 301;
	await db.insert(staff).values({
		id: SCOUT_ID,
		name: 'Priya Nair',
		nationalityCode: 'IND',
		birthplace: 'Mumbai',
		role: 'scout',
		teamId: 1,
		isScouted: true,
		morale: 70,
		ego: 40,
		loyalty: 65
	});
	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	await db.insert(attributes).values({
		id: Number(attrMax?.m ?? 0) + 1,
		entityId: SCOUT_ID,
		entityType: 'staff',
		attrName: 'leverage',
		currentValue: 88,
		ceiling: 95
	});

	// AI archetypes
	for (let i = 2; i <= 5; i++) {
		await db.insert(aiTeamProfiles).values({
			teamId: i,
			archetype:
				i === 2 ? 'aggressive_spender' : i === 3 ? 'long_term_builder' : 'pragmatic_pivot',
			rAndDFocusBias: 0.4,
			facilityInvestmentRate: 0.5,
			costCapRiskTolerance: 0.3
		});
	}

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' DRIVER MARKET');
	console.log('══════════════════════════════════════════════════════════════');

	const quiet = await scanMarketHeat(db);
	console.log(`\n── Early season heat: ${quiet.length} (expect final-year only)`);
	for (const h of quiet.slice(0, 5)) {
		console.log(`   ${h.name}  years=${h.yearsRemaining}  [${h.reasons.join(',')}]`);
	}

	// Buy out driver 10 → free agent + open seat on their team
	const victim = allDrivers[9];
	const fee = await buyoutDriver(db, {
		teamId: 1,
		driverId: victim.id,
		fee: 1_000_000
	});
	console.log(`\n── Buyout ${victim.name} by team 1: fee ${fee.fee}`);

	const afterBuy = await scanMarketHeat(db);
	const fa = afterBuy.filter((h) => h.reasons.includes('free_agent'));
	console.log(`── Free agents after buyout: ${fa.map((h) => h.name).join(', ')}`);

	const profile = await buildDriverProfile(db, victim.id, 1);
	const fair = marketRateAnnual(profile);
	console.log(`── Market rate for FA: ${(fair / 1e6).toFixed(2)}M`);

	const low = await previewDriverOffer(db, {
		driverId: victim.id,
		teamId: 1,
		offer: { salaryAnnual: fair * 0.4, years: 1 },
		rng: () => 0.5
	});
	console.log(
		`── Lowball preview: score ${low.score.toFixed(1)} vs thr ${low.threshold.toFixed(1)} accept=${low.accepted}`
	);

	const high = await signDriverContract(db, {
		driverId: victim.id,
		teamId: 1,
		offer: {
			salaryAnnual: fair * 1.15,
			years: 2,
			isNumberOne: true,
			buyoutFee: fair,
			releaseClause: fair * 2
		},
		rng: () => 0.5
	});
	console.log(
		`── Sign FA to team 1: accepted=${high.accepted} score=${high.evaluation.score.toFixed(1)} contract=#${high.contractId}`
	);

	// Open a seat: release driver 3 to FA without buyout (deactivate + clear team)
	const openDriver = allDrivers[2];
	await db
		.update(contracts)
		.set({ isActive: false })
		.where(eq(contracts.entityId, openDriver.id));
	await db.update(drivers).set({ teamId: null, carId: null }).where(eq(drivers.id, openDriver.id));
	console.log(`\n── Released ${openDriver.name} → FA; team ${openDriver.teamId} open seat`);

	const tick = await tickDriverMarket(db, {
		playerTeamId: 1,
		rng: rngSeq(99),
		maxSignings: 2
	});
	console.log(`── Market tick: hot=${tick.hotCount} open=[${tick.openSeats}] signings=${tick.signings.length}`);
	for (const s of tick.signings) {
		console.log(
			`   ${s.driverName}: team ${s.fromTeamId ?? 'FA'} → ${s.toTeamId} @ ${(s.salaryAnnual / 1e6).toFixed(2)}M (score ${s.acceptScore.toFixed(1)})`
		);
	}

	// Advance clock into final-window heat
	await db.update(worldClock).set({ week: 30 }).where(eq(worldClock.id, 1));
	const late = await scanMarketHeat(db);
	const finalWindow = late.filter((h) => h.reasons.includes('final_window'));
	console.log(`\n── Week 30 final-window heat: ${finalWindow.length}`);

	if (quiet.length < 1) throw new Error('Expected some final-year heat early');
	if (fa.length < 1) throw new Error('Expected free agent after buyout');
	if (low.accepted) throw new Error('Lowball should reject');
	if (!high.accepted) throw new Error('Fair+ offer should accept');
	if (tick.signings.length < 1) throw new Error('Expected AI signing into open seat');
	if (finalWindow.length < quiet.length) throw new Error('Late season should add heat');

	console.log('\nAll driver-market checks passed.');
} finally {
	await db.close();
}
