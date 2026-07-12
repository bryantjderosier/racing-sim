import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { facilities, financialLedger, teams } from '../electron/db/schema.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import {
	getFacilityUpgradeQuote,
	startFacilityBuild,
	upgradeCost,
	daysToWeeks
} from '../electron/sim/facilities/index.ts';
import { advanceWorldWeek } from '../electron/sim/world/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'facilities.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	await db.update(teams).set({ liquidCash: 200_000_000 }).where(eq(teams.id, 1));

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' FACILITY BUILD / UPGRADE');
	console.log('══════════════════════════════════════════════════════════════');

	const quoteNew = await getFacilityUpgradeQuote('weather_hub', 0);
	assert(quoteNew != null, 'weather_hub T1 quote');
	console.log(
		`\n── Quote weather_hub 0→1: ${(quoteNew!.cash / 1e6).toFixed(2)}M  ${quoteNew!.weeks}w  op=${(quoteNew!.operationalCostAnnual / 1e6).toFixed(2)}M/yr`
	);

	const cash0 = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	const start = await startFacilityBuild(db, {
		teamId: 1,
		facilityType: 'weather_hub'
	});
	const cash1 = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	assert(cash0 - cash1 === start.cashSpent, 'cash deducted');
	assert(start.toTier === 1 && start.fromTier === 0, 'tier step 0→1');

	const [hub] = await db
		.select()
		.from(facilities)
		.where(and(eq(facilities.teamId, 1), eq(facilities.facilityType, 'weather_hub')))
		.limit(1);
	assert(hub.isUnderConstruction, 'under construction');
	assert(hub.tier === 0, 'tier stays 0 until complete');
	assert(hub.constructionFinishDate === start.finishTick, 'finish tick stored');

	const [ledger] = await db
		.select()
		.from(financialLedger)
		.where(eq(financialLedger.teamId, 1));
	assert(ledger?.transactionType === 'facility_construction', 'ledger type');
	assert(ledger?.isCostCapApplicable === false, 'outside cost cap');
	assert(ledger?.amount === -start.cashSpent, 'ledger amount');

	console.log(
		`── Start: id=${start.facilityId} spend=${(start.cashSpent / 1e6).toFixed(2)}M weeks=${start.weeks} finishTick=${start.finishTick}`
	);

	let completed = false;
	let condWhileBuilding = hub.conditionPct;
	for (let i = 0; i < start.weeks; i++) {
		const tick = await advanceWorldWeek(db, { rng: () => 0.4,
		skipAi: true
	});
		const [mid] = await db.select().from(facilities).where(eq(facilities.id, hub.id)).limit(1);
		if (mid.isUnderConstruction) {
			assert(mid.conditionPct === condWhileBuilding, 'no decay while building');
		}
		if (tick.facilitiesCompleted.some((c) => c.facilityId === hub.id)) {
			completed = true;
			console.log(
				`── Complete @ tick ${tick.tickIndex}: T${tick.facilitiesCompleted.find((c) => c.facilityId === hub.id)!.newTier}`
			);
		}
	}
	assert(completed, 'build completed within weeks');

	const [hubDone] = await db.select().from(facilities).where(eq(facilities.id, hub.id)).limit(1);
	assert(!hubDone.isUnderConstruction, 'construction cleared');
	assert(hubDone.tier === 1, 'tier 1');
	assert(hubDone.conditionPct === 100, 'condition reset');
	assert(
		hubDone.operationalCostAnnual === upgradeCost('weather_hub', 1).operationalCostAnnual,
		'op cost'
	);

	let blocked = false;
	try {
		await startFacilityBuild(db, { teamId: 1, facilityType: 'weather_hub', toTier: 3 });
	} catch {
		blocked = true;
	}
	assert(blocked, 'must upgrade one tier at a time');

	const [wt] = await db
		.select()
		.from(facilities)
		.where(and(eq(facilities.teamId, 1), eq(facilities.facilityType, 'wind_tunnel')))
		.limit(1);
	const upQuote = await getFacilityUpgradeQuote('wind_tunnel', wt.tier);
	assert(upQuote != null, 'WT upgrade quote');
	const up = await startFacilityBuild(db, {
		teamId: 1,
		facilityType: 'wind_tunnel'
	});
	console.log(
		`── Upgrade WT T${up.fromTier}→${up.toTier}: ${(up.cashSpent / 1e6).toFixed(2)}M ${up.weeks}w (quote weeks=${upQuote!.weeks})`
	);
	assert(up.weeks === daysToWeeks(upgradeCost('wind_tunnel', up.toTier).days), 'weeks match');

	for (let i = 0; i < up.weeks; i++) {
		await advanceWorldWeek(db, { rng: () => 0.5,
		skipAi: true
	});
	}
	const [wtDone] = await db.select().from(facilities).where(eq(facilities.id, wt.id)).limit(1);
	assert(wtDone.tier === up.toTier, `WT reached T${up.toTier}`);
	assert(!wtDone.isUnderConstruction, 'WT construction done');

	console.log('\n── PASS');
} finally {
	await db.close();
}
