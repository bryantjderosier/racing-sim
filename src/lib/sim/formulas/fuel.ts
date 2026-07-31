import type {
	CarPerformance,
	EngineMode,
	FormulaConfig,
	TrackSegment,
	TyreConservation
} from '../core/types';
import { roundHalfEven } from '../core/math';

export function fuelPenaltyMs(
	fuelGrams: number,
	segment: TrackSegment,
	lapDistanceM: number,
	config: FormulaConfig
): number {
	return roundHalfEven(
		(fuelGrams / 1_000) * config.fuelPenaltyMsPerKgPerLap * (segment.distanceM / lapDistanceM)
	);
}

export function fuelBurnGrams(
	car: CarPerformance,
	mode: EngineMode,
	conservation: TyreConservation,
	segment: TrackSegment,
	segments: TrackSegment[],
	config: FormulaConfig
): number {
	const totalFuelFactor = segments.reduce((sum, candidate) => sum + candidate.fuelBurnFactor, 0);
	const modeFactor = mode === 'attack' ? 1.025 : mode === 'conserve' ? 0.975 : 1;
	const conservationFactor = conservation === 'save' ? 0.985 : conservation === 'push' ? 1.012 : 1;
	return Math.max(
		1,
		roundHalfEven(
			(config.baseFuelBurnGramsPerLap * segment.fuelBurnFactor * modeFactor * conservationFactor) /
				totalFuelFactor /
				car.fuelEfficiency
		)
	);
}
