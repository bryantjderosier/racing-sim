import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from './career-start.js';

const FDC_CHAMPIONSHIP_ID = '00000000-0000-4000-8000-000000000003';
const FDC_RULESET_ID = 'fdc-2030-ruleset-v1';
const FDC_SEASON_ID = 'fdc-2030-season';
const FDC_TEMPLATE_ID = 'fdc-standard-weekend-v1';
const FDC_SPRINT_POINTS_ID = 'fdc-sprint-half-points-v1';
const FDC_FEATURE_POINTS_ID = 'fdc-feature-full-points-v1';
const CONTENT_DATE = '2030-01-01T00:00:00.000Z';

export interface FdcWeekendFormatSeed {
	id: string;
	code: string;
	version: number;
	displayName: string;
}

export interface FdcSessionSlotSeed {
	id: string;
	templateId: string;
	sequence: number;
	sessionKind: string;
	targetLaps: number | null;
	targetMinutes: number | null;
	isScored: boolean;
	gridSourceSlotId: string | null;
	reverseGridCount: number;
	mandatoryPitStops: number;
	requiredCompoundRuleId: string | null;
	pointsSystemId: string | null;
	fastestLapPointEligible: boolean;
	parcFermeFromPrevious: boolean;
}

export interface FdcPointsSystemSeed {
	id: string;
	code: string;
	version: number;
	polePoints: number;
	fastestLapPoints: number;
	fastestLapMinFinishPosition: number | null;
	fastestLapRequiresClassified: boolean;
	shortenedRaceAllocationMode: string;
	shortenedRaceDistancePctThreshold: number | null;
	classificationRequirePctDistance: number | null;
	notes: string;
}

export interface FdcPlacePointSeed {
	pointsSystemId: string;
	position: number;
	points: number;
}

export interface FdcTyreCompoundSeed {
	id: string;
	code: string;
	displayName: string;
}

export interface FdcTyreCompoundSpecSeed {
	id: string;
	tyreCompoundId: string;
	version: number;
	gripPeak: number;
	degradationRate: number;
	warmUpLaps: number;
	operatingWindowMinC: number;
	operatingWindowMaxC: number;
	durability: number;
	wetnessCrossover: number;
	isWet: boolean;
	optimalWetnessMinBp: null;
	optimalWetnessMaxBp: null;
	underWetnessLossPpm: null;
	overWetnessLossPpm: null;
	waterClearingPpm: null;
	dryTrackWearMultiplierPpm: null;
	operatingTempMinDeciC: number;
	operatingTempMaxDeciC: number;
}

export interface FdcRulesetSeed {
	id: string;
	entriesPerTeam: number;
	weekendFormatTemplateId: string;
	refuelingEnabled: boolean;
	ersEnabled: boolean;
	drsEnabled: boolean;
	constructorConversionAllowed: boolean;
	ageCapMax: number | null;
	personnelLimitsPayload: string;
	personnelLimitsSchemaVersion: string;
	testingLimitsPayload: string;
	testingLimitsSchemaVersion: string;
	raceDistanceRulePayload: string;
	raceDistanceRuleSchemaVersion: string;
	gridPolicyPayload: string;
	gridPolicySchemaVersion: string;
}

export interface FdcRulesetSupplyTierSeed {
	rulesetId: string;
	tier: string;
}

export interface FdcPartCategoryRuleSeed {
	id: string;
	rulesetId: string;
	partCategory: string;
	participantStatus: string;
	procurementMode: string;
	upgradeMode: string;
}

export interface FdcSeasonSeed {
	id: string;
	championshipId: string;
	seasonYear: number;
	rulesetId: string;
}

export interface FdcCircuitSeed {
	id: string;
	name: string;
	shortName: string;
	nationId: string;
	timezone: string;
	firstAppearanceYear: number;
}

export interface FdcCircuitLayoutSeed {
	id: string;
	circuitId: string;
	versionLabel: string;
	effectiveFromYear: number;
	lengthKm: number;
	type: string;
	overtakingDifficulty: number;
	abrasion: number;
	downforceImportance: number;
	powerImportance: number;
	brakingDemand: number;
	tractionDemand: number;
	elevationChange: number;
	wallProximity: number;
	coolingDemand: number;
	gripBaseline: number;
	pitLossSeconds: number;
	pitLaneSpeedFactor: number;
	safetyCarLikelihood: number;
	vscLikelihood: number;
	qualifyingLapDeltaSensitivity: number;
	fuelConsumptionModifier: number;
	ersHarvestModifier: number;
	topSpeedZoneFactor: number;
	cornerCount: number;
	possibleDrsZoneCount: number;
	sectorsPayload: string;
	waypointsPayload: string;
	marshalZonesPayload: string;
	climateProfilePayload: string;
	geometrySchemaVersion: string;
	climateProfileSchemaVersion: string;
}

