import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { RaceInput } from '../../src/lib/sim/core/types.js';
import { persistSessionInput, SESSION_INPUT_SCHEMA_VERSION } from './session-input-resolver.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface SessionMaterializationConditions {
	tempC?: number | null;
	rainNow?: number | null;
	rainInMinutes?: number | null;
	trackWetness?: number | null;
}

export interface SessionMaterializationRequest {
	weekendSessionId: string;
	eventSessionDefinitionId: string;
	input: RaceInput;
	conditions?: SessionMaterializationConditions;
}

export interface SessionMaterializationResult {
	weekendSessionId: string;
	created: boolean;
	inputPersisted: boolean;
}

export class SessionMaterializationError extends Error {
	readonly code: 'INVALID_COMMAND' | 'CONFLICT';

	constructor(message: string, code: 'INVALID_COMMAND' | 'CONFLICT' = 'INVALID_COMMAND') {
		super(message);
		this.name = 'SessionMaterializationError';
		this.code = code;
	}
}

function requireId(value: unknown, label: string): asserts value is string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new SessionMaterializationError(`${label} is required.`);
	}
}

export async function materializeWeekendSession(
	db: Database,
	request: SessionMaterializationRequest
): Promise<SessionMaterializationResult> {
	requireId(request.weekendSessionId, 'weekendSessionId');
	requireId(request.eventSessionDefinitionId, 'eventSessionDefinitionId');

	return db.transaction(async (tx) => {
		const definitions = await tx
			.select({
				id: schema.eventSessionDefinition.id,
				pointsSystemId: schema.eventSessionDefinition.pointsSystemId
			})
			.from(schema.eventSessionDefinition)
			.where(eq(schema.eventSessionDefinition.id, request.eventSessionDefinitionId));
		const definition = definitions[0];
		if (!definition) {
			throw new SessionMaterializationError(
				`Event session definition was not found: ${request.eventSessionDefinitionId}.`
			);
		}
		if (!definition.pointsSystemId) {
			throw new SessionMaterializationError('Event session definition has no points system.');
		}

		const existingRows = await tx
			.select({
				id: schema.weekendSession.id,
				status: schema.weekendSession.status,
				activeCheckpointId: schema.weekendSession.activeCheckpointId,
				inputPayload: schema.weekendSession.simulationInputPayload,
				inputSchemaVersion: schema.weekendSession.simulationInputSchemaVersion
			})
			.from(schema.weekendSession)
			.where(eq(schema.weekendSession.eventSessionDefinitionId, request.eventSessionDefinitionId));
		const existing = existingRows[0];
		if (existing) {
			if (existing.id !== request.weekendSessionId) {
				throw new SessionMaterializationError(
					'An event session already has a different weekend session.',
					'CONFLICT'
				);
			}
			if (existing.status !== 'scheduled' || existing.activeCheckpointId) {
				throw new SessionMaterializationError(
					'Only an unstarted scheduled session can be materialized.',
					'CONFLICT'
				);
			}
			if (existing.inputPayload !== '{}') {
				const requestedPayload = JSON.stringify(request.input);
				if (
					existing.inputSchemaVersion !== SESSION_INPUT_SCHEMA_VERSION ||
					existing.inputPayload !== requestedPayload
				) {
					throw new SessionMaterializationError(
						'The scheduled session already has a different simulation input.',
						'CONFLICT'
					);
				}
				return {
					weekendSessionId: request.weekendSessionId,
					created: false,
					inputPersisted: true
				};
			}

			await persistSessionInput(tx, request.weekendSessionId, request.input);
			return {
				weekendSessionId: request.weekendSessionId,
				created: false,
				inputPersisted: true
			};
		}

		await tx.insert(schema.weekendSession).values({
			id: request.weekendSessionId,
			eventSessionDefinitionId: request.eventSessionDefinitionId,
			status: 'scheduled',
			tempC: request.conditions?.tempC ?? null,
			rainNow: request.conditions?.rainNow ?? null,
			rainInMinutes: request.conditions?.rainInMinutes ?? null,
			trackWetness: request.conditions?.trackWetness ?? 0,
			simulationInputPayload: '{}',
			simulationInputSchemaVersion: SESSION_INPUT_SCHEMA_VERSION,
			activeCheckpointId: null
		});
		await persistSessionInput(tx, request.weekendSessionId, request.input);
		return {
			weekendSessionId: request.weekendSessionId,
			created: true,
			inputPersisted: true
		};
	});
}
