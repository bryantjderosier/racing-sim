import { simulateLap } from '../lap/simulate-lap.js';
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
	/** Opening stint. */
	pace?: PaceDirective;
	compound?: TireCompound;
	fuelKg: number;
	batteryPct?: number;
	/** Ordered pit plan (no-stop = []). */
	pits?: PitStopPlan[];
	/** Pit crew Speed attr 0–99 (default 70). */
	pitCrewSpeed?: number;
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
};

export type RaceLapLine = {
	lapNumber: number;
	entrantId: number;
	name: string;
	position: number;
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	/** Pit loss applied after this lap (0 if no stop). */
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
};

export type RaceResult = {
	laps: number;
	lines: RaceLapLine[];
	pitEvents: RacePitEvent[];
	classification: {
		position: number;
		entrantId: number;
		name: string;
		totalMs: number;
		gapToLeaderMs: number;
		bestLapMs: number;
		bestLapNumber: number;
		endTireLife: number;
		endFuelKg: number;
		stops: number;
	}[];
};

export type RaceOptions = {
	laps: number;
	gripGainPerLap?: number;
	gripCap?: number;
	/** Base pit-lane transit loss (seconds). Overridden by track if present later. */
	pitLaneLossSeconds?: number;
};

/** Stationary service time from crew speed + fuel filled. */
export function pitStationaryMs(args: {
	pitCrewSpeed: number;
	fuelAddedKg: number;
	tireChange: boolean;
}): number {
	const speed = Math.max(1, Math.min(99, args.pitCrewSpeed));
	// Elite ~1.9s tires, slow ~4.2s
	const tireMs = args.tireChange ? (4200 - ((speed - 1) / 98) * (4200 - 1900)) : 0;
	const fuelMs = Math.max(0, args.fuelAddedKg) * 80; // 0.08s/kg
	return Math.round(tireMs + fuelMs);
}

/**
 * Feature race with optional pits: tire change + refuel.
 * Sprint = same engine with empty `pits` arrays.
 */
export function simulateFeatureRace(
	track: TrackLapContext,
	entrants: RaceEntrant[],
	options: RaceOptions
): RaceResult {
	const gripGain = options.gripGainPerLap ?? 0.003;
	const gripCap = options.gripCap ?? 1.02;
	const pitLaneMs = Math.round((options.pitLaneLossSeconds ?? 21) * 1000);

	type Runner = {
		entrant: RaceEntrant;
		state: CarRuntimeState;
		cumulativeMs: number;
		bestLapMs: number;
		bestLapNumber: number;
		stops: number;
		pitQueue: PitStopPlan[];
	};

	const runners: Runner[] = [...entrants]
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.map((e) => ({
			entrant: e,
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
			pitQueue: [...(e.pits ?? [])].sort((a, b) => a.afterLap - b.afterLap)
		}));

	let trackCtx = { ...track, trackGripMultiplier: track.trackGripMultiplier };
	const lines: RaceLapLine[] = [];
	const pitEvents: RacePitEvent[] = [];

	for (let lap = 1; lap <= options.laps; lap++) {
		const lapResults: {
			runner: Runner;
			sectorTimesMs: [number, number, number];
			lapTimeMs: number;
			pitMs: number;
			pitted: boolean;
			compound: TireCompound;
		}[] = [];

		for (const runner of runners) {
			const leaderCum = Math.min(...runners.map((r) => r.cumulativeMs || 0));
			const gap = runner.cumulativeMs - leaderCum;
			runner.state = {
				...runner.state,
				dirtyAir: lap === 1 ? 0 : Math.min(0.55, gap / 8000)
			};

			const compoundBefore = runner.state.tire.compound;
			const fuelBefore = runner.state.fuelKg;
			const result = simulateLap(runner.entrant.car, runner.entrant.driver, trackCtx, runner.state);
			runner.state = result.stateAfter;

			let pitMs = 0;
			let pitted = false;
			const stop = runner.pitQueue[0];
			if (stop && stop.afterLap === lap) {
				runner.pitQueue.shift();
				const fuelAdded = Math.max(0, stop.fuelKg - runner.state.fuelKg);
				const stationary = pitStationaryMs({
					pitCrewSpeed: runner.entrant.pitCrewSpeed ?? 70,
					fuelAddedKg: fuelAdded,
					tireChange: stop.compound !== compoundBefore || true
				});
				pitMs = pitLaneMs + stationary;
				pitEvents.push({
					lapNumber: lap,
					entrantId: runner.entrant.id,
					name: runner.entrant.name,
					compoundIn: compoundBefore,
					compoundOut: stop.compound,
					fuelBefore,
					fuelAfter: stop.fuelKg,
					stationaryMs: stationary,
					pitLaneMs,
					totalPitMs: pitMs
				});
				runner.state = {
					...runner.state,
					fuelKg: stop.fuelKg,
					tire: {
						compound: stop.compound,
						life: 1,
						coreTemp: 70
					},
					pace: stop.paceAfter ?? runner.state.pace,
					batteryPct: Math.min(100, runner.state.batteryPct + 15)
				};
				runner.stops += 1;
				pitted = true;
			}

			const stepMs = result.lapTimeMs + pitMs;
			runner.cumulativeMs += stepMs;
			if (result.lapTimeMs < runner.bestLapMs) {
				runner.bestLapMs = result.lapTimeMs;
				runner.bestLapNumber = lap;
			}

			lapResults.push({
				runner,
				sectorTimesMs: result.sectorTimesMs,
				lapTimeMs: result.lapTimeMs,
				pitMs,
				pitted,
				compound: runner.state.tire.compound
			});
		}

		lapResults.sort((a, b) => a.runner.cumulativeMs - b.runner.cumulativeMs);
		const leaderCum = lapResults[0].runner.cumulativeMs;

		lapResults.forEach((row, idx) => {
			const prevCum = idx === 0 ? leaderCum : lapResults[idx - 1].runner.cumulativeMs;
			lines.push({
				lapNumber: lap,
				entrantId: row.runner.entrant.id,
				name: row.runner.entrant.name,
				position: idx + 1,
				sectorTimesMs: row.sectorTimesMs,
				lapTimeMs: row.lapTimeMs,
				pitMs: row.pitMs,
				cumulativeMs: row.runner.cumulativeMs,
				gapToLeaderMs: row.runner.cumulativeMs - leaderCum,
				intervalMs: row.runner.cumulativeMs - prevCum,
				tireLife: row.runner.state.tire.life,
				tireCoreTemp: row.runner.state.tire.coreTemp,
				fuelKg: row.runner.state.fuelKg,
				batteryPct: row.runner.state.batteryPct,
				compound: row.compound,
				pitted: row.pitted
			});
		});

		trackCtx = {
			...trackCtx,
			trackGripMultiplier: Math.min(gripCap, trackCtx.trackGripMultiplier + gripGain)
		};
	}

	const classification = [...runners]
		.sort((a, b) => a.cumulativeMs - b.cumulativeMs)
		.map((r, idx, arr) => ({
			position: idx + 1,
			entrantId: r.entrant.id,
			name: r.entrant.name,
			totalMs: r.cumulativeMs,
			gapToLeaderMs: r.cumulativeMs - arr[0].cumulativeMs,
			bestLapMs: r.bestLapMs,
			bestLapNumber: r.bestLapNumber,
			endTireLife: r.state.tire.life,
			endFuelKg: r.state.fuelKg,
			stops: r.stops
		}));

	return { laps: options.laps, lines, pitEvents, classification };
}
