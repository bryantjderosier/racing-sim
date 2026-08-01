export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type Milliseconds = Brand<number, 'Milliseconds'>;
export type Grams = Brand<number, 'Grams'>;
export type BasisPoints = Brand<number, 'BasisPoints'>;
export type PartsPerMillion = Brand<number, 'PartsPerMillion'>;
export type Rating = Brand<number, 'Rating'>;
export type LapNumber = Brand<number, 'LapNumber'>;
export type SegmentId = Brand<string, 'SegmentId'>;

export type OfficialSector = 1 | 2 | 3;
export type EngineMode = 'conserve' | 'balanced' | 'attack';
export type TyreConservation = 'save' | 'normal' | 'push';
export type OvertakingAggression = 'low' | 'normal' | 'high';
export type CompoundName = 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';

export interface DriverRatings {
	pace: number;
	raceCraft: number;
	consistency: number;
	tyreManagement: number;
	fuelManagement: number;
	starts: number;
	focus: number;
	aggression: number;
	composure: number;
	feedback: number;
	wetPace?: number;
	adaptability?: number;
}

export interface CarPerformance {
	topSpeed: number;
	acceleration: number;
	corneringHigh: number;
	corneringLow: number;
	brakingStability: number;
	drag: number;
	coolingEfficiency: number;
	fuelEfficiency: number;
	reliabilityOverall: number;
	dryWeightKg: number;
}

export interface TyreCompoundSpec {
	name: CompoundName;
	peakGripPpm: number;
	warmupLaps: number;
	baseWearPerLapBp: number;
	wearTimeLossMsPerLap: number;
	wearKneeBp: number;
	postKneeTimeLossMsPerLap: number;
	optimalWetnessMinBp?: number;
	optimalWetnessMaxBp?: number;
	underWetnessLossPpm?: number;
	overWetnessLossPpm?: number;
	waterClearingPpm?: number;
	dryTrackWearMultiplierPpm?: number;
	operatingTempMinDeciC?: number;
	operatingTempMaxDeciC?: number;
}

export interface IssuedTyreSet {
	id: string;
	compound: TyreCompoundSpec;
}

export interface SimulationEntry {
	sessionEntryId: string;
	teamId: string;
	driverId: string;
	driverName: string;
	teamName: string;
	carNumber: number;
	gridPosition: number;
	driver: DriverRatings;
	car: CarPerformance;
	setupFactorPpm: number;
	tyreWearSetupPpm: number;
	startingFuelGrams: number;
	tyreSets: IssuedTyreSet[];
	startingTyreSetId: string;
	initialMode: EngineMode;
}

export interface TrackSegment {
	id: string;
	sequence: number;
	officialSector: OfficialSector;
	distanceM: number;
	baseTimeMs: number;
	highSpeedWeight: number;
	lowSpeedWeight: number;
	powerWeight: number;
	topSpeedWeight: number;
	brakingWeight: number;
	overtakingDifficulty: number;
	dirtyAirSensitivity: number;
	tyreEnergyFactor: number;
	fuelBurnFactor: number;
	drainagePpm?: number;
	evaporationPpm?: number;
	racingLineDryingPpm?: number;
	offLineRetentionPpm?: number;
	wetGripSensitivityPpm?: number;
	isDrsDetection?: boolean;
	isDrsActivation?: boolean;
	isPitEntry?: boolean;
	isPitExit?: boolean;
}

export interface SimulationTrack {
	id: string;
	name: string;
	lapDistanceM: number;
	pitLaneLossMs: number;
	segments: TrackSegment[];
}

export interface RaceRules {
	lapCount: number;
	refuelingEnabled: boolean;
	ersEnabled: boolean;
	drsEnabled: boolean;
	drsActivationLap: number;
	drsGapThresholdMs: number;
	mandatoryPitStops: number;
	points: number[];
	fastestLapPoint: number;
	polePoint: number;
	weather?: WeatherRaceRules;
}

