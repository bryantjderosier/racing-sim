import type { DevelopableSlot, PartFlawType } from './types.js';

/** Effective hours needed for progress = 100 (~1.5–2 weeks of focused spend). */
export const HOURS_TO_COMPLETE: Record<DevelopableSlot, number> = {
	front_wing: 95,
	rear_wing: 100,
	underfloor: 140,
	sidepods: 105,
	suspension: 110,
	power_unit: 160
};

/** Floor / ceiling PP by slot (matches seed scale). */
export const SLOT_PP_FLOOR: Record<DevelopableSlot, number> = {
	front_wing: 18,
	rear_wing: 20,
	underfloor: 24,
	sidepods: 14,
	suspension: 78,
	power_unit: 82
};

export const SLOT_PP_CEILING: Record<DevelopableSlot, number> = {
	front_wing: 42,
	rear_wing: 44,
	underfloor: 52,
	sidepods: 36,
	suspension: 110,
	power_unit: 118
};

export const SLOT_BASE_WEIGHT_KG: Record<DevelopableSlot, number> = {
	front_wing: 12,
	rear_wing: 14,
	underfloor: 40,
	sidepods: 25,
	suspension: 55,
	power_unit: 150
};

/** Diminishing-returns steepness for hour→quality. */
export const HOUR_QUALITY_K = 0.035;

/** Noise ±PP at completion (shrunk by elite staff). */
export const BASE_PP_NOISE = 4;

export const FLAW_TYPES: PartFlawType[] = [
	'pitch_sensitivity',
	'dirty_air_collapse',
	'curb_fragility',
	'thermal_tire_spike'
];

/** Chance of first / second flaw at completion. */
export const FLAW_CHANCE_1 = 0.55;
export const FLAW_CHANCE_2 = 0.22;

/** Mileage: confidence points per lap on mounted part from this blueprint. */
export const CONFIDENCE_PER_LAP = 0.45;

/** Band half-width at confidence 0 as fraction of slot PP range. */
export const BAND_WIDTH_AT_ZERO = 0.45;

export const REGRESSION_MINOR = 0.1;
export const REGRESSION_MAJOR = 0.4;

export const LIGHTWEIGHT_WEIGHT_MULT = 0.92;
export const LIGHTWEIGHT_RELIABILITY_PENALTY = 8;
export const LIGHTWEIGHT_CEILING_PENALTY = 6;

export const FABRICATION_DAYS_BASE = 7;
export const FABRICATION_COST_BASE = 180_000;
export const LIGHTWEIGHT_COST_MULT = 1.5;

export const AERO_SLOTS: DevelopableSlot[] = [
	'front_wing',
	'rear_wing',
	'underfloor',
	'sidepods'
];

export const DESIGNER_ATTRS_BY_SLOT: Record<DevelopableSlot, string[]> = {
	front_wing: ['efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping'],
	rear_wing: ['efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping'],
	underfloor: ['efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping'],
	sidepods: ['efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping'],
	suspension: ['chassis', 'suspension', 'weight_optimization', 'reliability', 'damage_resistance'],
	power_unit: ['thermal_efficiency', 'harvesting', 'deployment', 'integration', 'reliability']
};

export const DESIGNER_ROLE_BY_SLOT: Record<
	DevelopableSlot,
	'aero' | 'mechanical' | 'powertrain'
> = {
	front_wing: 'aero',
	rear_wing: 'aero',
	underfloor: 'aero',
	sidepods: 'aero',
	suspension: 'mechanical',
	power_unit: 'powertrain'
};
