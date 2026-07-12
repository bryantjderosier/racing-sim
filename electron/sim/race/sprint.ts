import { simulateLap } from '../lap/simulate-lap.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	PaceDirective,
	TireCompound,
	TrackLapContext
} from '../lap/types.js';

export type SprintEntrant = {
	id: number;
	name: string;
	car: CarPerformance;
	driver: DriverLapAttrs;
	/** Starting grid (1 = pole). */
	gridPosition: number;
	pace?: PaceDirective;
	compound?: TireCompound;
	/** Starting fuel — must cover full distance; no refuel. */
	fuelKg: number;
	batteryPct?: number;
};

export type SprintLapLine = {
	lapNumber: number;
	entrantId: number;
	name: string;
	position: number;
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	cumulativeMs: number;
	gapToLeaderMs: number;
	intervalMs: number;
	tireLife: number;
	tireCoreTemp: number;
	fuelKg: number;
	batteryPct: number;
};

export type SprintResult = {
	laps: number;
	/** Flat list of every car every lap (sorted by lap, then position). */
	lines: SprintLapLine[];
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
	}[];
};

export type SprintOptions = {
	laps: number;
	gripGainPerLap?: number;
	gripCap?: number;
};

/**
 * No-pit, no-refuel sprint: all cars run the full distance on starting tires/fuel.
 * Track rubber evolves once per completed lap (field average contribution).
 */
export function simulateSprintRace(
	track: TrackLapContext,
	entrants: SprintEntrant[],
	options: SprintOptions
): SprintResult {
	const gripGain = options.gripGainPerLap ?? 0.003;
	const gripCap = options.gripCap ?? 1.02;

	type Runner = {
		entrant: SprintEntrant;
		state: CarRuntimeState;
		cumulativeMs: number;
		bestLapMs: number;
		bestLapNumber: number;
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
			bestLapNumber: 1
		}));

	let trackCtx = { ...track, trackGripMultiplier: track.trackGripMultiplier };
	const lines: SprintLapLine[] = [];

	for (let lap = 1; lap <= options.laps; lap++) {
		const lapResults: {
			runner: Runner;
			sectorTimesMs: [number, number, number];
			lapTimeMs: number;
		}[] = [];

		for (const runner of runners) {
			// Soft dirty-air: cars behind leader get a small hit based on cumulative gap proxy
			const leaderCum = Math.min(...runners.map((r) => r.cumulativeMs || 0));
			const gap = runner.cumulativeMs - leaderCum;
			runner.state = {
				...runner.state,
				dirtyAir: lap === 1 ? 0 : Math.min(0.55, gap / 8000)
			};

			const result = simulateLap(runner.entrant.car, runner.entrant.driver, trackCtx, runner.state);
			runner.state = result.stateAfter;
			runner.cumulativeMs += result.lapTimeMs;
			if (result.lapTimeMs < runner.bestLapMs) {
				runner.bestLapMs = result.lapTimeMs;
				runner.bestLapNumber = lap;
			}
			lapResults.push({
				runner,
				sectorTimesMs: result.sectorTimesMs,
				lapTimeMs: result.lapTimeMs
			});
		}

		// Order by cumulative race time
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
				cumulativeMs: row.runner.cumulativeMs,
				gapToLeaderMs: row.runner.cumulativeMs - leaderCum,
				intervalMs: row.runner.cumulativeMs - prevCum,
				tireLife: row.runner.state.tire.life,
				tireCoreTemp: row.runner.state.tire.coreTemp,
				fuelKg: row.runner.state.fuelKg,
				batteryPct: row.runner.state.batteryPct
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
			endFuelKg: r.state.fuelKg
		}));

	return { laps: options.laps, lines, classification };
}
