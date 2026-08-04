import { clamp, roundHalfEven } from '../core/math';
import type {
	DriverRatings,
	FormulaConfig,
	TrackSegment,
	WeatherDriverConfig
} from '../core/types';
import { driverFactor } from './driver';

const PPM = 1_000_000;
const BASIS_POINTS = 10_000;
const MINIMUM_RATING = 0;
const MAXIMUM_RATING = 100;

export function wetPaceBlendBp(racingLineWetnessBp: number): number {
	return clamp(racingLineWetnessBp, 0, BASIS_POINTS);
}

export function weatherTransitionPenaltyPpm(
	driver: DriverRatings,
	racingLineWetnessBp: number,
	previousRacingLineWetnessBp: number,
	trackTempDeciC: number,
	previousTrackTempDeciC: number,
	config: Readonly<WeatherDriverConfig>
): number {
	const wetnessChangeBp = Math.abs(racingLineWetnessBp - previousRacingLineWetnessBp);
	const trackTempChangeDeciC = Math.abs(trackTempDeciC - previousTrackTempDeciC);
	const maximumPenaltyPpm = Math.min(
		config.maximumTransitionLossPpm,
		wetnessChangeBp * config.wetnessTransitionLossPpmPerBp +
			trackTempChangeDeciC * config.trackTempTransitionLossPpmPerDeciC
	);
	const adaptability = clamp(driver.adaptability!, MINIMUM_RATING, MAXIMUM_RATING);
	const adaptabilityRange = MAXIMUM_RATING - MINIMUM_RATING;
	const adaptabilityPenaltyPpm =
		config.bestAdaptabilityPenaltyPpm +
		roundHalfEven(
			((MAXIMUM_RATING - adaptability) * (PPM - config.bestAdaptabilityPenaltyPpm)) /
				adaptabilityRange
		);
	return roundHalfEven((maximumPenaltyPpm * adaptabilityPenaltyPpm) / PPM);
}

export function weatherDriverFactor(
	driver: DriverRatings,
	segment: TrackSegment,
	racingLineWetnessBp: number,
	previousRacingLineWetnessBp: number,
	trackTempDeciC: number,
	previousTrackTempDeciC: number,
	formulaConfig: FormulaConfig,
	weatherConfig: Readonly<WeatherDriverConfig>
): number {
	const dryFactor = driverFactor(driver, segment, formulaConfig);
	const wetFactor = driverFactor({ ...driver, pace: driver.wetPace! }, segment, formulaConfig);
	const wetBlendBp = wetPaceBlendBp(racingLineWetnessBp);
	const blendedFactor =
		(dryFactor * (BASIS_POINTS - wetBlendBp) + wetFactor * wetBlendBp) / BASIS_POINTS;
	const transitionPenaltyPpm = weatherTransitionPenaltyPpm(
		driver,
		racingLineWetnessBp,
		previousRacingLineWetnessBp,
		trackTempDeciC,
		previousTrackTempDeciC,
		weatherConfig
	);
	return blendedFactor * (1 + transitionPenaltyPpm / PPM);
}