export interface FdcEventSeed {
	id: string;
	championshipSeasonId: string;
	circuitLayoutVersionId: string;
	roundNumber: number;
	startDate: string;
	name: string;
}

export interface FdcEventSessionSeed {
	id: string;
	championshipEventId: string;
	sourceSlotId: string;
	sequence: number;
	sessionKind: string;
	scheduledStart: string;
	scheduledLaps: number | null;
	scheduledMinutes: number | null;
	drsEnabledOverride: boolean | null;
	gridSourceSessionDefinitionId: string | null;
	reverseGridCount: number;
	mandatoryPitStops: number;
	requiredCompoundRuleId: string | null;
	pointsSystemId: string | null;
	fastestLapPointEligible: boolean;
	parcFermeFromPrevious: boolean;
}

export interface FdcWeekendSessionSeed {
	id: string;
	eventSessionDefinitionId: string;
	status: string;
	tempC: number;
	rainNow: number;
	rainInMinutes: number;
	trackWetness: number;
	simulationInputPayload: string;
	simulationInputSchemaVersion: string;
	activeCheckpointId: null;
}

export interface FdcDriverSeed {
	id: string;
	firstName: string;
	lastName: string;
	displayName: string;
	dateOfBirth: string;
	nationalityId: string;
	portraitId: string;
	biographySeed: string;
	preferredNumber: number;
	careerStartYear: number;
	retiredAt: null;
	reputation: number;
	ambition: number;
	loyalty: number;
	temperament: number;
	leadership: number;
	mediaHandling: number;
	developmentRate: number;
	peakAgeStart: number;
	peakAgeEnd: number;
	declineRate: number;
	pace: number;
	raceCraft: number;
	consistency: number;
	tyreManagement: number;
	fuelManagement: number;
	wetPace: number;
	qualifyingPace: number;
	starts: number;
	focus: number;
	feedback: number;
	adaptability: number;
	aggression: number;
	composure: number;
	pacePotential: number;
	raceCraftPotential: number;
	consistencyPotential: number;
	tyreManagementPotential: number;
	fuelManagementPotential: number;
	wetPacePotential: number;
	qualifyingPacePotential: number;
	startsPotential: number;
	focusPotential: number;
	feedbackPotential: number;
	adaptabilityPotential: number;
	aggressionPotential: number;
	composurePotential: number;
}

export interface FdcDriverHealthSeed {
	driverId: string;
	injurySeverity: string;
	injuryDaysRemaining: number;
	fatigue: number;
	morale: number;
	form: number;
}

export interface FdcTeamSeasonEntrySeed {
	id: string;
	teamId: string;
	championshipSeasonId: string;
	constructorStatus: string;
	entriesCount: number;
	createdAt: string;
}

export interface FdcSeatAssignmentSeed {
	id: string;
	driverId: string;
	teamSeasonEntryId: string;
	seatRole: string;
	startDate: string;
	endDate: string;
	isPrimary: boolean;
}

export interface FdcPartDesignSeed {
	id: string;
	teamId: string;
	partCategory: string;
	version: number;
	formulaVersion: string;
	inputsHash: string;
	performancePayload: string;
	performanceSchemaVersion: string;
	reliabilityPayload: string;
	reliabilitySchemaVersion: string;
	createdAt: string;
}

export interface FdcChassisSeed {
	id: string;
	teamSeasonEntryId: string;
	chassisDesignVersionId: string;
	serialNumber: string;
	status: string;
}

export interface FdcEventEntrySeed {
	id: string;
	championshipEventId: string;
	teamSeasonEntryId: string;
	chassisInstanceId: string;
	driverId: string;
	carNumber: number;
	baselineResolvedSnapshotId: null;
}

const nationalityByCode = new Map(
	FOUNDATION_NATIONALITIES.map((nationality) => [nationality.code, nationality])
);