export interface WeatherRaceRules {
	wetTyreWaivesDryCompoundRule: boolean;
	drsSuspendRainBp: number;
	drsRestoreRainBp: number;
	drsSuspendWetnessBp: number;
	drsRestoreWetnessBp: number;
	unsafeWetnessBp: number;
}

export interface WeatherEnvelopePoint {
	atMs: number;
	rainIntensityMinBp: number;
	rainIntensityMaxBp: number;
	airTempMinDeciC: number;
	airTempMaxDeciC: number;
	trackTempMinDeciC: number;
	trackTempMaxDeciC: number;
}

export interface WeatherScenarioSpec {
	controlPointIntervalMs: number;
	initialAirTempDeciC: number;
	initialTrackTempDeciC: number;
	initialRainIntensityBp: number;
	initialRacingLineWetnessBp: number;
	initialOffLineWetnessBp: number;
	envelope: WeatherEnvelopePoint[];
}

export type WeatherInput =
	| { enabled: false }
	| {
			enabled: true;
			scenario: WeatherScenarioSpec;
			forecastModelVersion: string;
	  };

export type StrategyAction =
	| { type: 'set_mode'; mode: EngineMode }
	| { type: 'set_tyre_conservation'; target: TyreConservation }
	| { type: 'set_overtaking_aggression'; aggression: OvertakingAggression }
	| { type: 'pit'; tyreSetId: string };

export interface StrategyCommand {
	sequence: number;
	sessionEntryId: string;
	triggerLap: number;
	triggerSegmentId: string;
	action: StrategyAction;
}

export type WeatherStrategyTargetName = 'slicks' | 'intermediate' | 'wet';

export interface WeatherStrategyControllerState {
	nextRefreshAtMs: number;
	currentCompound: CompoundName | null;
	pendingTarget: WeatherStrategyTargetName | null;
	pendingRefreshes: number;
	refreshesSinceCompoundChange: number | null;
	refreshCount: number;
	heldDowngradeCount: number;
	rejectedCommandCount: number;
	nextSequence: number;
	lastScheduledTriggerLap: number | null;
	nextTyreSetIndexByCompound: Partial<Record<CompoundName, number>>;
}

export interface LiveStrategyControllerContext {
	seed: string;
	sessionDurationMs: number;
	lap: number;
	lapCount: number;
	segment: TrackSegment;
	weatherState?: WeatherRuntimeState;
	entries: readonly SimulationEntry[];
	states: readonly EntrySimulationState[];
}

export interface LiveStrategyController {
	onSegmentStart(context: LiveStrategyControllerContext): StrategyCommand[];
	recordCommandResult(accepted: boolean): void;
	sessionDurationMs(): number;
	snapshot(): WeatherStrategyControllerState;
	restore(state: WeatherStrategyControllerState): void;
}

export interface RaceInput {
	formulaVersion: string;
	engineVersion: string;
	seed: string;
	rules: RaceRules;
	track: SimulationTrack;
	entries: SimulationEntry[];
	commands: StrategyCommand[];
	weather?: WeatherInput;
}

export interface FormulaConfig {
	version: string;
	ratingCenter: number;
	carPerformanceScale: number;
	driverPerformancePerPoint: number;
	consistencyNoiseMs: number;
	fuelPenaltyMsPerKgPerLap: number;
	baseFuelBurnGramsPerLap: number;
	trafficThresholdMs: number;
	maxDirtyAirPenaltyPpm: number;
	drsGainPpm: number;
	overtakeAttemptGapMs: number;
	overtakeCooldownLaps: number;
	overtakePassBackCooldownLaps: number;
	overtakeOpportunityBase: number;
	overtakeOpportunityGapWeight: number;
	overtakeOpportunityZoneWeight: number;
	overtakeOpportunityPaceWeight: number;
	overtakeOpportunityDrsWeight: number;
	overtakeOpportunityMaximum: number;
	overtakeSuccessMarginMs: number;
	failedPassLossMs: number;
	pitServiceMs: number;
	startVarianceMs: number;
	qualifyingVarianceMs: number;
	gridPositionSpacingMs: number;
	conservativeFuelFactor: number;
	minimumSegmentTimeMs: number;
	wearLimitBp: number;
}

