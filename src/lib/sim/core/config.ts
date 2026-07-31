import type {
	FormulaConfig,
	WeatherDriverConfig,
	WeatherSurfaceConfig,
	WeatherTyreConfig
} from './types';

export const DRY_ENGINE_VERSION = 'headless-segment-v1';
export const WEATHER_FORMULA_VERSION = 'academy-weather-v2';
export const WEATHER_ENGINE_VERSION = 'headless-segment-v3';

export const WEATHER_SURFACE_CONFIG: Readonly<WeatherSurfaceConfig> = Object.freeze({
	rainAccumulationBpPerMinuteAtMaximum: 1_500,
	baseDrainagePpmPerMinute: 60_000,
	evaporationReferenceTempDeciC: 150,
	evaporationPpmPerDeciCPerMinute: 300,
	carDryingPpmPerPass: 1_000
});

export const WEATHER_TYRE_CONFIG: Readonly<WeatherTyreConfig> = Object.freeze({
	frictionHeatDeciC: 600,
	segmentEnergyHeatDeciC: 120,
	surfaceWaterCoolingDeciC: 450,
	compoundWetnessCoolingDeciC: 50,
	attackModeHeatDeciC: 35,
	conserveModeHeatDeciC: -25,
	pushConservationHeatDeciC: 30,
	saveConservationHeatDeciC: -25,
	temperatureResponsePpmPerSegment: 120_000,
	thermalGripLossPpmPerDeciC: 300,
	maximumThermalGripLossPpm: 180_000,
	thermalWearPpmPerDeciC: 1_000,
	maximumThermalWearPpm: 500_000
});

export const WEATHER_DRIVER_CONFIG: Readonly<WeatherDriverConfig> = Object.freeze({
	wetnessTransitionLossPpmPerBp: 25,
	trackTempTransitionLossPpmPerDeciC: 500,
	maximumTransitionLossPpm: 60_000,
	bestAdaptabilityPenaltyPpm: 50_000
});

export const FORMULA_CONFIG: Readonly<FormulaConfig> = Object.freeze({
	version: 'academy-dry-v4',
	ratingCenter: 10.5,
	carPerformanceScale: 0.075,
	driverPerformancePerPoint: 0.00135,
	consistencyNoiseMs: 44,
	fuelPenaltyMsPerKgPerLap: 31,
	baseFuelBurnGramsPerLap: 1_520,
	trafficThresholdMs: 1_800,
	maxDirtyAirPenaltyPpm: 22_000,
	drsGainPpm: 18_000,
	overtakeAttemptGapMs: 1_250,
	overtakeCooldownLaps: 5,
	overtakePassBackCooldownLaps: 2,
	overtakeOpportunityBase: 0.02,
	overtakeOpportunityGapWeight: 0.18,
	overtakeOpportunityZoneWeight: 0.22,
	overtakeOpportunityPaceWeight: 0.08,
	overtakeOpportunityDrsWeight: 0.3,
	overtakeOpportunityMaximum: 0.65,
	overtakeSuccessMarginMs: 110,
	failedPassLossMs: 90,
	pitServiceMs: 3_150,
	startVarianceMs: 420,
	qualifyingVarianceMs: 300,
	gridPositionSpacingMs: 85,
	conservativeFuelFactor: 1.05,
	minimumSegmentTimeMs: 500,
	wearLimitBp: 10_000
});
