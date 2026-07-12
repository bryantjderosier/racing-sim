import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { attributes, drivers, teams } from '../electron/db/schema.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import {
	evaluateSponsorEligibility,
	listActiveSponsorDeals,
	payRaceSponsors,
	seedSponsorCatalog,
	signSponsorDeal,
	SLOT_CAPS,
	buildTeamSponsorProfile,
	ageSponsorContractsOneYear
} from '../electron/sim/sponsors/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'sponsors.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);
	await seedSponsorCatalog(db);

	// Strong marketability + standing for team 1
	await db
		.update(teams)
		.set({ constructorsStanding: 2, reputation: 72, nationalityCode: 'GBR' })
		.where(eq(teams.id, 1));
	await db
		.update(attributes)
		.set({ currentValue: 82 })
		.where(eq(attributes.entityId, 1)); // rough — also bump marketability specifically
	const [d1] = await db.select().from(drivers).where(eq(drivers.id, 1)).limit(1);
	await db
		.update(attributes)
		.set({ currentValue: 82 })
		.where(eq(attributes.entityId, d1.id));

	// Explicit marketability
	const mktRows = await db.select().from(attributes);
	const mkt = mktRows.find(
		(a) => a.entityId === 1 && a.entityType === 'driver' && a.attrName === 'marketability'
	);
	if (mkt) {
		await db.update(attributes).set({ currentValue: 82 }).where(eq(attributes.id, mkt.id));
	}

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' SPONSORS');
	console.log('══════════════════════════════════════════════════════════════');

	const profile = await buildTeamSponsorProfile(db, 1);
	console.log(
		`\n── Team 1: mkt=${profile.driverMarketability} standing=${profile.standing} rep=${profile.reputation}`
	);

	const cash0 = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;

	const title = await signSponsorDeal(db, {
		teamId: 1,
		sponsorId: 2, // Nordic Volt — mkt 70, standing 8
		slotType: 'title'
	});
	console.log(
		`── Title Nordic Volt: signed=${title.signed} upfront=${(title.upfrontPaid / 1e6).toFixed(2)}M reasons=[${title.blockReasons}]`
	);

	const blocked = await signSponsorDeal(db, {
		teamId: 1,
		sponsorId: 7, // CleanStream NGO — ethics 0.85
		slotType: 'major'
	});
	// May or may not block depending on rep — force low rep ethics test
	await db.update(teams).set({ reputation: 10 }).where(eq(teams.id, 1));
	const ethicsBlock = evaluateSponsorEligibility(
		{
			minMarketability: 50,
			minTeamStanding: 15,
			ethicsSensitivity: 0.85,
			nationalityCode: 'CHE',
			slotType: 'major'
		},
		{ ...profile, reputation: 10, standing: 2 }
	);
	console.log(
		`── Ethics gate (rep 10): eligible=${ethicsBlock.eligible} reasons=[${ethicsBlock.blockReasons}]`
	);
	await db.update(teams).set({ reputation: 72 }).where(eq(teams.id, 1));

	const major = await signSponsorDeal(db, {
		teamId: 1,
		sponsorId: 3, // Helix
		slotType: 'major'
	});
	const minor = await signSponsorDeal(db, {
		teamId: 1,
		sponsorId: 5, // Rio Coffee
		slotType: 'minor',
		remainingRaces: 2,
		bonusTargetPosition: 5
	});
	console.log(
		`── Major signed=${major.signed}  Minor signed=${minor.signed} upfront=${(minor.upfrontPaid / 1e6).toFixed(2)}M`
	);

	const slotFull = await signSponsorDeal(db, {
		teamId: 1,
		sponsorId: 6,
		slotType: 'title'
	});
	console.log(`── Second title: signed=${slotFull.signed} reasons=[${slotFull.blockReasons}]`);

	const cash1 = (await db.select().from(teams).where(eq(teams.id, 1)))[0].liquidCash;
	console.log(`── Cash after upfronts: ${(cash0 / 1e6).toFixed(2)}M → ${(cash1 / 1e6).toFixed(2)}M`);

	const racePay = await payRaceSponsors(db, {
		teamId: 1,
		bestFinishPosition: 4,
		finished: true
	});
	console.log(
		`── Race P4 payouts: ${(racePay.totalPaid / 1e6).toFixed(2)}M  streams=${racePay.payouts.length} expired=${racePay.expiredContractIds.length}`
	);

	const racePay2 = await payRaceSponsors(db, {
		teamId: 1,
		bestFinishPosition: 12,
		finished: true
	});
	console.log(
		`── Race P12: paid=${(racePay2.totalPaid / 1e6).toFixed(2)}M expired=${racePay2.expiredContractIds.length}`
	);

	const active = await listActiveSponsorDeals(db, 1);
	console.log(`── Active contract rows: ${active.length}`);

	const aged = await ageSponsorContractsOneYear(db);
	console.log(`── Year tick: aged=${aged.aged} expired=${aged.expired}`);

	if (!title.signed) throw new Error('Title deal should sign');
	if (!ethicsBlock.blockReasons.includes('ethics')) throw new Error('Expected ethics block');
	if (!major.signed || !minor.signed) throw new Error('Major/minor should sign');
	if (slotFull.signed || !slotFull.blockReasons.includes('slot_full')) {
		throw new Error('Title slot should be full');
	}
	if (cash1 <= cash0) throw new Error('Upfront should increase cash');
	if (racePay.totalPaid <= 0) throw new Error('Expected per-race and/or bonus');
	if (!racePay.payouts.some((p) => p.payoutType === 'bonus')) {
		throw new Error('P4 should hit minor bonus target P5');
	}
	if (racePay2.expiredContractIds.length < 1) {
		throw new Error('Minor should expire after 2 races');
	}
	if (SLOT_CAPS.title !== 1) throw new Error('slot caps');

	console.log('\nAll sponsor checks passed.');
} finally {
	await db.close();
}
