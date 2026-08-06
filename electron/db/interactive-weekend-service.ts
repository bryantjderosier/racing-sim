import { and, asc, eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { RaceInput, StrategyCommand } from '../../src/lib/sim/core/types.js';
import { materializeSessionInTransaction } from './race-input-materializer.js';
import { readCheckpoint } from './checkpoint-repository.js';
import { createPersistedSessionDefinitionResolver } from './session-input-resolver.js';
import {
	SessionOrchestrator,
	type SessionStepResult
} from './session-orchestrator.js';
import { getSessionResults } from './read-models.js';
import {
	settleChampionshipEvent,
	type WeekendSettlementResult
} from './settlement-service.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type QueryDatabase = Database | Transaction;

export type InteractiveWeekendSessionStatus = 'scheduled' | 'live' | 'paused' | 'finished';

export type InteractiveSessionInputTransform = (
	input: RaceInput,
	sessionKind: string
) => RaceInput;

export interface InteractiveWeekendSessionState {
	weekendSessionId: string;
	eventSessionDefinitionId: string;
	sequence: number;
	sessionKind: string;
	status: InteractiveWeekendSessionStatus;
	scheduledStart: string;
	scheduledLaps: number | null;
	scheduledMinutes: number | null;
	pointsSystemId: string | null;
	hasCheckpoint: boolean;
	resultCount: number;
}

export interface InteractiveWeekendState {
	championshipEventId: string;
	championshipSeasonId: string;
	eventName: string;
	roundNumber: number;
	startDate: string;
	worldDate: string;
	currentSessionId: string | null;
	nextSessionId: string | null;
	settled: boolean;
	complete: boolean;
	sessions: InteractiveWeekendSessionState[];
}

export interface InteractiveWeekendCommandResult {
	state: InteractiveWeekendState;
	sessionStep: SessionStepResult | null;
	settlement: WeekendSettlementResult | null;
}

export interface InteractiveWeekendRunResult {
	state: InteractiveWeekendState;
	sessions: Array<{
		weekendSessionId: string;
		sessionKind: string;
		steps: number;
	}>;
	settlement: WeekendSettlementResult | null;
}

export class InteractiveWeekendError extends Error {
	readonly code:
		| 'INVALID_COMMAND'
		| 'CONFLICT'
		| 'WEEKEND_NOT_FOUND'
		| 'PLAYER_ENTRY_REQUIRED'
		| 'SESSION_NOT_READY';

	constructor(
		message: string,
		code: InteractiveWeekendError['code'] = 'INVALID_COMMAND'
	) {
		super(message);
		this.name = 'InteractiveWeekendError';
		this.code = code;
	}
}

interface EventRow {
	championshipEventId: string;
	championshipSeasonId: string;
	eventName: string;
	roundNumber: number;
	startDate: string;
}

interface SessionRow {
	weekendSessionId: string;
	eventSessionDefinitionId: string;
	sequence: number;
	sessionKind: string;
	status: string;
	scheduledStart: string;
	scheduledLaps: number | null;
	scheduledMinutes: number | null;
	pointsSystemId: string | null;
	activeCheckpointId: string | null;
}

function sessionStatus(status: string): InteractiveWeekendSessionStatus {
	if (status === 'scheduled' || status === 'live' || status === 'paused' || status === 'finished') {
		return status;
	}
	throw new InteractiveWeekendError(`Unsupported weekend session status: ${status}.`);
}

async function eventRow(db: QueryDatabase, championshipEventId: string): Promise<EventRow> {
	const rows = await db
		.select({
			championshipEventId: schema.championshipEvent.id,
			championshipSeasonId: schema.championshipSeason.id,
			eventName: schema.championshipEvent.name,
			roundNumber: schema.championshipEvent.roundNumber,
			startDate: schema.championshipEvent.startDate
		})
		.from(schema.championshipEvent)
		.innerJoin(
			schema.championshipSeason,
			eq(schema.championshipEvent.championshipSeasonId, schema.championshipSeason.id)
		)
		.where(eq(schema.championshipEvent.id, championshipEventId))
		.limit(1);
	const event = rows[0];
	if (!event) {
		throw new InteractiveWeekendError(
			`Championship event was not found: ${championshipEventId}.`,
			'WEEKEND_NOT_FOUND'
		);
	}
	return event;
}

async function sessionRows(
	db: QueryDatabase,
	championshipEventId: string
): Promise<SessionRow[]> {
	return db
		.select({
			weekendSessionId: schema.weekendSession.id,
			eventSessionDefinitionId: schema.eventSessionDefinition.id,
			sequence: schema.eventSessionDefinition.sequence,
			sessionKind: schema.eventSessionDefinition.sessionKind,
			status: schema.weekendSession.status,
			scheduledStart: schema.eventSessionDefinition.scheduledStart,
			scheduledLaps: schema.eventSessionDefinition.scheduledLaps,
			scheduledMinutes: schema.eventSessionDefinition.scheduledMinutes,
			pointsSystemId: schema.eventSessionDefinition.pointsSystemId,
			activeCheckpointId: schema.weekendSession.activeCheckpointId
		})
		.from(schema.eventSessionDefinition)
		.innerJoin(
			schema.weekendSession,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(eq(schema.eventSessionDefinition.championshipEventId, championshipEventId))
		.orderBy(asc(schema.eventSessionDefinition.sequence));
}

async function requirePlayerEntry(
	db: QueryDatabase,
	championshipEventId: string,
	worldDate: string
): Promise<void> {
	const saves = await db
		.select({ playerTeamId: schema.saveGame.playerTeamId })
		.from(schema.saveGame)
		.limit(1);
	const save = saves[0];
	if (!save?.playerTeamId) {
		throw new InteractiveWeekendError(
			'An interactive weekend requires a player team.',
			'PLAYER_ENTRY_REQUIRED'
		);
	}
	const entries = await db
		.select({ id: schema.eventEntry.id })
		.from(schema.eventEntry)
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.eventEntry.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.where(
			and(
				eq(schema.eventEntry.championshipEventId, championshipEventId),
				eq(schema.teamSeasonEntry.teamId, save.playerTeamId)
			)
		)
		.limit(1);
	if (entries.length === 0) {
		throw new InteractiveWeekendError(
			`Player team is not entered in ${championshipEventId}.`,
			'PLAYER_ENTRY_REQUIRED'
		);
	}
	if (worldDate < (await eventRow(db, championshipEventId)).startDate) {
		throw new InteractiveWeekendError(
			`The weekend cannot start before its event date: ${worldDate}.`,
			'CONFLICT'
		);
	}
}

async function requireNoOtherActiveWeekend(
	db: QueryDatabase,
	championshipEventId: string
): Promise<void> {
	const active = await db
		.select({
			championshipEventId: schema.championshipEvent.id,
			eventName: schema.championshipEvent.name
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
		.where(
			or(eq(schema.weekendSession.status, 'live'), eq(schema.weekendSession.status, 'paused'))
		)
		.limit(1);
	const other = active[0];
	if (other && other.championshipEventId !== championshipEventId) {
		throw new InteractiveWeekendError(
			`Another race weekend is active: ${other.eventName}.`,
			'CONFLICT'
		);
	}
}

async function stateFromRows(
	db: QueryDatabase,
	event: EventRow,
	rows: SessionRow[]
): Promise<InteractiveWeekendState> {
	const resultRows = await db
		.select({ weekendSessionId: schema.sessionResult.weekendSessionId })
		.from(schema.sessionResult);
	const resultCounts = new Map<string, number>();
	for (const result of resultRows) {
		resultCounts.set(
			result.weekendSessionId,
			(resultCounts.get(result.weekendSessionId) ?? 0) + 1
		);
	}
	const settlement = await db
		.select({ id: schema.championshipWeekendSettlement.id })
		.from(schema.championshipWeekendSettlement)
		.where(eq(schema.championshipWeekendSettlement.championshipEventId, event.championshipEventId))
		.limit(1);
	const sessions = rows.map((row) => ({
		weekendSessionId: row.weekendSessionId,
		eventSessionDefinitionId: row.eventSessionDefinitionId,
		sequence: row.sequence,
		sessionKind: row.sessionKind,
		status: sessionStatus(row.status),
		scheduledStart: row.scheduledStart,
		scheduledLaps: row.scheduledLaps,
		scheduledMinutes: row.scheduledMinutes,
		pointsSystemId: row.pointsSystemId,
		hasCheckpoint: row.activeCheckpointId !== null,
		resultCount: resultCounts.get(row.weekendSessionId) ?? 0
	}));
	const active = sessions.find(
		(session) => session.status === 'live' || session.status === 'paused'
	);
	const next = active ?? sessions.find((session) => session.status === 'scheduled');
	return {
		championshipEventId: event.championshipEventId,
		championshipSeasonId: event.championshipSeasonId,
		eventName: event.eventName,
		roundNumber: event.roundNumber,
		startDate: event.startDate,
		worldDate: (
			await db.select({ worldDate: schema.saveGame.worldDate }).from(schema.saveGame).limit(1)
		)[0]?.worldDate ?? event.startDate,
		currentSessionId: active?.weekendSessionId ?? null,
		nextSessionId: next?.weekendSessionId ?? null,
		settled: settlement.length > 0,
		complete: sessions.length > 0 && sessions.every((session) => session.status === 'finished'),
		sessions
	};
}

export async function getInteractiveWeekendState(
	db: Database,
	championshipEventId: string
): Promise<InteractiveWeekendState> {
	const event = await eventRow(db, championshipEventId);
	return stateFromRows(db, event, await sessionRows(db, championshipEventId));
}

async function materializeNextSessionInTransaction(
	tx: Transaction,
	championshipEventId: string,
	inputTransform?: InteractiveSessionInputTransform
): Promise<void> {
	const event = await eventRow(tx, championshipEventId);
	const state = await stateFromRows(tx, event, await sessionRows(tx, championshipEventId));
	if (state.settled || state.currentSessionId) return;
	const next = state.sessions.find((session) => session.status === 'scheduled');
	if (!next) return;
	const previous = state.sessions.find((session) => session.sequence < next.sequence);
	if (previous && previous.status !== 'finished') {
		throw new InteractiveWeekendError(
			`Session ${next.sessionKind} cannot start before ${previous.sessionKind} is finished.`,
			'SESSION_NOT_READY'
		);
	}
	await materializeSessionInTransaction(tx, next.eventSessionDefinitionId, {
		inputTransform: inputTransform
			? (input) => inputTransform(input, next.sessionKind)
			: undefined
	});
}

export async function startInteractiveWeekend(
	db: Database,
	championshipEventId: string,
	options: { inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<InteractiveWeekendState> {
	await requireNoOtherActiveWeekend(db, championshipEventId);
	const save = (await db.select().from(schema.saveGame).limit(1))[0];
	if (!save) throw new InteractiveWeekendError('Save metadata is missing.', 'CONFLICT');
	await requirePlayerEntry(db, championshipEventId, save.worldDate);
	await db.transaction((tx) =>
		materializeNextSessionInTransaction(tx, championshipEventId, options.inputTransform)
	);
	return getInteractiveWeekendState(db, championshipEventId);
}

async function openCurrentSession(
	db: Database,
	championshipEventId: string,
	options: { now: string; activate: boolean; inputTransform?: InteractiveSessionInputTransform }
): Promise<{ orchestrator: SessionOrchestrator; sessionId: string }> {
	const state = await startInteractiveWeekend(db, championshipEventId, {
		inputTransform: options.inputTransform
	});
	const targetSessionId = state.currentSessionId ?? state.nextSessionId;
	if (!targetSessionId) {
		throw new InteractiveWeekendError(
			'No scheduled or active interactive session remains.',
			'SESSION_NOT_READY'
		);
	}
	const resolver = createPersistedSessionDefinitionResolver({
		eventId: championshipEventId,
		weekendSessionId: targetSessionId,
		clock: () => options.now
	});
	const definition = await resolver(db);
	if (!definition) {
		throw new InteractiveWeekendError(
			'No scheduled or active interactive session remains.',
			'SESSION_NOT_READY'
		);
	}
	const checkpoint = await readCheckpoint(db, definition.options.weekendSessionId);
	const current = state.sessions.find(
		(session) => session.weekendSessionId === definition.options.weekendSessionId
	);
	if (!checkpoint && current?.status !== 'scheduled') {
		throw new InteractiveWeekendError(
			'An active session is missing its checkpoint and cannot be resumed safely.',
			'SESSION_NOT_READY'
		);
	}
	const orchestrator = checkpoint
		? await SessionOrchestrator.resume(db, definition.input, definition.options)
		: new SessionOrchestrator(db, definition.input, definition.options);
	if (options.activate) {
		if (orchestrator.status === 'idle') await orchestrator.start();
		if (orchestrator.status === 'paused') await orchestrator.resume();
	}
	return { orchestrator, sessionId: definition.options.weekendSessionId };
}

async function settleIfComplete(
	db: Database,
	championshipEventId: string,
	now: string
): Promise<WeekendSettlementResult | null> {
	const state = await getInteractiveWeekendState(db, championshipEventId);
	if (!state.complete) return null;
	return settleChampionshipEvent(db, championshipEventId, {
		settledAt: now,
		executionDetail: 'interactive'
	});
}

export async function startInteractiveSession(
	db: Database,
	championshipEventId: string,
	options: { now?: string; inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<InteractiveWeekendState> {
	await openCurrentSession(db, championshipEventId, {
		now: options.now ?? new Date().toISOString(),
		activate: true,
		inputTransform: options.inputTransform
	});
	return getInteractiveWeekendState(db, championshipEventId);
}

export async function advanceInteractiveSession(
	db: Database,
	championshipEventId: string,
	options: {
		steps?: number;
		now?: string;
		inputTransform?: InteractiveSessionInputTransform;
	} = {}
): Promise<InteractiveWeekendCommandResult> {
	const now = options.now ?? new Date().toISOString();
	const steps = options.steps ?? 1;
	if (!Number.isInteger(steps) || steps < 1) {
		throw new InteractiveWeekendError('steps must be a positive integer.');
	}
	const { orchestrator } = await openCurrentSession(db, championshipEventId, {
		now,
		activate: true,
		inputTransform: options.inputTransform
	});
	let sessionStep: SessionStepResult | null = null;
	for (let index = 0; index < steps; index += 1) {
		sessionStep = await orchestrator.step();
		if (sessionStep.completed) break;
	}
	const settlement = sessionStep?.completed
		? await settleIfComplete(db, championshipEventId, now)
		: null;
	return {
		state: await getInteractiveWeekendState(db, championshipEventId),
		sessionStep,
		settlement
	};
}

export async function pauseInteractiveSession(
	db: Database,
	championshipEventId: string,
	options: { now?: string; inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<InteractiveWeekendState> {
	const now = options.now ?? new Date().toISOString();
	const { orchestrator } = await openCurrentSession(db, championshipEventId, {
		now,
		activate: false,
		inputTransform: options.inputTransform
	});
	if (orchestrator.status === 'paused') return getInteractiveWeekendState(db, championshipEventId);
	if (orchestrator.status !== 'live') {
		throw new InteractiveWeekendError('Only a live session can be paused.', 'SESSION_NOT_READY');
	}
	await orchestrator.pause();
	return getInteractiveWeekendState(db, championshipEventId);
}

export async function resumeInteractiveSession(
	db: Database,
	championshipEventId: string,
	options: { now?: string; inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<InteractiveWeekendState> {
	await openCurrentSession(db, championshipEventId, {
		now: options.now ?? new Date().toISOString(),
		activate: true,
		inputTransform: options.inputTransform
	});
	return getInteractiveWeekendState(db, championshipEventId);
}

export async function issueInteractiveStrategyCommand(
	db: Database,
	championshipEventId: string,
	command: StrategyCommand,
	options: { now?: string; inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<{ accepted: boolean; state: InteractiveWeekendState }> {
	const { orchestrator } = await openCurrentSession(db, championshipEventId, {
		now: options.now ?? new Date().toISOString(),
		activate: true,
		inputTransform: options.inputTransform
	});
	const accepted = await orchestrator.issueStrategy(command);
	return { accepted, state: await getInteractiveWeekendState(db, championshipEventId) };
}

export async function runInteractiveWeekend(
	db: Database,
	championshipEventId: string,
	options: { now?: string; inputTransform?: InteractiveSessionInputTransform } = {}
): Promise<InteractiveWeekendRunResult> {
	const now = options.now ?? new Date().toISOString();
	const sessions: InteractiveWeekendRunResult['sessions'] = [];
	let settlement: WeekendSettlementResult | null = null;
	while (true) {
		const state = await startInteractiveWeekend(db, championshipEventId, {
			inputTransform: options.inputTransform
		});
		if (state.complete) {
			settlement = await settleIfComplete(db, championshipEventId, now);
			break;
		}
		const { orchestrator, sessionId } = await openCurrentSession(db, championshipEventId, {
			now,
			activate: true,
			inputTransform: options.inputTransform
		});
		let steps = 0;
		let result: SessionStepResult;
		do {
			result = await orchestrator.step();
			steps += 1;
		} while (!result.completed);
		const session = state.sessions.find((candidate) => candidate.weekendSessionId === sessionId);
		sessions.push({
			weekendSessionId: sessionId,
			sessionKind: session?.sessionKind ?? 'unknown',
			steps
		});
		settlement = await settleIfComplete(db, championshipEventId, now);
		if (settlement) break;
	}
	return {
		state: await getInteractiveWeekendState(db, championshipEventId),
		sessions,
		settlement
	};
}

export async function getInteractiveWeekendResults(
	db: Database,
	championshipEventId: string
): Promise<
	Array<{
		session: InteractiveWeekendSessionState;
		results: Awaited<ReturnType<typeof getSessionResults>>;
	}>
> {
	const state = await getInteractiveWeekendState(db, championshipEventId);
	return Promise.all(
		state.sessions
			.filter((session) => session.resultCount > 0)
			.map(async (session) => ({
				session,
				results: await getSessionResults(db, session.weekendSessionId)
			}))
	);
}
