import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type {
	LiveStrategyController,
	RaceInput,
	RaceRunResult,
	SimulationSnapshot,
	StrategyCommand
} from '../../src/lib/sim/core/types.js';
import { RaceSimulation } from '../../src/lib/sim/core/engine.js';
import { readCheckpoint } from './checkpoint-repository.js';
import {
	persistSimulationCheckpoint,
	persistSimulationResult,
	simulationSnapshotFromCheckpoint,
	type SimulationCheckpointContext
} from './simulation-persistence-adapter.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

export type SessionCheckpointReason = 'start' | 'lap' | 'pause' | 'manual' | 'finish';
export type SessionOrchestratorStatus = 'idle' | 'live' | 'paused' | 'finished' | 'closed';

export interface SessionOrchestratorOptions {
	weekendSessionId: string;
	pointsSystemId: string;
	checkpointContext: (
		snapshot: SimulationSnapshot,
		reason: SessionCheckpointReason,
		checkpointSeq: number
	) => SimulationCheckpointContext;
	clock?: () => string;
	strategyController?: LiveStrategyController;
}

export interface SessionStepResult {
	status: SessionOrchestratorStatus;
	checkpointed: boolean;
	completed: boolean;
	result?: RaceRunResult;
}

export class SessionLifecycleError extends Error {
	readonly code = 'SESSION_NOT_LIVE' as const;

	constructor(message: string) {
		super(message);
		this.name = 'SessionLifecycleError';
	}
}

export class SessionOrchestrator {
	private readonly clock: () => string;
	private simulation: RaceSimulation | null = null;
	private statusValue: SessionOrchestratorStatus = 'idle';
	private checkpointSeq = 0;
	private operation: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly db: Database,
		private readonly input: RaceInput,
		private readonly options: SessionOrchestratorOptions
	) {
		this.clock = options.clock ?? (() => new Date().toISOString());
	}

	static async resume(
		db: Database,
		input: RaceInput,
		options: SessionOrchestratorOptions
	): Promise<SessionOrchestrator> {
		const snapshot = await simulationSnapshotFromCheckpoint(db, input, options.weekendSessionId);
		const checkpoint = await readCheckpoint(db, options.weekendSessionId);
		if (!checkpoint) throw new SessionLifecycleError('Checkpoint disappeared during resume.');
		const orchestrator = new SessionOrchestrator(db, input, options);
		orchestrator.simulation = new RaceSimulation(input, snapshot, options.strategyController);
		orchestrator.checkpointSeq = checkpoint.checkpointSeq;
		await db
			.update(schema.weekendSession)
			.set({ status: 'paused' })
			.where(eq(schema.weekendSession.id, options.weekendSessionId));
		orchestrator.statusValue = 'paused';
		return orchestrator;
	}

	get status(): SessionOrchestratorStatus {
		return this.statusValue;
	}

	get checkpointSequence(): number {
		return this.checkpointSeq;
	}

	start(): Promise<void> {
		return this.enqueue(async () => {
			this.requireStatus('idle', 'Session has already started.');
			this.simulation = new RaceSimulation(this.input, undefined, this.options.strategyController);
			await this.checkpointInternal('start');
			await this.setWeekendStatus('live');
			this.statusValue = 'live';
		});
	}

	step(): Promise<SessionStepResult> {
		return this.enqueue(async () => {
			this.requireStatus('live', 'Only a live session can advance.');
			const simulation = this.requireSimulation();
			const previousEventCount = simulation.snapshot().events.length;
			simulation.step();
			const snapshot = simulation.snapshot();
			const completedLap = snapshot.events
				.slice(previousEventCount)
				.some((event) => event.type === 'lap_completed');
			let checkpointed = false;
			if (completedLap) {
				await this.checkpointInternal('lap');
				checkpointed = true;
			}
			if (!simulation.isComplete()) {
				return { status: this.statusValue, checkpointed, completed: false };
			}
			const result = await this.finalizeInternal();
			return { status: this.statusValue, checkpointed: true, completed: true, result };
		});
	}

	pause(): Promise<void> {
		return this.enqueue(async () => {
			this.requireStatus('live', 'Only a live session can pause.');
			await this.checkpointInternal('pause');
			await this.setWeekendStatus('paused');
			this.statusValue = 'paused';
		});
	}

	resume(): Promise<void> {
		return this.enqueue(async () => {
			this.requireStatus('paused', 'Only a paused session can resume.');
			await this.setWeekendStatus('live');
			this.statusValue = 'live';
		});
	}

	manualCheckpoint(): Promise<void> {
		return this.enqueue(async () => {
			if (this.statusValue !== 'live' && this.statusValue !== 'paused') {
				throw new SessionLifecycleError('Manual checkpoints require a live or paused session.');
			}
			await this.checkpointInternal('manual');
		});
	}

	issueStrategy(command: StrategyCommand): Promise<boolean> {
		return this.enqueue(async () => {
			if (this.statusValue !== 'live' && this.statusValue !== 'paused') {
				throw new SessionLifecycleError('Strategy commands require a live or paused session.');
			}
			const accepted = this.requireSimulation().issueStrategyCommand(command);
			if (accepted) await this.checkpointInternal('manual');
			return accepted;
		});
	}

	finalize(): Promise<RaceRunResult> {
		return this.enqueue(async () => {
			this.requireStatus('live', 'Only a live session can finalize.');
			const simulation = this.requireSimulation();
			if (!simulation.isComplete()) {
				throw new SessionLifecycleError('Session cannot finalize before the simulation completes.');
			}
			return this.finalizeInternal();
		});
	}

	close(): Promise<void> {
		return this.enqueue(async () => {
			if (this.statusValue === 'live') {
				await this.checkpointInternal('pause');
				await this.setWeekendStatus('paused');
			}
			if (
				this.statusValue === 'idle' ||
				this.statusValue === 'paused' ||
				this.statusValue === 'finished'
			) {
				this.statusValue = 'closed';
				return;
			}
			if (this.statusValue !== 'closed') {
				throw new SessionLifecycleError('Session could not be closed in its current state.');
			}
		});
	}

	private async checkpointInternal(reason: SessionCheckpointReason) {
		const simulation = this.requireSimulation();
		const nextSequence = this.checkpointSeq + 1;
		const context = this.options.checkpointContext(simulation.snapshot(), reason, nextSequence);
		await persistSimulationCheckpoint(this.db, simulation.snapshot(), {
			...context,
			checkpointSeq: nextSequence
		});
		this.checkpointSeq = nextSequence;
	}

	private async setWeekendStatus(status: string) {
		await this.db
			.update(schema.weekendSession)
			.set({ status })
			.where(eq(schema.weekendSession.id, this.options.weekendSessionId));
	}

	private async finalizeInternal(): Promise<RaceRunResult> {
		const simulation = this.requireSimulation();
		await this.checkpointInternal('finish');
		const result = simulation.run();
		await persistSimulationResult(this.db, result, {
			weekendSessionId: this.options.weekendSessionId,
			pointsSystemId: this.options.pointsSystemId,
			finalizedAt: this.clock()
		});
		this.statusValue = 'finished';
		return result;
	}

	private requireSimulation() {
		if (!this.simulation) throw new SessionLifecycleError('Session has not started.');
		return this.simulation;
	}

	private requireStatus(expected: SessionOrchestratorStatus, message: string) {
		if (this.statusValue !== expected) throw new SessionLifecycleError(message);
	}

	private enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const next = this.operation.then(operation, operation);
		this.operation = next.then(
			() => undefined,
			() => undefined
		);
		return next;
	}
}
