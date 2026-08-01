import { canonicalStringify, normalizeForHash } from './canonicalize';
import { FORMULA_CONFIG, WEATHER_DRIVER_CONFIG, WEATHER_TYRE_CONFIG } from './config';
import { hashString } from './hash';
import { roundHalfEven } from './math';
import {
	RNG_STREAM_NAMES,
	createRngStreams,
	restoreRngStreams,
	type RngStreamName,
	type Xoshiro128ss
} from './rng';
import type {
	EntrySimulationState,
	IssuedTyreSet,
	LapTelemetry,
	RaceEvent,
	RaceInput,
	RaceRunResult,
	SectorTelemetry,
	SimulationEntry,
	SimulationSnapshot,
	StrategyCommand,
	TrackSegment,
	LiveStrategyController,
	WeatherRuntimeState
} from './types';
import { validateRaceInput } from './validate';
import {
	advanceWeatherState,
	applyRacingLineDrying,
	createInitialWeatherState,
	updateSegmentSurfaces,
	updateWeatherControls,
	weatherSurfaceExtrema
} from './weather';
import { carFactor } from '../formulas/car';
import { driverFactor, paceNoiseMs } from '../formulas/driver';
import { fuelBurnGrams, fuelPenaltyMs } from '../formulas/fuel';
import { overtakeOpportunityProbability, overtakeProbability } from '../formulas/overtaking';
import { pitStopLossMs } from '../formulas/pit';
import { dirtyAirFactor, drsFactor } from '../formulas/traffic';
import { tyreFactor, tyreWearBp } from '../formulas/tyre';
import {
	weatherAdjustedTyreWearBp,
	weatherTyreFactor,
	weatherTyreTemperatureDeciC
} from '../formulas/weather-tyre';
import { createRaceEvent } from '../output/events';
import { buildPointAwards, buildRaceDetails, buildSessionResults } from '../output/results';
import { weatherDriverFactor } from '../formulas/weather-driver';

function stableEntries(entries: SimulationEntry[]): SimulationEntry[] {
	return [...entries].sort((left, right) =>
		left.sessionEntryId.localeCompare(right.sessionEntryId)
	);
}

function stableCommands(commands: StrategyCommand[]): StrategyCommand[] {
	return [...commands].sort(
		(left, right) =>
			left.triggerLap - right.triggerLap ||
			left.triggerSegmentId.localeCompare(right.triggerSegmentId) ||
			left.sequence - right.sequence ||
			left.sessionEntryId.localeCompare(right.sessionEntryId)
	);
}

function runningOrder(states: EntrySimulationState[]): EntrySimulationState[] {
	return [...states].sort(
		(left, right) =>
			left.elapsedMs - right.elapsedMs || left.sessionEntryId.localeCompare(right.sessionEntryId)
	);
}

function mountedTyre(entry: SimulationEntry, state: EntrySimulationState): IssuedTyreSet {
	return entry.tyreSets.find((tyreSet) => tyreSet.id === state.mountedTyreSetId)!;
}

function tyreState(state: EntrySimulationState) {
	return state.tyreSets.find((tyreSet) => tyreSet.id === state.mountedTyreSetId)!;
}

function commandAt(command: StrategyCommand, lap: number, segmentId: string): boolean {
	return command.triggerLap === lap && command.triggerSegmentId === segmentId;
}

export class RaceSimulation {
	private readonly input: RaceInput;
	private readonly inputHash: string;
	private readonly entries: SimulationEntry[];
	private commands: StrategyCommand[];
	private liveCommands: StrategyCommand[] = [];
	private readonly strategyController?: LiveStrategyController;
	private states: EntrySimulationState[];
	private rng: Record<RngStreamName, Xoshiro128ss>;
	private events: RaceEvent[] = [];
	private lapTelemetry: LapTelemetry[] = [];
	private sectorTelemetry: SectorTelemetry[] = [];
	private appliedCommands = new Set<number>();
	private pendingPitTyres: Record<string, string> = {};
	private carsInPit = new Set<string>();
	private lastOvertakeAttemptStep: Record<string, number> = {};
	private weatherState?: WeatherRuntimeState;
	private stepIndex = 0;