export interface WeatherSurfaceConfig {
	rainAccumulationBpPerMinuteAtMaximum: number;
	baseDrainagePpmPerMinute: number;
	evaporationReferenceTempDeciC: number;
	evaporationPpmPerDeciCPerMinute: number;
	carDryingPpmPerPass: number;
}

export interface WeatherTyreConfig {
	frictionHeatDeciC: number;
	segmentEnergyHeatDeciC: number;
	surfaceWaterCoolingDeciC: number;
	compoundWetnessCoolingDeciC: number;
	attackModeHeatDeciC: number;
	conserveModeHeatDeciC: number;
	pushConservationHeatDeciC: number;
	saveConservationHeatDeciC: number;
	temperatureResponsePpmPerSegment: number;
	thermalGripLossPpmPerDeciC: number;
	maximumThermalGripLossPpm: number;
	thermalWearPpmPerDeciC: number;
	maximumThermalWearPpm: number;
}

export interface WeatherDriverConfig {
	wetnessTransitionLossPpmPerBp: number;
	trackTempTransitionLossPpmPerDeciC: number;
	maximumTransitionLossPpm: number;
	bestAdaptabilityPenaltyPpm: number;
}

export interface TyreSetState {
	id: string;
	wearBp: number;
	lapsUsed: number;
	mounted: boolean;
	temperatureDeciC?: number;
}

export interface WeatherTruthPoint {
	atMs: number;
	rainIntensityBp: number;
	airTempDeciC: number;
	trackTempDeciC: number;
}

export interface WeatherForecastCapability {
	teamId: string;
	refreshIntervalMs: number;
	usefulHorizonMs: number;
	onsetTimingErrorMs: number;
	intensityErrorBp: number;
	probabilityNoiseBp: number;
	confidenceCeilingBp: number;
}

export interface WeatherForecastCapabilityInputs {
	hqWeatherStationLevel: number;
	weatherAnalystSkill: number;
	tracksideToolsLevel: number;
}

export interface WeatherForecastWindow {
	startOffsetMs: number;
	endOffsetMs: number;
	rainProbabilityBp: number;
	rainIntensityMinBp: number;
	rainIntensityMaxBp: number;
	confidenceBp: number;
	predictedOnsetOffsetMs: number | null;
}

export interface WeatherForecastSurfaceObservation {
	segmentId: string;
	racingLineWetnessBp: number;
	offLineWetnessBp: number;
}

export interface WeatherForecastObservation extends WeatherTruthPoint {
	segments: WeatherForecastSurfaceObservation[];
}

export interface WeatherForecastSnapshot {
	forecastModelVersion: string;
	teamId: string;
	issuedAtMs: number;
	validUntilMs: number;
	observed: WeatherForecastObservation;
	windows: WeatherForecastWindow[];
}

export interface WeatherForecastScore {
	windowCount: number;
	brierScore: number;
	meanOnsetTimingErrorMs: number;
	intensityIntervalCoverageBp: number;
	meanIntensityIntervalWidthBp: number;
}

export interface SegmentSurfaceState {
	segmentId: string;
	racingLineWetnessBp: number;
	offLineWetnessBp: number;
	previousRacingLineWetnessBp: number;
}

export interface WeatherRuntimeState {
	weatherClockMs: number;
	lastUpdateMs: number;
	resolvedTimeline: WeatherTruthPoint[];
	nextTruthPointIndex: number;
	rainIntensityBp: number;
	airTempDeciC: number;
	trackTempDeciC: number;
	previousRainIntensityBp: number;
	previousTrackTempDeciC: number;
	segments: SegmentSurfaceState[];
	drsWeatherSuspended: boolean;
	unsafeConditionsActive: boolean;
}

