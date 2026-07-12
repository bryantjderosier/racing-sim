import { BAND_WIDTH_AT_ZERO, CONFIDENCE_PER_LAP, SLOT_PP_CEILING, SLOT_PP_FLOOR } from './constants.js';
import type { DevelopableSlot, FogBand, PartFlawType, RolledFlaw } from './types.js';
import { FLAW_CHANCE_1, FLAW_CHANCE_2, FLAW_TYPES } from './constants.js';

export function bandFromConfidence(
	truePp: number,
	confidence: number,
	slot: DevelopableSlot
): FogBand {
	const c = Math.max(0, Math.min(100, confidence));
	const range = SLOT_PP_CEILING[slot] - SLOT_PP_FLOOR[slot];
	const half = range * BAND_WIDTH_AT_ZERO * (1 - c / 100);
	const knownMin = Math.max(SLOT_PP_FLOOR[slot], Math.round(truePp - half));
	const knownMax = Math.min(SLOT_PP_CEILING[slot], Math.round(truePp + half));
	return { knownMin, knownMax, scoutConfidence: Math.round(c) };
}

/** Track mileage collapses the uncertainty band toward true PP. */
export function applyMileageToFog(
	truePp: number,
	current: FogBand,
	slot: DevelopableSlot,
	laps: number,
	analysisBonus = 0
): FogBand {
	const gain = laps * CONFIDENCE_PER_LAP * (1 + analysisBonus / 200);
	const nextConf = Math.min(100, current.scoutConfidence + gain);
	return bandFromConfidence(truePp, nextConf, slot);
}

export function rollFlaws(rng: () => number): RolledFlaw[] {
	const out: RolledFlaw[] = [];
	const pool = [...FLAW_TYPES];
	if (rng() < FLAW_CHANCE_1 && pool.length) {
		const i = Math.floor(rng() * pool.length);
		out.push({ flawType: pool.splice(i, 1)[0]!, severity: 0.25 + rng() * 0.55 });
	}
	if (rng() < FLAW_CHANCE_2 && pool.length) {
		const i = Math.floor(rng() * pool.length);
		out.push({ flawType: pool.splice(i, 1)[0]!, severity: 0.2 + rng() * 0.5 });
	}
	return out;
}

/** Flaws become revealed as confidence crosses thresholds. */
export function flawsRevealedByConfidence(
	confidence: number,
	flaws: { flawType: PartFlawType; severity: number; isRevealed: boolean }[]
): PartFlawType[] {
	const newly: PartFlawType[] = [];
	for (const f of flaws) {
		if (f.isRevealed) continue;
		const threshold = 40 + f.severity * 45;
		if (confidence >= threshold) newly.push(f.flawType);
	}
	return newly;
}
