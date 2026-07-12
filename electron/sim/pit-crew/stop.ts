import {
	FATIGUE_PENALTY_PER_PCT,
	PIT_ERROR_BASE,
	PIT_ERROR_MS,
	PIT_TIRE_MS_FAST,
	PIT_TIRE_MS_SLOW,
	type PitErrorType,
	type PitPressure
} from './constants.js';

export type PitCrewMemberStats = {
	staffId: number;
	speed: number;
	consistency: number;
	focus: number;
	fatiguePct: number;
};

export type PitCrewSquadStats = {
	memberIds: number[];
	speed: number;
	consistency: number;
	focus: number;
	fatigueAvg: number;
	/** Effective attrs after fatigue penalty. */
	effectiveSpeed: number;
	effectiveConsistency: number;
	effectiveFocus: number;
};

function clampAttr(n: number): number {
	return Math.max(1, Math.min(99, n));
}

function fatiguePenalty(fatiguePct: number): number {
	return Math.max(0, Math.min(100, fatiguePct)) * FATIGUE_PENALTY_PER_PCT;
}

export function averageSquad(members: PitCrewMemberStats[]): PitCrewSquadStats {
	if (members.length === 0) {
		return {
			memberIds: [],
			speed: 50,
			consistency: 50,
			focus: 50,
			fatigueAvg: 0,
			effectiveSpeed: 50,
			effectiveConsistency: 50,
			effectiveFocus: 50
		};
	}
	const n = members.length;
	const speed = members.reduce((s, m) => s + m.speed, 0) / n;
	const consistency = members.reduce((s, m) => s + m.consistency, 0) / n;
	const focus = members.reduce((s, m) => s + m.focus, 0) / n;
	const fatigueAvg = members.reduce((s, m) => s + m.fatiguePct, 0) / n;
	const pen = fatiguePenalty(fatigueAvg);
	return {
		memberIds: members.map((m) => m.staffId),
		speed,
		consistency,
		focus,
		fatigueAvg,
		effectiveSpeed: clampAttr(speed - pen),
		effectiveConsistency: clampAttr(consistency - pen),
		effectiveFocus: clampAttr(focus - pen)
	};
}

/** Theoretical stationary tire+fuel time from squad speed (no errors). */
export function baseStationaryMs(args: {
	speed: number;
	fuelAddedKg: number;
	tireChange: boolean;
}): number {
	const speed = clampAttr(args.speed);
	const tireMs = args.tireChange
		? PIT_TIRE_MS_SLOW - ((speed - 1) / 98) * (PIT_TIRE_MS_SLOW - PIT_TIRE_MS_FAST)
		: 0;
	const fuelMs = Math.max(0, args.fuelAddedKg) * 80;
	return Math.round(tireMs + fuelMs);
}

export type ResolvePitStopResult = {
	stationaryMs: number;
	baseMs: number;
	errorMs: number;
	error: PitErrorType | null;
	errorChance: number;
	squad: PitCrewSquadStats;
};

/**
 * Squad-averaged stop with consistency/focus error matrix under pressure.
 */
export function resolvePitStop(args: {
	squad: PitCrewSquadStats;
	fuelAddedKg: number;
	tireChange?: boolean;
	pressure?: PitPressure;
	rng?: () => number;
}): ResolvePitStopResult {
	const rng = args.rng ?? Math.random;
	const pressure = args.pressure ?? 'normal';
	const tireChange = args.tireChange !== false;
	const baseMs = baseStationaryMs({
		speed: args.squad.effectiveSpeed,
		fuelAddedKg: args.fuelAddedKg,
		tireChange
	});

	const baseChance = PIT_ERROR_BASE[pressure];
	const cons = args.squad.effectiveConsistency;
	const foc = args.squad.effectiveFocus;
	// Consistency shrinks window; focus resists pressure
	const pressureAmp = pressure === 'normal' ? 1 : 1.15 + (99 - foc) / 200;
	const errorChance = Math.max(
		0.005,
		Math.min(0.45, baseChance * pressureAmp * (1.35 - cons / 100))
	);

	let error: PitErrorType | null = null;
	let errorMs = 0;
	if (rng() < errorChance) {
		const roll = rng();
		if (roll < 0.55) error = 'jammed_nut';
		else if (roll < 0.85) error = 'cross_thread';
		else error = 'unsafe_release';
		const band = PIT_ERROR_MS[error];
		errorMs =
			band.min === band.max
				? band.min
				: Math.round(band.min + rng() * (band.max - band.min));
	}

	return {
		stationaryMs: baseMs + errorMs,
		baseMs,
		errorMs,
		error,
		errorChance,
		squad: args.squad
	};
}

/** Map legacy single speed scalar → squad-like stats for backward compat. */
export function squadFromSpeedScalar(speed: number): PitCrewSquadStats {
	const s = clampAttr(speed);
	return averageSquad([
		{ staffId: 0, speed: s, consistency: s, focus: s, fatiguePct: 0 }
	]);
}
