import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { aiTeamProfiles, attributes, contracts, staff, teams } from '../electron/db/schema.ts';
import {
	buyoutStaff,
	previewStaffOffer,
	scanStaffMarketHeat,
	seedStaffContracts,
	signStaffContract,
	staffMarketRateAnnual,
	buildStaffProfile,
	tickStaffMarket,
	teamsMissingStaffRoles
} from '../electron/sim/market/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'staff-market.duckdb');
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

	// Seed aero/mech/powertrain/scout on teams 1–5; leave team 6 missing aero
	const ROLE_DEFS: {
		role: 'aero' | 'mechanical' | 'powertrain' | 'scout';
		attrs: Record<string, number>;
	}[] = [
		{
			role: 'aero',
			attrs: {
				efficiency: 80,
				packaging: 76,
				stability: 74,
				innovation: 78,
				cfd_mapping: 82
			}
		},
		{
			role: 'mechanical',
			attrs: {
				chassis: 75,
				suspension: 77,
				weight_optimization: 70,
				reliability: 78,
				damage_resistance: 72
			}
		},
		{
			role: 'powertrain',
			attrs: {
				thermal_efficiency: 74,
				harvesting: 71,
				deployment: 73,
				integration: 70,
				reliability: 76
			}
		},
		{
			role: 'scout',
			attrs: {
				detection: 70,
				accuracy: 72,
				appraisal: 68,
				leverage: 75,
				coverage: 66
			}
		}
	];

	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	let aid = Number(attrMax?.m ?? 0) + 1;
	let staffId = 500;
	const contractSeeds: {
		staffId: number;
		teamId: number;
		salaryAnnual: number;
		yearsRemaining: number;
	}[] = [];

	for (let teamId = 1; teamId <= 5; teamId++) {
		for (const def of ROLE_DEFS) {
			// Skip aero on team 6 later; for 1-5 seed all. Team 6 gets no aero.
			await db.insert(staff).values({
				id: staffId,
				name: `${def.role} T${teamId}`,
				nationalityCode: 'GBR',
				birthplace: 'Factory',
				role: def.role,
				teamId,
				isScouted: true,
				morale: 65,
				ego: 45,
				loyalty: 55
			});
			for (const [attrName, currentValue] of Object.entries(def.attrs)) {
				await db.insert(attributes).values({
					id: aid++,
					entityId: staffId,
					entityType: 'staff',
					attrName,
					currentValue,
					ceiling: Math.min(99, currentValue + 8)
				});
			}
			contractSeeds.push({
				staffId,
				teamId,
				salaryAnnual: 900_000 + teamId * 20_000,
				yearsRemaining: def.role === 'aero' && teamId === 2 ? 0 : 3
			});
			staffId++;
		}
	}

	// Free-agent elite aero
	const FA_AERO = staffId++;
	await db.insert(staff).values({
		id: FA_AERO,
		name: 'Free Aero Ace',
		nationalityCode: 'ITA',
		birthplace: 'Maranello',
		role: 'aero',
		teamId: null,
		isScouted: true,
		morale: 60,
		ego: 50,
		loyalty: 40
	});
	for (const [attrName, currentValue] of Object.entries(ROLE_DEFS[0].attrs)) {
		await db.insert(attributes).values({
			id: aid++,
			entityId: FA_AERO,
			entityType: 'staff',
			attrName,
			currentValue: currentValue + 8,
			ceiling: 95
		});
	}

	await seedStaffContracts(db, contractSeeds);

	for (let i = 2; i <= 6; i++) {
		await db.insert(aiTeamProfiles).values({
			teamId: i,
			archetype: i === 2 ? 'aggressive_spender' : 'long_term_builder',
			rAndDFocusBias: 0.5,
			facilityInvestmentRate: 0.5,
			costCapRiskTolerance: 0.3
		});
	}

	// Scout leverage on team 1 (from ROLE_DEFS scout)
	const team1Scout = (
		await db.select().from(staff).where(eq(staff.teamId, 1))
	).find((s) => s.role === 'scout');

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' STAFF MARKET');
	console.log('══════════════════════════════════════════════════════════════');

	const quiet = await scanStaffMarketHeat(db);
	console.log(`\n── Early heat: ${quiet.length}`);
	for (const h of quiet.slice(0, 4)) {
		console.log(`   ${h.name} ${h.role} [${h.reasons.join(',')}] years=${h.yearsRemaining}`);
	}

	const missing = await teamsMissingStaffRoles(db);
	const m6 = missing.find((m) => m.teamId === 6);
	console.log(`── Team 6 missing: [${m6?.missingRoles.join(', ') ?? 'none'}]`);

	const faProfile = await buildStaffProfile(db, FA_AERO, 1);
	const fair = staffMarketRateAnnual(faProfile);
	console.log(`── FA aero market rate: ${(fair / 1e6).toFixed(2)}M`);

	const low = await previewStaffOffer(db, {
		staffId: FA_AERO,
		teamId: 1,
		offer: { salaryAnnual: fair * 0.4, years: 1 },
		rng: () => 0.5
	});
	console.log(
		`── Lowball: score ${low.score.toFixed(1)} thr ${low.threshold.toFixed(1)} accept=${low.accepted}`
	);

	const signed = await signStaffContract(db, {
		staffId: FA_AERO,
		teamId: 1,
		offer: {
			salaryAnnual: fair * 1.2,
			years: 2,
			buyoutFee: fair,
			releaseClause: fair * 2
		},
		budgetGuarantee: true,
		rng: () => 0.5
	});
	console.log(
		`── Sign FA→T1: accepted=${signed.accepted} score=${signed.evaluation.score.toFixed(1)} #${signed.contractId}`
	);

	// Open aero seat on team 6 by ensuring no aero there; release heat aero from team 2
	const heatAero = quiet.find((h) => h.role === 'aero' && h.teamId === 2);
	if (heatAero) {
		await buyoutStaff(db, { teamId: 1, staffId: heatAero.staffId, fee: 500_000 });
		console.log(`── Buyout ${heatAero.name} → FA`);
	}

	const tick = await tickStaffMarket(db, {
		playerTeamId: 1,
		rng: rngSeq(77),
		maxSignings: 3
	});
	console.log(
		`── Staff tick: hot=${tick.hotCount} openTeams=${tick.openRoles.length} signings=${tick.signings.length}`
	);
	for (const s of tick.signings) {
		console.log(
			`   ${s.staffName} (${s.role}): ${s.fromTeamId ?? 'FA'} → T${s.toTeamId} @ ${(s.salaryAnnual / 1e6).toFixed(2)}M`
		);
	}

	if (quiet.length < 1) throw new Error('Expected final-window staff heat');
	if (!m6 || !m6.missingRoles.includes('aero')) throw new Error('Team 6 should miss aero');
	if (low.accepted) throw new Error('Lowball should reject');
	if (!signed.accepted) throw new Error('Fair staff offer should accept');
	if (tick.signings.length < 1) throw new Error('Expected AI staff signing');
	if (!team1Scout) throw new Error('Team 1 should have scout');

	const activeStaffContracts = await db
		.select()
		.from(contracts)
		.where(eq(contracts.entityType, 'staff'));
	console.log(`── Staff contracts in DB: ${activeStaffContracts.length}`);

	console.log('\nAll staff-market checks passed.');
} finally {
	await db.close();
}