const circuitDefinitions = [
	['silvermere', 'Silvermere Circuit', 'Silvermere', 'gbr', 'Europe/London', 5.18, 13, 3],
	['monteluce', 'Monteluce Autodrome', 'Monteluce', 'ita', 'Europe/Rome', 4.91, 11, 4],
	['hohenwald', 'Hohenwald Ring', 'Hohenwald', 'deu', 'Europe/Berlin', 5.44, 15, 3],
	['vallon-rouge', 'Vallon Rouge', 'Vallon Rouge', 'fra', 'Europe/Paris', 4.72, 10, 2],
	['sierra-sol', 'Sierra del Sol', 'Sierra Sol', 'esp', 'Europe/Madrid', 4.65, 12, 5],
	['suzukawa', 'Suzukawa International', 'Suzukawa', 'jpn', 'Asia/Tokyo', 5.03, 14, 4],
	['costa-verde', 'Costa Verde', 'Costa Verde', 'bra', 'America/Sao_Paulo', 4.81, 13, 4],
	['redwood', 'Redwood Raceway', 'Redwood', 'usa', 'America/Los_Angeles', 5.27, 16, 3],
	[
		'southern-cross',
		'Southern Cross Park',
		'Southern Cross',
		'aus',
		'Australia/Melbourne',
		5.11,
		12,
		4
	],
	['lowlands', 'Lowlands Circuit', 'Lowlands', 'nld', 'Europe/Amsterdam', 4.39, 14, 3]
] as const;

function requiredNationality(code: string): string {
	const nationality = nationalityByCode.get(code);
	if (!nationality) throw new Error(`Missing FDC circuit nationality: ${code}`);
	return nationality.id;
}

function isoDate(roundNumber: number): string {
	const dates = [
		'2030-03-15',
		'2030-04-05',
		'2030-04-26',
		'2030-05-17',
		'2030-06-07',
		'2030-06-28',
		'2030-07-19',
		'2030-08-09',
		'2030-08-30',
		'2030-09-20'
	];
	return dates[roundNumber - 1] ?? dates.at(-1)!;
}

function driverRating(teamIndex: number, seatIndex: number, offset: number): number {
	return Math.max(0, Math.min(100, 84 - teamIndex * 2 + seatIndex * 2 + offset));
}

export const FDC_WEEKEND_FORMAT: FdcWeekendFormatSeed = {
	id: FDC_TEMPLATE_ID,
	code: 'fdc_standard',
	version: 1,
	displayName: 'FDC Standard Weekend'
};

export const FDC_SESSION_SLOTS: readonly FdcSessionSlotSeed[] = Object.freeze([
	{
		id: 'fdc-slot-fp1',
		templateId: FDC_TEMPLATE_ID,
		sequence: 1,
		sessionKind: 'fp1',
		targetLaps: null,
		targetMinutes: 45,
		isScored: false,
		gridSourceSlotId: null,
		reverseGridCount: 0,
		mandatoryPitStops: 0,
		requiredCompoundRuleId: null,
		pointsSystemId: null,
		fastestLapPointEligible: false,
		parcFermeFromPrevious: false
	},
	{
		id: 'fdc-slot-fp2',
		templateId: FDC_TEMPLATE_ID,
		sequence: 2,
		sessionKind: 'fp2',
		targetLaps: null,
		targetMinutes: 45,
		isScored: false,
		gridSourceSlotId: null,
		reverseGridCount: 0,
		mandatoryPitStops: 0,
		requiredCompoundRuleId: null,
		pointsSystemId: null,
		fastestLapPointEligible: false,
		parcFermeFromPrevious: false
	},
	{
		id: 'fdc-slot-fp3',
		templateId: FDC_TEMPLATE_ID,
		sequence: 3,
		sessionKind: 'fp3',
		targetLaps: null,
		targetMinutes: 45,
		isScored: false,
		gridSourceSlotId: null,
		reverseGridCount: 0,
		mandatoryPitStops: 0,
		requiredCompoundRuleId: null,
		pointsSystemId: null,
		fastestLapPointEligible: false,
		parcFermeFromPrevious: false
	},
	{
		id: 'fdc-slot-sprint',
		templateId: FDC_TEMPLATE_ID,
		sequence: 4,
		sessionKind: 'sprint',
		targetLaps: 18,
		targetMinutes: null,
		isScored: true,
		gridSourceSlotId: null,
		reverseGridCount: 0,
		mandatoryPitStops: 0,
		requiredCompoundRuleId: null,
		pointsSystemId: FDC_SPRINT_POINTS_ID,
		fastestLapPointEligible: false,
		parcFermeFromPrevious: false
	},
	{
		id: 'fdc-slot-feature',
		templateId: FDC_TEMPLATE_ID,
		sequence: 5,
		sessionKind: 'feature',
		targetLaps: 28,
		targetMinutes: null,
		isScored: true,
		gridSourceSlotId: null,
		reverseGridCount: 0,
		mandatoryPitStops: 1,
		requiredCompoundRuleId: null,
		pointsSystemId: FDC_FEATURE_POINTS_ID,
		fastestLapPointEligible: false,
		parcFermeFromPrevious: false
	}
]);

