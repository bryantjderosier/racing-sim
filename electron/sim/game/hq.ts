import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { drivers, facilities, teams } from '../../db/schema.js';
import { getCostCapStatus } from '../finance/status.js';
import { getFacilityUpgradeQuote, type FacilityType } from '../facilities/index.js';
import { getStandingsTable } from '../season/standings.js';
import { ensureClock } from '../world/tick.js';
import type { CareerSummary } from '../career/store.js';
import { getCalendarView, getSeasonCaps } from './desk.js';
import { getNextRoundView } from './season.js';
import type {
	FacilityView,
	HqHubSnapshot,
	StandingsRowView
} from './types.js';

async function namedStandings(
	db: AppDb,
	seasonYear: number,
	division: number,
	entityType: 'driver' | 'team',
	limit = 10
): Promise<StandingsRowView[]> {
	const rows = await getStandingsTable(db, seasonYear, division, entityType);
	const top = rows.slice(0, limit);

	if (entityType === 'team') {
		const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams);
		const map = new Map(teamRows.map((t) => [t.id, t.name]));
		return top.map((r) => ({
			position: r.position,
			entityId: r.entityId,
			name: map.get(r.entityId) ?? `Team ${r.entityId}`,
			teamId: r.teamId,
			points: r.points
		}));
	}

	const driverRows = await db
		.select({ id: drivers.id, name: drivers.name, teamId: drivers.teamId })
		.from(drivers);
	const map = new Map(driverRows.map((d) => [d.id, d]));
	return top.map((r) => {
		const d = map.get(r.entityId);
		return {
			position: r.position,
			entityId: r.entityId,
			name: d?.name ?? `Driver ${r.entityId}`,
			teamId: r.teamId ?? d?.teamId ?? null,
			points: r.points
		};
	});
}

export async function getHqSnapshot(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>
): Promise<HqHubSnapshot> {
	const playerTeamId = career.playerTeamId;
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const costCap = await getCostCapStatus(db, playerTeamId);
	const caps = await getSeasonCaps(db, clock.seasonYear, team.division);
	const facilityRows = await db
		.select()
		.from(facilities)
		.where(eq(facilities.teamId, playerTeamId));

	const facilitiesView: FacilityView[] = facilityRows.map((f) => {
		const quote = getFacilityUpgradeQuote(f.facilityType as FacilityType, f.tier);
		return {
			id: f.id,
			facilityType: f.facilityType,
			tier: f.tier,
			conditionPct: f.conditionPct,
			isUnderConstruction: f.isUnderConstruction,
			constructionFinishDate: f.constructionFinishDate,
			upgradeQuote:
				quote == null
					? null
					: {
							facilityType: f.facilityType,
							fromTier: quote.fromTier,
							toTier: quote.toTier,
							cash: quote.cash,
							days: quote.days,
							weeks: quote.weeks,
							operationalCostAnnual: quote.operationalCostAnnual,
							underConstruction: f.isUnderConstruction
						}
		};
	});

	const nextRound = await getNextRoundView(db, clock.seasonYear);
	const calendar = await getCalendarView(db, clock.seasonYear);
	const standingsDrivers = await namedStandings(
		db,
		clock.seasonYear,
		team.division,
		'driver'
	);
	const standingsTeams = await namedStandings(db, clock.seasonYear, team.division, 'team');

	const gateOpen =
		!caps.rdPivotLocked &&
		(nextRound != null
			? nextRound.raceIndex >= caps.rdPivotRaceIndex
			: calendar.some((c) => c.isCompleted && c.raceIndex >= caps.rdPivotRaceIndex));

	return {
		career: {
			id: career.id,
			displayName: career.displayName,
			playerTeamId
		},
		clock: {
			seasonYear: clock.seasonYear,
			week: clock.week,
			day: clock.day,
			tickIndex: clock.tickIndex
		},
		team: {
			id: team.id,
			name: team.name,
			cash: team.liquidCash,
			wtHours: team.wtHoursRemaining,
			cfdHours: team.cfdHoursRemaining,
			wtHoursCap: caps.wtHoursWeeklyCap * (team.wtHoursCapMult ?? 1),
			cfdHoursCap: caps.cfdHoursWeeklyCap,
			reputation: team.reputation,
			division: team.division,
			rdPivotCurrent: team.rdPivotCurrent
		},
		costCap,
		facilities: facilitiesView,
		calendar,
		pivot: {
			raceIndex: caps.rdPivotRaceIndex,
			locked: caps.rdPivotLocked,
			currentFraction: team.rdPivotCurrent,
			gateOpen
		},
		nextRound,
		standingsDrivers,
		standingsTeams
	};
}

export async function getStandingsView(
	db: AppDb,
	args: {
		seasonYear: number;
		division: number;
		entityType: 'driver' | 'team';
	}
): Promise<StandingsRowView[]> {
	return namedStandings(db, args.seasonYear, args.division, args.entityType, 99);
}
