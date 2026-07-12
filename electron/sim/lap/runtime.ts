import { ENERGY, PACE, REF_FUEL_BURN_KG_PER_LAP, FUEL_KG_TIME_FACTOR } from './constants.js';
import type { EnergyDirective, PaceDirective } from './types.js';

export function paceTimeMult(pace: PaceDirective): number {
	return PACE[pace].timeMult;
}

export function energyTimeMult(energy: EnergyDirective, batteryPct: number, powerShare: number): number {
	const map = ENERGY[energy];
	if (energy === 'overtake' && batteryPct <= 0) {
		return 1; // empty = no boost, not a cliff
	}
	// Power-heavy sectors feel ERS more.
	const weight = 0.5 + 0.5 * powerShare;
	const delta = map.timeMult - 1;
	return 1 + delta * weight;
}

/** Time mult from fuel mass (heavier → slower). */
export function fuelTimeMult(fuelKg: number): number {
	return 1 + FUEL_KG_TIME_FACTOR * Math.max(0, fuelKg);
}

export function burnFuelKg(pace: PaceDirective, sectorFraction = 1 / 3): number {
	return REF_FUEL_BURN_KG_PER_LAP * PACE[pace].fuelMult * sectorFraction;
}

export function applyBatteryDelta(
	batteryPct: number,
	energy: EnergyDirective,
	sectorFraction = 1 / 3
): number {
	const delta = ENERGY[energy].batteryDelta * sectorFraction;
	return Math.max(0, Math.min(100, batteryPct + delta));
}

export function tireWearDelta(
	pace: PaceDirective,
	abrasionFactor: number,
	tyreManagementAttr: number,
	sectorFraction = 1 / 3
): number {
	const mgmt = 0.85 + (tyreManagementAttr / 99) * 0.3; // better → less wear
	const base = 0.035 * abrasionFactor * PACE[pace].wearMult * sectorFraction;
	return base / mgmt;
}

export function tireTempAfterSector(
	currentTemp: number,
	pace: PaceDirective,
	optTemp: number
): number {
	const targetPull = PACE[pace].tempDelta;
	// Drift toward opt + pace offset.
	const toward = optTemp + targetPull;
	return currentTemp + (toward - currentTemp) * 0.35;
}
