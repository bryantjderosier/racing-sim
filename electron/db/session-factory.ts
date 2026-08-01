import { drizzle } from 'drizzle-orm/libsql';
import type { RaceInput } from '../../src/lib/sim/core/types.js';
import { SessionOrchestrator, type SessionOrchestratorOptions } from './session-orchestrator.js';
import { readCheckpoint } from './checkpoint-repository.js';
import {
	materializeWeekendSession,
	SessionMaterializationError,
	type SessionMaterializationRequest,
	type SessionMaterializationResult
} from './session-materializer.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface ResolvedSessionDefinition {
	input: RaceInput;
	options: SessionOrchestratorOptions;
}

export type SessionDefinitionResolver = (db: Database) => Promise<ResolvedSessionDefinition | null>;

export class SessionFactory {
	constructor(private readonly resolveDefinition: SessionDefinitionResolver) {}

	async createOrResume(db: Database): Promise<SessionOrchestrator | null> {
		const definition = await this.resolveDefinition(db);
		if (!definition) return null;
		const checkpoint = await readCheckpoint(db, definition.options.weekendSessionId);
		return checkpoint
			? SessionOrchestrator.resume(db, definition.input, definition.options)
			: new SessionOrchestrator(db, definition.input, definition.options);
	}

	async createFromMaterialization(
		db: Database,
		request: SessionMaterializationRequest
	): Promise<{ session: SessionOrchestrator; materialization: SessionMaterializationResult }> {
		const materialization = await materializeWeekendSession(db, request);
		const definition = await this.resolveDefinition(db);
		if (!definition || definition.options.weekendSessionId !== request.weekendSessionId) {
			throw new SessionMaterializationError(
				'Materialized session is not the active session selected by the resolver.',
				'CONFLICT'
			);
		}
		const session = await this.createOrResume(db);
		if (!session) {
			throw new SessionMaterializationError('Materialized session could not be resolved.');
		}
		return { session, materialization };
	}
}