	constructor(
		input: RaceInput,
		snapshot?: SimulationSnapshot,
		strategyController?: LiveStrategyController
	) {
		validateRaceInput(input);
		this.input = structuredClone(input);
		this.entries = stableEntries(this.input.entries);
		this.commands = stableCommands([...this.input.commands, ...(snapshot?.liveCommands ?? [])]);
		this.liveCommands = structuredClone(snapshot?.liveCommands ?? []);
		this.strategyController = strategyController;
		this.inputHash = hashString(canonicalStringify(normalizeForHash(this.input)));
		if (snapshot) {
			if (snapshot.inputHash !== this.inputHash) throw new Error('Checkpoint input hash mismatch');
			if ((this.input.weather?.enabled === true) !== Boolean(snapshot.weatherState)) {
				throw new Error('Checkpoint weather state mismatch');
			}
			this.stepIndex = snapshot.step;
			this.states = structuredClone(snapshot.states);
			this.rng = restoreRngStreams(snapshot.rngStates);
			this.events = structuredClone(snapshot.events);
			this.lapTelemetry = structuredClone(snapshot.lapTelemetry);
			this.sectorTelemetry = structuredClone(snapshot.sectorTelemetry);
			this.appliedCommands = new Set(snapshot.appliedCommands);
			this.pendingPitTyres = { ...snapshot.pendingPitTyres };
			this.carsInPit = new Set(snapshot.carsInPit);
			this.lastOvertakeAttemptStep = { ...snapshot.lastOvertakeAttemptStep };
			this.weatherState = snapshot.weatherState
				? structuredClone(snapshot.weatherState)
				: undefined;
			if (snapshot.strategyControllerState) {
				if (!this.strategyController) throw new Error('Checkpoint strategy controller mismatch');
				this.strategyController.restore(snapshot.strategyControllerState);
			}
		} else {
			this.rng = createRngStreams(this.input.seed);
			this.weatherState = this.input.weather?.enabled
				? createInitialWeatherState(this.input.weather.scenario, this.input.track, this.rng.weather)
				: undefined;
			this.states = this.entries.map((entry) => ({
				sessionEntryId: entry.sessionEntryId,
				elapsedMs: (entry.gridPosition - 1) * FORMULA_CONFIG.gridPositionSpacingMs,
				currentLapTimeMs: 0,
				currentSectorTimeMs: 0,
				fuelGrams: entry.startingFuelGrams,
				mountedTyreSetId: entry.startingTyreSetId,
				tyreSets: entry.tyreSets.map((tyreSet) => ({
					id: tyreSet.id,
					wearBp: 0,
					lapsUsed: 0,
					mounted: tyreSet.id === entry.startingTyreSetId,
					...(this.weatherState
						? { temperatureDeciC: tyreSet.compound.operatingTempMinDeciC! }
						: {})
				})),
				mode: entry.initialMode,
				tyreConservation: 'normal',
				overtakingAggression: 'normal',
				pitStops: 0,
				lapsLed: 0,
				fastestLapMs: null,
				lastLapMs: null,
				finished: false,
				drsEligible: false,
				gridPosition: entry.gridPosition
			}));
			this.events.push(createRaceEvent(this.events, 'race_started', 0, 1, 'start', [], {}));
		}
	}

