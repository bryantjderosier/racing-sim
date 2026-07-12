import { and, asc, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { facilities, seasonCalendar, seasons, teams, tracks } from '../../db/schema.js';
import {
	getFacilityUpgradeQuote,
	startFacilityBuild,
	type FacilityType,
	type StartFacilityBuildResult
} from '../facilities/index.js';
import { setTeamRdPivot } from '../season/pivot.js';
import { WEEKLY_CFD_CAP, WEEKLY_WT_CAP } from '../world/constants.js';
import { ensureClock } from '../world/tick.js';
import type {
	CalendarRoundView,
	FacilityUpgradeQuoteView,
	SetRdPivotArgs,
	UpgradeFacilityArgs
} from './types.js';

const FACILITY_TYPES = new Set<string>([
	'wind_tunnel',
	'cfd_lab',
	'design_studio',
	'weather_hub',
	'scouting_hq',
	'logistics_hub',
	'simulator',
	'fitness_center',
	'staff_academy',
	'foundry',
	'rig_testing',
	'powertrain_factory'
]);

function asFacilityType(raw: string): FacilityType {
	if (!FACILITY_TYPES.has(raw)) throw new Error(`Unknown facility type: ${raw}`);
	return raw as FacilityType;
}

export async function getCalendarView(
	db: AppDb,
	seasonYear?: number
): Promise<CalendarRoundView[]> {
	const clock = await ensureClock(db);
	const year = seasonYear ?? clock.seasonYear;
	const rows = await db
		.select({
			id: seasonCalendar.id,
			raceIndex: seasonCalendar.raceIndex,
			trackId: seasonCalendar.trackId,
			isCompleted: seasonCalendar.isCompleted,
			trackName: tracks.name
		})
		.from(seasonCalendar)
		.leftJoin(tracks, eq(seasonCalendar.trackId, tracks.id))
		.where(eq(seasonCalendar.seasonYear, year))
		.orderBy(asc(seasonCalendar.raceIndex));

	return rows.map((r) => ({
		raceIndex: r.raceIndex,
		calendarId: r.id,
		trackId: r.trackId,
		trackName: r.trackName ?? `Track ${r.trackId}`,
		isCompleted: r.isCompleted
	}));
}

export async function quoteFacilityUpgrade(
	db: AppDb,
	playerTeamId: number,
	facilityTypeRaw: string
): Promise<FacilityUpgradeQuoteView | null> {
	const facilityType = asFacilityType(facilityTypeRaw);
	const [fac] = await db
		.select()
		.from(facilities)
		.where(and(eq(facilities.teamId, playerTeamId), eq(facilities.facilityType, facilityType)))
		.limit(1);
	const fromTier = fac?.tier ?? 0;
	const quote = getFacilityUpgradeQuote(facilityType, fromTier);
	if (!quote) return null;
	return {
		facilityType,
		fromTier: quote.fromTier,
		toTier: quote.toTier,
		cash: quote.cash,
		days: quote.days,
		weeks: quote.weeks,
		operationalCostAnnual: quote.operationalCostAnnual,
		underConstruction: fac?.isUnderConstruction ?? false
	};
}

export async function upgradePlayerFacility(
	db: AppDb,
	playerTeamId: number,
	args: UpgradeFacilityArgs
): Promise<StartFacilityBuildResult> {
	return startFacilityBuild(db, {
		teamId: playerTeamId,
		facilityType: asFacilityType(args.facilityType)
	});
}

export async function confirmPlayerRdPivot(
	db: AppDb,
	playerTeamId: number,
	args: SetRdPivotArgs
): Promise<{ currentFraction: number; locked: boolean }> {
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error('Player team not found');

	const frac = Math.max(0, Math.min(1, args.currentFraction));
	await setTeamRdPivot(db, {
		teamId: playerTeamId,
		seasonYear: clock.seasonYear,
		division: team.division,
		currentFraction: frac,
		lockSeason: args.lockSeason !== false
	});

	return {
		currentFraction: frac,
		locked: args.lockSeason !== false
	};
}

export async function getSeasonCaps(db: AppDb, seasonYear: number, division: number) {
	const season = await db
		.select()
		.from(seasons)
		.where(and(eq(seasons.seasonYear, seasonYear), eq(seasons.division, division)))
		.limit(1)
		.then((r) => r[0]);

	return {
		wtHoursWeeklyCap: season?.wtHoursWeeklyCap ?? WEEKLY_WT_CAP[division] ?? WEEKLY_WT_CAP[1],
		cfdHoursWeeklyCap: season?.cfdHoursWeeklyCap ?? WEEKLY_CFD_CAP[division] ?? WEEKLY_CFD_CAP[1],
		rdPivotRaceIndex: season?.rdPivotRaceIndex ?? 11,
		rdPivotLocked: season?.rdPivotLocked ?? false
	};
}