export interface EntrySimulationState {
	sessionEntryId: string;
	elapsedMs: number;
	currentLapTimeMs: number;
	currentSectorTimeMs: number;
	fuelGrams: number;
	mountedTyreSetId: string;
	tyreSets: TyreSetState[];
	mode: EngineMode;
	tyreConservation: TyreConservation;
	overtakingAggression: OvertakingAggression;
	pitStops: number;
	lapsLed: number;
	fastestLapMs: number | null;
	lastLapMs: number | null;
	finished: boolean;
	drsEligible: boolean;
	gridPosition: number;
}

export type RaceEventType =
	| 'race_started'
	| 'drs_weather_suspended'
	| 'drs_weather_restored'
	| 'unsafe_conditions_detected'
	| 'unsafe_conditions_cleared'
	| 'segment_completed'
	| 'sector_completed'
	| 'lap_completed'
	| 'strategy_command_applied'
	| 'drs_eligibility_changed'
	| 'overtake_attempted'
	| 'overtake_succeeded'
	| 'overtake_failed'
	| 'pit_entry'
	| 'pit_service'
	| 'pit_exit'
	| 'tyre_set_mounted'
	| 'car_finished';

export interface RaceEvent {
	sequence: number;
	type: RaceEventType;
	simulationTimeMs: number;
	lap: number;
	segmentId: string;
	sessionEntryIds: string[];
	payload: Record<string, boolean | number | string | null>;
}

export interface SectorTelemetry {
	sessionEntryId: string;
	lap: number;
	sector: OfficialSector;
	timeMs: number;
	elapsedMs: number;
}

export interface LapTelemetry {
	sessionEntryId: string;
	lap: number;
	lapTimeMs: number;
	elapsedMs: number;
	fuelGrams: number;
	tyreSetId: string;
	tyreWearBp: number;
	position: number;
	temperatureDeciC?: number;
	racingLineWetnessBp?: number;
}

export interface SessionResultOutput {
	sessionEntryId: string;
	position: number;
	gridPosition: number;
	status: 'finished';
	totalTimeMs: number;
	gapToWinnerMs: number;
	bestLapMs: number;
	lapsCompleted: number;
}

export interface RaceResultDetailOutput {
	sessionEntryId: string;
	pitStops: number;
	lapsLed: number;
	positionsGained: number;
}

export interface SessionPointAwardOutput {
	sessionEntryId: string;
	reason: 'position' | 'fastest_lap' | 'pole';
	points: number;
}

export interface RunMetadata {
	formulaVersion: string;
	engineVersion: string;
	rngAlgorithm: 'xoshiro128ss';
	seed: string;
	inputHash: string;
}

export interface RaceRunResult {
	metadata: RunMetadata;
	sessionResults: SessionResultOutput[];
	raceDetails: RaceResultDetailOutput[];
	pointAwards: SessionPointAwardOutput[];
	events: RaceEvent[];
	lapTelemetry: LapTelemetry[];
	sectorTelemetry: SectorTelemetry[];
	finalTyreWear: Record<string, Record<string, number>>;
	finalStateHash: string;
}

export interface RngState {
	s0: number;
	s1: number;
	s2: number;
	s3: number;
}

export interface SimulationSnapshot {
	inputHash: string;
	step: number;
	states: EntrySimulationState[];
	rngStates: Record<string, RngState>;
	events: RaceEvent[];
	lapTelemetry: LapTelemetry[];
	sectorTelemetry: SectorTelemetry[];
	appliedCommands: number[];
	pendingPitTyres: Record<string, string>;
	carsInPit: string[];
	lastOvertakeAttemptStep: Record<string, number>;
	weatherState?: WeatherRuntimeState;
	liveCommands?: StrategyCommand[];
	strategyControllerState?: WeatherStrategyControllerState;
}
