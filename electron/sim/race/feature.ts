import {
	resolvePitStop,
	squadFromSpeedScalar,
	type PitCrewSquadStats,
	type PitErrorType,
	type PitPressure
} from '../pit-crew/index.js';
import type { ChaosIncident, SafetyCarState } from './chaos.js';
import { createRaceSession, mulberry32 } from './session.js';
import type {
	CarPerformance,
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
	/** @deprecated Prefer pitCrewSquad. */
	pitCrewSpeed?: number;
	/** Full squad stats from roster (averaged starters). */
	pitCrewSquad?: PitCrewSquadStats;
	/** Combat attrs; default overtaking←aggression, defending←composure. */
	overtaking?: number;
	defending?: number;
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
	pitError?: PitErrorType | null;
	crewMemberIds?: number[];
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
	/** Extra pit pressure for all stops (default inferred from safety / lead). */
	pitPressure?: PitPressure;
};

export function pitStationaryMs(args: {
	pitCrewSpeed: number;
	fuelAddedKg: number;
	tireChange: boolean;
}): number {
	const resolved = resolvePitStop({
		squad: squadFromSpeedScalar(args.pitCrewSpeed),
		fuelAddedKg: args.fuelAddedKg,
		tireChange: args.tireChange,
		pressure: 'normal',
		rng: () => 1 // no error in legacy helper
	});
	return resolved.baseMs;
}

/** Batch wrapper: steps all laps with no mid-race commands. */
export function simulateFeatureRace(
	track: TrackLapContext,
	entrants: RaceEntrant[],
	options: RaceOptions
): RaceResult {
	const session = createRaceSession(track, entrants, options);
	while (!session.isComplete()) {
		session.stepLap();
	}
	return session.result();
}

export { mulberry32 };
