import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type CheckpointPhase =
	'pre_start' | 'green' | 'safety_car' | 'vsc' | 'red_flag' | 'chequered' | 'ended';

export type CheckpointPitPhase = 'on_track' | 'pit_entry' | 'pit_box' | 'pit_exit';
export type CheckpointRetirementState = 'running' | 'retired' | 'stopped';
export type CheckpointEngineMode = 'conserve' | 'balanced' | 'attack';

export interface CheckpointCarState {
	sessionEntryId: string;
	currentLap: number;
	sectorIndex: number;
	waypointProgress: number;
	racePosition: number;
	gapToLeaderMs: number;
	intervalAheadMs: number;
	currentLapTimeMs: number;
	lastSectorTimeMs: number | null;
	sectorTimesMs: readonly number[];
	pitPhase: CheckpointPitPhase;
	pitPhaseElapsedMs: number;
	fuelKg: number;
	mountedTyreSetId: string | null;
	ersChargePercent: number;
	engineMode: CheckpointEngineMode;
	pitStopsCompleted: number;
	penalty: unknown;
	penaltySchemaVersion: string;
	simulationState: CheckpointPayload<unknown>;
	retirementState: CheckpointRetirementState;
	retirementReason: string | null;
}

export interface CheckpointPayload<T> {
	payload: T;
	schemaVersion: string;
}

export interface CheckpointWrite {
	checkpointId?: string;
	weekendSessionId: string;
	checkpointSeq: number;
	simClockMs: number;
	rngAlgorithm: string;
	rngStates: Record<string, unknown>;
	phase: CheckpointPhase;
	safetyCarState: CheckpointPayload<unknown>;
	weatherState?: CheckpointPayload<unknown>;
	strategyState?: CheckpointPayload<unknown>;
	resumeState: CheckpointPayload<unknown>;
	leaderSessionEntryId: string | null;
	checkpointedAt: string;
	cars: readonly CheckpointCarState[];
}

export interface CheckpointRecord extends Omit<CheckpointWrite, 'checkpointId'> {
	checkpointId: string;
}

export class CheckpointSequenceError extends Error {
	readonly code = 'CHECKPOINT_SEQUENCE_INVALID' as const;

	constructor(existing: number, requested: number) {
		super(`Checkpoint sequence must increase from ${existing}; received ${requested}.`);
		this.name = 'CheckpointSequenceError';
	}
}

export class CheckpointPayloadError extends Error {
	readonly code = 'CHECKPOINT_PAYLOAD_INVALID' as const;

	constructor(message: string) {
		super(message);
		this.name = 'CheckpointPayloadError';
	}
}

