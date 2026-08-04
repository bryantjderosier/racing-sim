import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { RaceInput, SimulationSnapshot } from '../../src/lib/sim/core/types.js';
import { validateRaceInput } from '../../src/lib/sim/core/validate.js';
import {
	type ResolvedSessionDefinition,
	type SessionDefinitionResolver
} from './session-factory.js';
import type { SessionOrchestratorOptions } from './session-orchestrator.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type SessionInputWriter = Pick<Database, 'update'> | Pick<Transaction, 'update'>;

export const SESSION_INPUT_SCHEMA_VERSION = 'race-input-v1';

export class SessionInputResolverError extends Error {
	readonly code = 'MIGRATION_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'SessionInputResolverError';
	}
}

interface SessionRow {
	weekendSessionId: string;
	status: string;
	inputPayload: string;
	inputSchemaVersion: string;
	pointsSystemId: string | null;
}

function encodeInput(input: RaceInput): string {
	try {
		return JSON.stringify(input);
	} catch (error) {
		throw new SessionInputResolverError(
			`Race input is not serializable: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

function decodeInput(row: SessionRow): RaceInput {
	if (row.inputSchemaVersion !== SESSION_INPUT_SCHEMA_VERSION) {
		throw new SessionInputResolverError(
			`Unsupported race input schema version: ${row.inputSchemaVersion}.`
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(row.inputPayload);
	} catch (error) {
		throw new SessionInputResolverError(
			`Race input JSON is invalid: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (!parsed || typeof parsed !== 'object') {
		throw new SessionInputResolverError('Race input payload must be an object.');
	}
	try {
		validateRaceInput(parsed as RaceInput);
	} catch (error) {
		throw new SessionInputResolverError(
			`Race input validation failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	return structuredClone(parsed) as RaceInput;
}

function sessionPriority(status: string): number {
	if (status === 'live' || status === 'paused') return 0;
	if (status === 'scheduled') return 1;
	return 2;
}

function checkpointContextFactory(
	input: RaceInput,
	weekendSessionId: string,
	clock: () => string
): SessionOrchestratorOptions['checkpointContext'] {
	return (snapshot: SimulationSnapshot, reason, checkpointSeq) => {
		const segmentIndex = snapshot.step % input.track.segments.length;
		const segment = input.track.segments[segmentIndex];
		const currentLap = Math.min(
			input.rules.lapCount,
			Math.floor(snapshot.step / input.track.segments.length) + 1
		);
		const phase = reason === 'start' ? 'pre_start' : reason === 'finish' ? 'chequered' : 'green';
		const leader = [...snapshot.states].sort(
			(left, right) =>
				left.elapsedMs - right.elapsedMs || left.sessionEntryId.localeCompare(right.sessionEntryId)
		)[0];
		return {
			weekendSessionId,
			checkpointSeq,
			simClockMs: Math.max(0, ...snapshot.states.map((state) => state.elapsedMs)),
			rngAlgorithm: 'xoshiro128ss',
			phase,
			safetyCarState: { payload: { active: false }, schemaVersion: 'safety-v1' },
			...(snapshot.weatherState ? { weatherStateSchemaVersion: 'weather-v1' } : {}),
			...(snapshot.strategyControllerState ? { strategyStateSchemaVersion: 'strategy-v1' } : {}),
			resumeStateSchemaVersion: 'resume-v1',
			simulationStateSchemaVersion: 'simulation-v1',
			leaderSessionEntryId: leader?.sessionEntryId ?? null,
			checkpointedAt: clock(),
			carContexts: Object.fromEntries(
				snapshot.states.map((state) => [
					state.sessionEntryId,
					{
						currentLap,
						sectorIndex: segment?.officialSector ?? 1,
						waypointProgress: 0,
						racePosition: state.gridPosition,
						gapToLeaderMs: 0,
						intervalAheadMs: 0,
						lastSectorTimeMs: null,
						sectorTimesMs: [],
						pitPhase: 'on_track' as const,
						pitPhaseElapsedMs: 0,
						ersChargePercent: 100,
						penalty: {},
						penaltySchemaVersion: 'penalty-v1',
						retirementState: state.finished ? ('stopped' as const) : ('running' as const),
						retirementReason: null
					}
				])
			)
		};
	};
}

export function createPersistedSessionDefinitionResolver(
	options: {
		clock?: () => string;
	} = {}
): SessionDefinitionResolver {
	const clock = options.clock ?? (() => new Date().toISOString());
	return async (db: Database): Promise<ResolvedSessionDefinition | null> => {
		const rows = await db
			.select({
				weekendSessionId: schema.weekendSession.id,
				status: schema.weekendSession.status,
				inputPayload: schema.weekendSession.simulationInputPayload,
				inputSchemaVersion: schema.weekendSession.simulationInputSchemaVersion,
				pointsSystemId: schema.eventSessionDefinition.pointsSystemId
			})
			.from(schema.weekendSession)
			.innerJoin(
				schema.eventSessionDefinition,
				eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
			)
			.orderBy(asc(schema.eventSessionDefinition.scheduledStart));
		const row = rows
			.filter((candidate) => ['live', 'paused', 'scheduled'].includes(candidate.status))
			.sort((left, right) => sessionPriority(left.status) - sessionPriority(right.status))[0];
		if (!row) return null;
		const input = decodeInput(row);
		return {
			input,
			options: {
				weekendSessionId: row.weekendSessionId,
				pointsSystemId: row.pointsSystemId,
				clock,
				checkpointContext: checkpointContextFactory(input, row.weekendSessionId, clock)
			}
		};
	};
}

export async function persistSessionInput(
	db: SessionInputWriter,
	weekendSessionId: string,
	input: RaceInput,
	schemaVersion = SESSION_INPUT_SCHEMA_VERSION
): Promise<void> {
	if (schemaVersion !== SESSION_INPUT_SCHEMA_VERSION) {
		throw new SessionInputResolverError(`Unsupported race input schema version: ${schemaVersion}.`);
	}
	try {
		validateRaceInput(input);
	} catch (error) {
		throw new SessionInputResolverError(
			`Race input validation failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	const encodedInput = encodeInput(input);
	const result = await db
		.update(schema.weekendSession)
		.set({
			simulationInputPayload: encodedInput,
			simulationInputSchemaVersion: schemaVersion
		})
		.where(
			and(
				eq(schema.weekendSession.id, weekendSessionId),
				eq(schema.weekendSession.status, 'scheduled'),
				isNull(schema.weekendSession.activeCheckpointId),
				or(
					eq(schema.weekendSession.simulationInputPayload, '{}'),
					and(
						eq(schema.weekendSession.simulationInputPayload, encodedInput),
						eq(schema.weekendSession.simulationInputSchemaVersion, schemaVersion)
					)
				)
			)
		);
	if (result.rowsAffected !== 1) {
		throw new SessionInputResolverError(
			`Weekend session is missing, already started, or has a different simulation input: ${weekendSessionId}.`
		);
	}
}
