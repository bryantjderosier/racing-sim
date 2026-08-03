import { asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { CareerIdentityDto, CurrentWeekendDto, SessionResultDto } from '../ipc-contract.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

type WeekendRow = {
	weekendSessionId: string;
	status: string;
	eventName: string;
	roundNumber: number;
	startDate: string;
	championshipCode: string;
	championshipDisplayName: string;
	championshipShortCode: string;
	circuitName: string;
	circuitShortName: string;
	sessionId: string;
	sessionKind: string;
	sequence: number;
	scheduledStart: string;
	scheduledLaps: number | null;
	scheduledMinutes: number | null;
	tempC: number | null;
	rainNow: number | null;
	rainInMinutes: number | null;
	trackWetness: number | null;
};

async function weekendRows(db: Database): Promise<WeekendRow[]> {
	return db
		.select({
			weekendSessionId: schema.weekendSession.id,
			status: schema.weekendSession.status,
			eventName: schema.championshipEvent.name,
			roundNumber: schema.championshipEvent.roundNumber,
			startDate: schema.championshipEvent.startDate,
			championshipCode: schema.championship.code,
			championshipDisplayName: schema.championship.displayName,
			championshipShortCode: schema.championship.shortCode,
			circuitName: schema.circuit.name,
			circuitShortName: schema.circuit.shortName,
			sessionId: schema.eventSessionDefinition.id,
			sessionKind: schema.eventSessionDefinition.sessionKind,
			sequence: schema.eventSessionDefinition.sequence,
			scheduledStart: schema.eventSessionDefinition.scheduledStart,
			scheduledLaps: schema.eventSessionDefinition.scheduledLaps,
			scheduledMinutes: schema.eventSessionDefinition.scheduledMinutes,
			tempC: schema.weekendSession.tempC,
			rainNow: schema.weekendSession.rainNow,
			rainInMinutes: schema.weekendSession.rainInMinutes,
			trackWetness: schema.weekendSession.trackWetness
		})
		.from(schema.weekendSession)
		.innerJoin(
			schema.eventSessionDefinition,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.innerJoin(
			schema.championshipEvent,
			eq(schema.eventSessionDefinition.championshipEventId, schema.championshipEvent.id)
		)
		.innerJoin(
			schema.championshipSeason,
			eq(schema.championshipEvent.championshipSeasonId, schema.championshipSeason.id)
		)
		.innerJoin(
			schema.championship,
			eq(schema.championshipSeason.championshipId, schema.championship.id)
		)
		.innerJoin(
			schema.circuitLayoutVersion,
			eq(schema.championshipEvent.circuitLayoutVersionId, schema.circuitLayoutVersion.id)
		)
		.innerJoin(schema.circuit, eq(schema.circuitLayoutVersion.circuitId, schema.circuit.id))
		.orderBy(asc(schema.championshipEvent.startDate), asc(schema.eventSessionDefinition.sequence));
}

function mapWeekend(row: WeekendRow): CurrentWeekendDto {
	return {
		weekendSessionId: row.weekendSessionId,
		status: row.status,
		eventName: row.eventName,
		roundNumber: row.roundNumber,
		startDate: row.startDate,
		championship: {
			code: row.championshipCode,
			displayName: row.championshipDisplayName,
			shortCode: row.championshipShortCode
		},
		circuit: { name: row.circuitName, shortName: row.circuitShortName },
		session: {
			id: row.sessionId,
			kind: row.sessionKind,
			sequence: row.sequence,
			scheduledStart: row.scheduledStart,
			scheduledLaps: row.scheduledLaps,
			scheduledMinutes: row.scheduledMinutes
		},
		conditions: {
			tempC: row.tempC,
			rainNow: row.rainNow,
			rainInMinutes: row.rainInMinutes,
			trackWetness: row.trackWetness
		}
	};
}

export async function getCurrentWeekend(db: Database): Promise<CurrentWeekendDto | null> {
	const rows = await weekendRows(db);
	const active = rows.find((row) => row.status === 'live' || row.status === 'paused');
	const scheduled = rows.find((row) => row.status === 'scheduled');
	const fallback = rows.at(-1);
	return active
		? mapWeekend(active)
		: scheduled
			? mapWeekend(scheduled)
			: fallback
				? mapWeekend(fallback)
				: null;
}

export async function getSessionResults(
	db: Database,
	weekendSessionId: string
): Promise<SessionResultDto[]> {
	const rows = await db
		.select({
			sessionResultId: schema.sessionResult.id,
			sessionEntryId: schema.sessionResult.sessionEntryId,
			driverId: schema.driver.id,
			driverDisplayName: schema.driver.displayName,
			driverFirstName: schema.driver.firstName,
			driverLastName: schema.driver.lastName,
			teamId: schema.team.id,
			teamName: schema.team.name,
			teamShortName: schema.team.shortName,
			position: schema.sessionResult.classificationPosition,
			status: schema.sessionResult.classificationStatus,
			lapsCompleted: schema.sessionResult.lapsCompleted,
			bestLapMs: schema.sessionResult.bestLapMs,
			totalTimeMs: schema.sessionResult.totalTimeMs,
			gapToLeaderMs: schema.sessionResult.gapToLeaderMs,
			lapsBehind: schema.sessionResult.lapsBehind,
			pitStops: schema.raceResultDetail.pitStops,
			lapsLed: schema.raceResultDetail.lapsLed,
			positionsGained: schema.raceResultDetail.positionsGained
		})
		.from(schema.sessionResult)
		.innerJoin(schema.sessionEntry, eq(schema.sessionResult.sessionEntryId, schema.sessionEntry.id))
		.innerJoin(schema.driver, eq(schema.sessionEntry.driverId, schema.driver.id))
		.innerJoin(schema.eventEntry, eq(schema.sessionEntry.eventEntryId, schema.eventEntry.id))
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.eventEntry.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.leftJoin(
			schema.raceResultDetail,
			eq(schema.raceResultDetail.sessionResultId, schema.sessionResult.id)
		)
		.where(eq(schema.sessionResult.weekendSessionId, weekendSessionId))
		.orderBy(
			sql`${schema.sessionResult.classificationPosition} IS NULL`,
			asc(schema.sessionResult.classificationPosition)
		);

	if (rows.length === 0) return [];
	const awards = await db
		.select({
			sessionResultId: schema.sessionPointAward.sessionResultId,
			points: schema.sessionPointAward.points
		})
		.from(schema.sessionPointAward)
		.innerJoin(
			schema.sessionResult,
			eq(schema.sessionPointAward.sessionResultId, schema.sessionResult.id)
		)
		.where(eq(schema.sessionResult.weekendSessionId, weekendSessionId));
	const points = new Map<string, number>();
	for (const award of awards) {
		points.set(award.sessionResultId, (points.get(award.sessionResultId) ?? 0) + award.points);
	}

	return rows.map((row) => ({
		sessionResultId: row.sessionResultId,
		sessionEntryId: row.sessionEntryId,
		driver: {
			id: row.driverId,
			name: row.driverDisplayName ?? `${row.driverFirstName} ${row.driverLastName}`
		},
		team: { id: row.teamId, name: row.teamName, shortName: row.teamShortName },
		position: row.position,
		status: row.status,
		lapsCompleted: row.lapsCompleted,
		bestLapMs: row.bestLapMs,
		totalTimeMs: row.totalTimeMs,
		gapToLeaderMs: row.gapToLeaderMs,
		lapsBehind: row.lapsBehind,
		pitStops: row.pitStops ?? 0,
		lapsLed: row.lapsLed ?? 0,
		positionsGained: row.positionsGained ?? 0,
		points: points.get(row.sessionResultId) ?? 0
	}));
}

export async function getCareerIdentity(db: Database): Promise<CareerIdentityDto | null> {
	const rows = await db
		.select({
			saveId: schema.saveGame.id,
			displayName: schema.saveGame.displayName,
			worldDate: schema.saveGame.worldDate,
			managerFirstName: schema.saveGame.managerFirstName,
			managerLastName: schema.saveGame.managerLastName,
			managerNationalityId: schema.saveGame.managerNationalityId,
			managerBackstoryCode: schema.saveGame.managerBackstoryCode,
			managerAvatarPayload: schema.saveGame.managerAvatarPayload,
			managerAvatarSchemaVersion: schema.saveGame.managerAvatarSchemaVersion,
			teamId: schema.team.id,
			teamName: schema.team.name,
			teamShortName: schema.team.shortName,
			nationalityDisplayName: schema.nationality.displayName
		})
		.from(schema.saveGame)
		.leftJoin(schema.team, eq(schema.saveGame.playerTeamId, schema.team.id))
		.leftJoin(schema.nationality, eq(schema.team.nationalityId, schema.nationality.id))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	return {
		saveId: row.saveId,
		displayName: row.displayName,
		worldDate: row.worldDate,
		managerFirstName: row.managerFirstName,
		managerLastName: row.managerLastName,
		managerNationalityId: row.managerNationalityId,
		managerBackstoryCode: row.managerBackstoryCode,
		managerAvatarPayload: row.managerAvatarPayload,
		managerAvatarSchemaVersion: row.managerAvatarSchemaVersion,
		team: row.teamId
			? {
					id: row.teamId,
					name: row.teamName ?? '',
					shortName: row.teamShortName ?? '',
					nationalityDisplayName: row.nationalityDisplayName
				}
			: null
	};
}
