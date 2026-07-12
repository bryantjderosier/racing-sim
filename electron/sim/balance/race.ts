import type { PaceDirective } from '../lap/types.js';

/** Default pit lane loss (seconds) when options omit it. */
export const DEFAULT_PIT_LANE_LOSS_S = 21;

/** Grip evolution per lap / cap. */
export const TRACK_GRIP_GAIN_PER_LAP = 0.003;
export const TRACK_GRIP_CAP = 1.02;

/** Chaos: relative incident risk by pace. */
export const PACE_RISK: Record<PaceDirective, number> = {
	conserve: 0.35,
	balanced: 1,
	push: 1.55,
	maximum: 2.2
};

/** SC/VSC duration in laps. */
export const SAFETY_DURATION_LAPS = {
	none: 0,
	vsc: 2,
	safety_car: 3
} as const;

/** Lap time multiplier under SC/VSC. */
export const SAFETY_LAP_MULT = {
	none: 1,
	vsc: 1.12,
	safety_car: 1.38
} as const;

/** Pit lane loss factor under SC/VSC. */
export const SAFETY_PIT_FACTOR = {
	none: 1,
	vsc: 0.6,
	safety_car: 0.45
} as const;

/** Combat override duration default (laps). */
export const COMBAT_DEFAULT_LAPS = 3;

/** Base success chance before attrs for combat orders. */
export const COMBAT_BASE_SUCCESS = {
	hold_traffic: 0.55,
	no_fight_teammate: 0.7,
	attack_now: 0.45
} as const;

/** Time effects (ms) on combat success / fail. */
export const COMBAT_TIME_MS = {
	hold_traffic_success: 400,
	hold_traffic_fail: -200,
	no_fight_success: 0,
	no_fight_fail: 600,
	attack_success: -550,
	attack_fail: 900
} as const;

/** Dirty-air bias applied to self on hold_traffic success. */
export const COMBAT_HOLD_DIRTY_AIR = 0.15;

/** Extra incident risk multiplier when attack_now fails. */
export const COMBAT_ATTACK_FAIL_RISK = 1.35;