	private queueStrategyCommand(command: StrategyCommand): boolean {
		if (
			!command ||
			typeof command !== 'object' ||
			!Number.isInteger(command.sequence) ||
			!Number.isInteger(command.triggerLap) ||
			typeof command.sessionEntryId !== 'string' ||
			typeof command.triggerSegmentId !== 'string' ||
			!command.action ||
			typeof command.action !== 'object' ||
			this.commands.some((candidate) => candidate.sequence === command.sequence) ||
			!this.entries.some((entry) => entry.sessionEntryId === command.sessionEntryId) ||
			command.triggerLap < 1 ||
			command.triggerLap > this.input.rules.lapCount ||
			!this.input.track.segments.some((segment) => segment.id === command.triggerSegmentId) ||
			!this.validStrategyAction(command.action)
		)
			return false;
		if (command.action.type === 'pit') {
			const action = command.action;
			if (
				!this.entryFor(command.sessionEntryId).tyreSets.some(
					(set) => set.id === action.tyreSetId
				) ||
				this.commands.some(
					(candidate) =>
						candidate.sessionEntryId === command.sessionEntryId &&
						candidate.triggerLap === command.triggerLap &&
						candidate.triggerSegmentId === command.triggerSegmentId &&
						candidate.action.type === 'pit'
				)
			)
				return false;
		}
		this.commands = stableCommands([...this.commands, command]);
		this.liveCommands.push(structuredClone(command));
		return true;
	}

	private validStrategyAction(action: StrategyCommand['action']): boolean {
		switch (action.type) {
			case 'set_mode':
				return action.mode === 'conserve' || action.mode === 'balanced' || action.mode === 'attack';
			case 'set_tyre_conservation':
				return action.target === 'save' || action.target === 'normal' || action.target === 'push';
			case 'set_overtaking_aggression':
				return (
					action.aggression === 'low' ||
					action.aggression === 'normal' ||
					action.aggression === 'high'
				);
			case 'pit':
				return typeof action.tyreSetId === 'string' && action.tyreSetId.length > 0;
			default:
				return false;
		}
	}

	issueStrategyCommand(command: StrategyCommand): boolean {
		return this.queueStrategyCommand(command);
	}

	isComplete(): boolean {
		return this.stepIndex >= this.input.rules.lapCount * this.input.track.segments.length;
	}

	private entryFor(id: string): SimulationEntry {
		return this.entries.find((entry) => entry.sessionEntryId === id)!;
	}

	private applyCommands(lap: number, segment: TrackSegment): void {
		for (const command of this.commands) {
			if (this.appliedCommands.has(command.sequence) || !commandAt(command, lap, segment.id))
				continue;
			const state = this.states.find(
				(candidate) => candidate.sessionEntryId === command.sessionEntryId
			)!;
			switch (command.action.type) {
				case 'set_mode':
					state.mode = command.action.mode;
					break;
				case 'set_tyre_conservation':
					state.tyreConservation = command.action.target;
					break;
				case 'set_overtaking_aggression':
					state.overtakingAggression = command.action.aggression;
					break;
				case 'pit':
					this.pendingPitTyres[state.sessionEntryId] = command.action.tyreSetId;
					break;
			}
			this.appliedCommands.add(command.sequence);
			this.events.push(
				createRaceEvent(
					this.events,
					'strategy_command_applied',
					state.elapsedMs,
					lap,
					segment.id,
					[state.sessionEntryId],
					{ action: command.action.type, commandSequence: command.sequence }
				)
			);
		}
	}

	private resolvePitExits(lap: number, segment: TrackSegment): void {
		if (!segment.isPitExit) return;
		for (const id of this.carsInPit) {
			const state = this.states.find((candidate) => candidate.sessionEntryId === id)!;
			this.events.push(
				createRaceEvent(this.events, 'pit_exit', state.elapsedMs, lap, segment.id, [id])
			);
		}
		this.carsInPit.clear();
	}

