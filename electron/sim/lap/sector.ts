import { TIRE_OPT_TEMP } from './constants.js';
import {
	attrToMult,
	carPerformanceMult,
	damageTimeMult,
	dirtyAirTimeMult,
	setupTimeMult,
	tireTimeMult
} from './math.js';
import {
	applyBatteryDelta,
	burnFuelKg,
	energyTimeMult,
	fuelTimeMult,
	paceTimeMult,
	tireTempAfterSector,
	tireWearDelta
} from './runtime.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	SectorBreakdown,
	SectorProfile,
	TrackLapContext
} from './types.js';

function normalizeShares(s: SectorProfile) {
	const sum =
		s.brakingShare + s.corneringShare + s.tractionShare + s.powerShare || 1;
	return {
		braking: s.brakingShare / sum,
		cornering: s.corneringShare / sum,
		traction: s.tractionShare / sum,
		power: s.powerShare / sum
	};
}

function driverTimeMult(attrs: DriverLapAttrs, sector: SectorProfile, moistureWet: boolean): number {
	const shares = normalizeShares(sector);
	const braking = attrToMult(attrs.braking);
	const cornering = attrToMult(attrs.cornering);
	const traction = attrToMult(attrs.traction);
	// Higher attr → faster → invert attr band into time (attrToMult is already "goodness";
	// convert goodness to time by inverting around 1).
	const toTime = (g: number) => 1 / g;
	let mult =
		toTime(braking) * shares.braking +
		toTime(cornering) * shares.cornering +
		toTime(traction) * shares.traction +
		// power sector uses traction as proxy for throttle discipline; wet uses wetDriving
		toTime(attrToMult(attrs.traction)) * shares.power;

	if (moistureWet) {
		const wet = 1 / attrToMult(attrs.wetDriving);
		mult = mult * 0.7 + wet * 0.3;
	}
	return mult;
}

export function simulateSector(
	sector: SectorProfile,
	car: CarPerformance,
	driver: DriverLapAttrs,
	track: TrackLapContext,
	state: CarRuntimeState
): { breakdown: SectorBreakdown; stateAfter: CarRuntimeState } {
	const shares = normalizeShares(sector);
	const carMult = carPerformanceMult(
		car.aeroPoints,
		car.mechanicalPoints,
		car.powerPoints,
		sector.aeroWeight,
		sector.mechanicalWeight,
		Math.max(0.15, shares.power)
	);

	const tireMult = tireTimeMult(state.tire, track.moisture, track.trackGripMultiplier);
	const moistureWet = track.moisture === 'wet' || track.moisture === 'flooded';
	const driverMult = driverTimeMult(driver, sector, moistureWet);
	const setupMult = setupTimeMult(track.setupCurrent, track.setupTarget);
	const fuelMult = fuelTimeMult(state.fuelKg);
	const paceMult = paceTimeMult(state.pace);
	const energyMult = energyTimeMult(state.energy, state.batteryPct, shares.power);
	const situMult =
		dirtyAirTimeMult(state.dirtyAir) * damageTimeMult(car.damageFactor) * paceMult;

	const timeMs = Math.round(
		sector.baseTimeMs *
			carMult *
			tireMult *
			driverMult *
			setupMult *
			fuelMult *
			energyMult *
			situMult
	);

	const wear = tireWearDelta(
		state.pace,
		track.tireAbrasionFactor,
		driver.tyreManagement
	);
	const nextLife = Math.max(0, state.tire.life - wear);
	const nextTemp = tireTempAfterSector(
		state.tire.coreTemp,
		state.pace,
		TIRE_OPT_TEMP[state.tire.compound]
	);
	const nextFuel = Math.max(0, state.fuelKg - burnFuelKg(state.pace));
	const nextBattery = applyBatteryDelta(state.batteryPct, state.energy);

	const breakdown: SectorBreakdown = {
		baseTimeMs: sector.baseTimeMs,
		carMult,
		tireMult,
		driverMult,
		situationalMult: situMult,
		setupMult,
		fuelMult,
		energyMult,
		timeMs
	};

	const stateAfter: CarRuntimeState = {
		...state,
		fuelKg: nextFuel,
		batteryPct: nextBattery,
		tire: {
			...state.tire,
			life: nextLife,
			coreTemp: nextTemp
		}
	};

	return { breakdown, stateAfter };
}
