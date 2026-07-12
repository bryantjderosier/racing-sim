import { simulateLap } from '../lap/simulate-lap.js';
import {
	DEFAULT_PIT_LANE_LOSS_S,
	TRACK_GRIP_CAP,
	TRACK_GRIP_GAIN_PER_LAP
} from '../balance/race.js';
import {
	resolvePitStop,
	squadFromSpeedScalar,
	type PitPressure
} from '../pit-crew/index.js';
import {
	resolveChaosLap,
	safetyDuration,
	safetyLapMult,
	safetyPitFactor,
	type ChaosIncident,
	type SafetyCarState
} from './chaos.js';
import { createCombat, resolveCombatLap, type ActiveCombat, type CombatOrder } from './combat.js';
import type {
	CarPerformance,
	CarRuntimeState,
	EnergyDirective,
	PaceDirective,
	TireCompound,
	TrackLapContext
} from '../lap/types.js';
import type {
	PitStopPlan,
	RaceEntrant,
	RaceLapLine,
	RaceOptions,
	RacePitEvent,
	RaceResult
} from './feature.js';

export type RaceCommand =
	| { type: 'setPace'; entrantId: number; pace: PaceDirective }
	| { type: 'setEnergy'; entrantId: number; energy: EnergyDirective }
	| {
			type: 'boxThisLap';
			entrantId: number;
			compound: TireCompound;
			fuelKg: number;
			paceAfter?: PaceDirective;
			/** If true, pit after the upcoming lap (default). */
			afterCurrentLap?: boolean;
	  }
	| { type: 'cancelBox'; entrantId: number }
	| {
			type: 'combat';
			entrantId: number;
			order: CombatOrder;
			laps?: number;
			teammateId?: number;
	  }
	| { type: 'clearCombat'; entrantId: number };

export type RunnerTelemetry = {
	entrantId: number;
	name: string;
	position: number;
	gapToLeaderMs: number;
	tireLife: number;
	tireCoreTemp: number;
	fuelKg: number;
	batteryPct: number;
	pace: PaceDirective;
	energy: EnergyDirective;
	pendingBox: PitStopPlan | null;
	combat: ActiveCombat | null;
	retired: boolean;
	cumulativeMs: number;
};

export type RaceTelemetry = {
	lap: number;
	totalLaps: number;
	safety: SafetyCarState;
	cars: RunnerTelemetry[];
};

type Runner = {
	entrant: RaceEntrant;
	state: CarRuntimeState;
	car: CarPerformance;
	reliability: number;
	cumulativeMs: number;
	bestLapMs: number;
	bestLapNumber: number;
	stops: number;
	pitQueue: PitStopPlan[];
	retired: boolean;
	lapsCompleted: number;
	/** Player-set pace (restored after SC). */
	desiredPace: PaceDirective;
	combat: ActiveCombat | null;
	overtaking: number;
	defending: number;
};

export type RaceSession = {
	stepLap: () => RaceLapLine[];
	applyCommand: (cmd: RaceCommand) => void;
	telemetry: () => RaceTelemetry;
	isComplete: () => boolean;
	result: () => RaceResult;
	currentLap: () => number;
};

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Lap-steppable feature race. Commands apply before the next stepLap.
 */
