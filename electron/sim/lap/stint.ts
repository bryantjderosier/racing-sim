import { simulateLap } from './simulate-lap.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	LapResult,
	PaceDirective,
	TrackLapContext
} from './types.js';

export type StintLap = {
	lapNumber: number;
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	tireLife: number;
	tireCoreTemp: number;
	fuelKg: number;
	batteryPct: number;
};

export type StintResult = {
	laps: StintLap[];
	bestLapMs: number;
	bestLapNumber: number;
	averageLapMs: number;
	stateAfter: CarRuntimeState;
};

export type StintOptions = {
	/** Flying laps to simulate (out-lap prep can be added later). */
	lapCount: number;
	/** Optional per-stint pace override; defaults to state.pace. */
	pace?: PaceDirective;
	/** Rubbering-in: grip multiplier gain per completed lap. */
	gripGainPerLap?: number;
	gripCap?: number;
};

/**
 * Practice / long-run stint: chain N laps, carrying tire, fuel, battery, and track evolution.
 */
export function simulateStint(
	car: CarPerformance,
	driver: DriverLapAttrs,
	track: TrackLapContext,
	initialState: CarRuntimeState,
	options: StintOptions
): StintResult {
	const gripGain = options.gripGainPerLap ?? 0.004;
	const gripCap = options.gripCap ?? 1.02;
	let runtime: CarRuntimeState = {
		...initialState,
		pace: options.pace ?? initialState.pace
	};
	let trackCtx = { ...track, trackGripMultiplier: track.trackGripMultiplier };
	const laps: StintLap[] = [];

	for (let i = 1; i <= options.lapCount; i++) {
		const lap: LapResult = simulateLap(car, driver, trackCtx, runtime);
		runtime = lap.stateAfter;
		trackCtx = {
			...trackCtx,
			trackGripMultiplier: Math.min(gripCap, trackCtx.trackGripMultiplier + gripGain)
		};
		laps.push({
			lapNumber: i,
			sectorTimesMs: lap.sectorTimesMs,
			lapTimeMs: lap.lapTimeMs,
			tireLife: runtime.tire.life,
			tireCoreTemp: runtime.tire.coreTemp,
			fuelKg: runtime.fuelKg,
			batteryPct: runtime.batteryPct
		});
	}

	let bestLapMs = Infinity;
	let bestLapNumber = 1;
	let sum = 0;
	for (const lap of laps) {
		sum += lap.lapTimeMs;
		if (lap.lapTimeMs < bestLapMs) {
			bestLapMs = lap.lapTimeMs;
			bestLapNumber = lap.lapNumber;
		}
	}

	return {
		laps,
		bestLapMs,
		bestLapNumber,
		averageLapMs: Math.round(sum / laps.length),
		stateAfter: runtime
	};
}
