import type {
	EntrySimulationState,
	RaceInput,
	RaceRunResult,
	SimulationSnapshot,
	StrategyCommand,
	WeatherRuntimeState,
	WeatherStrategyControllerState
} from '../../src/lib/sim/core/types.js';
import {
	readCheckpoint,
	writeCheckpoint,
	type CheckpointCarState,
	type CheckpointWrite
} from './checkpoint-repository.js';
import {
	finalizeSession,
	type FinalizeSessionOptions,
	type FinalizeSessionResult
} from './result-repository.js';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

export type SimulationCheckpointCarContext = Omit<
	CheckpointCarState,
	| 'sessionEntryId'
	| 'currentLapTimeMs'
	| 'fuelKg'
	| 'mountedTyreSetId'
	| 'engineMode'
	| 'pitStopsCompleted'
	| 'simulationState'
> & {
	currentLap: number;
};

export interface SimulationCheckpointContext extends Omit<
	CheckpointWrite,
	'rngStates' | 'cars' | 'weatherState' | 'strategyState' | 'resumeState'
> {
	carContexts: Record<string, SimulationCheckpointCarContext>;
	weatherStateSchemaVersion?: string;
	strategyStateSchemaVersion?: string;
	resumeStateSchemaVersion: string;
	simulationStateSchemaVersion: string;
}

export class SimulationAdapterError extends Error {
	readonly code = 'CHECKPOINT_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'SimulationAdapterError';
	}
}

interface ResumeStatePayload {
	inputHash: string;
	step: number;
	appliedCommands: number[];
	pendingPitTyres: Record<string, string>;
	carsInPit: string[];
	lastOvertakeAttemptStep: Record<string, number>;
	liveCommands: StrategyCommand[];
}

export function checkpointWriteFromSnapshot(
	snapshot: SimulationSnapshot,
	context: SimulationCheckpointContext
): CheckpointWrite {
	const cars = snapshot.states.map((state) => {
		const carContext = context.carContexts[state.sessionEntryId];
		if (!carContext) {
			throw new SimulationAdapterError(`Checkpoint context is missing ${state.sessionEntryId}.`);
		}
		return {
			...carContext,
			sessionEntryId: state.sessionEntryId,
			currentLapTimeMs: state.currentLapTimeMs,
			fuelKg: state.fuelGrams / 1_000,
			mountedTyreSetId: state.mountedTyreSetId,
			engineMode: state.mode,
			pitStopsCompleted: state.pitStops,
			simulationState: {
				payload: state,
				schemaVersion: context.simulationStateSchemaVersion
			}
		};
	});

	const weatherState = snapshot.weatherState
		? {
				payload: snapshot.weatherState,
				schemaVersion: context.weatherStateSchemaVersion!
			}
		: undefined;
	if (weatherState && !weatherState.schemaVersion) {
		throw new SimulationAdapterError('Weather checkpoint schema version is required.');
	}
	const strategyState = snapshot.strategyControllerState
		? {
				payload: snapshot.strategyControllerState,
				schemaVersion: context.strategyStateSchemaVersion!
			}
		: undefined;
	if (strategyState && !strategyState.schemaVersion) {
		throw new SimulationAdapterError('Strategy checkpoint schema version is required.');
	}
	if (!context.resumeStateSchemaVersion) {
		throw new SimulationAdapterError('Resume checkpoint schema version is required.');
	}
	if (!context.simulationStateSchemaVersion) {
		throw new SimulationAdapterError('Simulation state schema version is required.');
	}
	const resumeState = {
		payload: {
			inputHash: snapshot.inputHash,
			step: snapshot.step,
			appliedCommands: snapshot.appliedCommands,
			pendingPitTyres: snapshot.pendingPitTyres,
			carsInPit: snapshot.carsInPit,
			lastOvertakeAttemptStep: snapshot.lastOvertakeAttemptStep,
			liveCommands: snapshot.liveCommands ?? []
		},
		schemaVersion: context.resumeStateSchemaVersion
	};

	return {
		...context,
		rngStates: snapshot.rngStates,
		cars,
		resumeState,
		...(weatherState ? { weatherState } : {}),
		...(strategyState ? { strategyState } : {})
	};
}

export async function persistSimulationCheckpoint(
	db: Database,
	snapshot: SimulationSnapshot,
	context: SimulationCheckpointContext
) {
	return writeCheckpoint(db, checkpointWriteFromSnapshot(snapshot, context));
}

export async function simulationSnapshotFromCheckpoint(
	db: Database,
	input: RaceInput,
	weekendSessionId: string
): Promise<SimulationSnapshot> {
	const checkpoint = await readCheckpoint(db, weekendSessionId);
	if (!checkpoint) {
		throw new SimulationAdapterError(`No checkpoint exists for ${weekendSessionId}.`);
	}
	const resumeState = checkpoint.resumeState.payload as Partial<ResumeStatePayload>;
	if (
		typeof resumeState.inputHash !== 'string' ||
		typeof resumeState.step !== 'number' ||
		!Array.isArray(resumeState.appliedCommands) ||
		!resumeState.pendingPitTyres ||
		!Array.isArray(resumeState.carsInPit) ||
		!resumeState.lastOvertakeAttemptStep
	) {
		throw new SimulationAdapterError('Checkpoint resume state is incomplete.');
	}
	const stateByEntryId = new Map(
		checkpoint.cars.map((car) => [
			car.sessionEntryId,
			car.simulationState.payload as EntrySimulationState
		])
	);
	const states = input.entries.map((entry) => {
		const state = stateByEntryId.get(entry.sessionEntryId);
		if (!state) throw new SimulationAdapterError(`Checkpoint is missing ${entry.sessionEntryId}.`);
		if (state.sessionEntryId !== entry.sessionEntryId) {
			throw new SimulationAdapterError(`Checkpoint state ID mismatch for ${entry.sessionEntryId}.`);
		}
		return state;
	});
	return {
		inputHash: resumeState.inputHash,
		step: resumeState.step,
		states,
		rngStates: checkpoint.rngStates as SimulationSnapshot['rngStates'],
		events: [],
		lapTelemetry: [],
		sectorTelemetry: [],
		appliedCommands: resumeState.appliedCommands,
		pendingPitTyres: resumeState.pendingPitTyres,
		carsInPit: resumeState.carsInPit,
		lastOvertakeAttemptStep: resumeState.lastOvertakeAttemptStep,
		...(checkpoint.weatherState
			? { weatherState: checkpoint.weatherState.payload as WeatherRuntimeState }
			: {}),
		liveCommands: resumeState.liveCommands ?? [],
		...(checkpoint.strategyState
			? {
					strategyControllerState: checkpoint.strategyState
						.payload as WeatherStrategyControllerState
				}
			: {})
	};
}

export function persistSimulationResult(
	db: Database,
	result: RaceRunResult,
	options: FinalizeSessionOptions
): Promise<FinalizeSessionResult> {
	return finalizeSession(db, result, options);
}
