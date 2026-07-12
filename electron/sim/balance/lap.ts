/** Balance catalog version — bump when tables change meaningfully. */
export const BALANCE_VERSION = 1;

/** Attr 0–99 → pace multiplier band around 1.0 */
export const ATTR_MULT_MIN = 0.92;
export const ATTR_MULT_MAX = 1.08;

/** Reference car aero/mech/power points for multiplier = 1.0 */
export const REF_AERO_PP = 100;
export const REF_MECH_PP = 100;
export const REF_POWER_PP = 100;

/** How strongly car PP above/below ref moves sector time (diminishing). */
export const CAR_PP_SCALE = 0.12;

/** Setup: normalized distance below this → no penalty. */
export const SETUP_SWEET_SPOT = 0.08;
/** Quadratic coefficient for setup distance → time mult. */
export const SETUP_PENALTY_K = 0.55;

/** Fuel mass cost per kg as time mult addon. */
export const FUEL_KG_TIME_FACTOR = 0.00035;
export const REF_FUEL_BURN_KG_PER_LAP = 2.2;

/** Pace directive: lap time / wear / fuel / tire temp pull. */
export const PACE = {
	conserve: { timeMult: 1.018, wearMult: 0.7, fuelMult: 0.85, tempDelta: -1.5 },
	balanced: { timeMult: 1.0, wearMult: 1.0, fuelMult: 1.0, tempDelta: 0.5 },
	push: { timeMult: 0.988, wearMult: 1.35, fuelMult: 1.15, tempDelta: 2.5 },
	maximum: { timeMult: 0.975, wearMult: 1.85, fuelMult: 1.35, tempDelta: 4.5 }
} as const;

/** Energy directive: time / battery delta / power boost. */
export const ENERGY = {
	harvest: { timeMult: 1.012, batteryDelta: 8, powerBoost: 0 },
	balanced: { timeMult: 1.0, batteryDelta: 0, powerBoost: 0 },
	overtake: { timeMult: 0.985, batteryDelta: -12, powerBoost: 0.025 }
} as const;

/** Life fraction where compound hits the cliff. */
export const TIRE_CLIFF = {
	soft: 0.3,
	medium: 0.25,
	hard: 0.2,
	intermediate: 0.22,
	wet: 0.22
} as const;

export const TIRE_PEAK_GRIP = {
	soft: 1.04,
	medium: 1.0,
	hard: 0.97,
	intermediate: 0.92,
	wet: 0.88
} as const;

/** Optimal core temp °C by compound. */
export const TIRE_OPT_TEMP = {
	soft: 95,
	medium: 90,
	hard: 85,
	intermediate: 70,
	wet: 50
} as const;

/** ±°C window before grip falls off. */
export const TIRE_TEMP_WINDOW = 15;

/** Extra time mult when below cliff threshold. */
export const CLIFF_PENALTY_K = 0.9;

/** Moisture vs compound grip mult. */
export const MOISTURE_COMPOUND: Record<string, Record<string, number>> = {
	dry: { soft: 1, medium: 1, hard: 1, intermediate: 0.82, wet: 0.7 },
	damp: { soft: 0.78, medium: 0.82, hard: 0.8, intermediate: 1.02, wet: 0.95 },
	wet: { soft: 0.55, medium: 0.58, hard: 0.56, intermediate: 0.95, wet: 1.05 },
	flooded: { soft: 0.4, medium: 0.42, hard: 0.4, intermediate: 0.75, wet: 1.08 }
};

/** Time mult addon at dirtyAir=1. */
export const DIRTY_AIR_PENALTY_K = 0.06;
/** Time mult penalty at damageFactor=0. */
export const DAMAGE_PENALTY_K = 0.2;
