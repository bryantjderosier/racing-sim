import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	blueprints,
	cars,
	drivers,
	parts,
	staff,
	teams,
	tracks
} from '../../db/schema.js';

const TEAM_ID = 1;
const CAR_ID = 1;
const DRIVER_ID = 1;
const ENGINEER_ID = 1;
const TRACK_ID = 1;

function driverAttrs(entityId: number, values: Record<string, number>) {
	return Object.entries(values).map(([attrName, currentValue], i) => ({
		id: entityId * 100 + i,
		entityId,
		entityType: 'driver' as const,
		attrName,
		currentValue,
		ceiling: Math.min(99, currentValue + 10)
	}));
}

function staffAttrs(entityId: number, values: Record<string, number>, idBase: number) {
	return Object.entries(values).map(([attrName, currentValue], i) => ({
		id: idBase + i,
		entityId,
		entityType: 'staff' as const,
		attrName,
		currentValue,
		ceiling: Math.min(99, currentValue + 8)
	}));
}

/** Idempotent minimal world for practice-from-DB harness. */
export async function seedPracticeFixture(db: AppDb): Promise<{
	teamId: number;
	carId: number;
	driverId: number;
	trackId: number;
}> {
	// Clear fixture rows (order: dependents first)
	await db.delete(parts).where(eq(parts.teamId, TEAM_ID));
	await db.delete(blueprints).where(eq(blueprints.teamId, TEAM_ID));
	await db.delete(attributes).where(eq(attributes.entityId, DRIVER_ID));
	await db.delete(attributes).where(eq(attributes.entityId, ENGINEER_ID));
	await db.delete(staff).where(eq(staff.id, ENGINEER_ID));
	await db.delete(drivers).where(eq(drivers.id, DRIVER_ID));
	await db.delete(cars).where(eq(cars.id, CAR_ID));
	await db.delete(teams).where(eq(teams.id, TEAM_ID));
	await db.delete(tracks).where(eq(tracks.id, TRACK_ID));

	await db.insert(teams).values({
		id: TEAM_ID,
		name: 'Apex Test Racing',
		shortName: 'ATR',
		nationalityCode: 'GBR',
		status: 'PLAYER_MANAGED',
		liquidCash: 50_000_000,
		costCapLimit: 140_000_000,
		division: 1,
		reputation: 55,
		wtHoursRemaining: 40,
		cfdHoursRemaining: 80
	});

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

	await db.insert(cars).values({
		id: CAR_ID,
		teamId: TEAM_ID,
		carNumber: 1
	});

	await db.insert(drivers).values({
		id: DRIVER_ID,
		name: 'Alex Rivera',
		nationalityCode: 'ESP',
		birthplace: 'Valencia',
		age: 24,
		teamId: TEAM_ID,
		carId: CAR_ID,
		injuryProneness: 0.4,
		longevity: 34,
		morale: 60
	});

	await db.insert(staff).values({
		id: ENGINEER_ID,
		name: 'Morgan Blake',
		nationalityCode: 'GBR',
		birthplace: 'Woking',
		role: 'race_engineer',
		teamId: TEAM_ID,
		assignedDriverId: DRIVER_ID,
		isScouted: true,
		morale: 70,
		ego: 40,
		loyalty: 65
	});

	await db.insert(attributes).values([
		...driverAttrs(DRIVER_ID, {
			braking: 78,
			cornering: 74,
			traction: 76,
			tyre_management: 72,
			wet_driving: 68,
			composure: 70,
			focus: 73,
			aggression: 55,
			feedback: 82,
			qualifying: 75,
			overtaking: 70,
			defending: 68,
			launch: 71,
			traffic_navigation: 69,
			consistency: 74,
			adaptability: 70,
			development: 65,
			marketability: 60,
			morale_balance: 70,
			teamwork: 75
		}),
		...staffAttrs(
			ENGINEER_ID,
			{
				chemistry: 80,
				setup: 86,
				strategy: 78,
				analysis: 84,
				adaptability: 75
			},
			500
		)
	]);

	const blueprintDefs: {
		id: number;
		slot: 'front_wing' | 'rear_wing' | 'underfloor' | 'sidepods' | 'suspension' | 'power_unit';
		name: string;
		pp: number;
		weight: number;
	}[] = [
		{ id: 1, slot: 'front_wing', name: 'FW Spec-2', pp: 28, weight: 12 },
		{ id: 2, slot: 'rear_wing', name: 'RW Spec-2', pp: 30, weight: 14 },
		{ id: 3, slot: 'underfloor', name: 'Floor Spec-1', pp: 35, weight: 40 },
		{ id: 4, slot: 'sidepods', name: 'Sidepod Spec-1', pp: 22, weight: 25 },
		{ id: 5, slot: 'suspension', name: 'Wishbone Spec-1', pp: 95, weight: 55 },
		{ id: 6, slot: 'power_unit', name: 'PU Customer-A', pp: 100, weight: 150 }
	];

	await db.insert(blueprints).values(
		blueprintDefs.map((b) => ({
			id: b.id,
			teamId: TEAM_ID,
			slot: b.slot,
			name: b.name,
			performancePoints: b.pp,
			baseReliability: 92,
			seasonYear: 2026,
			weightKg: b.weight
		}))
	);

	await db.insert(parts).values(
		blueprintDefs.map((b) => ({
			id: b.id,
			blueprintId: b.id,
			teamId: TEAM_ID,
			slot: b.slot,
			currentReliability: 96,
			maxConditionCeiling: 100,
			weightKg: b.weight,
			isLightweight: false,
			isScrapped: false,
			mountedOnCarId: CAR_ID
		}))
	);

	await db.update(cars).set({ powerUnitId: 6 }).where(eq(cars.id, CAR_ID));

	return { teamId: TEAM_ID, carId: CAR_ID, driverId: DRIVER_ID, trackId: TRACK_ID };
}