	private resolvePitStops(lap: number, segment: TrackSegment): Set<string> {
		if (!segment.isPitEntry) return this.carsInPit;
		for (const state of this.states) {
			const requestedTyre = this.pendingPitTyres[state.sessionEntryId];
			if (!requestedTyre) continue;
			this.carsInPit.add(state.sessionEntryId);
			const entry = this.entryFor(state.sessionEntryId);
			const oldState = tyreState(state);
			const newState = state.tyreSets.find((candidate) => candidate.id === requestedTyre)!;
			oldState.mounted = false;
			newState.mounted = true;
			state.mountedTyreSetId = requestedTyre;
			state.pitStops += 1;
			const loss = pitStopLossMs(this.input.track, FORMULA_CONFIG);
			state.elapsedMs += loss;
			state.currentLapTimeMs += loss;
			state.currentSectorTimeMs += loss;
			delete this.pendingPitTyres[state.sessionEntryId];
			this.events.push(
				createRaceEvent(this.events, 'pit_entry', state.elapsedMs - loss, lap, segment.id, [
					state.sessionEntryId
				])
			);
			this.events.push(
				createRaceEvent(
					this.events,
					'pit_service',
					state.elapsedMs - this.input.track.pitLaneLossMs,
					lap,
					segment.id,
					[state.sessionEntryId],
					{ serviceTimeMs: FORMULA_CONFIG.pitServiceMs }
				)
			);
			this.events.push(
				createRaceEvent(
					this.events,
					'tyre_set_mounted',
					state.elapsedMs,
					lap,
					segment.id,
					[state.sessionEntryId],
					{
						tyreSetId: requestedTyre,
						compound: entry.tyreSets.find((set) => set.id === requestedTyre)!.compound.name
					}
				)
			);
		}
		return this.carsInPit;
	}

	private captureDrs(lap: number, segment: TrackSegment, order: EntrySimulationState[]): void {
		if (!segment.isDrsDetection) return;
		for (let index = 0; index < order.length; index += 1) {
			const state = order[index];
			const previous = state.drsEligible;
			const ahead = order[index - 1];
			const eligible =
				this.input.rules.drsEnabled &&
				!this.weatherState?.drsWeatherSuspended &&
				lap >= this.input.rules.drsActivationLap &&
				Boolean(ahead) &&
				state.elapsedMs - ahead.elapsedMs <= this.input.rules.drsGapThresholdMs;
			state.drsEligible = eligible;
			if (previous !== eligible) {
				this.events.push(
					createRaceEvent(
						this.events,
						'drs_eligibility_changed',
						state.elapsedMs,
						lap,
						segment.id,
						[state.sessionEntryId],
						{ eligible }
					)
				);
			}
		}
	}

	private clearWeatherSuspendedDrs(lap: number, segment: TrackSegment): void {
		if (!this.weatherState?.drsWeatherSuspended) return;
		for (const state of this.states) {
			if (!state.drsEligible) continue;
			state.drsEligible = false;
			this.events.push(
				createRaceEvent(
					this.events,
					'drs_eligibility_changed',
					this.weatherState.weatherClockMs,
					lap,
					segment.id,
					[state.sessionEntryId],
					{ eligible: false, reason: 'weather' }
				)
			);
		}
	}

