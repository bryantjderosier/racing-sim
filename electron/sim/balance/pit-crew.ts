/** Active operators averaged for a stop. */
export const PIT_LINEUP_SIZE = 8;

/** Stationary tire-change window (ms) at speed 1 → 99. */
export const PIT_TIRE_MS_SLOW = 4200;
export const PIT_TIRE_MS_FAST = 1900;

/** Fatigue added to each starter per stop executed. */
export const FATIGUE_PER_STOP = 7;

/** Fatigue soft-caps effective consistency/focus. */
export const FATIGUE_PENALTY_PER_PCT = 0.35;

export type PitPressure = 'normal' | 'safety_car' | 'lead' | 'double_stack';

export type PitErrorType = 'jammed_nut' | 'cross_thread' | 'unsafe_release';

/** Error stationary time bands (ms). */
export const PIT_ERROR_MS: Record<PitErrorType, { min: number; max: number }> = {
	jammed_nut: { min: 3500, max: 3500 },
	cross_thread: { min: 6000, max: 10000 },
	unsafe_release: { min: 5000, max: 5000 }
};

/** Base error chance before consistency/focus mitigation. */
export const PIT_ERROR_BASE: Record<PitPressure, number> = {
	normal: 0.06,
	safety_car: 0.1,
	lead: 0.12,
	double_stack: 0.18
};
