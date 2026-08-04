import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type {
	RaceEvent,
	RaceRunResult,
	RaceResultDetailOutput,
	SessionPointAwardOutput,
	SessionResultOutput
} from '../../src/lib/sim/core/types.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface FinalizeSessionOptions {
	weekendSessionId: string;
	pointsSystemId: string | null;
	finalizedAt: string;
	lapsBehindByEntry?: Record<string, number>;
}

export interface FinalizeSessionResult {
	idempotent: boolean;
	sessionResultIds: Record<string, string>;
	persistedEventCount: number;
}

export class FinalizationValidationError extends Error {
	readonly code = 'FINALIZATION_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'FinalizationValidationError';
	}
}

type PersistedEvent = {
	eventType: string;
	payload: Record<string, boolean | number | string | null>;
};

function eventTypeAndPayload(event: RaceEvent): PersistedEvent | null {
	switch (event.type) {
		case 'pit_entry':
		case 'pit_service':
		case 'pit_exit':
		case 'tyre_set_mounted':
			return { eventType: 'pit', payload: { sourceType: event.type, ...event.payload } };
		case 'overtake_succeeded':
			return { eventType: 'overtake', payload: event.payload };
		case 'strategy_command_applied':
			return { eventType: 'strategy_command', payload: event.payload };
		case 'drs_weather_suspended':
		case 'drs_weather_restored':
			return { eventType: 'drs_weather', payload: { sourceType: event.type, ...event.payload } };
		case 'unsafe_conditions_detected':
		case 'unsafe_conditions_cleared':
			return {
				eventType: 'unsafe_conditions',
				payload: { sourceType: event.type, ...event.payload }
			};
		case 'car_finished':
			return { eventType: 'finish', payload: event.payload };
		default:
			return null;
	}
}

function validateOutput(output: RaceRunResult, options: FinalizeSessionOptions) {
	if (output.sessionResults.length === 0) {
		throw new FinalizationValidationError('A session must contain at least one result.');
	}
	const entryIds = new Set<string>();
	const positions = new Set<number>();
	for (const result of output.sessionResults) {
		if (entryIds.has(result.sessionEntryId)) {
			throw new FinalizationValidationError(`Duplicate session result: ${result.sessionEntryId}.`);
		}
		if (positions.has(result.position)) {
			throw new FinalizationValidationError(
				`Duplicate classification position: ${result.position}.`
			);
		}
		if (result.position < 1 || result.lapsCompleted < 0 || result.totalTimeMs < 0) {
			throw new FinalizationValidationError('Session result contains an invalid race value.');
		}
		entryIds.add(result.sessionEntryId);
		positions.add(result.position);
	}
	for (const award of output.pointAwards) {
		if (!entryIds.has(award.sessionEntryId)) {
			throw new FinalizationValidationError(`Point award has no result: ${award.sessionEntryId}.`);
		}
		if (award.points < 0) throw new FinalizationValidationError('Point awards cannot be negative.');
	}
	for (const detail of output.raceDetails) {
		if (!entryIds.has(detail.sessionEntryId)) {
			throw new FinalizationValidationError(`Race detail has no result: ${detail.sessionEntryId}.`);
		}
	}
	if (!options.finalizedAt || (output.pointAwards.length > 0 && !options.pointsSystemId)) {
		throw new FinalizationValidationError('Finalization metadata is incomplete.');
	}
}

function resultRow(
	weekendSessionId: string,
	output: SessionResultOutput,
	finalizedAt: string,
	lapsBehind: number
) {
	return {
		id: randomUUID(),
		sessionEntryId: output.sessionEntryId,
		weekendSessionId,
		classificationPosition: output.position,
		classificationStatus: output.status,
		lapsCompleted: output.lapsCompleted,
		bestLapMs: output.bestLapMs,
		bestLapNumber: null,
		totalTimeMs: output.totalTimeMs,
		gapToLeaderMs: output.gapToWinnerMs,
		lapsBehind,
		finalizedAt
	};
}

function detailFor(
	details: readonly RaceResultDetailOutput[],
	entryId: string
): RaceResultDetailOutput {
	return (
		details.find((detail) => detail.sessionEntryId === entryId) ?? {
			sessionEntryId: entryId,
			pitStops: 0,
			lapsLed: 0,
			positionsGained: 0
		}
	);
}