	private resolveOvertakes(
		lap: number,
		segment: TrackSegment,
		orderBefore: EntrySimulationState[],
		segmentTimes: Map<string, number>,
		pitting: Set<string>
	): void {
		if (segment.overtakingDifficulty >= 1) return;
		for (let index = 1; index < orderBefore.length; index += 1) {
			const defender = orderBefore[index - 1];
			const attacker = orderBefore[index];
			if (pitting.has(defender.sessionEntryId) || pitting.has(attacker.sessionEntryId)) continue;
			const gap = attacker.elapsedMs - defender.elapsedMs;
			if (gap > FORMULA_CONFIG.overtakeAttemptGapMs) continue;
			const lastAttempt = this.lastOvertakeAttemptStep[attacker.sessionEntryId];
			if (
				lastAttempt !== undefined &&
				this.stepIndex - lastAttempt <
					this.input.track.segments.length * FORMULA_CONFIG.overtakeCooldownLaps
			) {
				continue;
			}
			const attackerEntry = this.entryFor(attacker.sessionEntryId);
			const defenderEntry = this.entryFor(defender.sessionEntryId);
			const opportunityProbability = overtakeOpportunityProbability(
				gap,
				segmentTimes.get(attacker.sessionEntryId)!,
				segmentTimes.get(defender.sessionEntryId)!,
				attacker.drsEligible,
				segment,
				FORMULA_CONFIG
			);
			if (this.rng.overtaking.nextFloat() >= opportunityProbability) continue;
			const probability = overtakeProbability(
				attackerEntry.driver,
				defenderEntry.driver,
				segmentTimes.get(attacker.sessionEntryId)!,
				segmentTimes.get(defender.sessionEntryId)!,
				attacker.overtakingAggression,
				attacker.drsEligible,
				segment
			);
			const draw = this.rng.overtaking.nextFloat();
			this.lastOvertakeAttemptStep[attacker.sessionEntryId] = this.stepIndex;
			this.events.push(
				createRaceEvent(
					this.events,
					'overtake_attempted',
					attacker.elapsedMs,
					lap,
					segment.id,
					[attacker.sessionEntryId, defender.sessionEntryId],
					{
						attackerId: attacker.sessionEntryId,
						defenderId: defender.sessionEntryId,
						opportunityProbabilityPpm: roundHalfEven(opportunityProbability * 1_000_000),
						probabilityPpm: roundHalfEven(probability * 1_000_000)
					}
				)
			);
			if (draw < probability) {
				const originalElapsedMs = attacker.elapsedMs;
				const passedElapsedMs = Math.max(
					0,
					defender.elapsedMs - FORMULA_CONFIG.overtakeSuccessMarginMs
				);
				const passAdjustmentMs = passedElapsedMs - originalElapsedMs;
				attacker.elapsedMs = passedElapsedMs;
				attacker.currentLapTimeMs += passAdjustmentMs;
				attacker.currentSectorTimeMs += passAdjustmentMs;
				this.lastOvertakeAttemptStep[defender.sessionEntryId] =
					this.stepIndex -
					this.input.track.segments.length *
						(FORMULA_CONFIG.overtakeCooldownLaps - FORMULA_CONFIG.overtakePassBackCooldownLaps);
				this.events.push(
					createRaceEvent(
						this.events,
						'overtake_succeeded',
						attacker.elapsedMs,
						lap,
						segment.id,
						[attacker.sessionEntryId, defender.sessionEntryId],
						{
							attackerId: attacker.sessionEntryId,
							defenderId: defender.sessionEntryId,
							drsUsed: attacker.drsEligible && Boolean(segment.isDrsActivation)
						}
					)
				);
			} else {
				attacker.elapsedMs += FORMULA_CONFIG.failedPassLossMs;
				attacker.currentLapTimeMs += FORMULA_CONFIG.failedPassLossMs;
				attacker.currentSectorTimeMs += FORMULA_CONFIG.failedPassLossMs;
				this.events.push(
					createRaceEvent(
						this.events,
						'overtake_failed',
						attacker.elapsedMs,
						lap,
						segment.id,
						[attacker.sessionEntryId, defender.sessionEntryId],
						{ attackerId: attacker.sessionEntryId, defenderId: defender.sessionEntryId }
					)
				);
			}
		}
	}