export function createRaceSession(
	track: TrackLapContext,
	entrants: RaceEntrant[],
	options: RaceOptions
): RaceSession {
	const gripGain = options.gripGainPerLap ?? TRACK_GRIP_GAIN_PER_LAP;
	const gripCap = options.gripCap ?? TRACK_GRIP_CAP;
	const basePitLaneMs = Math.round(
		(options.pitLaneLossSeconds ?? DEFAULT_PIT_LANE_LOSS_S) * 1000
	);
	const chaosOn = options.chaos !== false;
	const rng = options.rng ?? Math.random;

	const runners: Runner[] = [...entrants]
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.map((e) => {
			const desiredPace = e.pace ?? 'balanced';
			return {
				entrant: e,
				car: { ...e.car },
				reliability: e.reliability ?? Math.round(e.car.damageFactor * 100),
				state: {
					fuelKg: e.fuelKg,
					batteryPct: e.batteryPct ?? 100,
					tire: {
						compound: e.compound ?? 'medium',
						life: 1,
						coreTemp: 75
					},
					pace: desiredPace,
					energy: 'balanced' as const,
					dirtyAir: 0
				},
				cumulativeMs: 0,
				bestLapMs: Infinity,
				bestLapNumber: 1,
				stops: 0,
				pitQueue: [...(e.pits ?? [])].sort((a, b) => a.afterLap - b.afterLap),
				retired: false,
				lapsCompleted: 0,
				desiredPace,
				combat: null,
				overtaking: e.overtaking ?? e.driver.aggression,
				defending: e.defending ?? e.driver.composure
			};
		});

	let trackCtx = { ...track, trackGripMultiplier: track.trackGripMultiplier };
	let safety: SafetyCarState = 'none';
	let safetyLapsLeft = 0;
	let pendingSafety: SafetyCarState = 'none';
	const lines: RaceLapLine[] = [];
	const pitEvents: RacePitEvent[] = [];
	const incidents: ChaosIncident[] = [];
	const safetyPeriods: RaceResult['safetyPeriods'] = [];
	let safetyPeriodStart: number | null = null;
	let nextLap = 1;
	const totalLaps = options.laps;

	function findRunner(id: number): Runner {
		const r = runners.find((x) => x.entrant.id === id);
		if (!r) throw new Error(`Entrant ${id} not in race`);
		return r;
	}

	function applyCommand(cmd: RaceCommand): void {
		if (nextLap > totalLaps) throw new Error('Race already complete');
		const r = findRunner(cmd.entrantId);
		if (r.retired) return;

		switch (cmd.type) {
			case 'setPace':
				r.desiredPace = cmd.pace;
				if (safety === 'none') r.state = { ...r.state, pace: cmd.pace };
				break;
			case 'setEnergy':
				r.state = { ...r.state, energy: cmd.energy };
				break;
			case 'boxThisLap': {
				const afterLap = cmd.afterCurrentLap === false ? nextLap - 1 : nextLap;
				const plan: PitStopPlan = {
					afterLap: Math.max(1, afterLap),
					compound: cmd.compound,
					fuelKg: cmd.fuelKg,
					paceAfter: cmd.paceAfter
				};
				r.pitQueue = r.pitQueue.filter((p) => p.afterLap !== plan.afterLap);
				r.pitQueue.push(plan);
				r.pitQueue.sort((a, b) => a.afterLap - b.afterLap);
				break;
			}
			case 'cancelBox':
				r.pitQueue = [];
				break;
			case 'combat':
				r.combat = createCombat(cmd.order, {
					laps: cmd.laps,
					teammateId: cmd.teammateId
				});
				break;
			case 'clearCombat':
				r.combat = null;
				break;
		}
	}

	function stepLap(): RaceLapLine[] {
		if (nextLap > totalLaps) throw new Error('Race already complete');
		const lap = nextLap;

		if (pendingSafety !== 'none') {
			const rank = { none: 0, vsc: 1, safety_car: 2 } as const;
			if (rank[pendingSafety] > rank[safety]) {
				safety = pendingSafety;
				safetyLapsLeft = safetyDuration(safety);
				safetyPeriodStart = lap;
			}
			pendingSafety = 'none';
		}

		if (safetyLapsLeft <= 0 && safety !== 'none') {
			if (safetyPeriodStart != null) {
				safetyPeriods.push({
					startLap: safetyPeriodStart,
					endLap: lap - 1,
					state: safety
				});
				safetyPeriodStart = null;
			}
			safety = 'none';
			for (const r of runners) {
				if (!r.retired) r.state = { ...r.state, pace: r.desiredPace };
			}
		}

		const active = runners.filter((r) => !r.retired);
		const racingLeadId =
			active.length > 0
				? active.reduce((best, r) =>
						r.cumulativeMs < best.cumulativeMs ? r : best
					).entrant.id
				: undefined;

		const lapResults: {
			runner: Runner;
			sectorTimesMs: [number, number, number];
			lapTimeMs: number;
			chaosMs: number;
			pitMs: number;
			pitted: boolean;
			compound: TireCompound;
		}[] = [];

		for (const runner of runners) {
			if (runner.retired) {
				lapResults.push({
					runner,
					sectorTimesMs: [0, 0, 0],
					lapTimeMs: 0,
					chaosMs: 0,
					pitMs: 0,
					pitted: false,
					compound: runner.state.tire.compound
				});
				continue;
			}

			const leaderCum = Math.min(...active.map((r) => r.cumulativeMs || 0));
			const gap = runner.cumulativeMs - leaderCum;
			const trafficPressure = active.filter(
				(o) =>
					o !== runner && Math.abs(o.cumulativeMs - runner.cumulativeMs) < 1500
			).length;

			const paceForLap: PaceDirective =
				safety === 'safety_car' || safety === 'vsc' ? 'conserve' : runner.desiredPace;

			let dirtyAir = lap === 1 || safety !== 'none' ? 0 : Math.min(0.55, gap / 8000);
			let combatMs = 0;
			let incidentRiskMult = 1;

			if (runner.combat && runner.combat.lapsRemaining > 0 && safety === 'none') {
				const c = resolveCombatLap({
					combat: runner.combat,
					driver: runner.entrant.driver,
					overtaking: runner.overtaking,
					defending: runner.defending,
					rng
				});
				combatMs = c.timeDeltaMs;
				dirtyAir = Math.min(1, dirtyAir + c.dirtyAirAdd);
				incidentRiskMult = c.incidentRiskMult;
				runner.combat = {
					...runner.combat,
					lapsRemaining: runner.combat.lapsRemaining - 1
				};
				if (runner.combat.lapsRemaining <= 0) runner.combat = null;
			}

			runner.state = {
				...runner.state,
				pace: paceForLap,
				dirtyAir
			};

			const compoundBefore = runner.state.tire.compound;
			const fuelBefore = runner.state.fuelKg;
			const result = simulateLap(runner.car, runner.entrant.driver, trackCtx, runner.state);
			runner.state = result.stateAfter;

			let lapTimeMs = Math.round(result.lapTimeMs * safetyLapMult(safety)) + combatMs;
			let chaosMs = 0;

			if (chaosOn && safety === 'none') {
				const outcome = resolveChaosLap(
					{
						lapNumber: lap,
						track: trackCtx,
						state: runner.state,
						driver: runner.entrant.driver,
						car: runner.car,
						reliability: runner.reliability,
						trafficPressure: Math.min(1, (trafficPressure / 3) * incidentRiskMult)
					},
					{
						name: runner.entrant.name,
						rng,
						lightweightAmp: runner.entrant.lightweightAmp ?? 1
					}
				);
				runner.reliability = outcome.reliability;
				runner.car = { ...runner.car, damageFactor: outcome.damageFactor };
				chaosMs = outcome.timeLossMs;
				lapTimeMs += chaosMs;

				if (outcome.incident) {
					incidents.push({
						...outcome.incident,
						entrantId: runner.entrant.id
					});
				}
				if (outcome.retired) runner.retired = true;
				if (outcome.triggeredSafety !== 'none') {
					const rank = { none: 0, vsc: 1, safety_car: 2 } as const;
					if (rank[outcome.triggeredSafety] > rank[pendingSafety]) {
						pendingSafety = outcome.triggeredSafety;
					}
				}
			} else if (chaosOn) {
				runner.reliability = Math.max(0, runner.reliability - 0.15);
			}

			let pitMs = 0;
			let pitted = false;
			const stop = runner.pitQueue[0];
			if (!runner.retired && stop && stop.afterLap === lap) {
				runner.pitQueue.shift();
				const fuelAdded = Math.max(0, stop.fuelKg - runner.state.fuelKg);
				const squad =
					runner.entrant.pitCrewSquad ??
					squadFromSpeedScalar(runner.entrant.pitCrewSpeed ?? 70);
				const isLeader = runner.entrant.id === racingLeadId;
				let pressure: PitPressure = options.pitPressure ?? 'normal';
				if (!options.pitPressure) {
					if (safety === 'safety_car' || safety === 'vsc') pressure = 'safety_car';
					else if (isLeader) pressure = 'lead';
				}
				const resolved = resolvePitStop({
					squad,
					fuelAddedKg: fuelAdded,
					tireChange: true,
					pressure,
					rng
				});
				const stationary = resolved.stationaryMs;
				const lane = Math.round(basePitLaneMs * safetyPitFactor(safety));
				pitMs = lane + stationary;
				pitEvents.push({
					lapNumber: lap,
					entrantId: runner.entrant.id,
					name: runner.entrant.name,
					compoundIn: compoundBefore,
					compoundOut: stop.compound,
					fuelBefore,
					fuelAfter: stop.fuelKg,
					stationaryMs: stationary,
					pitLaneMs: lane,
					totalPitMs: pitMs,
					underSafety: safety,
					pitError: resolved.error,
					crewMemberIds: squad.memberIds.filter((id) => id > 0)
				});
				runner.state = {
					...runner.state,
					fuelKg: stop.fuelKg,
					tire: { compound: stop.compound, life: 1, coreTemp: 70 },
					pace: stop.paceAfter ?? runner.desiredPace,
					batteryPct: Math.min(100, runner.state.batteryPct + 15)
				};
				if (stop.paceAfter) runner.desiredPace = stop.paceAfter;
				runner.stops += 1;
				pitted = true;
			}

			if (!runner.retired) {
				runner.cumulativeMs += lapTimeMs + pitMs;
				runner.lapsCompleted = lap;
				if (result.lapTimeMs < runner.bestLapMs) {
					runner.bestLapMs = result.lapTimeMs;
					runner.bestLapNumber = lap;
				}
			}

			lapResults.push({
				runner,
				sectorTimesMs: result.sectorTimesMs,
				lapTimeMs,
				chaosMs,
				pitMs,
				pitted,
				compound: runner.state.tire.compound
			});
		}

		const racing = lapResults.filter((r) => !r.runner.retired);
		racing.sort((a, b) => a.runner.cumulativeMs - b.runner.cumulativeMs);
		const leaderCum = racing[0]?.runner.cumulativeMs ?? 0;

		if (safety === 'safety_car' && racing.length > 1) {
			for (let i = 1; i < racing.length; i++) {
				const targetGap = i * 800;
				const actual = racing[i].runner.cumulativeMs - leaderCum;
				if (actual > targetGap) {
					racing[i].runner.cumulativeMs -= Math.round((actual - targetGap) * 0.35);
				}
			}
			racing.sort((a, b) => a.runner.cumulativeMs - b.runner.cumulativeMs);
		}

		const ordered = [...racing, ...lapResults.filter((r) => r.runner.retired)];
		const lead = racing[0]?.runner.cumulativeMs ?? 0;
		const lapLines: RaceLapLine[] = [];

		ordered.forEach((row, idx) => {
			const prevCum =
				idx === 0 || row.runner.retired
					? lead
					: ordered[idx - 1].runner.retired
						? lead
						: ordered[idx - 1].runner.cumulativeMs;
			const line: RaceLapLine = {
				lapNumber: lap,
				entrantId: row.runner.entrant.id,
				name: row.runner.entrant.name,
				position: row.runner.retired ? 0 : idx + 1,
				sectorTimesMs: row.sectorTimesMs,
				lapTimeMs: row.lapTimeMs,
				chaosMs: row.chaosMs,
				pitMs: row.pitMs,
				cumulativeMs: row.runner.cumulativeMs,
				gapToLeaderMs: row.runner.retired ? 0 : row.runner.cumulativeMs - lead,
				intervalMs: row.runner.retired ? 0 : row.runner.cumulativeMs - prevCum,
				tireLife: row.runner.state.tire.life,
				tireCoreTemp: row.runner.state.tire.coreTemp,
				fuelKg: row.runner.state.fuelKg,
				batteryPct: row.runner.state.batteryPct,
				compound: row.compound,
				pitted: row.pitted,
				reliability: row.runner.reliability,
				retired: row.runner.retired,
				safetyCarState: safety
			};
			lapLines.push(line);
			lines.push(line);
		});

		if (safetyLapsLeft > 0) safetyLapsLeft -= 1;
		trackCtx = {
			...trackCtx,
			trackGripMultiplier: Math.min(gripCap, trackCtx.trackGripMultiplier + gripGain)
		};
		nextLap += 1;
		return lapLines;
	}

	function telemetry(): RaceTelemetry {
		const active = runners.filter((r) => !r.retired);
		const sorted = [...active].sort((a, b) => a.cumulativeMs - b.cumulativeMs);
		const lead = sorted[0]?.cumulativeMs ?? 0;
		const posMap = new Map(sorted.map((r, i) => [r.entrant.id, i + 1]));
		return {
			lap: nextLap - 1,
			totalLaps,
			safety,
			cars: runners.map((r) => ({
				entrantId: r.entrant.id,
				name: r.entrant.name,
				position: r.retired ? 0 : (posMap.get(r.entrant.id) ?? 0),
				gapToLeaderMs: r.retired ? 0 : r.cumulativeMs - lead,
				tireLife: r.state.tire.life,
				tireCoreTemp: r.state.tire.coreTemp,
				fuelKg: r.state.fuelKg,
				batteryPct: r.state.batteryPct,
				pace: r.desiredPace,
				energy: r.state.energy,
				pendingBox: r.pitQueue[0] ?? null,
				combat: r.combat,
				retired: r.retired,
				cumulativeMs: r.cumulativeMs
			}))
		};
	}

	function result(): RaceResult {
		if (safety !== 'none' && safetyPeriodStart != null) {
			safetyPeriods.push({
				startLap: safetyPeriodStart,
				endLap: totalLaps,
				state: safety
			});
			safetyPeriodStart = null;
		}
		const finished = runners
			.filter((r) => !r.retired)
			.sort((a, b) => a.cumulativeMs - b.cumulativeMs);
		const dnfs = runners.filter((r) => r.retired);
		const classification = [
			...finished.map((r, idx) => ({
				position: idx + 1,
				entrantId: r.entrant.id,
				name: r.entrant.name,
				status: 'finished' as const,
				totalMs: r.cumulativeMs,
				gapToLeaderMs: r.cumulativeMs - finished[0].cumulativeMs,
				bestLapMs: r.bestLapMs === Infinity ? 0 : r.bestLapMs,
				bestLapNumber: r.bestLapNumber,
				endTireLife: r.state.tire.life,
				endFuelKg: r.state.fuelKg,
				endReliability: r.reliability,
				stops: r.stops,
				lapsCompleted: r.lapsCompleted
			})),
			...dnfs.map((r, idx) => ({
				position: finished.length + idx + 1,
				entrantId: r.entrant.id,
				name: r.entrant.name,
				status: 'dnf' as const,
				totalMs: r.cumulativeMs,
				gapToLeaderMs: 0,
				bestLapMs: r.bestLapMs === Infinity ? 0 : r.bestLapMs,
				bestLapNumber: r.bestLapNumber,
				endTireLife: r.state.tire.life,
				endFuelKg: r.state.fuelKg,
				endReliability: r.reliability,
				stops: r.stops,
				lapsCompleted: r.lapsCompleted
			}))
		];
		return {
			laps: totalLaps,
			lines: [...lines],
			pitEvents: [...pitEvents],
			incidents: [...incidents],
			safetyPeriods: [...safetyPeriods],
			classification
		};
	}

	return {
		stepLap,
		applyCommand,
		telemetry,
		isComplete: () => nextLap > totalLaps,
		result,
		currentLap: () => nextLap - 1
	};
}

export { mulberry32 };
export type { CombatOrder, ActiveCombat };
