import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	blueprints,
	cars,
	drivers,
	facilities,
	parts,
	staff,
	teams,
	tracks,
	worldClock
} from '../../db/schema.js';

const TRACK_ID = 1;
const GRID_SIZE = 20;
const SEASON_YEAR = 2026;

/** Deterministic 0–1 from integer seed. */
function hash01(n: number): number {
	let t = (n + 0x6d2b79f5) | 0;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clampAttr(n: number): number {
	return Math.max(55, Math.min(92, Math.round(n)));
}

const TEAM_META: { name: string; short: string; nat: string }[] = [
	{ name: 'Apex Test Racing', short: 'ATR', nat: 'GBR' },
	{ name: 'Silverline GP', short: 'SLG', nat: 'DEU' },
	{ name: 'Nova Dynamics', short: 'NOV', nat: 'ITA' },
	{ name: 'Horizon Motorsport', short: 'HRZ', nat: 'FRA' },
	{ name: 'Vertex Racing', short: 'VTX', nat: 'NLD' },
	{ name: 'Cascade Works', short: 'CSW', nat: 'JPN' },
	{ name: 'Aurora Grand Prix', short: 'AGO', nat: 'FIN' },
	{ name: 'Ironclad Racing', short: 'ICR', nat: 'USA' },
	{ name: 'Mercator Team', short: 'MRC', nat: 'BEL' },
	{ name: 'Polaris Engineering', short: 'POL', nat: 'SWE' },
	{ name: 'Lumen Racing', short: 'LMN', nat: 'CHE' },
	{ name: 'Redcliff GP', short: 'RCF', nat: 'AUT' },
	{ name: 'Tidewater Racing', short: 'TDR', nat: 'AUS' },
	{ name: 'Obsidian Motors', short: 'OBS', nat: 'ESP' },
	{ name: 'Kinetic Factory', short: 'KNT', nat: 'CAN' },
	{ name: 'Stratos GP', short: 'STR', nat: 'MEX' },
	{ name: 'Beacon Racing', short: 'BCN', nat: 'DNK' },
	{ name: 'Forge United', short: 'FRG', nat: 'GBR' },
	{ name: 'Zenith Autosport', short: 'ZEN', nat: 'KOR' },
	{ name: 'Northwind Racing', short: 'NWR', nat: 'NOR' }
];

const DRIVER_NAMES = [
	'Alex Rivera',
	'Casey Okonkwo',
	'Jules Moreau',
	'Sam Chen',
	'Riley Sato',
	'Noah Petrov',
	'Mila Andersson',
	'Theo Brandt',
	'Elena Vasquez',
	'Kai Nakamura',
	'Owen Gallagher',
	'Sofia Ricci',
	'Marcus Webb',
	'Yuki Tanaka',
	'Hugo Laurent',
	'Ava Lindholm',
	'Diego Alves',
	'Nina Kowalski',
	'Felix Orth',
	'Amara Singh'
];

const ENGINEER_NAMES = [
	'Morgan Blake',
	'Priya Nair',
	'Hans Keller',
	'Chloe Martin',
	'Kenji Sato',
	'Lara Novak',
	'Tomás Silva',
	'Ingrid Berg',
	'James Whit',
	'Mei Lin',
	'Omar Haddad',
	'Eva Hoffmann',
	'Chris Doyle',
	'Sora Kim',
	'Nina Petrova',
	'Luca Bianchi',
	'Ade Okafor',
	'Freya Nilsen',
	'Raj Patel',
	'Zoe Martin'
];

type Slot =
	| 'front_wing'
	| 'rear_wing'
	| 'underfloor'
	| 'sidepods'
	| 'suspension'
	| 'power_unit';

const SLOT_BASE: { slot: Slot; name: string; pp: number; weight: number }[] = [
	{ slot: 'front_wing', name: 'FW', pp: 27, weight: 12 },
	{ slot: 'rear_wing', name: 'RW', pp: 29, weight: 14 },
	{ slot: 'underfloor', name: 'Floor', pp: 34, weight: 40 },
	{ slot: 'sidepods', name: 'Sidepod', pp: 22, weight: 25 },
	{ slot: 'suspension', name: 'Suspension', pp: 94, weight: 55 },
	{ slot: 'power_unit', name: 'PU', pp: 98, weight: 150 }
];

function driverAttrSet(teamIndex: number): Record<string, number> {
	// Tight band: mid ~74, spread ±3 with small per-driver signature
	const mid = 74;
	const jitter = (k: number) => Math.round((hash01(teamIndex * 17 + k) - 0.5) * 6);
	return {
		braking: clampAttr(mid + jitter(1)),
		cornering: clampAttr(mid + jitter(2)),
		traction: clampAttr(mid + jitter(3)),
		tyre_management: clampAttr(mid - 1 + jitter(4)),
		wet_driving: clampAttr(mid - 2 + jitter(5)),
		composure: clampAttr(mid + jitter(6)),
		focus: clampAttr(mid + jitter(7)),
		aggression: clampAttr(52 + jitter(8)),
		feedback: clampAttr(72 + jitter(9)),
		qualifying: clampAttr(mid + jitter(10)),
		overtaking: clampAttr(mid + jitter(11)),
		defending: clampAttr(mid + jitter(12)),
		launch: clampAttr(mid + jitter(13)),
		traffic_navigation: clampAttr(mid + jitter(14)),
		consistency: clampAttr(mid + jitter(15)),
		adaptability: clampAttr(mid + jitter(16)),
		development: clampAttr(68 + jitter(17)),
		marketability: clampAttr(60 + jitter(18)),
		morale_balance: clampAttr(70 + jitter(19)),
		teamwork: clampAttr(72 + jitter(20))
	};
}

function engineerAttrSet(teamIndex: number): Record<string, number> {
	const mid = 74;
	const jitter = (k: number) => Math.round((hash01(teamIndex * 31 + k) - 0.5) * 6);
	return {
		chemistry: clampAttr(mid + jitter(1)),
		setup: clampAttr(mid + 2 + jitter(2)),
		strategy: clampAttr(mid + jitter(3)),
		analysis: clampAttr(mid + 1 + jitter(4)),
		adaptability: clampAttr(mid + jitter(5))
	};
}

/**
 * Seed a full Div 1 grid: 20 teams, 20 cars, drivers, REs, parts.
 * Talent/car PP stay in a tight band so race gaps stay realistic.
 */
export async function seedFullGrid(db: AppDb): Promise<{ trackId: number; teamIds: number[] }> {
	// Wipe sim tables used by fixtures (full reset of seeded world)
	await db.execute(sql`DELETE FROM scouting_reports`);
	await db.execute(sql`DELETE FROM regulation_votes`);
	await db.execute(sql`DELETE FROM regulatory_history`);
	await db.execute(sql`DELETE FROM contracts`);
	await db.execute(sql`DELETE FROM race_results`);
	await db.execute(sql`DELETE FROM race_events`);
	await db.execute(sql`DELETE FROM championship_standings`);
	await db.execute(sql`DELETE FROM season_calendar`);
	await db.execute(sql`DELETE FROM seasons`);
	await db.execute(sql`DELETE FROM points_scheme_rows`);
	await db.execute(sql`DELETE FROM ai_team_profiles`);
	await db.execute(sql`DELETE FROM freight_inventory`);
	await db.execute(sql`DELETE FROM manufacturing_queue`);
	await db.execute(sql`DELETE FROM parts`);
	await db.execute(sql`DELETE FROM blueprint_flaws`);
	await db.execute(sql`DELETE FROM rd_projects`);
	await db.execute(sql`DELETE FROM blueprints`);
	await db.execute(sql`DELETE FROM financial_ledger`);
	await db.execute(sql`DELETE FROM attributes`);
	await db.execute(sql`DELETE FROM attribute_progress`);
	await db.execute(sql`DELETE FROM facilities`);
	await db.execute(sql`DELETE FROM staff`);
	await db.execute(sql`DELETE FROM drivers`);
	await db.execute(sql`DELETE FROM cars`);
	await db.execute(sql`DELETE FROM teams`);
	await db.execute(sql`DELETE FROM suppliers`);
	await db.execute(sql`DELETE FROM tracks`);
	await db.execute(sql`DELETE FROM world_clock`);

	await db.insert(tracks).values({
		id: TRACK_ID,
		name: 'Porto Grande',
		nationalityCode: 'PRT',
		lengthKm: 5.4,
		aeroEfficiencyWeight: 1.2,
		mechanicalGripWeight: 0.9,
		tireAbrasionFactor: 1.1,
		pitLossSeconds: 21,
		baseGrip: 0.95,
		maxGrip: 1.02,
		climateRainProbability: 0.2
	});

	const teamIds: number[] = [];
	const attrRows: {
		id: number;
		entityId: number;
		entityType: 'driver' | 'staff';
		attrName: string;
		currentValue: number;
		ceiling: number;
	}[] = [];

	let attrId = 1;
	let blueprintId = 1;
	let partId = 1;

	const blueprintRows: {
		id: number;
		teamId: number;
		slot: Slot;
		name: string;
		performancePoints: number;
		baseReliability: number;
		seasonYear: number;
		weightKg: number;
	}[] = [];
	const partRows: {
		id: number;
		blueprintId: number;
		teamId: number;
		slot: Slot;
		currentReliability: number;
		maxConditionCeiling: number;
		weightKg: number;
		isLightweight: boolean;
		isScrapped: boolean;
		mountedOnCarId: number;
	}[] = [];

	for (let i = 0; i < GRID_SIZE; i++) {
		const teamId = i + 1;
		const carId = i + 1;
		const driverId = i + 1;
		const engineerId = 100 + i + 1;
		teamIds.push(teamId);
		const meta = TEAM_META[i];

		await db.insert(teams).values({
			id: teamId,
			name: meta.name,
			shortName: meta.short,
			nationalityCode: meta.nat,
			status: i === 0 ? 'PLAYER_MANAGED' : 'UNMANAGED_AI',
			liquidCash: 45_000_000 + Math.round(hash01(i) * 20_000_000),
			costCapLimit: 140_000_000,
			division: 1,
			reputation: 48 + Math.round(hash01(i + 99) * 12),
			wtHoursRemaining: 40,
			cfdHoursRemaining: 80
		});

		await db.insert(cars).values({ id: carId, teamId, carNumber: 1 });

		await db.insert(drivers).values({
			id: driverId,
			name: DRIVER_NAMES[i],
			nationalityCode: meta.nat,
			birthplace: meta.nat,
			age: 22 + Math.floor(hash01(i + 3) * 12),
			teamId,
			carId,
			injuryProneness: 0.3 + hash01(i + 7) * 0.3,
			longevity: 33 + Math.floor(hash01(i + 11) * 5),
			morale: 55 + Math.round(hash01(i + 13) * 20)
		});

		await db.insert(staff).values({
			id: engineerId,
			name: ENGINEER_NAMES[i],
			nationalityCode: meta.nat,
			birthplace: meta.nat,
			role: 'race_engineer',
			teamId,
			assignedDriverId: driverId,
			isScouted: true,
			morale: 60,
			ego: 40 + Math.round(hash01(i + 17) * 20),
			loyalty: 55
		});

		for (const [attrName, currentValue] of Object.entries(driverAttrSet(i))) {
			attrRows.push({
				id: attrId++,
				entityId: driverId,
				entityType: 'driver',
				attrName,
				currentValue,
				ceiling: Math.min(99, currentValue + 8)
			});
		}
		for (const [attrName, currentValue] of Object.entries(engineerAttrSet(i))) {
			attrRows.push({
				id: attrId++,
				entityId: engineerId,
				entityType: 'staff',
				attrName,
				currentValue,
				ceiling: Math.min(99, currentValue + 6)
			});
		}

		// Car PP: ±3 from baseline (tight field)
		let puPartId = 0;
		for (let s = 0; s < SLOT_BASE.length; s++) {
			const base = SLOT_BASE[s];
			const ppJitter = Math.round((hash01(i * 10 + s) - 0.5) * 6); // ±3
			const bid = blueprintId++;
			const pid = partId++;
			blueprintRows.push({
				id: bid,
				teamId,
				slot: base.slot,
				name: `${base.name} T${teamId}`,
				performancePoints: base.pp + ppJitter,
				baseReliability: 90 + Math.round(hash01(i + s) * 5),
				seasonYear: SEASON_YEAR,
				weightKg: base.weight
			});
			partRows.push({
				id: pid,
				blueprintId: bid,
				teamId,
				slot: base.slot,
				currentReliability: 94 + Math.round(hash01(i * 5 + s) * 4),
				maxConditionCeiling: 100,
				weightKg: base.weight,
				isLightweight: false,
				isScrapped: false,
				mountedOnCarId: carId
			});
			if (base.slot === 'power_unit') puPartId = pid;
		}
		await db.update(cars).set({ powerUnitId: puPartId }).where(eq(cars.id, carId));
	}

	await db.insert(attributes).values(attrRows);
	await db.insert(blueprints).values(blueprintRows);
	await db.insert(parts).values(partRows);

	let facilityId = 1;
	const facilityRows: {
		id: number;
		teamId: number;
		facilityType: 'simulator' | 'staff_academy' | 'wind_tunnel' | 'cfd_lab' | 'foundry';
		tier: number;
		conditionPct: number;
		isUnderConstruction: boolean;
		operationalCostAnnual: number;
	}[] = [];
	for (let i = 0; i < GRID_SIZE; i++) {
		const teamId = i + 1;
		const simTier = 1 + Math.floor(hash01(i + 50) * 3); // 1–3
		const academyTier = 1 + Math.floor(hash01(i + 60) * 2);
		const wtTier = 1 + Math.floor(hash01(i + 70) * 2);
		facilityRows.push(
			{
				id: facilityId++,
				teamId,
				facilityType: 'simulator',
				tier: simTier,
				conditionPct: 92 + Math.round(hash01(i + 80) * 8),
				isUnderConstruction: false,
				operationalCostAnnual: 500_000 * simTier
			},
			{
				id: facilityId++,
				teamId,
				facilityType: 'staff_academy',
				tier: academyTier,
				conditionPct: 90 + Math.round(hash01(i + 90) * 10),
				isUnderConstruction: false,
				operationalCostAnnual: 400_000 * academyTier
			},
			{
				id: facilityId++,
				teamId,
				facilityType: 'wind_tunnel',
				tier: wtTier,
				conditionPct: 88 + Math.round(hash01(i + 100) * 12),
				isUnderConstruction: false,
				operationalCostAnnual: 1_200_000 * wtTier
			}
		);
	}
	await db.insert(facilities).values(facilityRows);

	await db.insert(worldClock).values({
		id: 1,
		seasonYear: SEASON_YEAR,
		week: 1,
		day: 1,
		tickIndex: 0
	});

	return { trackId: TRACK_ID, teamIds };
}

export const FULL_GRID_SIZE = GRID_SIZE;