	step(): void {
		if (this.isComplete()) return;
		const segmentCount = this.input.track.segments.length;
		const lap = Math.floor(this.stepIndex / segmentCount) + 1;
		const segmentIndex = this.stepIndex % segmentCount;
		const segment = this.input.track.segments[segmentIndex];
		if (this.weatherState) {
			advanceWeatherState(this.weatherState, runningOrder(this.states)[0].elapsedMs);
			updateSegmentSurfaces(this.weatherState, this.input.track);
			const transitions = updateWeatherControls(
				this.weatherState,
				this.input.track,
				this.input.rules.weather!
			);
			const extrema = weatherSurfaceExtrema(this.weatherState);
			if (transitions.drsWeatherSuspendedChanged) {
				this.events.push(
					createRaceEvent(
						this.events,
						this.weatherState.drsWeatherSuspended
							? 'drs_weather_suspended'
							: 'drs_weather_restored',
						this.weatherState.weatherClockMs,
						lap,
						segment.id,
						[],
						{
							rainIntensityBp: this.weatherState.rainIntensityBp,
							maximumRacingLineWetnessBp: extrema.maximumRacingLineWetnessBp
						}
					)
				);
			}
			if (transitions.unsafeConditionsActiveChanged) {
				this.events.push(
					createRaceEvent(
						this.events,
						this.weatherState.unsafeConditionsActive
							? 'unsafe_conditions_detected'
							: 'unsafe_conditions_cleared',
						this.weatherState.weatherClockMs,
						lap,
						segment.id,
						[],
						{
							maximumRacingLineWetnessBp: extrema.maximumRacingLineWetnessBp,
							maximumOffLineWetnessBp: extrema.maximumOffLineWetnessBp,
							unsafeWetnessBp: this.input.rules.weather!.unsafeWetnessBp
						}
					)
				);
			}
			this.clearWeatherSuspendedDrs(lap, segment);
		}
		if (this.strategyController) {
			const generatedCommands = this.strategyController.onSegmentStart({
				seed: this.input.seed,
				sessionDurationMs: this.strategyController.sessionDurationMs(),
				lap,
				lapCount: this.input.rules.lapCount,
				segment,
				weatherState: this.weatherState,
				entries: this.entries,
				states: this.states
			});
			for (const command of generatedCommands) {
				this.strategyController.recordCommandResult(this.queueStrategyCommand(command));
			}
		}
		this.applyCommands(lap, segment);
		this.resolvePitExits(lap, segment);
		const pitting = this.resolvePitStops(lap, segment);
		const orderBefore = runningOrder(this.states);
		this.captureDrs(lap, segment, orderBefore);
		const previousById = new Map<string, EntrySimulationState>();
		for (let index = 1; index < orderBefore.length; index += 1) {
			previousById.set(orderBefore[index].sessionEntryId, orderBefore[index - 1]);
		}
		const segmentTimes = new Map<string, number>();
		const weatherSurface = this.weatherState?.segments.find(
			(surface) => surface.segmentId === segment.id
		);
		for (const state of this.states) {
			const entry = this.entryFor(state.sessionEntryId);
			const set = mountedTyre(entry, state);
			const setState = tyreState(state);
			if (this.weatherState && weatherSurface) {
				setState.temperatureDeciC = weatherTyreTemperatureDeciC(
					set.compound,
					setState.temperatureDeciC!,
					state.mode,
					state.tyreConservation,
					segment,
					weatherSurface.racingLineWetnessBp,
					this.weatherState.trackTempDeciC,
					WEATHER_TYRE_CONFIG
				);
			}
			const ahead = previousById.get(state.sessionEntryId);
			const gap = ahead ? state.elapsedMs - ahead.elapsedMs : Number.POSITIVE_INFINITY;
			const startLoss =
				this.stepIndex === 0
					? ((21 - entry.driver.starts) / 20) *
						FORMULA_CONFIG.startVarianceMs *
						this.rng.starts.nextFloat()
					: 0;
			const cleanTime =
				segment.baseTimeMs *
				carFactor(entry.car, segment, FORMULA_CONFIG) *
				(this.weatherState && weatherSurface
					? weatherDriverFactor(
							entry.driver,
							segment,
							weatherSurface.racingLineWetnessBp,
							weatherSurface.previousRacingLineWetnessBp,
							this.weatherState.trackTempDeciC,
							this.weatherState.previousTrackTempDeciC,
							FORMULA_CONFIG,
							WEATHER_DRIVER_CONFIG
						)
					: driverFactor(entry.driver, segment, FORMULA_CONFIG)) *
				(entry.setupFactorPpm / 1_000_000) *
				tyreFactor(set.compound, setState.wearBp, setState.lapsUsed) *
				(this.weatherState && weatherSurface
					? weatherTyreFactor(
							set.compound,
							setState.temperatureDeciC!,
							weatherSurface.racingLineWetnessBp,
							segment,
							WEATHER_TYRE_CONFIG
						)
					: 1) *
				dirtyAirFactor(gap, segment, FORMULA_CONFIG) *
				drsFactor(state.drsEligible, segment, FORMULA_CONFIG);
			const time = Math.max(
				FORMULA_CONFIG.minimumSegmentTimeMs,
				roundHalfEven(
					cleanTime +
						paceNoiseMs(entry.driver, this.rng.pace_variance.normalLike(), FORMULA_CONFIG) +
						startLoss
				) + fuelPenaltyMs(state.fuelGrams, segment, this.input.track.lapDistanceM, FORMULA_CONFIG)
			);
			segmentTimes.set(state.sessionEntryId, time);
			state.elapsedMs += time;
			state.currentLapTimeMs += time;
			state.currentSectorTimeMs += time;
		}
		this.resolveOvertakes(lap, segment, orderBefore, segmentTimes, pitting);
		for (const state of this.states) {
			const entry = this.entryFor(state.sessionEntryId);
			const set = mountedTyre(entry, state);
			const setState = tyreState(state);
			const burn = fuelBurnGrams(
				entry.car,
				state.mode,
				state.tyreConservation,
				segment,
				this.input.track.segments,
				FORMULA_CONFIG
			);
			state.fuelGrams = Math.max(0, state.fuelGrams - burn);
			const baseUpdatedWearBp = tyreWearBp(
				set.compound,
				setState.wearBp,
				entry.driver,
				state.mode,
				state.tyreConservation,
				segment,
				this.input.track.segments,
				state.fuelGrams,
				entry.tyreWearSetupPpm,
				FORMULA_CONFIG
			);
			setState.wearBp =
				this.weatherState && weatherSurface
					? weatherAdjustedTyreWearBp(
							set.compound,
							setState.wearBp,
							baseUpdatedWearBp,
							setState.temperatureDeciC!,
							weatherSurface.racingLineWetnessBp,
							FORMULA_CONFIG.wearLimitBp,
							WEATHER_TYRE_CONFIG
						)
					: baseUpdatedWearBp;
			this.events.push(
				createRaceEvent(
					this.events,
					'segment_completed',
					state.elapsedMs,
					lap,
					segment.id,
					[state.sessionEntryId],
					{ segmentTimeMs: segmentTimes.get(state.sessionEntryId)!, fuelGrams: state.fuelGrams }
				)
			);
		}
		if (this.weatherState) {
			applyRacingLineDrying(
				this.weatherState,
				segment,
				this.states.filter((state) => !state.finished).length
			);
		}

		const nextSegment = this.input.track.segments[segmentIndex + 1];
		const sectorComplete = !nextSegment || nextSegment.officialSector !== segment.officialSector;
		if (sectorComplete) {
			for (const state of this.states) {
				this.sectorTelemetry.push({
					sessionEntryId: state.sessionEntryId,
					lap,
					sector: segment.officialSector,
					timeMs: state.currentSectorTimeMs,
					elapsedMs: state.elapsedMs
				});
				this.events.push(
					createRaceEvent(
						this.events,
						'sector_completed',
						state.elapsedMs,
						lap,
						segment.id,
						[state.sessionEntryId],
						{ sector: segment.officialSector, sectorTimeMs: state.currentSectorTimeMs }
					)
				);
				state.currentSectorTimeMs = 0;
			}
		}

		if (segmentIndex === segmentCount - 1) {
			const order = runningOrder(this.states);
			order[0].lapsLed += 1;
			const positions = new Map(order.map((state, index) => [state.sessionEntryId, index + 1]));
			for (const state of this.states) {
				const setState = tyreState(state);
				state.lastLapMs = state.currentLapTimeMs;
				state.fastestLapMs =
					state.fastestLapMs === null
						? state.currentLapTimeMs
						: Math.min(state.fastestLapMs, state.currentLapTimeMs);
				setState.lapsUsed += 1;
				this.lapTelemetry.push({
					sessionEntryId: state.sessionEntryId,
					lap,
					lapTimeMs: state.currentLapTimeMs,
					elapsedMs: state.elapsedMs,
					fuelGrams: state.fuelGrams,
					tyreSetId: state.mountedTyreSetId,
					tyreWearBp: setState.wearBp,
					position: positions.get(state.sessionEntryId)!,
					...(this.weatherState
						? {
								temperatureDeciC: setState.temperatureDeciC!,
								racingLineWetnessBp: this.weatherState.segments.find(
									(surface) => surface.segmentId === segment.id
								)!.racingLineWetnessBp
							}
						: {})
				});
				this.events.push(
					createRaceEvent(
						this.events,
						'lap_completed',
						state.elapsedMs,
						lap,
						segment.id,
						[state.sessionEntryId],
						{ lapTimeMs: state.currentLapTimeMs, position: positions.get(state.sessionEntryId)! }
					)
				);
				state.currentLapTimeMs = 0;
				if (lap === this.input.rules.lapCount) {
					state.finished = true;
					this.events.push(
						createRaceEvent(
							this.events,
							'car_finished',
							state.elapsedMs,
							lap,
							segment.id,
							[state.sessionEntryId],
							{ position: positions.get(state.sessionEntryId)! }
						)
					);
				}
			}
		}
		this.stepIndex += 1;
	}

