export type PaceDirective = 'conserve' | 'balanced' | 'push' | 'maximum';
export type EnergyDirective = 'harvest' | 'balanced' | 'overtake';
export type TireCompound = 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
export type TrackMoisture = 'dry' | 'damp' | 'wet' | 'flooded';

/** Driver attributes used by the lap engine (0–99). */
export type DriverLapAttrs = {
	braking: number;
	cornering: number;
	traction: number;
	tyreManagement: number;
	wetDriving: number;
	composure: number;
	focus: number;
	aggression: number;
};

export type CarPerformance = {
	/** Summed aero blueprint PP (wings/floor/sidepods). */
	aeroPoints: number;
	/** Suspension / mech grip PP. */
	mechanicalPoints: number;
	/** Power unit PP. */
	powerPoints: number;
	/** Chassis + parts mass excluding fuel (kg). */
	dryWeightKg: number;
	/** 1 = pristine, 0 = heavily damaged. */
	damageFactor: number;
};

export type SetupVector = {
	frontWingAngle: number;
	rearWingAngle: number;
	frontArb: number;
	rearArb: number;
	frontRideHeightMm: number;
	rearRideHeightMm: number;
	frontCamber: number;
	rearCamber: number;
	frontToe: number;
	rearToe: number;
	brakeBias: number;
};

export type SectorProfile = {
	baseTimeMs: number;
	aeroWeight: number;
	mechanicalWeight: number;
	/** Driver emphasis shares (need not sum to 1; normalized at use). */
	brakingShare: number;
	corneringShare: number;
	tractionShare: number;
	powerShare: number;
};

export type TireState = {
	compound: TireCompound;
	/** Remaining life 1→0. */
	life: number;
	/** Core temperature °C. */
	coreTemp: number;
};

export type CarRuntimeState = {
	fuelKg: number;
	/** 0–100. */
	batteryPct: number;
	tire: TireState;
	pace: PaceDirective;
	energy: EnergyDirective;
	/** 0 = clean air, 1 = heavy dirty air. */
	dirtyAir: number;
};

export type TrackLapContext = {
	sectors: [SectorProfile, SectorProfile, SectorProfile];
	tireAbrasionFactor: number;
	moisture: TrackMoisture;
	trackGripMultiplier: number;
	setupTarget: SetupVector;
	setupCurrent: SetupVector;
};

export type SectorBreakdown = {
	baseTimeMs: number;
	carMult: number;
	tireMult: number;
	driverMult: number;
	situationalMult: number;
	setupMult: number;
	fuelMult: number;
	energyMult: number;
	timeMs: number;
};

export type LapResult = {
	sectorTimesMs: [number, number, number];
	lapTimeMs: number;
	sectors: [SectorBreakdown, SectorBreakdown, SectorBreakdown];
	stateAfter: CarRuntimeState;
};
