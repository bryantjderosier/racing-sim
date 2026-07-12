import type { PaceDirective, TireCompound, TrackMoisture } from '../lap/types.js';
import type { KnowledgeTrims, TrimKind } from './types.js';

const TIER_THRESHOLDS = [0, 40, 100, 180]; // XP to reach tier 1/2/3

export const EMPTY_COMPOUND = (): Record<TireCompound, { xp: number; tier: number }> => ({
	soft: { xp: 0, tier: 0 },
	medium: { xp: 0, tier: 0 },
	hard: { xp: 0, tier: 0 },
	intermediate: { xp: 0, tier: 0 },
	wet: { xp: 0, tier: 0 }
});

export function createEmptyTrims(): KnowledgeTrims {
	return {
		qualifying: { xp: 0, tier: 0 },
		race: { xp: 0, tier: 0 },
		compound: EMPTY_COMPOUND(),
		wetWeather: { xp: 0, tier: 0 },
		slicksFrozen: false
	};
}

export function tierFromXp(xp: number): number {
	let tier = 0;
	for (let i = 1; i < TIER_THRESHOLDS.length; i++) {
		if (xp >= TIER_THRESHOLDS[i]) tier = i;
	}
	return Math.min(3, tier);
}

/** Quali trim lap-time bonus seconds (subtract from lap) by tier. */
export const QUALI_TRIM_BONUS_S = [0, 0.1, 0.25, 0.4] as const;

/** Race trim wear mult by tier (<1 = less wear). */
export const RACE_TRIM_WEAR_MULT = [1, 0.97, 0.93, 0.88] as const;

export function isSlick(compound: TireCompound): boolean {
	return compound === 'soft' || compound === 'medium' || compound === 'hard';
}

export function updateSlicksFrozen(trims: KnowledgeTrims, moisture: TrackMoisture): KnowledgeTrims {
	const raining = moisture === 'damp' || moisture === 'wet' || moisture === 'flooded';
	return { ...trims, slicksFrozen: raining };
}

/**
 * Infer trim intent from stint shape (design-decisions).
 * Wet + wet tires → wet_weather; else quali/race/compound heuristics.
 */
export function inferTrimIntent(args: {
	fuelKg: number;
	lapCount: number;
	pace: PaceDirective;
	compound: TireCompound;
	moisture: TrackMoisture;
}): TrimKind {
	const raining = args.moisture === 'wet' || args.moisture === 'flooded';
	if (raining && (args.compound === 'intermediate' || args.compound === 'wet')) {
		return 'wet_weather_trim';
	}
	if (args.fuelKg <= 35 && args.lapCount <= 5 && (args.pace === 'push' || args.pace === 'maximum')) {
		return 'qualifying_trim';
	}
	if (args.fuelKg >= 55 && args.lapCount >= 6) {
		return 'race_trim';
	}
	return 'compound_knowledge';
}

/**
 * XP scales with stint quality: clean (no cliff), in-window setup, Feedback — not raw lap count.
 */
export function computeTrimXp(args: {
	lapCount: number;
	setupDistance: number;
	driverFeedback: number;
	hitCliff: boolean;
	avgLapMs: number;
	bestLapMs: number;
}): number {
	if (args.hitCliff) return Math.max(2, Math.floor(args.lapCount * 1.5));

	const setupQuality = Math.max(0, 1 - args.setupDistance / 0.45);
	const feedback = args.driverFeedback / 99;
	const consistency =
		args.avgLapMs > 0 ? Math.max(0, 1 - (args.avgLapMs - args.bestLapMs) / args.avgLapMs) : 0.5;

	const base = 8 + args.lapCount * 2.5;
	const mult = 0.45 + 0.35 * setupQuality + 0.15 * feedback + 0.15 * consistency;
	return Math.round(base * mult);
}

export function applyTrimXp(
	trims: KnowledgeTrims,
	kind: TrimKind,
	xp: number,
	compound: TireCompound
): { trims: KnowledgeTrims; tierAfter: number; xpApplied: number } {
	const next = {
		...trims,
		qualifying: { ...trims.qualifying },
		race: { ...trims.race },
		wetWeather: { ...trims.wetWeather },
		compound: { ...trims.compound, [compound]: { ...trims.compound[compound] } }
	};

	if (kind === 'qualifying_trim') {
		if (trims.slicksFrozen && isSlick(compound)) {
			return { trims, tierAfter: trims.qualifying.tier, xpApplied: 0 };
		}
		next.qualifying.xp += xp;
		next.qualifying.tier = tierFromXp(next.qualifying.xp);
		return { trims: next, tierAfter: next.qualifying.tier, xpApplied: xp };
	}
	if (kind === 'race_trim') {
		if (trims.slicksFrozen && isSlick(compound)) {
			return { trims, tierAfter: trims.race.tier, xpApplied: 0 };
		}
		next.race.xp += xp;
		next.race.tier = tierFromXp(next.race.xp);
		return { trims: next, tierAfter: next.race.tier, xpApplied: xp };
	}
	if (kind === 'wet_weather_trim') {
		next.wetWeather.xp += xp;
		next.wetWeather.tier = tierFromXp(next.wetWeather.xp);
		return { trims: next, tierAfter: next.wetWeather.tier, xpApplied: xp };
	}
	if (trims.slicksFrozen && isSlick(compound)) {
		return { trims, tierAfter: trims.compound[compound].tier, xpApplied: 0 };
	}
	next.compound[compound].xp += xp;
	next.compound[compound].tier = tierFromXp(next.compound[compound].xp);
	return { trims: next, tierAfter: next.compound[compound].tier, xpApplied: xp };
}