export const FDC_POINTS_SYSTEMS: readonly FdcPointsSystemSeed[] = Object.freeze([
	{
		id: FDC_SPRINT_POINTS_ID,
		code: 'fdc_sprint_half',
		version: 1,
		polePoints: 0,
		fastestLapPoints: 0,
		fastestLapMinFinishPosition: null,
		fastestLapRequiresClassified: true,
		shortenedRaceAllocationMode: 'none',
		shortenedRaceDistancePctThreshold: null,
		classificationRequirePctDistance: 75,
		notes: 'Half points for the FDC sprint race.'
	},
	{
		id: FDC_FEATURE_POINTS_ID,
		code: 'fdc_feature_full',
		version: 1,
		polePoints: 0,
		fastestLapPoints: 0,
		fastestLapMinFinishPosition: null,
		fastestLapRequiresClassified: true,
		shortenedRaceAllocationMode: 'none',
		shortenedRaceDistancePctThreshold: null,
		classificationRequirePctDistance: 75,
		notes: 'Full points for the FDC feature race.'
	}
]);

export const FDC_PLACE_POINTS: readonly FdcPlacePointSeed[] = Object.freeze([
	...([12.5, 9, 7.5, 6, 5, 4, 3, 2, 1, 0.5] as const).map((points, index) => ({
		pointsSystemId: FDC_SPRINT_POINTS_ID,
		position: index + 1,
		points
	})),
	...([25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const).map((points, index) => ({
		pointsSystemId: FDC_FEATURE_POINTS_ID,
		position: index + 1,
		points
	}))
]);

export const FDC_TYRE_COMPOUNDS: readonly FdcTyreCompoundSeed[] = Object.freeze([
	{ id: 'fdc-tyre-soft', code: 'soft', displayName: 'Soft' },
	{ id: 'fdc-tyre-medium', code: 'medium', displayName: 'Medium' },
	{ id: 'fdc-tyre-hard', code: 'hard', displayName: 'Hard' }
]);

export const FDC_TYRE_COMPOUND_SPECS: readonly FdcTyreCompoundSpecSeed[] = Object.freeze([
	{
		id: 'fdc-tyre-soft-v1',
		tyreCompoundId: 'fdc-tyre-soft',
		version: 1,
		gripPeak: 1_012_000,
		degradationRate: 255,
		warmUpLaps: 1,
		operatingWindowMinC: 75,
		operatingWindowMaxC: 105,
		durability: 0.72,
		wetnessCrossover: 1_600,
		isWet: false,
		optimalWetnessMinBp: null,
		optimalWetnessMaxBp: null,
		underWetnessLossPpm: null,
		overWetnessLossPpm: null,
		waterClearingPpm: null,
		dryTrackWearMultiplierPpm: null,
		operatingTempMinDeciC: 750,
		operatingTempMaxDeciC: 1_050
	},
	{
		id: 'fdc-tyre-medium-v1',
		tyreCompoundId: 'fdc-tyre-medium',
		version: 1,
		gripPeak: 1_005_000,
		degradationRate: 178,
		warmUpLaps: 2,
		operatingWindowMinC: 80,
		operatingWindowMaxC: 110,
		durability: 0.86,
		wetnessCrossover: 1_700,
		isWet: false,
		optimalWetnessMinBp: null,
		optimalWetnessMaxBp: null,
		underWetnessLossPpm: null,
		overWetnessLossPpm: null,
		waterClearingPpm: null,
		dryTrackWearMultiplierPpm: null,
		operatingTempMinDeciC: 800,
		operatingTempMaxDeciC: 1_100
	},
	{
		id: 'fdc-tyre-hard-v1',
		tyreCompoundId: 'fdc-tyre-hard',
		version: 1,
		gripPeak: 999_000,
		degradationRate: 125,
		warmUpLaps: 3,
		operatingWindowMinC: 85,
		operatingWindowMaxC: 115,
		durability: 0.96,
		wetnessCrossover: 1_900,
		isWet: false,
		optimalWetnessMinBp: null,
		optimalWetnessMaxBp: null,
		underWetnessLossPpm: null,
		overWetnessLossPpm: null,
		waterClearingPpm: null,
		dryTrackWearMultiplierPpm: null,
		operatingTempMinDeciC: 850,
		operatingTempMaxDeciC: 1_150
	}
]);

export const FDC_RULESET: FdcRulesetSeed = {
	id: FDC_RULESET_ID,
	entriesPerTeam: 2,
	weekendFormatTemplateId: FDC_TEMPLATE_ID,
	refuelingEnabled: true,
	ersEnabled: false,
	drsEnabled: true,
	constructorConversionAllowed: false,
	ageCapMax: 30,
	personnelLimitsPayload: JSON.stringify({
		teamEntries: 2,
		pitCrewSize: 7,
		sharedPitCrew: true
	}),
	personnelLimitsSchemaVersion: 'personnel-limits-v1',
	testingLimitsPayload: JSON.stringify({
		practiceSessions: 3,
		qualifyingSessions: 0,
		practiceTesting: 'limited'
	}),
	testingLimitsSchemaVersion: 'testing-limits-v1',
	raceDistanceRulePayload: JSON.stringify({
		sprintLaps: 18,
		featureLaps: 28,
		mandatoryFeaturePitStops: 1
	}),
	raceDistanceRuleSchemaVersion: 'race-distance-v1',
	gridPolicyPayload: JSON.stringify({
		qualifying: 'none',
		competitiveSessions: {
			sprint: 'reverse_driver_championship_order',
			feature: 'reverse_driver_championship_order'
		},
		openingRaceFallback: 'regulation_entry_ranking',
		tieBreak: 'championship_countback_before_reversal'
	}),
	gridPolicySchemaVersion: 'grid-policy-v1'
};

export const FDC_RULESET_SUPPLY_TIERS: readonly FdcRulesetSupplyTierSeed[] = Object.freeze([
	{ rulesetId: FDC_RULESET_ID, tier: 'league_spec' }
]);

export const FDC_PART_CATEGORY_RULES: readonly FdcPartCategoryRuleSeed[] = Object.freeze(
	['aero', 'chassis', 'powertrain', 'reliability'].map((partCategory) => ({
		id: `fdc-rule-${partCategory}`,
		rulesetId: FDC_RULESET_ID,
		partCategory,
		participantStatus: 'junior',
		procurementMode: 'league_spec',
		upgradeMode: 'reliability_only'
	}))
);

export const FDC_SEASON: FdcSeasonSeed = {
	id: FDC_SEASON_ID,
	championshipId: FDC_CHAMPIONSHIP_ID,
	seasonYear: 2030,
	rulesetId: FDC_RULESET_ID
};

export const FDC_CIRCUITS: readonly FdcCircuitSeed[] = Object.freeze(
	circuitDefinitions.map(([code, name, shortName, nationCode, timezone]) => ({
		id: `fdc-circuit-${code}`,
		name,
		shortName,
		nationId: requiredNationality(nationCode),
		timezone,
		firstAppearanceYear: 2030
	}))
);

export const FDC_LAYOUTS: readonly FdcCircuitLayoutSeed[] = Object.freeze(
	circuitDefinitions.map(([code, , , , , lengthKm, cornerCount, drsZones], index) => ({
		id: `fdc-layout-${code}-v1`,
		circuitId: `fdc-circuit-${code}`,
		versionLabel: '2030-standard',
		effectiveFromYear: 2030,
		lengthKm,
		type: index % 3 === 0 ? 'permanent' : index % 3 === 1 ? 'street' : 'hybrid',
		overtakingDifficulty: 35 + (index % 5) * 10,
		abrasion: 30 + (index % 4) * 12,
		downforceImportance: 45 + (index % 5) * 8,
		powerImportance: 45 + ((index + 2) % 5) * 8,
		brakingDemand: 40 + ((index + 1) % 5) * 10,
		tractionDemand: 40 + ((index + 3) % 5) * 9,
		elevationChange: 20 + (index % 6) * 8,
		wallProximity: index % 3 === 1 ? 85 : 35 + (index % 4) * 10,
		coolingDemand: 35 + ((index + 1) % 5) * 9,
		gripBaseline: 0.98 + (index % 3) * 0.01,
		pitLossSeconds: 19 + (index % 4) * 1.2,
		pitLaneSpeedFactor: 0.94,
		safetyCarLikelihood: 0.08 + (index % 4) * 0.02,
		vscLikelihood: 0.12 + (index % 3) * 0.02,
		qualifyingLapDeltaSensitivity: 0.9 + (index % 4) * 0.05,
		fuelConsumptionModifier: 0.96 + (index % 5) * 0.02,
		ersHarvestModifier: 0.95 + (index % 4) * 0.03,
		topSpeedZoneFactor: 0.9 + (index % 5) * 0.04,
		cornerCount,
		possibleDrsZoneCount: drsZones,
		sectorsPayload: JSON.stringify([
			{ sector: 1, distancePct: 0.32 },
			{ sector: 2, distancePct: 0.34 },
			{ sector: 3, distancePct: 0.34 }
		]),
		waypointsPayload: JSON.stringify([]),
		marshalZonesPayload: JSON.stringify([]),
		climateProfilePayload: JSON.stringify({ rainChance: 0.22 + (index % 4) * 0.04 }),
		geometrySchemaVersion: 'circuit-geometry-v1',
		climateProfileSchemaVersion: 'circuit-climate-v1'
	}))
);

export const FDC_EVENTS: readonly FdcEventSeed[] = Object.freeze(
	FDC_LAYOUTS.map((layout, index) => ({
		id: `fdc-event-2030-${String(index + 1).padStart(2, '0')}`,
		championshipSeasonId: FDC_SEASON_ID,
		circuitLayoutVersionId: layout.id,
		roundNumber: index + 1,
		startDate: isoDate(index + 1),
		name: `FDC Round ${index + 1} — ${FDC_CIRCUITS[index].shortName}`
	}))
);

const sessionStartOffsets = [
	'T09:00:00.000Z',
	'T14:00:00.000Z',
	'T09:00:00.000Z',
	'T14:00:00.000Z',
	'T09:00:00.000Z'
] as const;

export const FDC_EVENT_SESSION_DEFINITIONS: readonly FdcEventSessionSeed[] = Object.freeze(
	FDC_EVENTS.flatMap((event) =>
		FDC_SESSION_SLOTS.map((slot, index) => ({
			id: `${event.id}-${slot.sessionKind}`,
			championshipEventId: event.id,
			sourceSlotId: slot.id,
			sequence: slot.sequence,
			sessionKind: slot.sessionKind,
			scheduledStart: `${event.startDate}${sessionStartOffsets[index]}`,
			scheduledLaps: slot.targetLaps,
			scheduledMinutes: slot.targetMinutes,
			drsEnabledOverride: null,
			gridSourceSessionDefinitionId: null,
			reverseGridCount: slot.reverseGridCount,
			mandatoryPitStops: slot.mandatoryPitStops,
			requiredCompoundRuleId: slot.requiredCompoundRuleId,
			pointsSystemId: slot.pointsSystemId,
			fastestLapPointEligible: slot.fastestLapPointEligible,
			parcFermeFromPrevious: slot.parcFermeFromPrevious
		}))
	)
);

export const FDC_WEEKEND_SESSIONS: readonly FdcWeekendSessionSeed[] = Object.freeze(
	FDC_EVENT_SESSION_DEFINITIONS.map((session) => ({
		id: `${session.id}-runtime`,
		eventSessionDefinitionId: session.id,
		status: 'scheduled',
		tempC: 22,
		rainNow: 0,
		rainInMinutes: 0,
		trackWetness: 0,
		simulationInputPayload: '{}',
		simulationInputSchemaVersion: 'race-input-v1',
		activeCheckpointId: null
	}))
);

const driverNames = [
	['Elias', 'Mercer'],
	['Mara', 'Voss'],
	['Jonas', 'Vale'],
	['Lina', 'Moretti'],
	['Theo', 'Hartmann'],
	['Nadia', 'Keller'],
	['Julien', 'Marchand'],
	['Anais', 'Roche'],
	['Mateo', 'Serrano'],
	['Iria', 'Navarro'],
	['Ren', 'Takeda'],
	['Hana', 'Mizuno'],
	['Rafael', 'Costa'],
	['Bianca', 'Lima'],
	['Caleb', 'Wright'],
	['Sloane', 'Bennett'],
	['Lachlan', 'Reid'],
	['Mia', 'Dalton'],
	['Daan', 'Vermeer'],
	['Fleur', 'Smit']
] as const;

export const FDC_DRIVERS: readonly FdcDriverSeed[] = Object.freeze(
	FOUNDATION_FDC_TEAMS.flatMap((team, teamIndex) =>
		[0, 1].map((seatIndex) => {
			const driverIndex = teamIndex * 2 + seatIndex;
			const [firstName, lastName] = driverNames[driverIndex];
			const base = driverRating(teamIndex, seatIndex, 0);
			return {
				id: `fdc-driver-${String(driverIndex + 1).padStart(2, '0')}`,
				firstName,
				lastName,
				displayName: `${firstName} ${lastName}`,
				dateOfBirth: `2010-${String((driverIndex % 9) + 1).padStart(2, '0')}-${String((driverIndex % 28) + 1).padStart(2, '0')}`,
				nationalityId: team.nationalityId,
				portraitId: `fdc-driver-portrait-${driverIndex + 1}`,
				biographySeed: `fdc-2030-driver-${driverIndex + 1}`,
				preferredNumber: driverIndex + 2,
				careerStartYear: 2028,
				retiredAt: null,
				reputation: driverRating(teamIndex, seatIndex, -6),
				ambition: driverRating(teamIndex, seatIndex, 4),
				loyalty: driverRating(teamIndex, seatIndex, -2),
				temperament: driverRating(teamIndex, seatIndex, 1),
				leadership: driverRating(teamIndex, seatIndex, -5),
				mediaHandling: driverRating(teamIndex, seatIndex, -4),
				developmentRate: driverRating(teamIndex, seatIndex, 8),
				peakAgeStart: 25,
				peakAgeEnd: 31,
				declineRate: 1,
				pace: base,
				raceCraft: driverRating(teamIndex, seatIndex, -1),
				consistency: driverRating(teamIndex, seatIndex, 2),
				tyreManagement: driverRating(teamIndex, seatIndex, -3),
				fuelManagement: driverRating(teamIndex, seatIndex, -1),
				wetPace: driverRating(teamIndex, seatIndex, -4),
				qualifyingPace: driverRating(teamIndex, seatIndex, 1),
				starts: driverRating(teamIndex, seatIndex, 0),
				focus: driverRating(teamIndex, seatIndex, 3),
				feedback: driverRating(teamIndex, seatIndex, -2),
				adaptability: driverRating(teamIndex, seatIndex, 4),
				aggression: driverRating(teamIndex, seatIndex, 3),
				composure: driverRating(teamIndex, seatIndex, 1),
				pacePotential: Math.min(100, base + 8),
				raceCraftPotential: Math.min(100, driverRating(teamIndex, seatIndex, 7)),
				consistencyPotential: Math.min(100, driverRating(teamIndex, seatIndex, 8)),
				tyreManagementPotential: Math.min(100, driverRating(teamIndex, seatIndex, 6)),
				fuelManagementPotential: Math.min(100, driverRating(teamIndex, seatIndex, 6)),
				wetPacePotential: Math.min(100, driverRating(teamIndex, seatIndex, 5)),
				qualifyingPacePotential: Math.min(100, driverRating(teamIndex, seatIndex, 7)),
				startsPotential: Math.min(100, driverRating(teamIndex, seatIndex, 6)),
				focusPotential: Math.min(100, driverRating(teamIndex, seatIndex, 7)),
				feedbackPotential: Math.min(100, driverRating(teamIndex, seatIndex, 6)),
				adaptabilityPotential: Math.min(100, driverRating(teamIndex, seatIndex, 8)),
				aggressionPotential: Math.min(100, driverRating(teamIndex, seatIndex, 7)),
				composurePotential: Math.min(100, driverRating(teamIndex, seatIndex, 7))
			};
		})
	)
);

export const FDC_DRIVER_HEALTH: readonly FdcDriverHealthSeed[] = Object.freeze(
	FDC_DRIVERS.map((driver) => ({
		driverId: driver.id,
		injurySeverity: 'none',
		injuryDaysRemaining: 0,
		fatigue: 0,
		morale: 75,
		form: 0
	}))
);

export const FDC_TEAM_SEASON_ENTRIES: readonly FdcTeamSeasonEntrySeed[] = Object.freeze(
	FOUNDATION_FDC_TEAMS.map((team) => ({
		id: `fdc-entry-${team.code}-2030`,
		teamId: team.id,
		championshipSeasonId: FDC_SEASON_ID,
		constructorStatus: 'junior',
		entriesCount: 2,
		createdAt: CONTENT_DATE
	}))
);

export const FDC_SEAT_ASSIGNMENTS: readonly FdcSeatAssignmentSeed[] = Object.freeze(
	FDC_DRIVERS.map((driver, driverIndex) => ({
		id: `fdc-seat-${driver.id}`,
		driverId: driver.id,
		teamSeasonEntryId: FDC_TEAM_SEASON_ENTRIES[Math.floor(driverIndex / 2)].id,
		seatRole: driverIndex % 2 === 0 ? 'driver_1' : 'driver_2',
		startDate: '2030-01-01',
		endDate: '2030-12-31',
		isPrimary: true
	}))
);

export const FDC_PART_DESIGNS: readonly FdcPartDesignSeed[] = Object.freeze(
	FOUNDATION_FDC_TEAMS.map((team, teamIndex) => ({
		id: `fdc-chassis-design-${team.code}-v1`,
		teamId: team.id,
		partCategory: 'chassis',
		version: 1,
		formulaVersion: 'car-content-v1',
		inputsHash: `fdc-2030-${team.code}-chassis-v1`,
		performancePayload: JSON.stringify({
			aero: { frontWing: 54 - teamIndex, rearWing: 55 - teamIndex },
			chassis: { suspension: 58 - teamIndex, weight: 57 - teamIndex },
			powertrain: { acceleration: 56 - teamIndex, efficiency: 55 - teamIndex },
			reliability: { durability: 60 - teamIndex }
		}),
		performanceSchemaVersion: 'car-performance-v1',
		reliabilityPayload: JSON.stringify({ overall: 74 - teamIndex }),
		reliabilitySchemaVersion: 'car-reliability-v1',
		createdAt: CONTENT_DATE
	}))
);

export const FDC_CHASSIS: readonly FdcChassisSeed[] = Object.freeze(
	FDC_TEAM_SEASON_ENTRIES.flatMap((entry, teamIndex) =>
		[0, 1].map((seatIndex) => ({
			id: `fdc-chassis-${FOUNDATION_FDC_TEAMS[teamIndex].code}-${seatIndex + 1}`,
			teamSeasonEntryId: entry.id,
			chassisDesignVersionId: FDC_PART_DESIGNS[teamIndex].id,
			serialNumber: `FDC-${teamIndex + 1}${seatIndex + 1}-2030`,
			status: 'available'
		}))
	)
);

export const FDC_EVENT_ENTRIES: readonly FdcEventEntrySeed[] = Object.freeze(
	FDC_EVENTS.flatMap((event) =>
		FDC_DRIVERS.map((driver, driverIndex) => ({
			id: `${event.id}-${driver.id}`,
			championshipEventId: event.id,
			teamSeasonEntryId: FDC_TEAM_SEASON_ENTRIES[Math.floor(driverIndex / 2)].id,
			chassisInstanceId: FDC_CHASSIS[driverIndex].id,
			driverId: driver.id,
			carNumber: driver.preferredNumber,
			baselineResolvedSnapshotId: null
		}))
	)
);

export const FDC_FOUNDATION_CONTENT = Object.freeze({
	weekendFormat: FDC_WEEKEND_FORMAT,
	sessionSlots: FDC_SESSION_SLOTS,
	pointsSystems: FDC_POINTS_SYSTEMS,
	placePoints: FDC_PLACE_POINTS,
	tyreCompounds: FDC_TYRE_COMPOUNDS,
	tyreCompoundSpecs: FDC_TYRE_COMPOUND_SPECS,
	ruleset: FDC_RULESET,
	rulesetSupplyTiers: FDC_RULESET_SUPPLY_TIERS,
	partCategoryRules: FDC_PART_CATEGORY_RULES,
	season: FDC_SEASON,
	circuits: FDC_CIRCUITS,
	layouts: FDC_LAYOUTS,
	events: FDC_EVENTS,
	eventSessionDefinitions: FDC_EVENT_SESSION_DEFINITIONS,
	weekendSessions: FDC_WEEKEND_SESSIONS,
	drivers: FDC_DRIVERS,
	driverHealth: FDC_DRIVER_HEALTH,
	teamSeasonEntries: FDC_TEAM_SEASON_ENTRIES,
	seatAssignments: FDC_SEAT_ASSIGNMENTS,
	partDesigns: FDC_PART_DESIGNS,
	chassis: FDC_CHASSIS,
	eventEntries: FDC_EVENT_ENTRIES
});
