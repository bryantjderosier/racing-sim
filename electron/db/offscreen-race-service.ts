import { and, asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { RaceSimulation } from '../../src/lib/sim/core/engine.js';
import { hashString } from '../../src/lib/sim/core/hash.js';
import type { RaceInput, StrategyCommand } from '../../src/lib/sim/core/types.js';
import { materializeSessionInTransaction } from './race-input-materializer.js';
import { finalizeSessionInTransaction, type FinalizeSessionResult } from './result-repository.js';
import {
	settleChampionshipEventInTransaction,
	type WeekendSettlementResult
} from './settlement-service.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const OFFSCREEN_RACE_SCHEMA_VERSION = 'offscreen-race-v1';

export interface OffscreenSessionResult {
	weekendSessionId: string;
	status: 'resolved' | 'idempotent';
	finalization: FinalizeSessionResult;
}

export interface OffscreenWeekendResult {
	schemaVersion: typeof OFFSCREEN_RACE_SCHEMA_VERSION;
	championshipEventId: string;
	sessionsResolved: number;
	sessionsReplayed: number;
	sessions: OffscreenSessionResult[];
	settlement: WeekendSettlementResult;
}

export class OffscreenRaceError extends Error {
	readonly code = 'OFFSCREEN_RACE_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'OffscreenRaceError';
	}
}

interface SessionRow {
	eventSessionDefinitionId: string;
	weekendSessionId: string;
	sequence: number;
	status: string;
	activeCheckpointId: string | null;
	pointsSystemId: string | null;
}

function pitLap(input: RaceInput, entryId: string, stopIndex: number, stopCount: number): number {
	const spacing = Math.max(1, Math.floor(input.rules.lapCount / 12));
	const variation = parseInt(hashString(`${input.seed}:${entryId}:${stopIndex}`).slice(0, 4), 16);
	const offset = variation % spacing;
	const baseLap = Math.floor((input.rules.lapCount * (stopIndex + 1)) / (stopCount + 1));
	return Math.min(
		input.rules.lapCount - 1,
		Math.max(1, baseLap + offset - Math.floor(spacing / 2))
	);
}

function offscreenCommands(input: RaceInput): StrategyCommand[] {
	const pitSegment =
		input.track.segments.find((segment) => segment.isPitEntry)?.id ??
		input.track.segments[input.track.segments.length - 1]?.id;
	if (!pitSegment) throw new OffscreenRaceError('Off-screen strategy cannot find a pit segment.');

	const commands: StrategyCommand[] = [];
	for (const entry of input.entries) {
		let previousLap = 0;
		for (let stopIndex = 0; stopIndex < input.rules.mandatoryPitStops; stopIndex += 1) {
			const lap = Math.max(
				previousLap + 1,
				pitLap(input, entry.sessionEntryId, stopIndex, input.rules.mandatoryPitStops)
			);
			if (lap >= input.rules.lapCount) {
				throw new OffscreenRaceError(
					`Off-screen strategy cannot schedule pit stop ${stopIndex + 1} for ${entry.sessionEntryId}.`
				);
			}
			const alternateTyreSets = entry.tyreSets.filter((set) => set.id !== entry.startingTyreSetId);
			const tyreSet = alternateTyreSets[stopIndex % alternateTyreSets.length];
			if (!tyreSet) {
				throw new OffscreenRaceError(`No alternate tyre set exists for ${entry.sessionEntryId}.`);
			}
			commands.push({
				sequence: commands.length + 1,
				sessionEntryId: entry.sessionEntryId,
				triggerLap: lap,
				triggerSegmentId: pitSegment,
				action: { type: 'pit', tyreSetId: tyreSet.id }
			});
			previousLap = lap;
		}
	}
	return commands;
}

