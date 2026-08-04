import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import { commitCalendarTransition } from './calendar-service.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface WeekendSettlementResult {
	settlementId: string;
	championshipEventId: string;
	idempotent: boolean;
	advancedToWorldDate: string;
	nextWeekendSessionId: string | null;
	driverPointsApplied: number;
	teamPointsApplied: number;
}

export interface DriverChampionshipStanding {
	standingId: string;
	championshipSeasonId: string;
	driverId: string;
	driverName: string;
	points: number;
	wins: number;
	secondPlaces: number;
	thirdPlaces: number;
	finishCounts: Record<number, number>;
}

export interface TeamChampionshipStanding {
	standingId: string;
	championshipSeasonId: string;
	teamSeasonEntryId: string;
	teamId: string;
	teamName: string;
	points: number;
	wins: number;
	secondPlaces: number;
	thirdPlaces: number;
	finishCounts: Record<number, number>;
}

export class SettlementError extends Error {
	readonly code = 'SETTLEMENT_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'SettlementError';
	}
}

interface EventContext {
	eventId: string;
	seasonId: string;
	eventStartDate: string;
}

interface EventSessionRow {
	weekendSessionId: string;
	status: string;
	activeCheckpointId: string | null;
	pointsSystemId: string | null;
}

interface ParticipantRow {
	driverId: string;
	teamSeasonEntryId: string;
}

interface AwardRow {
	sessionPointAwardId: string;
	driverId: string;
	teamSeasonEntryId: string;
	points: number;
}

interface FinishRow {
	weekendSessionId: string;
	driverId: string;
	teamSeasonEntryId: string;
	classificationPosition: number | null;
	classificationStatus: string;
}

function standingId(kind: 'driver' | 'team', seasonId: string, entityId: string): string {
	return `${seasonId}:${kind}:${entityId}`;
}

function finishCountId(standing: string, position: number): string {
	return `${standing}:finish:${position}`;
}

function isCountbackResult(row: FinishRow): row is FinishRow & { classificationPosition: number } {
	const position = row.classificationPosition;
	return (
		(row.classificationStatus === 'finished' || row.classificationStatus === 'classified') &&
		typeof position === 'number' &&
		Number.isInteger(position) &&
		position > 0
	);
}

async function eventContext(tx: Transaction, eventId: string): Promise<EventContext> {
	const rows = await tx
		.select({
			eventId: schema.championshipEvent.id,
			seasonId: schema.championshipSeason.id,
			eventStartDate: schema.championshipEvent.startDate
		})
		.from(schema.championshipEvent)
		.innerJoin(
			schema.championshipSeason,
			eq(schema.championshipEvent.championshipSeasonId, schema.championshipSeason.id)
		)
		.where(eq(schema.championshipEvent.id, eventId))
		.limit(1);
	const event = rows[0];
	if (!event) throw new SettlementError(`Championship event was not found: ${eventId}.`);
	return event;
}

