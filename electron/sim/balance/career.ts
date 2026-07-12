/** Division weekly testing caps. */
export const WEEKLY_WT_CAP: Record<number, number> = { 1: 40, 2: 28, 3: 18 };
export const WEEKLY_CFD_CAP: Record<number, number> = { 1: 80, 2: 55, 3: 35 };

/** Facility condition decay % per week when not maintained. */
export const FACILITY_WEEKLY_DECAY = 0.75;

/** XP bank needed for +1 attribute point. */
export const XP_PER_LEVEL = 100;

/** Base weekly XP before facility mult. */
export const DRIVER_WEEKLY_XP_BASE = 18;
export const STAFF_WEEKLY_XP_BASE = 14;

/** Mileage: XP per race lap completed last week. */
export const XP_PER_MILEAGE_LAP = 0.35;

/** Pit crew fatigue recovery per week. */
export const FATIGUE_RECOVERY_PCT = 12;

export const PACE_PHYSICAL_ATTRS = [
	'braking',
	'cornering',
	'traction',
	'tyre_management',
	'qualifying',
	'focus'
] as const;

/** Tier → efficiency bonus (index = tier). */
export const TIER_EFFICIENCY = [0, 0.03, 0.05, 0.09, 0.14, 0.22] as const;

/** Morale clamp / neutral. */
export const MOOD_MIN = 0;
export const MOOD_MAX = 100;
export const MOOD_NEUTRAL = 50;
export const WEEKLY_DRIFT = 1.2;

export const RACE_PODIUM_MORALE = 4.5;
export const RACE_POINTS_MORALE = 2.0;
export const RACE_BACKMARKER_MORALE = -3.5;

export const ORDER_OBEYED_MORALE = 1.5;
export const ORDER_SACRIFICED_MORALE = -5;
export const ORDER_REFUSED_LOYALTY = -4;

export const DIVISION_PAY_BASELINE: Record<number, number> = {
	1: 4_000_000,
	2: 1_200_000,
	3: 350_000
};

export const TOXIC_EGO_THRESHOLD = 72;
export const TOXIC_MORALE_HIT = -2.5;
export const TOXIC_LOYALTY_HIT = -1.5;

export const QUIT_MORALE_THRESHOLD = 28;
export const QUIT_LOYALTY_THRESHOLD = 32;
