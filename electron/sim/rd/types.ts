export type DevelopableSlot =
	| 'front_wing'
	| 'rear_wing'
	| 'underfloor'
	| 'sidepods'
	| 'suspension'
	| 'power_unit';

export type RdFocus = 'current_car' | 'next_year';

export type PartFlawType =
	| 'pitch_sensitivity'
	| 'dirty_air_collapse'
	| 'curb_fragility'
	| 'thermal_tire_spike';

export type RegulationImpact = 'minor_tweak' | 'major_overhaul' | 'category_ban';

export type DesignerAttrs = Record<string, number>;

export type FacilitySnapshot = {
	facilityType: string;
	tier: number;
	conditionPct: number;
};

export type QualityInput = {
	slot: DevelopableSlot;
	allocatedWtHours: number;
	allocatedCfdHours: number;
	designerAttrs: DesignerAttrs;
	facilities: FacilitySnapshot[];
	rng: () => number;
};

export type QualityResult = {
	performancePoints: number;
	baseReliability: number;
	pitchSensitivity: number;
	dragCoefficient: number;
	weightKg: number;
	/** 0–100 starting scout confidence from WT/CFD balance + designer. */
	initialConfidence: number;
};

export type FogBand = {
	knownMin: number;
	knownMax: number;
	scoutConfidence: number;
};

export type RolledFlaw = {
	flawType: PartFlawType;
	severity: number;
};
