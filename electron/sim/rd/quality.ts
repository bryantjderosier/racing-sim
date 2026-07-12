import { facilityEfficiencyMult } from '../world/facilities.js';
import {
	AERO_SLOTS,
	BASE_PP_NOISE,
	DESIGNER_ATTRS_BY_SLOT,
	HOUR_QUALITY_K,
	SLOT_BASE_WEIGHT_KG,
	SLOT_PP_CEILING,
	SLOT_PP_FLOOR
} from './constants.js';
import type { FacilitySnapshot, QualityInput, QualityResult } from './types.js';

function avgAttrs(attrs: Record<string, number>, keys: string[]): number {
	if (keys.length === 0) return 50;
	let sum = 0;
	for (const k of keys) sum += attrs[k] ?? 50;
	return sum / keys.length;
}

function facilityMult(facilities: FacilitySnapshot[], type: string): number {
	const f = facilities.find((x) => x.facilityType === type);
	if (!f) return 1;
	return facilityEfficiencyMult(f.tier, f.conditionPct);
}

/**
 * Effective testing hours after facility multipliers + CFD mapping skill.
 * Hours buy expected quality on a diminishing-returns curve.
 */
export function effectiveTestingHours(input: QualityInput): number {
	const wtMult = facilityMult(input.facilities, 'wind_tunnel');
	const cfdMult = facilityMult(input.facilities, 'cfd_lab');
	const cfdSkill = (input.designerAttrs.cfd_mapping ?? 50) / 100;
	const wt = input.allocatedWtHours * wtMult;
	const cfd = input.allocatedCfdHours * cfdMult * (0.75 + 0.5 * cfdSkill);
	return wt + cfd;
}

/**
 * Blend allocated hours, designer attrs, facility tiers → true PP + secondary stats.
 */
export function computeBlueprintQuality(input: QualityInput): QualityResult {
	const keys = DESIGNER_ATTRS_BY_SLOT[input.slot];
	const designerScore = avgAttrs(input.designerAttrs, keys) / 100; // 0–1
	const hours = effectiveTestingHours(input);
	const requiredHint = 50;
	const hourFactor = 1 - Math.exp(-HOUR_QUALITY_K * hours);
	const floor = SLOT_PP_FLOOR[input.slot];
	const ceil = SLOT_PP_CEILING[input.slot];
	const range = ceil - floor;

	// Designer raises ceiling utilization and shrinks noise
	const expected = floor + range * hourFactor * (0.55 + 0.45 * designerScore);
	const noiseAmp = BASE_PP_NOISE * (1.15 - 0.7 * designerScore);
	const noise = (input.rng() - 0.5) * 2 * noiseAmp;
	const performancePoints = Math.round(
		Math.max(floor, Math.min(ceil, expected + noise))
	);

	const reliabilityAttr =
		input.designerAttrs.reliability ??
		input.designerAttrs.stability ??
		avgAttrs(input.designerAttrs, keys);
	const baseReliability = Math.round(
		Math.max(70, Math.min(99, 78 + reliabilityAttr * 0.18 + (input.rng() - 0.5) * 4))
	);

	const stability = (input.designerAttrs.stability ?? 50) / 100;
	const pitchSensitivity = Math.max(
		0,
		Math.min(1, 0.55 - stability * 0.35 + (input.rng() - 0.5) * 0.15)
	);

	const packaging = (input.designerAttrs.packaging ?? 50) / 100;
	const dragCoefficient = AERO_SLOTS.includes(input.slot)
		? Math.max(0.2, 0.9 - packaging * 0.35 + (input.rng() - 0.5) * 0.08)
		: 0.4;

	const weightOpt = (input.designerAttrs.weight_optimization ?? 50) / 100;
	const baseW = SLOT_BASE_WEIGHT_KG[input.slot];
	const weightKg = Math.round((baseW * (1.08 - weightOpt * 0.12)) * 10) / 10;

	// WT/CFD balance + designer → initial fog confidence
	const totalAlloc = input.allocatedWtHours + input.allocatedCfdHours;
	const balance =
		totalAlloc <= 0
			? 0
			: 1 -
				Math.abs(input.allocatedWtHours - input.allocatedCfdHours * 0.5) /
					Math.max(1, totalAlloc);
	const hourFill = Math.min(1, hours / requiredHint);
	const initialConfidence = Math.round(
		Math.max(
			5,
			Math.min(
				55,
				12 + hourFill * 28 + balance * 12 + designerScore * 18
			)
		)
	);

	return {
		performancePoints,
		baseReliability,
		pitchSensitivity,
		dragCoefficient,
		weightKg,
		initialConfidence
	};
}
