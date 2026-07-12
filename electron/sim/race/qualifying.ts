import { simulateLap } from '../lap/simulate-lap.js';
import { QUALI_TRIM_BONUS_S } from '../practice/trim.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	TireCompound,
	TrackLapContext
} from '../lap/types.js';

export type QualifyingFormat = 'div1_knockout' | 'div2_single' | 'div3_reverse_points';

export type QualifyingEntrant = {
	id: number;
	name: string;
	car: CarPerformance;
	driver: DriverLapAttrs;
	/** Soft compound default for quali. */
	compound?: TireCompound;
	/** Quali trim tier 0–3 (from practice). */
	qualifyingTrimTier?: number;
	/** Div3 only: championship points (higher = further back on reverse grid). */
	championshipPoints?: number;
	/** Div3 tie-break: prior race finishing position (lower better). */
	priorRacePosition?: number;
};

export type QualifyingAttempt = {
	session: 'Q1' | 'Q2' | 'Q3' | 'SINGLE';
	entrantId: number;
	name: string;
	attempt: number;
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	/** After quali trim bonus applied. */
	effectiveLapTimeMs: number;
};

export type QualifyingElimination = {
	session: 'Q1' | 'Q2';
	entrantId: number;
	name: string;
	bestMs: number;
	gridPosition: number;
};

export type QualifyingResult = {
	format: QualifyingFormat;
	attempts: QualifyingAttempt[];
	eliminations: QualifyingElimination[];
	/** Final grid: position 1 = pole. */
	grid: {
		position: number;
		entrantId: number;
		name: string;
		bestMs: number | null;
		session: 'Q1' | 'Q2' | 'Q3' | 'SINGLE' | 'REVERSE';
	}[];
	/** Pole time for reference. */
	poleMs: number | null;
};

export type QualifyingOptions = {
	format: QualifyingFormat;
	/** Flying laps each driver may take per session stage. */
	attemptsPerSession?: number;
	/** Starting fuel for a flying lap. */
	fuelKg?: number;
	gripGainPerLap?: number;
	gripCap?: number;
	/**
	 * Div1 cutoffs. Defaults scale with field size (20→5/5/10).
	 * q1Eliminate + q2Eliminate + q3Count must equal field size.
	 */
	cutoffs?: { q1Eliminate: number; q2Eliminate: number };
};

function defaultCutoffs(n: number): { q1Eliminate: number; q2Eliminate: number; q3Count: number } {
	if (n <= 2) return { q1Eliminate: 0, q2Eliminate: 0, q3Count: n };
	const q1Eliminate = Math.max(1, Math.round(n * 0.25));
	const q2Eliminate = Math.max(1, Math.round(n * 0.25));
	let q3Count = n - q1Eliminate - q2Eliminate;
	if (q3Count < 1) {
		return { q1Eliminate: Math.max(1, n - 2), q2Eliminate: 1, q3Count: Math.max(1, n - Math.max(1, n - 2) - 1) };
	}
	return { q1Eliminate, q2Eliminate, q3Count };
}

function applyTrimBonus(lapMs: number, tier: number): number {
	const bonusS = QUALI_TRIM_BONUS_S[Math.min(3, Math.max(0, tier))] ?? 0;
	return Math.max(1, Math.round(lapMs - bonusS * 1000));
}

function freshQualiState(compound: TireCompound, fuelKg: number): CarRuntimeState {
	return {
		fuelKg,
		batteryPct: 100,
		tire: { compound, life: 1, coreTemp: 88 },
		pace: 'push',
		energy: 'overtake',
		dirtyAir: 0
	};
}

type Runner = {
	entrant: QualifyingEntrant;
	bestMs: number;
	bestSectors: [number, number, number] | null;
};

