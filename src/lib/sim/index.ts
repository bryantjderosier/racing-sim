export { canonicalStringify } from './core/canonicalize';
export { runCalibration } from './calibration/report';
export type { CalibrationOptions } from './calibration/report';
export { runWeatherCalibration, runWeatherStrategySweep } from './calibration/weather-report';
export type {
	WeatherCalibrationOptions,
	WeatherStrategySweepOptions
} from './calibration/weather-report';
export {
	WEATHER_CALIBRATION_SCENARIOS,
	createWeatherCalibrationInput
} from './fixtures/weather-calibration';
export {
	DRY_ENGINE_VERSION,
	FORMULA_CONFIG,
	WEATHER_DRIVER_CONFIG,
	WEATHER_ENGINE_VERSION,
	WEATHER_FORMULA_VERSION,
	WEATHER_SURFACE_CONFIG,
	WEATHER_TYRE_CONFIG
} from './core/config';
export { RaceSimulation, runRace, runRaceFromCheckpoint } from './core/engine';
export {
	CHAMPIONSHIP_CODES,
	CHAMPIONSHIP_DISPLAY_NAMES,
	CHAMPIONSHIP_SHORT_CODES
} from './core/championship';
export type { ChampionshipCode } from './core/championship';
export { WeatherStrategyController } from './core/weather-controller';
export type { WeatherStrategyControllerOptions } from './core/weather-controller';
export {
	buildWeatherForecastSnapshot,
	resolveWeatherForecastCapability,
	scoreWeatherForecast,
	WEATHER_FORECAST_MODEL_VERSION
} from './core/forecast';
export { roundHalfEven } from './core/math';
export { Xoshiro128ss } from './core/rng';
export { validateRaceInput } from './core/validate';
export {
	applyWeatherStrategyPersistence,
	createWeatherStrategyPersistenceState,
	decideWeatherStrategy,
	DEFAULT_WEATHER_STRATEGY_POLICY,
	validateWeatherStrategyPolicy,
	WEATHER_STRATEGY_DOWNGRADE_CONFIRMATIONS,
	WEATHER_STRATEGY_MIN_STINT_REFRESHES
} from './core/weather-strategy';
export type {
	WeatherStrategyDecision,
	WeatherStrategyDecisionInputs,
	WeatherStrategyPolicy,
	WeatherStrategyPersistenceResult,
	WeatherStrategyPersistenceState,
	WeatherStrategyTarget,
	WeatherStrategyUrgency
} from './core/weather-strategy';
export { timingSheetCsv } from './output/telemetry';
export type * from './core/types';
