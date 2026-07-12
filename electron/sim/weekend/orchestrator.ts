import {
	applySetupTweak,
	createPracticeSession,
	runPracticeStint,
	type PracticePersonnel,
	type PracticeSessionState
} from '../practice/index.js';
import type { KnowledgeTrims } from '../practice/types.js';
import {
	mulberry32,
	simulateFeatureRace,
	simulateQualifying,
	type PitStopPlan,
	type QualifyingFormat,
	type QualifyingResult,
	type RaceEntrant,
	type RaceResult
} from '../race/index.js';
import type {
	CarPerformance,
	DriverLapAttrs,
	PaceDirective,
	SetupVector,
	TireCompound,
	TrackLapContext
} from '../lap/types.js';

export type WeekendEntrant = {
	id: number;
	name: string;
	car: CarPerformance;
	driver: DriverLapAttrs;
	personnel: PracticePersonnel;
	raceCompound?: TireCompound;
	racePace?: PaceDirective;
	raceFuelKg?: number;
	reliability?: number;
	lightweightAmp?: number;
	pitCrewSpeed?: number;
	pits?: PitStopPlan[];
};

export type WeekendPracticeSummary = {
	entrantId: number;
	name: string;
	stints: number;
	bestLapMs: number;
	setupDistanceBefore: number;
	setupDistanceAfter: number;
	qualifyingTrimTier: number;
	trims: KnowledgeTrims;
	briefLines: string[];
	briefClarity: string;
};

export type WeekendResult = {
	practice: WeekendPracticeSummary[];
	qualifying: QualifyingResult;
	race: RaceResult;
	finalSetups: { entrantId: number; setup: SetupVector }[];
};

export type WeekendOptions = {
	track: TrackLapContext;
	format: QualifyingFormat;
	raceLaps: number;
	practiceStints?: number;
	practiceLapsPerStint?: number;
	chaos?: boolean;
	rng?: () => number;
	seed?: number;
	qualiAttempts?: number;
	qualiCutoffs?: { q1Eliminate: number; q2Eliminate: number };
	pitLaneLossSeconds?: number;
};

function cloneSetup(s: SetupVector): SetupVector {
	return { ...s };
}

/**
 * Auto-apply setup from engineering brief quality (stand-in for player tweaks).
 */
function autoApplyBriefSetup(
	session: PracticeSessionState,
	focusKeys: (keyof SetupVector)[],
	clarity: string,
	rng: () => number
): PracticeSessionState {
	const target = session.track.setupTarget;
	const current = session.setupCurrent;
	const tweak: Partial<SetupVector> = {};

	const keys =
		focusKeys.length > 0
			? focusKeys
			: (Object.keys(target) as (keyof SetupVector)[]).slice(0, 2);

	const blend =
		clarity === 'high' ? 1 : clarity === 'mid' ? 0.55 : 0.2 + rng() * 0.15;

	for (const key of keys) {
		const delta = target[key] - current[key];
		const noise = clarity === 'low' ? (rng() - 0.5) * Math.abs(delta || 1) : 0;
		tweak[key] = current[key] + delta * blend + noise;
	}

	if (clarity === 'high') {
		for (const key of Object.keys(target) as (keyof SetupVector)[]) {
			if (tweak[key] === undefined) {
				tweak[key] = current[key] + (target[key] - current[key]) * 0.35;
			}
		}
	}

	return applySetupTweak(session, tweak);
}

function defaultPits(raceLaps: number, entrantId: number): PitStopPlan[] {
	const window = Math.max(6, Math.floor(raceLaps * 0.4) + (entrantId % 3));
	return [
		{
			afterLap: Math.min(raceLaps - 2, window),
			compound: 'medium',
			fuelKg: 36,
			paceAfter: 'push'
		}
	];
}

function setupSpread(a: SetupVector, b: SetupVector): number {
	const keys = Object.keys(a) as (keyof SetupVector)[];
	let sum = 0;
	for (const k of keys) {
		const scale = k.includes('Wing') || k === 'brakeBias' ? 10 : k.includes('Ride') ? 20 : 5;
		const d = (a[k] - b[k]) / scale;
		sum += d * d;
	}
	return Math.sqrt(sum / keys.length);
}

/**
 * Full weekend pipeline: practice (trims + setup) → qualifying → feature race.
 */