async function eventSessions(tx: Transaction, eventId: string): Promise<EventSessionRow[]> {
	return tx
		.select({
			weekendSessionId: schema.weekendSession.id,
			status: schema.weekendSession.status,
			activeCheckpointId: schema.weekendSession.activeCheckpointId,
			pointsSystemId: schema.eventSessionDefinition.pointsSystemId
		})
		.from(schema.eventSessionDefinition)
		.innerJoin(
			schema.weekendSession,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(eq(schema.eventSessionDefinition.championshipEventId, eventId));
}

async function nextScheduledSession(tx: Transaction): Promise<string | null> {
	const rows = await tx
		.select({
			weekendSessionId: schema.weekendSession.id,
			scheduledStart: schema.eventSessionDefinition.scheduledStart
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
		.where(eq(schema.weekendSession.status, 'scheduled'))
		.orderBy(
			asc(schema.eventSessionDefinition.scheduledStart),
			asc(schema.eventSessionDefinition.sequence)
		)
		.limit(1);
	return rows[0]?.weekendSessionId ?? null;
}

async function participants(tx: Transaction, eventId: string): Promise<ParticipantRow[]> {
	const rows = await tx
		.select({
			driverId: schema.eventEntry.driverId,
			teamSeasonEntryId: schema.eventEntry.teamSeasonEntryId
		})
		.from(schema.eventEntry)
		.where(eq(schema.eventEntry.championshipEventId, eventId));
	return rows;
}

async function pointAwards(tx: Transaction, eventId: string): Promise<AwardRow[]> {
	return tx
		.select({
			sessionPointAwardId: schema.sessionPointAward.id,
			driverId: schema.sessionEntry.driverId,
			teamSeasonEntryId: schema.eventEntry.teamSeasonEntryId,
			points: schema.sessionPointAward.points
		})
		.from(schema.sessionPointAward)
		.innerJoin(
			schema.sessionResult,
			eq(schema.sessionPointAward.sessionResultId, schema.sessionResult.id)
		)
		.innerJoin(schema.sessionEntry, eq(schema.sessionResult.sessionEntryId, schema.sessionEntry.id))
		.innerJoin(schema.eventEntry, eq(schema.sessionEntry.eventEntryId, schema.eventEntry.id))
		.innerJoin(
			schema.weekendSession,
			eq(schema.sessionResult.weekendSessionId, schema.weekendSession.id)
		)
		.innerJoin(
			schema.eventSessionDefinition,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(eq(schema.eventSessionDefinition.championshipEventId, eventId));
}

async function finishRows(tx: Transaction, eventId: string): Promise<FinishRow[]> {
	return tx
		.select({
			weekendSessionId: schema.sessionResult.weekendSessionId,
			driverId: schema.sessionEntry.driverId,
			teamSeasonEntryId: schema.eventEntry.teamSeasonEntryId,
			classificationPosition: schema.sessionResult.classificationPosition,
			classificationStatus: schema.sessionResult.classificationStatus
		})
		.from(schema.sessionResult)
		.innerJoin(schema.sessionEntry, eq(schema.sessionResult.sessionEntryId, schema.sessionEntry.id))
		.innerJoin(schema.eventEntry, eq(schema.sessionEntry.eventEntryId, schema.eventEntry.id))
		.innerJoin(
			schema.weekendSession,
			eq(schema.sessionResult.weekendSessionId, schema.weekendSession.id)
		)
		.innerJoin(
			schema.eventSessionDefinition,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(
			and(
				eq(schema.eventSessionDefinition.championshipEventId, eventId),
				isNotNull(schema.eventSessionDefinition.pointsSystemId)
			)
		);
}

function addValue(map: Map<string, number>, key: string, value: number): void {
	map.set(key, (map.get(key) ?? 0) + value);
}

function addFinish(map: Map<string, Map<number, number>>, key: string, position: number): void {
	const counts = map.get(key) ?? new Map<number, number>();
	counts.set(position, (counts.get(position) ?? 0) + 1);
	map.set(key, counts);
}

async function ensureStandings(
	tx: Transaction,
	seasonId: string,
	participantRows: readonly ParticipantRow[],
	updatedAt: string
): Promise<void> {
	const driverIds = [...new Set(participantRows.map((row) => row.driverId))];
	const teamSeasonEntryIds = [...new Set(participantRows.map((row) => row.teamSeasonEntryId))];
	if (driverIds.length > 0) {
		await tx
			.insert(schema.championshipDriverStanding)
			.values(
				driverIds.map((driverId) => ({
					id: standingId('driver', seasonId, driverId),
					championshipSeasonId: seasonId,
					driverId,
					updatedAt
				}))
			)
			.onConflictDoNothing();
	}
	if (teamSeasonEntryIds.length > 0) {
		await tx
			.insert(schema.championshipTeamStanding)
			.values(
				teamSeasonEntryIds.map((teamSeasonEntryId) => ({
					id: standingId('team', seasonId, teamSeasonEntryId),
					championshipSeasonId: seasonId,
					teamSeasonEntryId,
					updatedAt
				}))
			)
			.onConflictDoNothing();
	}
}

async function applyDriverStandings(
	tx: Transaction,
	seasonId: string,
	points: Map<string, number>,
	finishes: Map<string, Map<number, number>>,
	updatedAt: string
): Promise<void> {
	const driverIds = new Set([...points.keys(), ...finishes.keys()]);
	for (const driverId of driverIds) {
		const pointsDelta = points.get(driverId) ?? 0;
		const id = standingId('driver', seasonId, driverId);
		const current = await tx
			.select()
			.from(schema.championshipDriverStanding)
			.where(eq(schema.championshipDriverStanding.id, id))
			.limit(1);
		if (!current[0]) throw new SettlementError(`Driver standing is missing: ${driverId}.`);
		const finishDelta = finishes.get(driverId) ?? new Map<number, number>();
		await tx
			.update(schema.championshipDriverStanding)
			.set({
				points: current[0].points + pointsDelta,
				wins: current[0].wins + (finishDelta.get(1) ?? 0),
				secondPlaces: current[0].secondPlaces + (finishDelta.get(2) ?? 0),
				thirdPlaces: current[0].thirdPlaces + (finishDelta.get(3) ?? 0),
				updatedAt
			})
			.where(eq(schema.championshipDriverStanding.id, id));
		await applyFinishCounts(tx, 'driver', id, finishDelta);
	}
}

async function applyTeamStandings(
	tx: Transaction,
	seasonId: string,
	points: Map<string, number>,
	finishes: Map<string, Map<number, number>>,
	updatedAt: string
): Promise<void> {
	const teamSeasonEntryIds = new Set([...points.keys(), ...finishes.keys()]);
	for (const teamSeasonEntryId of teamSeasonEntryIds) {
		const pointsDelta = points.get(teamSeasonEntryId) ?? 0;
		const id = standingId('team', seasonId, teamSeasonEntryId);
		const current = await tx
			.select()
			.from(schema.championshipTeamStanding)
			.where(eq(schema.championshipTeamStanding.id, id))
			.limit(1);
		if (!current[0]) {
			throw new SettlementError(`Team standing is missing: ${teamSeasonEntryId}.`);
		}
		const finishDelta = finishes.get(teamSeasonEntryId) ?? new Map<number, number>();
		await tx
			.update(schema.championshipTeamStanding)
			.set({
				points: current[0].points + pointsDelta,
				wins: current[0].wins + (finishDelta.get(1) ?? 0),
				secondPlaces: current[0].secondPlaces + (finishDelta.get(2) ?? 0),
				thirdPlaces: current[0].thirdPlaces + (finishDelta.get(3) ?? 0),
				updatedAt
			})
			.where(eq(schema.championshipTeamStanding.id, id));
		await applyFinishCounts(tx, 'team', id, finishDelta);
	}
}

async function applyFinishCounts(
	tx: Transaction,
	kind: 'driver' | 'team',
	standing: string,
	finishDelta: Map<number, number>
): Promise<void> {
	for (const [position, countDelta] of finishDelta) {
		if (kind === 'driver') {
			const existing = await tx
				.select()
				.from(schema.championshipDriverFinishCount)
				.where(
					and(
						eq(schema.championshipDriverFinishCount.standingId, standing),
						eq(schema.championshipDriverFinishCount.finishingPosition, position)
					)
				)
				.limit(1);
			if (existing[0]) {
				await tx
					.update(schema.championshipDriverFinishCount)
					.set({ count: existing[0].count + countDelta })
					.where(eq(schema.championshipDriverFinishCount.id, existing[0].id));
			} else {
				await tx.insert(schema.championshipDriverFinishCount).values({
					id: finishCountId(standing, position),
					standingId: standing,
					finishingPosition: position,
					count: countDelta
				});
			}
		} else {
			const existing = await tx
				.select()
				.from(schema.championshipTeamFinishCount)
				.where(
					and(
						eq(schema.championshipTeamFinishCount.standingId, standing),
						eq(schema.championshipTeamFinishCount.finishingPosition, position)
					)
				)
				.limit(1);
			if (existing[0]) {
				await tx
					.update(schema.championshipTeamFinishCount)
					.set({ count: existing[0].count + countDelta })
					.where(eq(schema.championshipTeamFinishCount.id, existing[0].id));
			} else {
				await tx.insert(schema.championshipTeamFinishCount).values({
					id: finishCountId(standing, position),
					standingId: standing,
					finishingPosition: position,
					count: countDelta
				});
			}
		}
	}
}

async function advanceWorldDate(
	tx: Transaction,
	seasonId: string,
	eventStartDate: string,
	settledAt: string
): Promise<string> {
	const nextEvents = await tx
		.select({ startDate: schema.championshipEvent.startDate })
		.from(schema.championshipEvent)
		.where(eq(schema.championshipEvent.championshipSeasonId, seasonId))
		.orderBy(asc(schema.championshipEvent.roundNumber));
	const nextEvent = nextEvents.find((event) => event.startDate > eventStartDate);
	const targetDate = nextEvent?.startDate ?? eventStartDate;
	const saves = await tx
		.select({ worldDate: schema.saveGame.worldDate })
		.from(schema.saveGame)
		.limit(1);
	const save = saves[0];
	if (!save) throw new SettlementError('Save metadata is missing.');
	const next = save.worldDate.localeCompare(targetDate) >= 0 ? save.worldDate : targetDate;
	await commitCalendarTransition(tx, {
		transitionKind: 'weekend_settlement',
		fromWorldDate: save.worldDate,
		toWorldDate: next,
		now: settledAt
	});
	return next;
}

export async function settleChampionshipEvent(
	db: Database,
	championshipEventId: string,
	options: { settledAt?: string } = {}
): Promise<WeekendSettlementResult> {
	const settledAt = options.settledAt ?? new Date().toISOString();
	return db.transaction(async (tx) => {
		const context = await eventContext(tx, championshipEventId);
		const existing = await tx
			.select()
			.from(schema.championshipWeekendSettlement)
			.where(eq(schema.championshipWeekendSettlement.championshipEventId, championshipEventId))
			.limit(1);
		if (existing[0]) {
			return {
				settlementId: existing[0].id,
				championshipEventId,
				idempotent: true,
				advancedToWorldDate: existing[0].advancedToWorldDate,
				nextWeekendSessionId: await nextScheduledSession(tx),
				driverPointsApplied: 0,
				teamPointsApplied: 0
			};
		}

		const sessions = await eventSessions(tx, championshipEventId);
		if (sessions.length === 0) throw new SettlementError('Championship event has no sessions.');
		if (sessions.some((session) => session.status !== 'finished' || session.activeCheckpointId)) {
			throw new SettlementError('All event sessions must be finished with no active checkpoint.');
		}
		const resultSessionIds = new Set(
			(
				await tx
					.select({ weekendSessionId: schema.sessionResult.weekendSessionId })
					.from(schema.sessionResult)
					.innerJoin(
						schema.weekendSession,
						eq(schema.sessionResult.weekendSessionId, schema.weekendSession.id)
					)
					.innerJoin(
						schema.eventSessionDefinition,
						eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
					)
					.where(eq(schema.eventSessionDefinition.championshipEventId, championshipEventId))
			).map((row) => row.weekendSessionId)
		);
		if (sessions.some((session) => !resultSessionIds.has(session.weekendSessionId))) {
			throw new SettlementError('Every event session must have persisted results.');
		}

		const participantRows = await participants(tx, championshipEventId);
		if (participantRows.length === 0)
			throw new SettlementError('Championship event has no entries.');
		await ensureStandings(tx, context.seasonId, participantRows, settledAt);

		const awards = await pointAwards(tx, championshipEventId);
		const driverPoints = new Map<string, number>();
		const teamPoints = new Map<string, number>();
		for (const award of awards) {
			addValue(driverPoints, award.driverId, award.points);
			addValue(teamPoints, award.teamSeasonEntryId, award.points);
		}

		const driverFinishes = new Map<string, Map<number, number>>();
		const teamFinishes = new Map<string, Map<number, number>>();
		const bestTeamFinishes = new Map<string, number>();
		for (const finish of await finishRows(tx, championshipEventId)) {
			if (!isCountbackResult(finish)) continue;
			addFinish(driverFinishes, finish.driverId, finish.classificationPosition);
			const teamResultKey = `${finish.weekendSessionId}:${finish.teamSeasonEntryId}`;
			const bestPosition = bestTeamFinishes.get(teamResultKey);
			if (bestPosition === undefined || finish.classificationPosition < bestPosition) {
				bestTeamFinishes.set(teamResultKey, finish.classificationPosition);
			}
		}
		for (const [teamResultKey, position] of bestTeamFinishes) {
			const teamSeasonEntryId = teamResultKey.slice(teamResultKey.indexOf(':') + 1);
			addFinish(teamFinishes, teamSeasonEntryId, position);
		}

		const advancedToWorldDate = await advanceWorldDate(
			tx,
			context.seasonId,
			context.eventStartDate,
			settledAt
		);
		const settlementId = `${championshipEventId}:settlement`;
		await tx.insert(schema.championshipWeekendSettlement).values({
			id: settlementId,
			championshipEventId,
			championshipSeasonId: context.seasonId,
			settledAt,
			advancedToWorldDate
		});
		if (awards.length > 0) {
			await tx.insert(schema.championshipWeekendSettlementAward).values(
				awards.map((award) => ({
					id: `${settlementId}:${award.sessionPointAwardId}`,
					settlementId,
					sessionPointAwardId: award.sessionPointAwardId,
					driverId: award.driverId,
					teamSeasonEntryId: award.teamSeasonEntryId,
					points: award.points
				}))
			);
		}
		await applyDriverStandings(tx, context.seasonId, driverPoints, driverFinishes, settledAt);
		await applyTeamStandings(tx, context.seasonId, teamPoints, teamFinishes, settledAt);

		return {
			settlementId,
			championshipEventId,
			idempotent: false,
			advancedToWorldDate,
			nextWeekendSessionId: await nextScheduledSession(tx),
			driverPointsApplied: [...driverPoints.values()].reduce((total, value) => total + value, 0),
			teamPointsApplied: [...teamPoints.values()].reduce((total, value) => total + value, 0)
		};
	});
}

function countbackCompare(
	left: {
		points: number;
		wins: number;
		secondPlaces: number;
		thirdPlaces: number;
		standingId: string;
	},
	right: {
		points: number;
		wins: number;
		secondPlaces: number;
		thirdPlaces: number;
		standingId: string;
	},
	finishCounts: Map<string, Record<number, number>>
): number {
	if (left.points !== right.points) return right.points - left.points;
	for (const position of new Set(
		[
			...Object.keys(finishCounts.get(left.standingId) ?? {}).map(Number),
			...Object.keys(finishCounts.get(right.standingId) ?? {}).map(Number)
		].sort((a, b) => a - b)
	)) {
		const difference =
			(finishCounts.get(right.standingId)?.[position] ?? 0) -
			(finishCounts.get(left.standingId)?.[position] ?? 0);
		if (difference !== 0) return difference;
	}
	return left.standingId.localeCompare(right.standingId);
}

export async function getDriverChampionshipStandings(
	db: Database,
	championshipSeasonId: string
): Promise<DriverChampionshipStanding[]> {
	const rows = await db
		.select({
			standingId: schema.championshipDriverStanding.id,
			championshipSeasonId: schema.championshipDriverStanding.championshipSeasonId,
			driverId: schema.championshipDriverStanding.driverId,
			driverName: schema.driver.displayName,
			firstName: schema.driver.firstName,
			lastName: schema.driver.lastName,
			points: schema.championshipDriverStanding.points,
			wins: schema.championshipDriverStanding.wins,
			secondPlaces: schema.championshipDriverStanding.secondPlaces,
			thirdPlaces: schema.championshipDriverStanding.thirdPlaces
		})
		.from(schema.championshipDriverStanding)
		.innerJoin(schema.driver, eq(schema.championshipDriverStanding.driverId, schema.driver.id))
		.where(eq(schema.championshipDriverStanding.championshipSeasonId, championshipSeasonId));
	const finishRows = await db
		.select({
			standingId: schema.championshipDriverFinishCount.standingId,
			position: schema.championshipDriverFinishCount.finishingPosition,
			count: schema.championshipDriverFinishCount.count
		})
		.from(schema.championshipDriverFinishCount)
		.innerJoin(
			schema.championshipDriverStanding,
			eq(schema.championshipDriverFinishCount.standingId, schema.championshipDriverStanding.id)
		)
		.where(eq(schema.championshipDriverStanding.championshipSeasonId, championshipSeasonId));
	const finishCounts = new Map<string, Record<number, number>>();
	for (const row of finishRows) {
		const counts = finishCounts.get(row.standingId) ?? {};
		counts[row.position] = row.count;
		finishCounts.set(row.standingId, counts);
	}
	return rows
		.map((row) => ({
			standingId: row.standingId,
			championshipSeasonId: row.championshipSeasonId,
			driverId: row.driverId,
			driverName: row.driverName ?? `${row.firstName} ${row.lastName}`,
			points: row.points,
			wins: row.wins,
			secondPlaces: row.secondPlaces,
			thirdPlaces: row.thirdPlaces,
			finishCounts: finishCounts.get(row.standingId) ?? {}
		}))
		.sort((left, right) => countbackCompare(left, right, finishCounts));
}

export async function getTeamChampionshipStandings(
	db: Database,
	championshipSeasonId: string
): Promise<TeamChampionshipStanding[]> {
	const rows = await db
		.select({
			standingId: schema.championshipTeamStanding.id,
			championshipSeasonId: schema.championshipTeamStanding.championshipSeasonId,
			teamSeasonEntryId: schema.championshipTeamStanding.teamSeasonEntryId,
			teamId: schema.team.id,
			teamName: schema.team.name,
			points: schema.championshipTeamStanding.points,
			wins: schema.championshipTeamStanding.wins,
			secondPlaces: schema.championshipTeamStanding.secondPlaces,
			thirdPlaces: schema.championshipTeamStanding.thirdPlaces
		})
		.from(schema.championshipTeamStanding)
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.championshipTeamStanding.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.where(eq(schema.championshipTeamStanding.championshipSeasonId, championshipSeasonId));
	const finishRows = await db
		.select({
			standingId: schema.championshipTeamFinishCount.standingId,
			position: schema.championshipTeamFinishCount.finishingPosition,
			count: schema.championshipTeamFinishCount.count
		})
		.from(schema.championshipTeamFinishCount)
		.innerJoin(
			schema.championshipTeamStanding,
			eq(schema.championshipTeamFinishCount.standingId, schema.championshipTeamStanding.id)
		)
		.where(eq(schema.championshipTeamStanding.championshipSeasonId, championshipSeasonId));
	const finishCounts = new Map<string, Record<number, number>>();
	for (const row of finishRows) {
		const counts = finishCounts.get(row.standingId) ?? {};
		counts[row.position] = row.count;
		finishCounts.set(row.standingId, counts);
	}
	return rows
		.map((row) => ({
			standingId: row.standingId,
			championshipSeasonId: row.championshipSeasonId,
			teamSeasonEntryId: row.teamSeasonEntryId,
			teamId: row.teamId,
			teamName: row.teamName,
			points: row.points,
			wins: row.wins,
			secondPlaces: row.secondPlaces,
			thirdPlaces: row.thirdPlaces,
			finishCounts: finishCounts.get(row.standingId) ?? {}
		}))
		.sort((left, right) => countbackCompare(left, right, finishCounts));
}