async function eventSessions(tx: Transaction, championshipEventId: string): Promise<SessionRow[]> {
	return tx
		.select({
			eventSessionDefinitionId: schema.eventSessionDefinition.id,
			weekendSessionId: schema.weekendSession.id,
			sequence: schema.eventSessionDefinition.sequence,
			status: schema.weekendSession.status,
			activeCheckpointId: schema.weekendSession.activeCheckpointId,
			pointsSystemId: schema.eventSessionDefinition.pointsSystemId
		})
		.from(schema.eventSessionDefinition)
		.innerJoin(
			schema.weekendSession,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.where(eq(schema.eventSessionDefinition.championshipEventId, championshipEventId))
		.orderBy(asc(schema.eventSessionDefinition.sequence));
}

async function assertNonPlayerEvent(tx: Transaction, championshipEventId: string): Promise<void> {
	const saves = await tx
		.select({ playerTeamId: schema.saveGame.playerTeamId })
		.from(schema.saveGame)
		.limit(1);
	const playerTeamId = saves[0]?.playerTeamId;
	if (!playerTeamId) throw new OffscreenRaceError('Save metadata has no player team.');
	const playerEntries = await tx
		.select({ eventEntryId: schema.eventEntry.id })
		.from(schema.eventEntry)
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.eventEntry.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.where(
			and(
				eq(schema.eventEntry.championshipEventId, championshipEventId),
				eq(schema.teamSeasonEntry.teamId, playerTeamId)
			)
		);
	if (playerEntries.length > 0) {
		throw new OffscreenRaceError('The player team cannot be resolved as an off-screen weekend.');
	}
}

export async function runOffscreenChampionshipEventInTransaction(
	tx: Transaction,
	championshipEventId: string,
	options: { now: string; advanceCalendar?: boolean }
): Promise<OffscreenWeekendResult> {
	await assertNonPlayerEvent(tx, championshipEventId);
	const sessions = await eventSessions(tx, championshipEventId);
	if (sessions.length === 0) throw new OffscreenRaceError('Championship event has no sessions.');

	const resolvedSessions: OffscreenSessionResult[] = [];
	for (const session of sessions) {
		if (session.status === 'finished') {
			resolvedSessions.push({
				weekendSessionId: session.weekendSessionId,
				status: 'idempotent',
				finalization: {
					idempotent: true,
					sessionResultIds: {},
					persistedEventCount: 0
				}
			});
			continue;
		}
		if (session.status !== 'scheduled' || session.activeCheckpointId) {
			throw new OffscreenRaceError(
				`Off-screen session is not an unstarted scheduled session: ${session.weekendSessionId}.`
			);
		}
		const materialized = await materializeSessionInTransaction(
			tx,
			session.eventSessionDefinitionId,
			{ inputTransform: (input) => ({ ...input, commands: offscreenCommands(input) }) }
		);
		const result = new RaceSimulation(materialized.input).run();
		const finalization = await finalizeSessionInTransaction(tx, result, {
			weekendSessionId: session.weekendSessionId,
			pointsSystemId: session.pointsSystemId,
			finalizedAt: options.now
		});
		resolvedSessions.push({
			weekendSessionId: session.weekendSessionId,
			status: finalization.idempotent ? 'idempotent' : 'resolved',
			finalization
		});
	}

	const settlement = await settleChampionshipEventInTransaction(tx, championshipEventId, {
		settledAt: options.now,
		executionDetail: 'off_screen',
		advanceCalendar: options.advanceCalendar ?? true
	});
	return {
		schemaVersion: OFFSCREEN_RACE_SCHEMA_VERSION,
		championshipEventId,
		sessionsResolved: resolvedSessions.filter((session) => session.status === 'resolved').length,
		sessionsReplayed: resolvedSessions.filter((session) => session.status === 'idempotent').length,
		sessions: resolvedSessions,
		settlement
	};
}

export async function runOffscreenChampionshipEvent(
	db: Database,
	championshipEventId: string,
	options: { now?: string; advanceCalendar?: boolean } = {}
): Promise<OffscreenWeekendResult> {
	return db.transaction((tx) =>
		runOffscreenChampionshipEventInTransaction(tx, championshipEventId, {
			now: options.now ?? new Date().toISOString(),
			advanceCalendar: options.advanceCalendar
		})
	);
}