export function simulateWeekend(
	entrants: WeekendEntrant[],
	options: WeekendOptions
): WeekendResult {
	const rng =
		options.rng ?? (options.seed != null ? mulberry32(options.seed) : Math.random);
	const practiceStints = options.practiceStints ?? 2;
	const lapsPerStint = options.practiceLapsPerStint ?? 4;

	const practiceSummaries: WeekendPracticeSummary[] = [];
	const finalSetups: { entrantId: number; setup: SetupVector }[] = [];
	const trimByEntrant = new Map<number, KnowledgeTrims>();
	const setupByEntrant = new Map<number, SetupVector>();

	const target = options.track.setupTarget;
	const badStart: SetupVector = {
		...target,
		rearRideHeightMm: target.rearRideHeightMm + 5,
		rearArb: target.rearArb + 2,
		frontWingAngle: target.frontWingAngle + 2
	};

	for (const e of entrants) {
		let session = createPracticeSession(options.track, cloneSetup(badStart));
		const distBefore = setupSpread(session.setupCurrent, target);
		let bestLapMs = Infinity;
		let lastBriefLines: string[] = [];
		let lastClarity = 'low';

		for (let s = 0; s < practiceStints; s++) {
			const { session: next, result } = runPracticeStint(
				session,
				e.car,
				e.driver,
				e.personnel,
				{
					fuelKg: 28,
					batteryPct: 90,
					tire: { compound: 'soft', life: 1, coreTemp: 72 },
					pace: 'push',
					energy: 'balanced',
					dirtyAir: 0
				},
				{ lapCount: lapsPerStint, pace: 'push', intent: 'qualifying_trim' }
			);
			session = next;
			bestLapMs = Math.min(bestLapMs, result.stint.bestLapMs);
			lastBriefLines = result.brief.lines;
			lastClarity = result.brief.clarity;
			session = autoApplyBriefSetup(
				session,
				result.brief.trueFocusKeys,
				result.brief.clarity,
				rng
			);
		}

		trimByEntrant.set(e.id, session.trims);
		setupByEntrant.set(e.id, cloneSetup(session.setupCurrent));
		finalSetups.push({ entrantId: e.id, setup: cloneSetup(session.setupCurrent) });

		practiceSummaries.push({
			entrantId: e.id,
			name: e.name,
			stints: practiceStints,
			bestLapMs,
			setupDistanceBefore: distBefore,
			setupDistanceAfter: setupSpread(session.setupCurrent, target),
			qualifyingTrimTier: session.trims.qualifying.tier,
			trims: session.trims,
			briefLines: lastBriefLines,
			briefClarity: lastClarity
		});
	}

	// Quali track uses mean practiced setup (per-car setup windows land in a later pass).
	const setups = [...setupByEntrant.values()];
	const meanSetup = cloneSetup(target);
	for (const key of Object.keys(target) as (keyof SetupVector)[]) {
		meanSetup[key] =
			setups.reduce((sum, s) => sum + s[key], 0) / Math.max(1, setups.length);
	}

	const qualiTrack: TrackLapContext = {
		...options.track,
		setupCurrent: meanSetup,
		setupTarget: target,
		trackGripMultiplier: Math.min(options.track.trackGripMultiplier, 0.96)
	};

	const qualifying = simulateQualifying(
		qualiTrack,
		entrants.map((e) => ({
			id: e.id,
			name: e.name,
			car: e.car,
			driver: e.driver,
			compound: 'soft' as const,
			qualifyingTrimTier: trimByEntrant.get(e.id)?.qualifying.tier ?? 0
		})),
		{
			format: options.format,
			attemptsPerSession: options.qualiAttempts ?? 2,
			cutoffs: options.qualiCutoffs
		}
	);

	const byId = new Map(entrants.map((e) => [e.id, e]));
	const raceField: RaceEntrant[] = qualifying.grid.map((g) => {
		const e = byId.get(g.entrantId)!;
		return {
			id: e.id,
			name: e.name,
			car: e.car,
			driver: e.driver,
			gridPosition: g.position,
			pace: e.racePace ?? 'push',
			compound: e.raceCompound ?? 'soft',
			fuelKg: e.raceFuelKg ?? 40,
			reliability: e.reliability ?? Math.round(e.car.damageFactor * 100),
			lightweightAmp: e.lightweightAmp ?? 1,
			pitCrewSpeed: e.pitCrewSpeed ?? 70,
			pits: e.pits ?? defaultPits(options.raceLaps, e.id)
		};
	});

	const poleId = qualifying.grid[0]?.entrantId ?? entrants[0].id;
	const raceTrack: TrackLapContext = {
		...options.track,
		setupCurrent: setupByEntrant.get(poleId) ?? meanSetup,
		setupTarget: target,
		trackGripMultiplier: 0.97
	};

	const race = simulateFeatureRace(raceTrack, raceField, {
		laps: options.raceLaps,
		chaos: options.chaos !== false,
		rng,
		pitLaneLossSeconds: options.pitLaneLossSeconds
	});

	return {
		practice: practiceSummaries,
		qualifying,
		race,
		finalSetups
	};
}
