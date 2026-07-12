import { TIER_EFFICIENCY } from './constants.js';

/** effective_efficiency = tier_bonus × (condition_pct / 100) */
export function facilityEfficiencyMult(tier: number, conditionPct: number): number {
	const t = Math.max(0, Math.min(5, Math.floor(tier)));
	const bonus = TIER_EFFICIENCY[t] ?? 0;
	return 1 + bonus * Math.max(0, Math.min(100, conditionPct)) / 100;
}

export function applyFacilityDecay(
	conditionPct: number,
	decayPct: number
): number {
	return Math.max(0, conditionPct - decayPct);
}

export function applyFacilityMaintenance(
	conditionPct: number,
	spendFractionTowardFull = 1
): number {
	const missing = 100 - conditionPct;
	return Math.min(100, conditionPct + missing * Math.max(0, Math.min(1, spendFractionTowardFull)));
}
