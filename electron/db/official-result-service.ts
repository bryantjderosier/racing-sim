import { createHash } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION = 'official-weekend-result-v1';
export const OFFICIAL_RESULT_EXECUTION_DETAILS = ['interactive', 'off_screen'] as const;
export type OfficialResultExecutionDetail = (typeof OFFICIAL_RESULT_EXECUTION_DETAILS)[number];

export interface OfficialResultFact {
	sessionResultId: string;
	sessionEntryId: string;
	driverId: string;
	teamSeasonEntryId: string;
	classificationPosition: number | null;
	classificationStatus: string;
	lapsCompleted: number;
	bestLapMs: number | null;
	bestLapNumber: number | null;
	totalTimeMs: number | null;
	gapToLeaderMs: number | null;
	lapsBehind: number;
	pitStops: number;
	lapsLed: number;
	retirementReason: string | null;
	positionsGained: number;
	pointAwards: Array<{
		id: string;
		points: number;
		awardKind: string;
	}>;
}

export interface OfficialSessionFact {
	weekendSessionId: string;
	sequence: number;
	sessionKind: string;
	pointsSystemId: string | null;
	results: OfficialResultFact[];
}

export interface OfficialWeekendResultPayload {
	schemaVersion: typeof OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION;
	championshipEventId: string;
	championshipSeasonId: string;
	executionDetail: OfficialResultExecutionDetail;
	formulaVersion: string;
	engineVersion: string;
	inputHash: string;
	sessions: OfficialSessionFact[];
}

export interface OfficialWeekendResultPackage {
	id: string;
	championshipEventId: string;
	championshipSeasonId: string;
	packageSchemaVersion: string;
	executionDetail: OfficialResultExecutionDetail;
	formulaVersion: string;
	engineVersion: string;
	inputHash: string;
	resultHash: string;
	createdAt: string;
	payload: OfficialWeekendResultPayload;
}

export class OfficialResultError extends Error {
	readonly code = 'OFFICIAL_RESULT_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'OfficialResultError';
	}
}

interface SessionRow {
	weekendSessionId: string;
	sequence: number;
	sessionKind: string;
	pointsSystemId: string | null;
	status: string;
	activeCheckpointId: string | null;
	simulationInputPayload: string;
}

function hashText(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

function versionFromInput(payload: string, key: 'formulaVersion' | 'engineVersion'): string {
	try {
		const parsed: unknown = JSON.parse(payload);
		if (parsed && typeof parsed === 'object') {
			const value = (parsed as Record<string, unknown>)[key];
			if (typeof value === 'string' && value.length > 0) return value;
		}
	} catch {
		throw new OfficialResultError('A session input snapshot is not valid JSON.');
	}
	return 'unknown';
}

function parsePayload(payload: string): OfficialWeekendResultPayload {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch {
		throw new OfficialResultError('The official result package payload is not valid JSON.');
	}
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		(parsed as { schemaVersion?: unknown }).schemaVersion !== OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION
	) {
		throw new OfficialResultError(
			'The official result package payload has an unsupported version.'
		);
	}
	return parsed as OfficialWeekendResultPayload;
}

function toPackage(
	row: typeof schema.officialWeekendResultPackage.$inferSelect
): OfficialWeekendResultPackage {
	if (
		!OFFICIAL_RESULT_EXECUTION_DETAILS.includes(
			row.executionDetail as OfficialResultExecutionDetail
		)
	) {
		throw new OfficialResultError(
			`Unknown official result execution detail: ${row.executionDetail}.`
		);
	}
	const payload = parsePayload(row.payload);
	if (hashText(row.payload) !== row.resultHash) {
		throw new OfficialResultError('The official result package hash does not match its payload.');
	}
	return {
		id: row.id,
		championshipEventId: row.championshipEventId,
		championshipSeasonId: row.championshipSeasonId,
		packageSchemaVersion: row.packageSchemaVersion,
		executionDetail: row.executionDetail as OfficialResultExecutionDetail,
		formulaVersion: row.formulaVersion,
		engineVersion: row.engineVersion,
		inputHash: row.inputHash,
		resultHash: row.resultHash,
		createdAt: row.createdAt,
		payload
	};
}

