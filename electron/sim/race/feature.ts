import { simulateLap } from '../lap/simulate-lap.js';
import {
	resolveChaosLap,
	safetyDuration,
	safetyLapMult,
	safetyPitFactor,
	type ChaosIncident,
	type SafetyCarState
} from './chaos.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	PaceDirective,
	TireCompound,
	TrackLapContext
} from '../lap/types.js';

export type PitStopPlan = {
	/** Complete this lap, then pit. */
	afterLap: number;
	compound: TireCompound;
	/** Absolute fuel load after the stop (not delta). */
	fuelKg: number;
	paceAfter?: PaceDirective;
};

export type RaceEntrant = {
	id: number;
	name: string;
	car: CarPerformance;
	driver: DriverLapAttrs;
	gridPosition: number;
	pace?: PaceDirective;
	compound?: TireCompound;
	fuelKg: number;
	batteryPct?: number;
	pits?: PitStopPlan[];
	pitCrewSpeed?: number;
	/** Starting part reliability pool 0–100 (default from damageFactor). */
	reliability?: number;
	/** Lightweight builds wear parts faster. */
	lightweightAmp?: number;
};

export type RacePitEvent = {
	lapNumber: number;
	entrantId: number;
	name: string;
	compoundIn: TireCompound;
	compoundOut: TireCompound;
	fuelBefore: number;
	fuelAfter: number;
	stationaryMs: number;
	pitLaneMs: number;
	totalPitMs: number;
	underSafety: SafetyCarState;
};

export type RaceLapLine = {
	lapNumber: number;
	entrantId: number;
	name: string;
	position: number;
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	chaosMs: number;
	pitMs: number;
	cumulativeMs: number;
	gapToLeaderMs: number;
	intervalMs: number;
	tireLife: number;
	tireCoreTemp: number;
	fuelKg: number;
	batteryPct: number;
	compound: TireCompound;
	pitted: boolean;
	reliability: number;
	retired: boolean;
	safetyCarState: SafetyCarState;
};

export type RaceResult = {
	laps: number;
	lines: RaceLapLine[];
	pitEvents: RacePitEvent[];
	incidents: ChaosIncident[];
	safetyPeriods: { startLap: number; endLap: number; state: SafetyCarState }[];
	classification: {
		position: number;
		entrantId: number;
		name: string;
		status: 'finished' | 'dnf';
		totalMs: number;
		gapToLeaderMs: number;
		bestLapMs: number;
		bestLapNumber: number;
		endTireLife: number;
		endFuelKg: number;
		endReliability: number;
		stops: number;
		lapsCompleted: number;
	}[];
};

export type RaceOptions = {
	laps: number;
	gripGainPerLap?: number;
	gripCap?: number;
	pitLaneLossSeconds?: number;
	/** Enable driver/mechanical chaos (default true). */
	chaos?: boolean;
	/** RNG for chaos rolls (default Math.random). */
	rng?: () => number;
};

