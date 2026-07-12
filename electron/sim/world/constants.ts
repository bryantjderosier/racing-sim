/** Division weekly testing caps (design-decisions: hard caps, facilities don't raise them). */
export const WEEKLY_WT_CAP: Record<number, number> = { 1: 40, 2: 28, 3: 18 };
export const WEEKLY_CFD_CAP: Record<number, number> = { 1: 80, 2: 55, 3: 35 };

/** Facility condition decay % per week when not maintained. */
export const FACILITY_WEEKLY_DECAY = 0.75;

/** XP bank needed for +1 attribute point. */
export const XP_PER_LEVEL = 100;

/** Base weekly XP into the Development-driven pool (before facility mult). */
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

export const TIER_EFFICIENCY = [0, 0.03, 0.05, 0.09, 0.14, 0.22] as const;