function encodeJson(value: unknown): string {
	try {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) throw new Error('value is undefined');
		return serialized;
	} catch (error) {
		throw new CheckpointPayloadError(
			`Checkpoint payload is not serializable: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

function encodeBlob(value: unknown): Buffer {
	return Buffer.from(encodeJson(value), 'utf8');
}

function decodeJson<T>(value: string): T {
	try {
		return JSON.parse(value) as T;
	} catch (error) {
		throw new CheckpointPayloadError(
			`Checkpoint JSON is invalid: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

function decodeBlob<T>(value: Buffer | Uint8Array): T {
	return decodeJson<T>(Buffer.from(value).toString('utf8'));
}

function validateCheckpoint(input: CheckpointWrite) {
	if (input.checkpointSeq < 1)
		throw new CheckpointPayloadError('Checkpoint sequence must be positive.');
	if (input.simClockMs < 0)
		throw new CheckpointPayloadError('Checkpoint clock cannot be negative.');
	if (!input.safetyCarState.schemaVersion) {
		throw new CheckpointPayloadError('Safety-car state schema version is required.');
	}
	if (input.weatherState && !input.weatherState.schemaVersion) {
		throw new CheckpointPayloadError('Weather state schema version is required.');
	}
	if (input.strategyState && !input.strategyState.schemaVersion) {
		throw new CheckpointPayloadError('Strategy state schema version is required.');
	}
	if (!input.resumeState.schemaVersion) {
		throw new CheckpointPayloadError('Resume state schema version is required.');
	}
	const entryIds = new Set<string>();
	for (const car of input.cars) {
		if (entryIds.has(car.sessionEntryId)) {
			throw new CheckpointPayloadError(`Duplicate checkpoint car: ${car.sessionEntryId}.`);
		}
		if (car.waypointProgress < 0 || car.waypointProgress > 1) {
			throw new CheckpointPayloadError(
				`Waypoint progress is out of range for ${car.sessionEntryId}.`
			);
		}
		entryIds.add(car.sessionEntryId);
	}
}

function childRow(checkpointId: string, car: CheckpointCarState) {
	return {
		id: randomUUID(),
		checkpointId,
		sessionEntryId: car.sessionEntryId,
		currentLap: car.currentLap,
		sectorIndex: car.sectorIndex,
		waypointProgress: car.waypointProgress,
		racePosition: car.racePosition,
		gapToLeaderMs: car.gapToLeaderMs,
		intervalAheadMs: car.intervalAheadMs,
		currentLapTimeMs: car.currentLapTimeMs,
		lastSectorTimeMs: car.lastSectorTimeMs,
		sectorTimesMsPayload: encodeJson(car.sectorTimesMs),
		sectorTimesSchemaVersion: 'checkpoint-sector-times-v1',
		pitPhase: car.pitPhase,
		pitPhaseElapsedMs: car.pitPhaseElapsedMs,
		fuelKg: car.fuelKg,
		mountedTyreSetId: car.mountedTyreSetId,
		ersChargePercent: car.ersChargePercent,
		engineMode: car.engineMode,
		pitStopsCompleted: car.pitStopsCompleted,
		penaltyPayload: encodeJson(car.penalty),
		penaltySchemaVersion: car.penaltySchemaVersion,
		simulationStatePayload: encodeJson(car.simulationState.payload),
		simulationStateSchemaVersion: car.simulationState.schemaVersion,
		retirementState: car.retirementState,
		retirementReason: car.retirementReason
	};
}

export async function writeCheckpoint(
	db: Database,
	input: CheckpointWrite
): Promise<CheckpointRecord> {
	validateCheckpoint(input);
	return db.transaction(async (tx) => writeCheckpointTransaction(tx, input));
}

async function writeCheckpointTransaction(
	tx: Transaction,
	input: CheckpointWrite
): Promise<CheckpointRecord> {
	const existing = await tx
		.select({
			id: schema.sessionCheckpoint.id,
			checkpointSeq: schema.sessionCheckpoint.checkpointSeq
		})
		.from(schema.sessionCheckpoint)
		.where(eq(schema.sessionCheckpoint.weekendSessionId, input.weekendSessionId))
		.limit(1);
	const current = existing[0];
	if (current && input.checkpointSeq <= current.checkpointSeq) {
		throw new CheckpointSequenceError(current.checkpointSeq, input.checkpointSeq);
	}
	const checkpointId = current?.id ?? input.checkpointId ?? randomUUID();
	const header = {
		weekendSessionId: input.weekendSessionId,
		checkpointSeq: input.checkpointSeq,
		simClockMs: input.simClockMs,
		rngAlgorithm: input.rngAlgorithm,
		rngState: encodeBlob(input.rngStates),
		phase: input.phase,
		safetyCarStatePayload: encodeJson(input.safetyCarState.payload),
		safetyCarStateSchemaVersion: input.safetyCarState.schemaVersion,
		weatherStatePayload: input.weatherState ? encodeJson(input.weatherState.payload) : null,
		weatherStateSchemaVersion: input.weatherState?.schemaVersion ?? null,
		strategyStatePayload: input.strategyState ? encodeJson(input.strategyState.payload) : null,
		strategyStateSchemaVersion: input.strategyState?.schemaVersion ?? null,
		resumeStatePayload: encodeJson(input.resumeState.payload),
		resumeStateSchemaVersion: input.resumeState.schemaVersion,
		leaderSessionEntryId: input.leaderSessionEntryId,
		checkpointedAt: input.checkpointedAt
	};

	if (current) {
		await tx
			.update(schema.sessionCheckpoint)
			.set(header)
			.where(eq(schema.sessionCheckpoint.id, checkpointId));
	} else {
		await tx.insert(schema.sessionCheckpoint).values({ id: checkpointId, ...header });
	}
	await tx
		.delete(schema.sessionCarCheckpoint)
		.where(eq(schema.sessionCarCheckpoint.checkpointId, checkpointId));
	if (input.cars.length > 0) {
		await tx
			.insert(schema.sessionCarCheckpoint)
			.values(input.cars.map((car) => childRow(checkpointId, car)));
	}
	await tx
		.update(schema.weekendSession)
		.set({ activeCheckpointId: checkpointId })
		.where(eq(schema.weekendSession.id, input.weekendSessionId));

	return { checkpointId, ...input };
}

export async function readCheckpoint(
	db: Database,
	weekendSessionId: string
): Promise<CheckpointRecord | null> {
	const headers = await db
		.select()
		.from(schema.sessionCheckpoint)
		.where(eq(schema.sessionCheckpoint.weekendSessionId, weekendSessionId))
		.limit(1);
	const header = headers[0];
	if (!header) return null;
	const cars = await db
		.select()
		.from(schema.sessionCarCheckpoint)
		.where(eq(schema.sessionCarCheckpoint.checkpointId, header.id))
		.orderBy(asc(schema.sessionCarCheckpoint.sessionEntryId));

	return {
		checkpointId: header.id,
		weekendSessionId: header.weekendSessionId,
		checkpointSeq: header.checkpointSeq,
		simClockMs: header.simClockMs,
		rngAlgorithm: header.rngAlgorithm,
		rngStates: decodeBlob<Record<string, unknown>>(header.rngState),
		phase: header.phase as CheckpointPhase,
		safetyCarState: {
			payload: decodeJson(header.safetyCarStatePayload),
			schemaVersion: header.safetyCarStateSchemaVersion
		},
		weatherState:
			header.weatherStatePayload && header.weatherStateSchemaVersion
				? {
						payload: decodeJson(header.weatherStatePayload),
						schemaVersion: header.weatherStateSchemaVersion
					}
				: undefined,
		strategyState:
			header.strategyStatePayload && header.strategyStateSchemaVersion
				? {
						payload: decodeJson(header.strategyStatePayload),
						schemaVersion: header.strategyStateSchemaVersion
					}
				: undefined,
		resumeState: {
			payload: decodeJson(header.resumeStatePayload),
			schemaVersion: header.resumeStateSchemaVersion
		},
		leaderSessionEntryId: header.leaderSessionEntryId,
		checkpointedAt: header.checkpointedAt,
		cars: cars.map((car) => ({
			sessionEntryId: car.sessionEntryId,
			currentLap: car.currentLap,
			sectorIndex: car.sectorIndex,
			waypointProgress: car.waypointProgress,
			racePosition: car.racePosition,
			gapToLeaderMs: car.gapToLeaderMs,
			intervalAheadMs: car.intervalAheadMs,
			currentLapTimeMs: car.currentLapTimeMs,
			lastSectorTimeMs: car.lastSectorTimeMs,
			sectorTimesMs: decodeJson<number[]>(car.sectorTimesMsPayload),
			pitPhase: car.pitPhase as CheckpointPitPhase,
			pitPhaseElapsedMs: car.pitPhaseElapsedMs,
			fuelKg: car.fuelKg,
			mountedTyreSetId: car.mountedTyreSetId,
			ersChargePercent: car.ersChargePercent,
			engineMode: car.engineMode as CheckpointEngineMode,
			pitStopsCompleted: car.pitStopsCompleted,
			penalty: decodeJson(car.penaltyPayload),
			penaltySchemaVersion: car.penaltySchemaVersion,
			simulationState: {
				payload: decodeJson(car.simulationStatePayload),
				schemaVersion: car.simulationStateSchemaVersion
			},
			retirementState: car.retirementState as CheckpointRetirementState,
			retirementReason: car.retirementReason
		}))
	};
}
