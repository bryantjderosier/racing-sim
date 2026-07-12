import { and, eq } from 'drizzle-orm';
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
import type { AppDb } from '../../db/node.js';
import {
	attributesToDriverLapAttrs,
	attributesToPracticePersonnel
} from './attributes.js';
import { partsToCarPerformance, type MountedPartView, type PartSlot } from './car.js';
import { trackToLapContext, type TrackRow } from './track.js';
import type {
	CarPerformance,
	DriverLapAttrs,
	SetupVector,
	TrackLapContext
} from '../lap/types.js';
import type { PracticePersonnel } from '../practice/types.js';

export type LoadedPracticeEntrant = {
	teamId: number;
	carId: number;
	driverId: number;
	driverName: string;
	engineerName: string | null;
	car: CarPerformance;
	driver: DriverLapAttrs;
	personnel: PracticePersonnel;
	track: TrackLapContext;
	trackName: string;
	parts: MountedPartView[];
};

async function loadAttrs(db: AppDb, entityId: number, entityType: 'driver' | 'staff') {
	return db
		.select({
			attrName: attributes.attrName,
			currentValue: attributes.currentValue
		})
		.from(attributes)
		.where(and(eq(attributes.entityId, entityId), eq(attributes.entityType, entityType)));
}

async function loadMountedParts(db: AppDb, carId: number): Promise<MountedPartView[]> {
	const rows = await db
		.select({
			slot: parts.slot,
			performancePoints: blueprints.performancePoints,
			weightKg: parts.weightKg,
			currentReliability: parts.currentReliability,
			maxConditionCeiling: parts.maxConditionCeiling
		})
		.from(parts)
		.innerJoin(blueprints, eq(parts.blueprintId, blueprints.id))
		.where(and(eq(parts.mountedOnCarId, carId), eq(parts.isScrapped, false)));

	return rows.map((r) => ({
		slot: r.slot as PartSlot,
		performancePoints: r.performancePoints,
		weightKg: r.weightKg,
		currentReliability: r.currentReliability,
		maxConditionCeiling: r.maxConditionCeiling
	}));
}

/**
 * Load driver #1 seat for a team + track into sim-ready practice inputs.
 */
export async function loadPracticeEntrant(
	db: AppDb,
	args: { teamId: number; trackId: number; setupCurrent?: SetupVector }
): Promise<LoadedPracticeEntrant> {
	const [car] = await db
		.select()
		.from(cars)
		.where(and(eq(cars.teamId, args.teamId), eq(cars.carNumber, 1)))
		.limit(1);
	if (!car) throw new Error(`No car #1 for team ${args.teamId}`);

	const [driver] = await db
		.select()
		.from(drivers)
		.where(eq(drivers.carId, car.id))
		.limit(1);
	if (!driver) throw new Error(`No driver on car ${car.id}`);

	const [engineer] = await db
		.select()
		.from(staff)
		.where(
			and(
				eq(staff.teamId, args.teamId),
				eq(staff.role, 'race_engineer'),
				eq(staff.assignedDriverId, driver.id)
			)
		)
		.limit(1);

	const [track] = await db.select().from(tracks).where(eq(tracks.id, args.trackId)).limit(1);
	if (!track) throw new Error(`Track ${args.trackId} not found`);

	const driverAttrs = await loadAttrs(db, driver.id, 'driver');
	const engineerAttrs = engineer ? await loadAttrs(db, engineer.id, 'staff') : [];
	const mounted = await loadMountedParts(db, car.id);

	const trackRow: TrackRow = {
		id: track.id,
		name: track.name,
		lengthKm: track.lengthKm,
		aeroEfficiencyWeight: track.aeroEfficiencyWeight,
		mechanicalGripWeight: track.mechanicalGripWeight,
		tireAbrasionFactor: track.tireAbrasionFactor,
		baseGrip: track.baseGrip,
		maxGrip: track.maxGrip
	};

	return {
		teamId: args.teamId,
		carId: car.id,
		driverId: driver.id,
		driverName: driver.name,
		engineerName: engineer?.name ?? null,
		car: partsToCarPerformance(mounted),
		driver: attributesToDriverLapAttrs(driverAttrs),
		personnel: attributesToPracticePersonnel(driverAttrs, engineerAttrs),
		track: trackToLapContext(trackRow, { setupCurrent: args.setupCurrent }),
		trackName: track.name,
		parts: mounted
	};
}

/**
 * Load all Div N car #1 seats for a track into sim-ready entrants.
 */
export async function loadGridEntrants(
	db: AppDb,
	args: { trackId: number; division?: number }
): Promise<{ trackName: string; track: TrackLapContext; entrants: LoadedPracticeEntrant[] }> {
	const division = args.division ?? 1;
	const teamRows = await db
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.division, division))
		.orderBy(teams.id);

	const entrants: LoadedPracticeEntrant[] = [];
	let trackName = '';
	let trackCtx: TrackLapContext | null = null;

	for (const t of teamRows) {
		const e = await loadPracticeEntrant(db, {
			teamId: t.id,
			trackId: args.trackId
		});
		trackName = e.trackName;
		trackCtx = e.track;
		entrants.push(e);
	}

	if (!trackCtx) throw new Error('No teams found for grid load');
	return { trackName, track: trackCtx, entrants };
}

