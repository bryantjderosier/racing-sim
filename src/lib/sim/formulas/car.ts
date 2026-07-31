import type { CarPerformance, FormulaConfig, TrackSegment } from '../core/types';

export function carFactor(
	car: CarPerformance,
	segment: TrackSegment,
	config: FormulaConfig
): number {
	const performance =
		car.corneringHigh * segment.highSpeedWeight +
		car.corneringLow * segment.lowSpeedWeight +
		car.acceleration * segment.powerWeight +
		car.topSpeed * segment.topSpeedWeight +
		car.brakingStability * segment.brakingWeight;
	const dragPenalty = (car.drag - 1) * (segment.topSpeedWeight + segment.powerWeight) * 0.25;
	const weightPenalty = (car.dryWeightKg - 700) * 0.000_035;
	return 1 - (performance - 1) * config.carPerformanceScale + dragPenalty + weightPenalty;
}
