import {
	ATTR_MULT_MAX,
	ATTR_MULT_MIN,
	CAR_PP_SCALE,
	CLIFF_PENALTY_K,
	DAMAGE_PENALTY_K,
	DIRTY_AIR_PENALTY_K,
	MOISTURE_COMPOUND,
	REF_AERO_PP,
	REF_MECH_PP,
	REF_POWER_PP,
	SETUP_PENALTY_K,
	SETUP_SWEET_SPOT,
	TIRE_CLIFF,
	TIRE_OPT_TEMP,
	TIRE_PEAK_GRIP,
	TIRE_TEMP_WINDOW
} from './constants.js';
import type { SetupVector, TireCompound, TireState, TrackMoisture } from './types.js';

/** Map 0–99 attr → multiplicative factor centered near 1. */
export function attrToMult(value: number): number {
	const t = Math.max(0, Math.min(99, value)) / 99;
	return ATTR_MULT_MIN + t * (ATTR_MULT_MAX - ATTR_MULT_MIN);
}

/** Diminishing returns: points vs reference → time multiplier (<1 faster). */
export function pointsToTimeMult(points: number, ref: number): number {
	const ratio = points / Math.max(1, ref);
	// ratio>1 → faster (mult<1). Soft curve.
	return 1 / (1 + CAR_PP_SCALE * Math.log2(Math.max(0.25, ratio)));
}

export function carPerformanceMult(
	aeroPoints: number,
	mechanicalPoints: number,
	powerPoints: number,
	aeroWeight: number,
	mechanicalWeight: number,
	powerShare: number
): number {
	const aero = pointsToTimeMult(aeroPoints, REF_AERO_PP);
	const mech = pointsToTimeMult(mechanicalPoints, REF_MECH_PP);
	const power = pointsToTimeMult(powerPoints, REF_POWER_PP);
	const wSum = aeroWeight + mechanicalWeight + powerShare;
	const aw = aeroWeight / wSum;
	const mw = mechanicalWeight / wSum;
	const pw = powerShare / wSum;
	return aero * aw + mech * mw + power * pw;
}

export function setupDistance(current: SetupVector, target: SetupVector): number {
	const keys = Object.keys(target) as (keyof SetupVector)[];
	// Normalize each axis roughly into comparable units.
	const scales: Record<keyof SetupVector, number> = {
		frontWingAngle: 10,
		rearWingAngle: 10,
		frontArb: 5,
		rearArb: 5,
		frontRideHeightMm: 20,
		rearRideHeightMm: 20,
		frontCamber: 2,
		rearCamber: 2,
		frontToe: 0.5,
		rearToe: 0.5,
		brakeBias: 10
	};
	let sumSq = 0;
	for (const k of keys) {
		const d = (current[k] - target[k]) / scales[k];
		sumSq += d * d;
	}
	return Math.sqrt(sumSq / keys.length);
}

/** Time multiplier ≥ 1 when off-window. */
export function setupTimeMult(current: SetupVector, target: SetupVector): number {
	const dist = setupDistance(current, target);
	if (dist <= SETUP_SWEET_SPOT) return 1;
	const over = dist - SETUP_SWEET_SPOT;
	return 1 + SETUP_PENALTY_K * over * over;
}

export function tireTempGrip(compound: TireCompound, coreTemp: number): number {
	const opt = TIRE_OPT_TEMP[compound];
	const delta = Math.abs(coreTemp - opt);
	if (delta <= TIRE_TEMP_WINDOW * 0.35) return 1;
	const t = Math.min(1, (delta - TIRE_TEMP_WINDOW * 0.35) / TIRE_TEMP_WINDOW);
	return 1 + 0.12 * t * t; // colder/hotter → slower
}

/**
 * S-curve life → grip time mult.
 * Phase A: high life, warm-up handled mainly via temp.
 * Phase B: linear.
 * Phase C: cliff below compound threshold.
 */
export function tireLifeTimeMult(tire: TireState): number {
	const peak = TIRE_PEAK_GRIP[tire.compound];
	const cliff = TIRE_CLIFF[tire.compound];
	const life = Math.max(0, Math.min(1, tire.life));

	// Invert grip to time: higher peak grip → lower time mult.
	const base = 1 / peak;

	if (life >= cliff) {
		// Linear from peak at life=1 toward slight loss at cliff.
		const t = (1 - life) / (1 - cliff);
		return base * (1 + 0.06 * t);
	}

	// Cliff: collapse.
	const under = (cliff - life) / cliff;
	return base * (1 + 0.06 + CLIFF_PENALTY_K * under * under);
}

export function moistureCompoundMult(
	moisture: TrackMoisture,
	compound: TireCompound
): number {
	const row = MOISTURE_COMPOUND[moisture];
	const grip = row?.[compound] ?? 1;
	// grip → time (inverse)
	return 1 / grip;
}

/** Combined tire layer as time multiplier. */
export function tireTimeMult(
	tire: TireState,
	moisture: TrackMoisture,
	trackGripMultiplier: number
): number {
	const life = tireLifeTimeMult(tire);
	const temp = tireTempGrip(tire.compound, tire.coreTemp);
	const moistureMult = moistureCompoundMult(moisture, tire.compound);
	// trackGripMultiplier >1 = rubbered-in = faster
	const evolution = 1 / Math.max(0.8, trackGripMultiplier);
	return life * temp * moistureMult * evolution;
}

export function dirtyAirTimeMult(dirtyAir: number): number {
	return 1 + DIRTY_AIR_PENALTY_K * Math.max(0, Math.min(1, dirtyAir));
}

export function damageTimeMult(damageFactor: number): number {
	const d = Math.max(0, Math.min(1, damageFactor));
	return 1 + DAMAGE_PENALTY_K * (1 - d);
}
