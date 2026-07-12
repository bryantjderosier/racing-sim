export type FacilityType =
	| 'wind_tunnel'
	| 'cfd_lab'
	| 'design_studio'
	| 'weather_hub'
	| 'scouting_hq'
	| 'logistics_hub'
	| 'simulator'
	| 'fitness_center'
	| 'staff_academy'
	| 'foundry'
	| 'rig_testing'
	| 'powertrain_factory';

/** Cost/time to reach `toTier` from `toTier - 1` (break ground = toTier 1). */
export type FacilityUpgradeCost = {
	cash: number;
	/** Calendar days; converted to world weeks via ceil(days/7). */
	days: number;
	operationalCostAnnual: number;
};

type BaseSpec = {
	/** Cash to reach tier 1 (break ground). */
	baseCash: number;
	/** Days to reach tier 1. */
	baseDays: number;
	/** Annual op cost at tier 1. */
	baseOpCost: number;
	cashGrowth: number;
	daysGrowth: number;
};

/**
 * Data-driven facility cost bases (design-decisions: lookup tables, not pure formula).
 * Exponential curve applied per tier step.
 */
export const FACILITY_COST_BASE: Record<FacilityType, BaseSpec> = {
	wind_tunnel: { baseCash: 8_000_000, baseDays: 56, baseOpCost: 1_200_000, cashGrowth: 1.9, daysGrowth: 1.55 },
	cfd_lab: { baseCash: 5_500_000, baseDays: 42, baseOpCost: 900_000, cashGrowth: 1.85, daysGrowth: 1.5 },
	design_studio: { baseCash: 3_500_000, baseDays: 35, baseOpCost: 500_000, cashGrowth: 1.8, daysGrowth: 1.45 },
	weather_hub: { baseCash: 2_200_000, baseDays: 28, baseOpCost: 350_000, cashGrowth: 1.75, daysGrowth: 1.4 },
	scouting_hq: { baseCash: 2_800_000, baseDays: 35, baseOpCost: 400_000, cashGrowth: 1.8, daysGrowth: 1.45 },
	logistics_hub: { baseCash: 2_000_000, baseDays: 28, baseOpCost: 300_000, cashGrowth: 1.7, daysGrowth: 1.4 },
	simulator: { baseCash: 6_000_000, baseDays: 49, baseOpCost: 800_000, cashGrowth: 1.85, daysGrowth: 1.5 },
	fitness_center: { baseCash: 1_800_000, baseDays: 28, baseOpCost: 250_000, cashGrowth: 1.7, daysGrowth: 1.35 },
	staff_academy: { baseCash: 3_000_000, baseDays: 42, baseOpCost: 450_000, cashGrowth: 1.8, daysGrowth: 1.45 },
	foundry: { baseCash: 7_000_000, baseDays: 63, baseOpCost: 1_000_000, cashGrowth: 1.9, daysGrowth: 1.55 },
	rig_testing: { baseCash: 4_500_000, baseDays: 49, baseOpCost: 700_000, cashGrowth: 1.85, daysGrowth: 1.5 },
	// Multi-season special case (~2 years to tier 1)
	powertrain_factory: {
		baseCash: 85_000_000,
		baseDays: 730,
		baseOpCost: 5_000_000,
		cashGrowth: 2.1,
		daysGrowth: 1.35
	}
};

export const MAX_FACILITY_TIER = 5;

export function upgradeCost(type: FacilityType, toTier: number): FacilityUpgradeCost {
	const t = Math.max(1, Math.min(MAX_FACILITY_TIER, Math.floor(toTier)));
	const spec = FACILITY_COST_BASE[type];
	const step = t - 1; // 0 for tier 1
	const cash = Math.round(spec.baseCash * Math.pow(spec.cashGrowth, step));
	const days = Math.round(spec.baseDays * Math.pow(spec.daysGrowth, step));
	const operationalCostAnnual = Math.round(spec.baseOpCost * Math.pow(1.55, t - 1));
	return { cash, days, operationalCostAnnual };
}

export function daysToWeeks(days: number): number {
	return Math.max(1, Math.ceil(days / 7));
}

/** Parallel project slots unlocked by tier (campus matrix). */
export function parallelProjectSlots(tier: number): number {
	if (tier >= 5) return 3;
	if (tier >= 3) return 2;
	if (tier >= 1) return 1;
	return 0;
}
