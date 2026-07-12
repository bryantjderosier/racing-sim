import {
	MOOD_MAX,
	MOOD_MIN,
	MOOD_NEUTRAL,
	QUIT_LOYALTY_THRESHOLD,
	QUIT_MORALE_THRESHOLD
} from './constants.js';

export function clampMood(n: number): number {
	return Math.max(MOOD_MIN, Math.min(MOOD_MAX, n));
}

/** XP budget multiplier from morale (design: affects XP rate). */
export function moraleXpMult(morale: number): number {
	const m = clampMood(morale);
	return 0.78 + (m / 100) * 0.44;
}

/** Practice feedback clarity / quality (design: Feedback quality). */
export function moraleFeedbackMult(morale: number): number {
	const m = clampMood(morale);
	return 0.7 + (m / 100) * 0.45;
}

/** Small strategy error probability bump. */
export function moraleStrategyErrorChance(morale: number, ego = 50): number {
	const lowMorale = Math.max(0, (45 - clampMood(morale)) / 45);
	const highEgo = Math.max(0, (clampMood(ego) - 70) / 30);
	return Math.min(0.35, lowMorale * 0.18 + highEgo * 0.12);
}

/** Silly-season quit pressure 0–1. */
export function quitRiskScore(args: {
	morale: number;
	loyalty?: number;
	ego?: number;
}): number {
	const moralePressure = Math.max(
		0,
		(QUIT_MORALE_THRESHOLD - args.morale) / QUIT_MORALE_THRESHOLD
	);
	const ego = args.ego ?? 50;
	const egoAmp = 1 + Math.max(0, (ego - 60) / 80);

	// Drivers (no loyalty): morale-dominant
	if (args.loyalty == null) {
		return Math.min(1, moralePressure * 1.15 * egoAmp);
	}

	const loyaltyPressure = Math.max(
		0,
		(QUIT_LOYALTY_THRESHOLD - args.loyalty) / QUIT_LOYALTY_THRESHOLD
	);
	return Math.min(1, (moralePressure * 0.55 + loyaltyPressure * 0.45) * egoAmp);
}

export function driftTowardNeutral(current: number, amount = 1.2): number {
	if (current > MOOD_NEUTRAL) return clampMood(current - amount);
	if (current < MOOD_NEUTRAL) return clampMood(current + amount);
	return current;
}
