import { clamp, roundHalfEven } from '../core/math';
import type {
	DriverRatings,
	EngineMode,
	FormulaConfig,
	TrackSegment,
	TyreCompoundSpec,
	TyreConservation
} from '../core/types';

export function tyreFactor(compound: TyreCompoundSpec, wearBp: number, lapsUsed: number): number {
	const warmupProgress = Math.min(1, (lapsUsed + 0.35) / compound.warmupLaps);
	const warmupPenalty = (1 - warmupProgress) * 0.012;
	const wearPenalty = (wearBp / 10_000) * (compound.wearTimeLossMsPerLap / 90_000);
	const postKneeProgress = clamp(
		(wearBp - compound.wearKneeBp) / (10_000 - compound.wearKneeBp),
		0,
		1
	);
	const postKneePenalty = postKneeProgress * (compound.postKneeTimeLossMsPerLap / 90_000);
	return 1_000_000 / compound.peakGripPpm + warmupPenalty + wearPenalty + postKneePenalty;
}

export function tyreWearBp(
	compound: TyreCompoundSpec,
	currentWearBp: number,
	driver: DriverRatings,
	mode: EngineMode,
	conservation: TyreConservation,
	segment: TrackSegment,
	segments: TrackSegment[],
	fuelGrams: number,
	tyreWearSetupPpm: number,
	config: FormulaConfig
): number {
	const totalEnergy = segments.reduce((sum, candidate) => sum + candidate.tyreEnergyFactor, 0);
	const driverFactor = 1 - (driver.tyreManagement - config.ratingCenter) * 0.012;
	const modeFactor = mode === 'attack' ? 1.09 : mode === 'conserve' ? 0.94 : 1;
	const conservationFactor = conservation === 'push' ? 1.08 : conservation === 'save' ? 0.9 : 1;
	const fuelFactor = 1 + Math.max(0, fuelGrams - 30_000) / 300_000;
	const setupFactor = tyreWearSetupPpm / 1_000_000;
	const wear = roundHalfEven(
		(compound.baseWearPerLapBp *
			segment.tyreEnergyFactor *
			driverFactor *
			modeFactor *
			conservationFactor *
			fuelFactor *
			setupFactor) /
			totalEnergy
	);
	return clamp(currentWearBp + Math.max(1, wear), 0, config.wearLimitBp);
}