export function pitStationaryMs(args: {
	pitCrewSpeed: number;
	fuelAddedKg: number;
	tireChange: boolean;
}): number {
	const speed = Math.max(1, Math.min(99, args.pitCrewSpeed));
	const tireMs = args.tireChange ? 4200 - ((speed - 1) / 98) * (4200 - 1900) : 0;
	const fuelMs = Math.max(0, args.fuelAddedKg) * 80;
	return Math.round(tireMs + fuelMs);
}

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function simulateFeatureRace(
	track: TrackLapContext,
	entrants: RaceEntrant[],
	options: RaceOptions
): RaceResult {
	const gripGain = options.gripGainPerLap ?? 0.003;
	const gripCap = options.gripCap ?? 1.02;
	const basePitLaneMs = Math.round((options.pitLaneLossSeconds ?? 21) * 1000);
	const chaosOn = options.chaos !== false;
	const rng = options.rng ?? Math.random;

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
	};

	const runners: Runner[] = [...entrants]
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.map((e) => ({
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
				pace: e.pace ?? 'balanced',
				energy: 'balanced' as const,
				dirtyAir: 0
			},
			cumulativeMs: 0,
			bestLapMs: Infinity,
			bestLapNumber: 1,
			stops: 0,
			pitQueue: [...(e.pits ?? [])].sort((a, b) => a.afterLap - b.afterLap),
			retired: false,
			lapsCompleted: 0
		}));

	let trackCtx = { ...track, trackGripMultiplier: track.trackGripMultiplier };
	let safety: SafetyCarState = 'none';
	let safetyLapsLeft = 0;
	let pendingSafety: SafetyCarState = 'none';
	const lines: RaceLapLine[] = [];
	const pitEvents: RacePitEvent[] = [];
	const incidents: ChaosIncident[] = [];
	const safetyPeriods: RaceResult['safetyPeriods'] = [];
	let safetyPeriodStart: number | null = null;

	for (let lap = 1; lap <= options.laps; lap++) {
		// Deploy SC/VSC at the start of the lap after the trigger (keeps the field in sync).
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
		}

		const active = runners.filter((r) => !r.retired);
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
				safety === 'safety_car' || safety === 'vsc' ? 'conserve' : runner.state.pace;

			runner.state = {
				...runner.state,
				pace: paceForLap,
				dirtyAir: lap === 1 || safety !== 'none' ? 0 : Math.min(0.55, gap / 8000)
			};

			const compoundBefore = runner.state.tire.compound;
			const fuelBefore = runner.state.fuelKg;
			const result = simulateLap(runner.car, runner.entrant.driver, trackCtx, runner.state);
			runner.state = result.stateAfter;

			let lapTimeMs = Math.round(result.lapTimeMs * safetyLapMult(safety));
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
						trafficPressure: Math.min(1, trafficPressure / 3)
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
					const inc: ChaosIncident = {
						...outcome.incident,
						entrantId: runner.entrant.id
					};
					incidents.push(inc);
				}

				if (outcome.retired) {
					runner.retired = true;
				}

				if (outcome.triggeredSafety !== 'none') {
					const rank = { none: 0, vsc: 1, safety_car: 2 } as const;
					if (rank[outcome.triggeredSafety] > rank[pendingSafety]) {
						pendingSafety = outcome.triggeredSafety;
					}
				}
			} else if (chaosOn) {
				// Still tick light reliability wear under SC
				runner.reliability = Math.max(0, runner.reliability - 0.15);
			}

			let pitMs = 0;
			let pitted = false;
			const stop = runner.pitQueue[0];
			if (!runner.retired && stop && stop.afterLap === lap) {
				runner.pitQueue.shift();
				const fuelAdded = Math.max(0, stop.fuelKg - runner.state.fuelKg);
				const stationary = pitStationaryMs({
					pitCrewSpeed: runner.entrant.pitCrewSpeed ?? 70,
					fuelAddedKg: fuelAdded,
					tireChange: true
				});
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
					underSafety: safety
				});
				runner.state = {
					...runner.state,
					fuelKg: stop.fuelKg,
					tire: { compound: stop.compound, life: 1, coreTemp: 70 },
					pace: stop.paceAfter ?? runner.entrant.pace ?? 'balanced',
					batteryPct: Math.min(100, runner.state.batteryPct + 15)
				};
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

		// Under SC, gently bunch gaps (design: SC bunches the field)
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

		const ordered = [
			...racing,
			...lapResults.filter((r) => r.runner.retired)
		];
		const lead = racing[0]?.runner.cumulativeMs ?? 0;

		ordered.forEach((row, idx) => {
			const prevCum =
				idx === 0 || row.runner.retired
					? lead
					: ordered[idx - 1].runner.retired
						? lead
						: ordered[idx - 1].runner.cumulativeMs;
			lines.push({
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
			});
		});

		if (safetyLapsLeft > 0) safetyLapsLeft -= 1;

		trackCtx = {
			...trackCtx,
			trackGripMultiplier: Math.min(gripCap, trackCtx.trackGripMultiplier + gripGain)
		};
	}

	if (safety !== 'none' && safetyPeriodStart != null) {
		safetyPeriods.push({
			startLap: safetyPeriodStart,
			endLap: options.laps,
			state: safety
		});
	}

	const finished = runners.filter((r) => !r.retired).sort((a, b) => a.cumulativeMs - b.cumulativeMs);
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

	return { laps: options.laps, lines, pitEvents, incidents, safetyPeriods, classification };
}

export { mulberry32 };
