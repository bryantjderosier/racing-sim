import type { DriverRatings, FormulaConfig, TrackSegment } from '../core/types';

export function driverFactor(
	driver: DriverRatings,
	segment: TrackSegment,
	config: FormulaConfig
): number {
	const relevant =
		driver.pace * 0.55 +
		driver.focus * 0.15 +
		driver.raceCraft * (segment.overtakingDifficulty < 0.65 ? 0.15 : 0.05) +
		driver.composure * 0.15;
	const weight = segment.overtakingDifficulty < 0.65 ? 1 : 0.9;
	return 1 - (relevant / weight - config.ratingCenter) * config.driverPerformancePerPoint;
}

export function paceNoiseMs(
	driver: DriverRatings,
	normalDraw: number,
	config: FormulaConfig
): number {
	const consistencyScale = (101 - driver.consistency) / 50.5;
	return normalDraw * config.consistencyNoiseMs * consistencyScale;
}