	snapshot(): SimulationSnapshot {
		const snapshot = {
			inputHash: this.inputHash,
			step: this.stepIndex,
			states: structuredClone(this.states),
			rngStates: Object.fromEntries(
				RNG_STREAM_NAMES.map((name) => [name, this.rng[name].serialize()])
			),
			events: structuredClone(this.events),
			lapTelemetry: structuredClone(this.lapTelemetry),
			sectorTelemetry: structuredClone(this.sectorTelemetry),
			appliedCommands: [...this.appliedCommands].sort((left, right) => left - right),
			pendingPitTyres: { ...this.pendingPitTyres },
			carsInPit: [...this.carsInPit].sort(),
			lastOvertakeAttemptStep: { ...this.lastOvertakeAttemptStep },
			...(this.liveCommands.length > 0 ? { liveCommands: structuredClone(this.liveCommands) } : {}),
			...(this.strategyController
				? { strategyControllerState: this.strategyController.snapshot() }
				: {})
		};
		return this.weatherState
			? { ...snapshot, weatherState: structuredClone(this.weatherState) }
			: snapshot;
	}

	run(): RaceRunResult {
		while (!this.isComplete()) this.step();
		const sessionResults = buildSessionResults(this.input, this.states);
		const raceDetails = buildRaceDetails(sessionResults, this.states);
		const pointAwards = buildPointAwards(this.input, sessionResults);
		const finalTyreWear = Object.fromEntries(
			this.states.map((state) => [
				state.sessionEntryId,
				Object.fromEntries(state.tyreSets.map((set) => [set.id, set.wearBp]))
			])
		);
		const base = {
			metadata: {
				formulaVersion: this.input.formulaVersion,
				engineVersion: this.input.engineVersion,
				rngAlgorithm: 'xoshiro128ss' as const,
				seed: this.input.seed,
				inputHash: this.inputHash
			},
			sessionResults,
			raceDetails,
			pointAwards,
			events: this.events,
			lapTelemetry: this.lapTelemetry,
			sectorTelemetry: this.sectorTelemetry,
			finalTyreWear
		};
		const finalState = this.weatherState
			? { ...base, states: this.states, weatherState: this.weatherState }
			: { ...base, states: this.states };
		return {
			...structuredClone(base),
			finalStateHash: hashString(canonicalStringify(finalState))
		};
	}
}

export function runRace(input: RaceInput): RaceRunResult {
	return new RaceSimulation(input).run();
}

export function runRaceFromCheckpoint(
	input: RaceInput,
	checkpointAfterSteps: number
): RaceRunResult {
	const simulation = new RaceSimulation(input);
	for (let step = 0; step < checkpointAfterSteps && !simulation.isComplete(); step += 1) {
		simulation.step();
	}
	return new RaceSimulation(input, simulation.snapshot()).run();
}