function awardRows(
	awards: readonly SessionPointAwardOutput[],
	resultIds: Map<string, string>,
	pointsSystemId: string
) {
	return awards.map((award) => {
		const sessionResultId = resultIds.get(award.sessionEntryId);
		if (!sessionResultId) {
			throw new FinalizationValidationError(`Point award has no result: ${award.sessionEntryId}.`);
		}
		return {
			id: randomUUID(),
			sessionResultId,
			pointsSystemId,
			awardKind: award.reason,
			points: award.points
		};
	});
}

async function existingFinalization(
	tx: Transaction,
	weekendSessionId: string
): Promise<FinalizeSessionResult | null> {
	const existing = await tx
		.select({ id: schema.sessionResult.id, sessionEntryId: schema.sessionResult.sessionEntryId })
		.from(schema.sessionResult)
		.where(eq(schema.sessionResult.weekendSessionId, weekendSessionId));
	if (existing.length === 0) return null;
	return {
		idempotent: true,
		sessionResultIds: Object.fromEntries(
			existing.map((result) => [result.sessionEntryId, result.id])
		),
		persistedEventCount: (
			await tx
				.select({ id: schema.sessionEvent.id })
				.from(schema.sessionEvent)
				.where(eq(schema.sessionEvent.weekendSessionId, weekendSessionId))
		).length
	};
}

export async function finalizeSession(
	db: Database,
	output: RaceRunResult,
	options: FinalizeSessionOptions
): Promise<FinalizeSessionResult> {
	validateOutput(output, options);
	return db.transaction(async (tx) => {
		const alreadyFinalized = await existingFinalization(tx, options.weekendSessionId);
		if (alreadyFinalized) return alreadyFinalized;

		const session = await tx
			.select({ activeCheckpointId: schema.weekendSession.activeCheckpointId })
			.from(schema.weekendSession)
			.where(eq(schema.weekendSession.id, options.weekendSessionId))
			.limit(1);
		if (session.length !== 1) {
			throw new FinalizationValidationError('Weekend session does not exist.');
		}

		const rows = output.sessionResults.map((result) =>
			resultRow(
				options.weekendSessionId,
				result,
				options.finalizedAt,
				options.lapsBehindByEntry?.[result.sessionEntryId] ?? 0
			)
		);
		await tx.insert(schema.sessionResult).values(rows);
		const resultIds = new Map(rows.map((row) => [row.sessionEntryId, row.id]));
		await tx.insert(schema.raceResultDetail).values(
			rows.map((row) => {
				const detail = detailFor(output.raceDetails, row.sessionEntryId);
				return {
					sessionResultId: row.id,
					pitStops: detail.pitStops,
					lapsLed: detail.lapsLed,
					positionsGained: detail.positionsGained,
					retirementReason: null
				};
			})
		);
		const awards = options.pointsSystemId
			? awardRows(output.pointAwards, resultIds, options.pointsSystemId)
			: [];
		if (awards.length > 0) await tx.insert(schema.sessionPointAward).values(awards);

		const events = output.events
			.map((event) => ({ event, persisted: eventTypeAndPayload(event) }))
			.filter((entry): entry is { event: RaceEvent; persisted: PersistedEvent } =>
				Boolean(entry.persisted)
			);
		if (events.length > 0) {
			await tx.insert(schema.sessionEvent).values(
				events.map(({ event, persisted }, index) => ({
					id: randomUUID(),
					weekendSessionId: options.weekendSessionId,
					sequence: index + 1,
					simulationTimeMs: event.simulationTimeMs,
					lap: event.lap,
					segmentId: event.segmentId,
					eventType: persisted.eventType,
					sessionEntryIdsPayload: JSON.stringify(event.sessionEntryIds),
					payload: JSON.stringify(persisted.payload),
					payloadSchemaVersion: 'session-event-v1'
				}))
			);
		}

		if (session[0]?.activeCheckpointId) {
			await tx
				.delete(schema.sessionCheckpoint)
				.where(eq(schema.sessionCheckpoint.id, session[0].activeCheckpointId));
		}
		await tx
			.update(schema.weekendSession)
			.set({ status: 'finished', activeCheckpointId: null })
			.where(eq(schema.weekendSession.id, options.weekendSessionId));

		return {
			idempotent: false,
			sessionResultIds: Object.fromEntries(resultIds),
			persistedEventCount: events.length
		};
	});
}