function runSessionAttempts(
	track: TrackLapContext,
	runners: Runner[],
	session: QualifyingAttempt['session'],
	attemptsPerSession: number,
	fuelKg: number,
	gripGain: number,
	gripCap: number,
	attemptsOut: QualifyingAttempt[]
): TrackLapContext {
	let trackCtx = { ...track };
	for (const runner of runners) {
		for (let a = 1; a <= attemptsPerSession; a++) {
			const state = freshQualiState(runner.entrant.compound ?? 'soft', fuelKg);
			const lap = simulateLap(runner.entrant.car, runner.entrant.driver, trackCtx, state);
			const effective = applyTrimBonus(lap.lapTimeMs, runner.entrant.qualifyingTrimTier ?? 0);
			attemptsOut.push({
				session,
				entrantId: runner.entrant.id,
				name: runner.entrant.name,
				attempt: a,
				sectorTimesMs: lap.sectorTimesMs,
				lapTimeMs: lap.lapTimeMs,
				effectiveLapTimeMs: effective
			});
			if (effective < runner.bestMs) {
				runner.bestMs = effective;
				runner.bestSectors = lap.sectorTimesMs;
			}
			trackCtx = {
				...trackCtx,
				trackGripMultiplier: Math.min(gripCap, trackCtx.trackGripMultiplier + gripGain)
			};
		}
	}
	return trackCtx;
}

function simulateDiv2Single(
	track: TrackLapContext,
	entrants: QualifyingEntrant[],
	opts: Required<Pick<QualifyingOptions, 'attemptsPerSession' | 'fuelKg' | 'gripGainPerLap' | 'gripCap'>>
): QualifyingResult {
	const attempts: QualifyingAttempt[] = [];
	const runners: Runner[] = entrants.map((e) => ({
		entrant: e,
		bestMs: Infinity,
		bestSectors: null
	}));
	runSessionAttempts(
		track,
		runners,
		'SINGLE',
		opts.attemptsPerSession,
		opts.fuelKg,
		opts.gripGainPerLap,
		opts.gripCap,
		attempts
	);
	runners.sort((a, b) => a.bestMs - b.bestMs);
	const grid = runners.map((r, i) => ({
		position: i + 1,
		entrantId: r.entrant.id,
		name: r.entrant.name,
		bestMs: r.bestMs,
		session: 'SINGLE' as const
	}));
	return {
		format: 'div2_single',
		attempts,
		eliminations: [],
		grid,
		poleMs: grid[0]?.bestMs ?? null
	};
}

function simulateDiv3Reverse(entrants: QualifyingEntrant[]): QualifyingResult {
	const sorted = [...entrants].sort((a, b) => {
		const pa = a.championshipPoints ?? 0;
		const pb = b.championshipPoints ?? 0;
		if (pb !== pa) return pa - pb; // reverse: fewer points → front
		const ra = a.priorRacePosition ?? 99;
		const rb = b.priorRacePosition ?? 99;
		if (ra !== rb) return rb - ra; // worse prior race → further forward when tied on points
		return a.id - b.id; // ballot
	});
	const grid = sorted.map((e, i) => ({
		position: i + 1,
		entrantId: e.id,
		name: e.name,
		bestMs: null,
		session: 'REVERSE' as const
	}));
	return {
		format: 'div3_reverse_points',
		attempts: [],
		eliminations: [],
		grid,
		poleMs: null
	};
}

