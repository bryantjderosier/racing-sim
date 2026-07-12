import type { CarPerformance } from '../lap/types.js';

export type PartSlot =
	| 'front_wing'
	| 'rear_wing'
	| 'underfloor'
	| 'sidepods'
	| 'power_unit'
	| 'gearbox'
	| 'suspension';

export type MountedPartView = {
	slot: PartSlot;
	performancePoints: number;
	weightKg: number;
	currentReliability: number;
	maxConditionCeiling: number;
};

const AERO_SLOTS: PartSlot[] = ['front_wing', 'rear_wing', 'underfloor', 'sidepods'];
const BASE_CHASSIS_KG = 650;

/**
 * Sum mounted parts into lap-engine car performance.
 * Aero = wing/floor/sidepod PP; mech = suspension; power = power_unit.
 */
export function partsToCarPerformance(parts: MountedPartView[]): CarPerformance {
	let aeroPoints = 0;
	let mechanicalPoints = 80;
	let powerPoints = 80;
	let weightKg = BASE_CHASSIS_KG;
	let reliabilitySum = 0;
	let reliabilityN = 0;

	for (const p of parts) {
		weightKg += p.weightKg;
		reliabilitySum += p.currentReliability / 100;
		reliabilityN += 1;

		if (AERO_SLOTS.includes(p.slot)) {
			aeroPoints += p.performancePoints;
		} else if (p.slot === 'suspension') {
			mechanicalPoints = p.performancePoints;
		} else if (p.slot === 'power_unit') {
			powerPoints = p.performancePoints;
		}
	}

	if (aeroPoints === 0) aeroPoints = 80;

	const damageFactor =
		reliabilityN === 0 ? 1 : Math.max(0.2, Math.min(1, reliabilitySum / reliabilityN));

	return {
		aeroPoints,
		mechanicalPoints,
		powerPoints,
		dryWeightKg: weightKg,
		damageFactor
	};
}