async function sessionRows(tx: Transaction, championshipEventId: string): Promise<SessionRow[]> {
	return tx
		.select({
			weekendSessionId: schema.weekendSession.id,
			sequence: schema.eventSessionDefinition.sequence,
			sessionKind: schema.eventSessionDefinition.sessionKind,
			pointsSystemId: schema.eventSessionDefinition.pointsSystemId,
			status: schema.weekendSession.status,
			activeCheckpointId: schema.weekendSession.activeCheckpointId,
			simulationInputPayload: schema.weekendSession.simulationInputPayload
		})
		.from(schema.eventSessionDefinition)
		.innerJoin(
			schema.weekendSession,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(eq(schema.eventSessionDefinition.championshipEventId, championshipEventId))
		.orderBy(asc(schema.eventSessionDefinition.sequence));
}

async function sessionResults(
	tx: Transaction,
	weekendSessionId: string
): Promise<OfficialResultFact[]> {
	const rows = await tx
		.select({
			sessionResultId: schema.sessionResult.id,
			sessionEntryId: schema.sessionResult.sessionEntryId,
			driverId: schema.sessionEntry.driverId,
			teamSeasonEntryId: schema.eventEntry.teamSeasonEntryId,
			classificationPosition: schema.sessionResult.classificationPosition,
			classificationStatus: schema.sessionResult.classificationStatus,
			lapsCompleted: schema.sessionResult.lapsCompleted,
			bestLapMs: schema.sessionResult.bestLapMs,
			bestLapNumber: schema.sessionResult.bestLapNumber,
			totalTimeMs: schema.sessionResult.totalTimeMs,
			gapToLeaderMs: schema.sessionResult.gapToLeaderMs,
			lapsBehind: schema.sessionResult.lapsBehind,
			pitStops: schema.raceResultDetail.pitStops,
			lapsLed: schema.raceResultDetail.lapsLed,
			retirementReason: schema.raceResultDetail.retirementReason,
			positionsGained: schema.raceResultDetail.positionsGained
		})
		.from(schema.sessionResult)
		.innerJoin(schema.sessionEntry, eq(schema.sessionResult.sessionEntryId, schema.sessionEntry.id))
		.innerJoin(schema.eventEntry, eq(schema.sessionEntry.eventEntryId, schema.eventEntry.id))
		.leftJoin(
			schema.raceResultDetail,
			eq(schema.raceResultDetail.sessionResultId, schema.sessionResult.id)
		)
		.where(eq(schema.sessionResult.weekendSessionId, weekendSessionId))
		.orderBy(
			asc(schema.sessionResult.classificationPosition),
			asc(schema.sessionResult.sessionEntryId)
		);
	if (rows.length === 0) {
		throw new OfficialResultError(`Session has no persisted results: ${weekendSessionId}.`);
	}

	const awards = await tx
		.select({
			id: schema.sessionPointAward.id,
			sessionResultId: schema.sessionPointAward.sessionResultId,
			points: schema.sessionPointAward.points,
			awardKind: schema.sessionPointAward.awardKind
		})
		.from(schema.sessionPointAward)
		.innerJoin(
			schema.sessionResult,
			eq(schema.sessionPointAward.sessionResultId, schema.sessionResult.id)
		)
		.where(eq(schema.sessionResult.weekendSessionId, weekendSessionId));
	const awardsByResult = new Map<string, OfficialResultFact['pointAwards']>();
	for (const award of awards) {
		const resultAwards = awardsByResult.get(award.sessionResultId) ?? [];
		resultAwards.push({ id: award.id, points: award.points, awardKind: award.awardKind });
		awardsByResult.set(award.sessionResultId, resultAwards);
	}
	return rows.map((row) => ({
		sessionResultId: row.sessionResultId,
		sessionEntryId: row.sessionEntryId,
		driverId: row.driverId,
		teamSeasonEntryId: row.teamSeasonEntryId,
		classificationPosition: row.classificationPosition,
		classificationStatus: row.classificationStatus,
		lapsCompleted: row.lapsCompleted,
		bestLapMs: row.bestLapMs,
		bestLapNumber: row.bestLapNumber,
		totalTimeMs: row.totalTimeMs,
		gapToLeaderMs: row.gapToLeaderMs,
		lapsBehind: row.lapsBehind,
		pitStops: row.pitStops ?? 0,
		lapsLed: row.lapsLed ?? 0,
		retirementReason: row.retirementReason ?? null,
		positionsGained: row.positionsGained ?? 0,
		pointAwards: awardsByResult.get(row.sessionResultId) ?? []
	}));
}

export async function ensureOfficialWeekendResultPackage(
	tx: Transaction,
	options: {
		championshipEventId: string;
		executionDetail?: OfficialResultExecutionDetail;
		createdAt: string;
	}
): Promise<OfficialWeekendResultPackage> {
	const existing = await tx
		.select()
		.from(schema.officialWeekendResultPackage)
		.where(eq(schema.officialWeekendResultPackage.championshipEventId, options.championshipEventId))
		.limit(1);
	if (existing[0]) return toPackage(existing[0]);

	const eventRows = await tx
		.select({
			championshipEventId: schema.championshipEvent.id,
			championshipSeasonId: schema.championshipSeason.id
		})
		.from(schema.championshipEvent)
		.innerJoin(
			schema.championshipSeason,
			eq(schema.championshipEvent.championshipSeasonId, schema.championshipSeason.id)
		)
		.where(eq(schema.championshipEvent.id, options.championshipEventId))
		.limit(1);
	const event = eventRows[0];
	if (!event)
		throw new OfficialResultError(
			`Championship event was not found: ${options.championshipEventId}.`
		);

	const sessions = await sessionRows(tx, options.championshipEventId);
	if (sessions.length === 0) throw new OfficialResultError('Championship event has no sessions.');
	if (sessions.some((session) => session.status !== 'finished' || session.activeCheckpointId)) {
		throw new OfficialResultError('All event sessions must be finished with no active checkpoint.');
	}
	const inputHash = hashText(
		JSON.stringify(
			sessions.map((session) => ({
				weekendSessionId: session.weekendSessionId,
				sequence: session.sequence,
				simulationInputPayload: session.simulationInputPayload
			}))
		)
	);
	const formulaVersions = new Set(
		sessions.map((session) => versionFromInput(session.simulationInputPayload, 'formulaVersion'))
	);
	const engineVersions = new Set(
		sessions.map((session) => versionFromInput(session.simulationInputPayload, 'engineVersion'))
	);
	const formulaVersion = [...formulaVersions].sort().join('|');
	const engineVersion = [...engineVersions].sort().join('|');
	const payload: OfficialWeekendResultPayload = {
		schemaVersion: OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION,
		championshipEventId: event.championshipEventId,
		championshipSeasonId: event.championshipSeasonId,
		executionDetail: options.executionDetail ?? 'interactive',
		formulaVersion,
		engineVersion,
		inputHash,
		sessions: await Promise.all(
			sessions.map(async (session) => ({
				weekendSessionId: session.weekendSessionId,
				sequence: session.sequence,
				sessionKind: session.sessionKind,
				pointsSystemId: session.pointsSystemId,
				results: await sessionResults(tx, session.weekendSessionId)
			}))
		)
	};
	const payloadText = JSON.stringify(payload);
	const packageId = `${options.championshipEventId}:official-result`;
	await tx.insert(schema.officialWeekendResultPackage).values({
		id: packageId,
		championshipEventId: event.championshipEventId,
		championshipSeasonId: event.championshipSeasonId,
		packageSchemaVersion: OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION,
		executionDetail: payload.executionDetail,
		formulaVersion,
		engineVersion,
		inputHash,
		resultHash: hashText(payloadText),
		payload: payloadText,
		createdAt: options.createdAt
	});
	return {
		id: packageId,
		championshipEventId: event.championshipEventId,
		championshipSeasonId: event.championshipSeasonId,
		packageSchemaVersion: OFFICIAL_WEEKEND_RESULT_SCHEMA_VERSION,
		executionDetail: payload.executionDetail,
		formulaVersion,
		engineVersion,
		inputHash,
		resultHash: hashText(payloadText),
		createdAt: options.createdAt,
		payload
	};
}