function simulateDiv1Knockout(
	track: TrackLapContext,
	entrants: QualifyingEntrant[],
	opts: Required<
		Pick<QualifyingOptions, 'attemptsPerSession' | 'fuelKg' | 'gripGainPerLap' | 'gripCap'>
	> & { cutoffs?: QualifyingOptions['cutoffs'] }
): QualifyingResult {
	const n = entrants.length;
	const cuts = opts.cutoffs
		? {
				q1Eliminate: opts.cutoffs.q1Eliminate,
				q2Eliminate: opts.cutoffs.q2Eliminate,
				q3Count: n - opts.cutoffs.q1Eliminate - opts.cutoffs.q2Eliminate
			}
		: defaultCutoffs(n);

	const attempts: QualifyingAttempt[] = [];
	const eliminations: QualifyingElimination[] = [];
	let trackCtx = { ...track };

	let active: Runner[] = entrants.map((e) => ({
		entrant: e,
		bestMs: Infinity,
		bestSectors: null
	}));

	// Q1
	for (const r of active) r.bestMs = Infinity;
	trackCtx = runSessionAttempts(
		trackCtx,
		active,
		'Q1',
		opts.attemptsPerSession,
		opts.fuelKg,
		opts.gripGainPerLap,
		opts.gripCap,
		attempts
	);
	active.sort((a, b) => a.bestMs - b.bestMs);
	const q1Out = active.splice(active.length - cuts.q1Eliminate, cuts.q1Eliminate);
	// Slowest Q1 → back of grid (positions n, n-1, ...)
	q1Out
		.slice()
		.reverse()
		.forEach((r, i) => {
			eliminations.push({
				session: 'Q1',
				entrantId: r.entrant.id,
				name: r.entrant.name,
				bestMs: r.bestMs,
				gridPosition: n - i
			});
		});

	// Q2 — times wiped
	for (const r of active) r.bestMs = Infinity;
	trackCtx = runSessionAttempts(
		trackCtx,
		active,
		'Q2',
		opts.attemptsPerSession,
		opts.fuelKg,
		opts.gripGainPerLap,
		opts.gripCap,
		attempts
	);
	active.sort((a, b) => a.bestMs - b.bestMs);
	const q2Out = active.splice(active.length - cuts.q2Eliminate, cuts.q2Eliminate);
	const q2StartPos = n - cuts.q1Eliminate;
	q2Out
		.slice()
		.reverse()
		.forEach((r, i) => {
			eliminations.push({
				session: 'Q2',
				entrantId: r.entrant.id,
				name: r.entrant.name,
				bestMs: r.bestMs,
				gridPosition: q2StartPos - i
			});
		});

	// Q3 — times wiped; sets pole → P(q3Count)
	for (const r of active) r.bestMs = Infinity;
	runSessionAttempts(
		trackCtx,
		active,
		'Q3',
		opts.attemptsPerSession,
		opts.fuelKg,
		opts.gripGainPerLap,
		opts.gripCap,
		attempts
	);
	active.sort((a, b) => a.bestMs - b.bestMs);

	const grid: QualifyingResult['grid'] = [];
	active.forEach((r, i) => {
		grid.push({
			position: i + 1,
			entrantId: r.entrant.id,
			name: r.entrant.name,
			bestMs: r.bestMs,
			session: 'Q3'
		});
	});
	eliminations
		.filter((e) => e.session === 'Q2')
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.forEach((e) => {
			grid.push({
				position: e.gridPosition,
				entrantId: e.entrantId,
				name: e.name,
				bestMs: e.bestMs,
				session: 'Q2'
			});
		});
	eliminations
		.filter((e) => e.session === 'Q1')
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.forEach((e) => {
			grid.push({
				position: e.gridPosition,
				entrantId: e.entrantId,
				name: e.name,
				bestMs: e.bestMs,
				session: 'Q1'
			});
		});

	grid.sort((a, b) => a.position - b.position);

	return {
		format: 'div1_knockout',
		attempts,
		eliminations,
		grid,
		poleMs: grid[0]?.bestMs ?? null
	};
}

/**
 * Run qualifying and produce a starting grid.
 * Div1: Q1/Q2/Q3 knockout. Div2: single best-lap. Div3: reverse points (no laps).
 */
export function simulateQualifying(
	track: TrackLapContext,
	entrants: QualifyingEntrant[],
	options: QualifyingOptions
): QualifyingResult {
	const attemptsPerSession = options.attemptsPerSession ?? 2;
	const fuelKg = options.fuelKg ?? 15;
	const gripGainPerLap = options.gripGainPerLap ?? 0.004;
	const gripCap = options.gripCap ?? 1.02;
	const shared = { attemptsPerSession, fuelKg, gripGainPerLap, gripCap };

	if (options.format === 'div3_reverse_points') {
		return simulateDiv3Reverse(entrants);
	}
	if (options.format === 'div2_single') {
		return simulateDiv2Single(track, entrants, shared);
	}
	return simulateDiv1Knockout(track, entrants, { ...shared, cutoffs: options.cutoffs });
}
