import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { DRY_ENGINE_VERSION, FORMULA_CONFIG } from '../../src/lib/sim/core/config.js';
import { hashString } from '../../src/lib/sim/core/hash.js';
import type {
	CarPerformance,
	RaceInput,
	SimulationEntry,
	TrackSegment,
	TyreCompoundSpec
} from '../../src/lib/sim/core/types.js';
import { validateRaceInput } from '../../src/lib/sim/core/validate.js';
import {
	materializeWeekendSessionInTransaction,
	type Transaction,
	type SessionMaterializationResult
} from './session-materializer.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type QueryDatabase = Database | Transaction;

export interface MaterializedCurrentSession {
	input: RaceInput;
	weekendSessionId: string;
	eventSessionDefinitionId: string;
	pointsSystemId: string | null;
	materialization: SessionMaterializationResult;
}

export class RaceInputMaterializationError extends Error {
	readonly code = 'MATERIALIZATION_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'RaceInputMaterializationError';
	}
}

interface CurrentSession {
	weekendSessionId: string;
	eventSessionDefinitionId: string;
	eventId: string;
	status: string;
	sessionKind: string;
	scheduledStart: string;
	scheduledLaps: number | null;
	scheduledMinutes: number | null;
	drsEnabledOverride: boolean | null;
	mandatoryPitStops: number;
	pointsSystemId: string | null;
	championshipSeasonId: string;
	rulesetId: string;
	rulesetRefuelingEnabled: boolean;
	rulesetErsEnabled: boolean;
	rulesetDrsEnabled: boolean;
	tempC: number | null;
	rainNow: number | null;
	rainInMinutes: number | null;
	trackWetness: number | null;
	layoutId: string;
	layoutName: string;
	layoutLengthKm: number;
	layoutOvertakingDifficulty: number;
	layoutAbrasion: number;
	layoutDownforceImportance: number;
	layoutPowerImportance: number;
	layoutBrakingDemand: number;
	layoutCoolingDemand: number;
	layoutPitLossSeconds: number;
	layoutFuelConsumptionModifier: number;
	layoutTopSpeedZoneFactor: number;
}

export interface RaceInputMaterializationOptions {
	inputTransform?: (input: RaceInput) => RaceInput;
}

interface EventEntryRow {
	eventEntryId: string;
	driverId: string;
	driverName: string | null;
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
	teamId: string;
	teamName: string;
	carNumber: number;
	partDesignId: string;
	performancePayload: string;
	reliabilityPayload: string;
}

interface TyreRow {
	specId: string;
	code: string;
	gripPeak: number;
	degradationRate: number;
	warmUpLaps: number;
	operatingTempMinDeciC: number | null;
	operatingTempMaxDeciC: number | null;
	isWet: boolean;
}

type NumericRecord = Record<string, number>;

function parseNumericRecord(payload: string, label: string): NumericRecord {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new RaceInputMaterializationError(
			`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new RaceInputMaterializationError(`${label} must be an object.`);
	}
	const values = Object.fromEntries(
		Object.entries(parsed).map(([key, value]) => {
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				throw new RaceInputMaterializationError(`${label}.${key} must be numeric.`);
			}
			return [key, value];
		})
	);
	return values;
}

function category(payload: Record<string, unknown>, name: string, label: string): NumericRecord {
	const value = payload[name];
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new RaceInputMaterializationError(`${label}.${name} must be an object.`);
	}
	return parseNumericRecord(JSON.stringify(value), `${label}.${name}`);
}

function numeric(record: NumericRecord, key: string, label: string): number {
	const value = record[key];
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new RaceInputMaterializationError(`${label}.${key} is required.`);
	}
	return value;
}

function average(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function performanceFactor(rating: number): number {
	return 1 + (rating - 50) / 1_000;
}

function parseCarPerformance(entry: EventEntryRow): { car: CarPerformance; reliability: number } {
	let parsedPerformance: unknown;
	try {
		parsedPerformance = JSON.parse(entry.performancePayload);
	} catch (error) {
		throw new RaceInputMaterializationError(
			`Part design ${entry.partDesignId} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (
		!parsedPerformance ||
		typeof parsedPerformance !== 'object' ||
		Array.isArray(parsedPerformance)
	) {
		throw new RaceInputMaterializationError(`Part design ${entry.partDesignId} must be an object.`);
	}
	const payload = parsedPerformance as Record<string, unknown>;
	const aero = category(payload, 'aero', entry.partDesignId);
	const chassis = category(payload, 'chassis', entry.partDesignId);
	const powertrain = category(payload, 'powertrain', entry.partDesignId);
	const reliability = category(payload, 'reliability', entry.partDesignId);
	const frontWing = numeric(aero, 'frontWing', entry.partDesignId);
	const rearWing = numeric(aero, 'rearWing', entry.partDesignId);
	const suspension = numeric(chassis, 'suspension', entry.partDesignId);
	const weight = numeric(chassis, 'weight', entry.partDesignId);
	const acceleration = numeric(powertrain, 'acceleration', entry.partDesignId);
	const efficiency = numeric(powertrain, 'efficiency', entry.partDesignId);
	const durability = numeric(reliability, 'durability', entry.partDesignId);

	let reliabilityPayload: unknown;
	try {
		reliabilityPayload = JSON.parse(entry.reliabilityPayload);
	} catch (error) {
		throw new RaceInputMaterializationError(
			`Reliability payload ${entry.partDesignId} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (
		!reliabilityPayload ||
		typeof reliabilityPayload !== 'object' ||
		Array.isArray(reliabilityPayload)
	) {
		throw new RaceInputMaterializationError(
			`Reliability payload ${entry.partDesignId} must be an object.`
		);
	}
	const reliabilityOverall = numeric(
		reliabilityPayload as NumericRecord,
		'overall',
		entry.partDesignId
	);
	const aeroAverage = average([frontWing, rearWing]);
	const car: CarPerformance = {
		topSpeed: performanceFactor(average([rearWing, acceleration])),
		acceleration: performanceFactor(acceleration),
		corneringHigh: performanceFactor(aeroAverage),
		corneringLow: performanceFactor(average([aeroAverage, suspension])),
		brakingStability: performanceFactor(suspension),
		drag: 1 + (50 - aeroAverage) / 1_000,
		coolingEfficiency: performanceFactor(durability),
		fuelEfficiency: performanceFactor(efficiency),
		reliabilityOverall: 0.9 + reliabilityOverall / 1_000,
		dryWeightKg: 700 + Math.max(0, 100 - weight) * 0.12
	};
	return { car, reliability: Math.round(reliabilityOverall) };
}

type DryCompoundName = 'soft' | 'medium' | 'hard';

function compoundName(value: string): DryCompoundName {
	if (value === 'soft' || value === 'medium' || value === 'hard') return value;
	throw new RaceInputMaterializationError(`Unsupported dry tyre compound: ${value}.`);
}

function tyreSpec(row: TyreRow): TyreCompoundSpec {
	const name = compoundName(row.code);
	const dryWear = {
		soft: { knee: 2_800, postKnee: 4_500 },
		medium: { knee: 2_200, postKnee: 8_000 },
		hard: { knee: 4_000, postKnee: 5_000 }
	}[name];
	return {
		name,
		peakGripPpm: Math.round(row.gripPeak),
		warmupLaps: Math.max(1, Math.round(row.warmUpLaps)),
		baseWearPerLapBp: Math.max(1, Math.round(row.degradationRate)),
		wearTimeLossMsPerLap: Math.round(900 + row.degradationRate * 4.1),
		wearKneeBp: dryWear.knee,
		postKneeTimeLossMsPerLap: dryWear.postKnee,
		...(row.operatingTempMinDeciC === null
			? {}
			: { operatingTempMinDeciC: row.operatingTempMinDeciC }),
		...(row.operatingTempMaxDeciC === null
			? {}
			: { operatingTempMaxDeciC: row.operatingTempMaxDeciC })
	};
}

function buildTrack(session: CurrentSession): RaceInput['track'] {
	const lapDistanceM = Math.round(session.layoutLengthKm * 1_000);
	const segments = Array.from({ length: 15 }, (_, index): TrackSegment => {
		const sequence = index + 1;
		const distanceM = Math.floor(lapDistanceM / 15) + (index < lapDistanceM % 15 ? 1 : 0);
		const rawWeights = [
			0.16 + session.layoutDownforceImportance / 500,
			0.16 + (100 - session.layoutDownforceImportance) / 500,
			0.16 + session.layoutPowerImportance / 500,
			0.16 + session.layoutTopSpeedZoneFactor / 5,
			0.16 + session.layoutBrakingDemand / 500
		];
		const totalWeight = rawWeights.reduce((total, value) => total + value, 0);
		const weights = rawWeights.map((value) => value / totalWeight);
		const roundedWeights = weights
			.slice(0, 4)
			.map((value) => Math.round(value * 1_000_000) / 1_000_000);
		roundedWeights.push(1 - roundedWeights.reduce((total, value) => total + value, 0));
		const sector = sequence <= 5 ? 1 : sequence <= 10 ? 2 : 3;
		return {
			id: `${session.layoutId}-segment-${String(sequence).padStart(2, '0')}`,
			sequence,
			officialSector: sector,
			distanceM,
			baseTimeMs: Math.max(
				FORMULA_CONFIG.minimumSegmentTimeMs,
				Math.round((distanceM / 80) * 1_000)
			),
			highSpeedWeight: roundedWeights[0],
			lowSpeedWeight: roundedWeights[1],
			powerWeight: roundedWeights[2],
			topSpeedWeight: roundedWeights[3],
			brakingWeight: roundedWeights[4],
			overtakingDifficulty: session.layoutOvertakingDifficulty / 100,
			dirtyAirSensitivity: 0.7 + session.layoutCoolingDemand / 500,
			tyreEnergyFactor: 0.8 + session.layoutAbrasion / 100,
			fuelBurnFactor: session.layoutFuelConsumptionModifier,
			...(sequence === 4 ? { isDrsDetection: true } : {}),
			...(sequence === 5 ? { isDrsActivation: true } : {}),
			...(sequence === 14 ? { isPitEntry: true } : {}),
			...(sequence === 15 ? { isPitExit: true } : {})
		};
	});
	return {
		id: session.layoutId,
		name: session.layoutName,
		lapDistanceM,
		pitLaneLossMs: Math.round(session.layoutPitLossSeconds * 1_000),
		segments
	};
}

async function resolveCurrentSession(
	db: QueryDatabase,
	eventSessionDefinitionId?: string
): Promise<CurrentSession> {
	const rows = await db
		.select({
			weekendSessionId: schema.weekendSession.id,
			eventSessionDefinitionId: schema.eventSessionDefinition.id,
			eventId: schema.championshipEvent.id,
			status: schema.weekendSession.status,
			sessionKind: schema.eventSessionDefinition.sessionKind,
			scheduledStart: schema.eventSessionDefinition.scheduledStart,
			scheduledLaps: schema.eventSessionDefinition.scheduledLaps,
			scheduledMinutes: schema.eventSessionDefinition.scheduledMinutes,
			drsEnabledOverride: schema.eventSessionDefinition.drsEnabledOverride,
			mandatoryPitStops: schema.eventSessionDefinition.mandatoryPitStops,
			pointsSystemId: schema.eventSessionDefinition.pointsSystemId,
			championshipSeasonId: schema.championshipSeason.id,
			rulesetId: schema.championshipSeasonRuleset.id,
			rulesetRefuelingEnabled: schema.championshipSeasonRuleset.refuelingEnabled,
			rulesetErsEnabled: schema.championshipSeasonRuleset.ersEnabled,
			rulesetDrsEnabled: schema.championshipSeasonRuleset.drsEnabled,
			tempC: schema.weekendSession.tempC,
			rainNow: schema.weekendSession.rainNow,
			rainInMinutes: schema.weekendSession.rainInMinutes,
			trackWetness: schema.weekendSession.trackWetness,
			layoutId: schema.circuitLayoutVersion.id,
			layoutName: schema.circuit.name,
			layoutLengthKm: schema.circuitLayoutVersion.lengthKm,
			layoutOvertakingDifficulty: schema.circuitLayoutVersion.overtakingDifficulty,
			layoutAbrasion: schema.circuitLayoutVersion.abrasion,
			layoutDownforceImportance: schema.circuitLayoutVersion.downforceImportance,
			layoutPowerImportance: schema.circuitLayoutVersion.powerImportance,
			layoutBrakingDemand: schema.circuitLayoutVersion.brakingDemand,
			layoutCoolingDemand: schema.circuitLayoutVersion.coolingDemand,
			layoutPitLossSeconds: schema.circuitLayoutVersion.pitLossSeconds,
			layoutFuelConsumptionModifier: schema.circuitLayoutVersion.fuelConsumptionModifier,
			layoutTopSpeedZoneFactor: schema.circuitLayoutVersion.topSpeedZoneFactor
		})
		.from(schema.weekendSession)
		.innerJoin(
			schema.eventSessionDefinition,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.innerJoin(
			schema.championshipEvent,
			eq(schema.eventSessionDefinition.championshipEventId, schema.championshipEvent.id)
		)
		.innerJoin(
			schema.championshipSeason,
			eq(schema.championshipEvent.championshipSeasonId, schema.championshipSeason.id)
		)
		.innerJoin(
			schema.championshipSeasonRuleset,
			eq(schema.championshipSeason.rulesetId, schema.championshipSeasonRuleset.id)
		)
		.innerJoin(
			schema.circuitLayoutVersion,
			eq(schema.championshipEvent.circuitLayoutVersionId, schema.circuitLayoutVersion.id)
		)
		.innerJoin(schema.circuit, eq(schema.circuitLayoutVersion.circuitId, schema.circuit.id))
		.orderBy(asc(schema.eventSessionDefinition.scheduledStart));
	const current = [...rows]
		.filter(
			(row) =>
				(row.status === 'live' || row.status === 'paused' || row.status === 'scheduled') &&
				(eventSessionDefinitionId === undefined ||
					row.eventSessionDefinitionId === eventSessionDefinitionId)
		)
		.sort(
			(left, right) =>
				(left.status === 'live' || left.status === 'paused' ? 0 : 1) -
					(right.status === 'live' || right.status === 'paused' ? 0 : 1) ||
				left.scheduledStart.localeCompare(right.scheduledStart)
		)[0];
	if (!current) throw new RaceInputMaterializationError('No current scheduled session exists.');
	return current;
}

async function materializeResolvedSession(
	db: Transaction,
	session: CurrentSession,
	options: RaceInputMaterializationOptions = {}
): Promise<MaterializedCurrentSession> {
	if (session.rainNow !== null && session.rainNow > 0) {
		throw new RaceInputMaterializationError('Wet-session materialization is not enabled yet.');
	}
	if (session.trackWetness !== null && session.trackWetness > 0) {
		throw new RaceInputMaterializationError('Wet-session materialization is not enabled yet.');
	}
	if (session.rainInMinutes !== null && session.rainInMinutes > 0) {
		throw new RaceInputMaterializationError(
			'Forecasted wet-session materialization is not enabled yet.'
		);
	}
	if (
		session.rulesetRefuelingEnabled &&
		session.sessionKind !== 'fp1' &&
		session.sessionKind !== 'fp2' &&
		session.sessionKind !== 'fp3'
	) {
		throw new RaceInputMaterializationError(
			`Cannot materialize ${session.sessionKind} until refueling is supported by the simulation engine.`
		);
	}
	if (session.rulesetErsEnabled) {
		throw new RaceInputMaterializationError('Cannot materialize an ERS-enabled session yet.');
	}

	const eventEntries = await db
		.select({
			eventEntryId: schema.eventEntry.id,
			driverId: schema.driver.id,
			driverName: schema.driver.displayName,
			pace: schema.driver.pace,
			raceCraft: schema.driver.raceCraft,
			consistency: schema.driver.consistency,
			tyreManagement: schema.driver.tyreManagement,
			fuelManagement: schema.driver.fuelManagement,
			starts: schema.driver.starts,
			focus: schema.driver.focus,
			aggression: schema.driver.aggression,
			composure: schema.driver.composure,
			feedback: schema.driver.feedback,
			teamId: schema.team.id,
			teamName: schema.team.name,
			carNumber: schema.eventEntry.carNumber,
			partDesignId: schema.partDesignVersion.id,
			performancePayload: schema.partDesignVersion.performancePayload,
			reliabilityPayload: schema.partDesignVersion.reliabilityPayload
		})
		.from(schema.eventEntry)
		.innerJoin(schema.driver, eq(schema.eventEntry.driverId, schema.driver.id))
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.eventEntry.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.innerJoin(
			schema.chassisInstance,
			eq(schema.eventEntry.chassisInstanceId, schema.chassisInstance.id)
		)
		.innerJoin(
			schema.partDesignVersion,
			eq(schema.chassisInstance.chassisDesignVersionId, schema.partDesignVersion.id)
		)
		.where(eq(schema.eventEntry.championshipEventId, session.eventId))
		.orderBy(asc(schema.eventEntry.carNumber));
	if (eventEntries.length === 0) {
		throw new RaceInputMaterializationError(`No event entries exist for ${session.eventId}.`);
	}

	const tyreRows = await db
		.select({
			specId: schema.tyreCompoundSpec.id,
			code: schema.tyreCompound.code,
			gripPeak: schema.tyreCompoundSpec.gripPeak,
			degradationRate: schema.tyreCompoundSpec.degradationRate,
			warmUpLaps: schema.tyreCompoundSpec.warmUpLaps,
			operatingTempMinDeciC: schema.tyreCompoundSpec.operatingTempMinDeciC,
			operatingTempMaxDeciC: schema.tyreCompoundSpec.operatingTempMaxDeciC,
			isWet: schema.tyreCompoundSpec.isWet
		})
		.from(schema.tyreCompoundSpec)
		.innerJoin(
			schema.tyreCompound,
			eq(schema.tyreCompoundSpec.tyreCompoundId, schema.tyreCompound.id)
		)
		.orderBy(asc(schema.tyreCompound.code), asc(schema.tyreCompoundSpec.version));
	const dryTyres = tyreRows.filter((row) => !row.isWet);
	const tyreByName = new Map(dryTyres.map((row) => [row.code, row]));
	const requiredTyres = ['soft', 'medium', 'hard'];
	if (requiredTyres.some((name) => !tyreByName.has(name))) {
		throw new RaceInputMaterializationError('Soft, medium, and hard dry tyre specs are required.');
	}

	const pointsSystem = session.pointsSystemId
		? (
				await db
					.select({
						fastestLapPoints: schema.pointsSystem.fastestLapPoints,
						polePoints: schema.pointsSystem.polePoints
					})
					.from(schema.pointsSystem)
					.where(eq(schema.pointsSystem.id, session.pointsSystemId))
					.limit(1)
			)[0]
		: undefined;
	if (session.pointsSystemId && !pointsSystem) {
		throw new RaceInputMaterializationError(
			`Points system was not found: ${session.pointsSystemId}.`
		);
	}
	const points = session.pointsSystemId
		? await db
				.select({
					position: schema.pointsSystemPlacePoint.position,
					points: schema.pointsSystemPlacePoint.points
				})
				.from(schema.pointsSystemPlacePoint)
				.where(eq(schema.pointsSystemPlacePoint.pointsSystemId, session.pointsSystemId))
				.orderBy(asc(schema.pointsSystemPlacePoint.position))
		: [];

	const track = buildTrack(session);
	const baseLapTimeMs = track.segments.reduce((total, segment) => total + segment.baseTimeMs, 0);
	const lapCount =
		session.scheduledLaps ??
		Math.max(1, Math.floor(((session.scheduledMinutes ?? 45) * 60_000) / baseLapTimeMs));
	const entries: SimulationEntry[] = eventEntries.map((eventEntry, index) => {
		const { car } = parseCarPerformance(eventEntry);
		return {
			sessionEntryId: `${session.weekendSessionId}:${eventEntry.eventEntryId}`,
			teamId: eventEntry.teamId,
			driverId: eventEntry.driverId,
			driverName: eventEntry.driverName ?? eventEntry.driverId,
			teamName: eventEntry.teamName,
			carNumber: eventEntry.carNumber,
			gridPosition: index + 1,
			driver: {
				pace: eventEntry.pace,
				raceCraft: eventEntry.raceCraft,
				consistency: eventEntry.consistency,
				tyreManagement: eventEntry.tyreManagement,
				fuelManagement: eventEntry.fuelManagement,
				starts: eventEntry.starts,
				focus: eventEntry.focus,
				aggression: eventEntry.aggression,
				composure: eventEntry.composure,
				feedback: eventEntry.feedback
			},
			car,
			setupFactorPpm: 1_000_000,
			tyreWearSetupPpm: 1_000_000,
			startingFuelGrams:
				Math.ceil(
					(FORMULA_CONFIG.baseFuelBurnGramsPerLap *
						lapCount *
						FORMULA_CONFIG.conservativeFuelFactor) /
						car.fuelEfficiency
				) + 1_000,
			tyreSets: requiredTyres.map((name) => {
				const row = tyreByName.get(name)!;
				return {
					id: `${eventEntry.eventEntryId}:${name}`,
					compound: tyreSpec(row)
				};
			}),
			startingTyreSetId: `${eventEntry.eventEntryId}:medium`,
			initialMode: 'balanced'
		};
	});
	const tyreSets = eventEntries.flatMap((eventEntry) =>
		requiredTyres.map((name, index) => ({
			id: `${eventEntry.eventEntryId}:${name}`,
			eventEntryId: eventEntry.eventEntryId,
			tyreCompoundSpecId: tyreByName.get(name)!.specId,
			setIndex: index + 1,
			wearPercent: 0,
			status: 'available'
		}))
	);

	const baseInput: RaceInput = {
		formulaVersion: FORMULA_CONFIG.version,
		engineVersion: DRY_ENGINE_VERSION,
		seed: hashString(
			`${session.eventId}:${session.eventSessionDefinitionId}:${FORMULA_CONFIG.version}`
		),
		rules: {
			lapCount,
			refuelingEnabled: false,
			ersEnabled: false,
			drsEnabled: session.drsEnabledOverride ?? session.rulesetDrsEnabled,
			drsActivationLap: 2,
			drsGapThresholdMs: 1_200,
			mandatoryPitStops: session.mandatoryPitStops,
			points: points.map((row) => row.points),
			fastestLapPoint: pointsSystem?.fastestLapPoints ?? 0,
			polePoint: pointsSystem?.polePoints ?? 0
		},
		track,
		entries,
		commands: []
	};
	const input = options.inputTransform ? options.inputTransform(baseInput) : baseInput;
	try {
		validateRaceInput(input);
	} catch (error) {
		throw new RaceInputMaterializationError(
			`Materialized race input failed validation: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	const performanceSnapshots = eventEntries.map((eventEntry) => {
		const { car, reliability } = parseCarPerformance(eventEntry);
		return {
			id: `snapshot-${session.weekendSessionId}-${eventEntry.eventEntryId}`,
			rulesetId: session.rulesetId,
			formulaVersion: FORMULA_CONFIG.version,
			inputsHash: hashString(
				JSON.stringify({
					eventEntryId: eventEntry.eventEntryId,
					partDesignId: eventEntry.partDesignId,
					car
				})
			),
			createdAt: session.scheduledStart,
			topSpeed: car.topSpeed,
			acceleration: car.acceleration,
			corneringHigh: car.corneringHigh,
			corneringLow: car.corneringLow,
			brakingStability: car.brakingStability,
			drag: car.drag,
			coolingEfficiency: car.coolingEfficiency,
			fuelEfficiency: car.fuelEfficiency,
			ersDeployPower: 0,
			ersHarvestEfficiency: 0,
			ersBatteryCapacity: 0,
			reliabilityOverall: reliability,
			dryWeightKg: car.dryWeightKg
		};
	});
	const sessionEntries = eventEntries.map((eventEntry, index) => ({
		id: entries[index].sessionEntryId,
		weekendSessionId: session.weekendSessionId,
		eventEntryId: eventEntry.eventEntryId,
		driverId: eventEntry.driverId,
		gridSlot: index + 1,
		startStatus: 'started',
		resolvedPerformanceSnapshotId: performanceSnapshots[index].id
	}));
	const materialization = await materializeWeekendSessionInTransaction(db, {
		weekendSessionId: session.weekendSessionId,
		eventSessionDefinitionId: session.eventSessionDefinitionId,
		input,
		conditions: {
			tempC: session.tempC,
			rainNow: session.rainNow,
			rainInMinutes: session.rainInMinutes,
			trackWetness: session.trackWetness
		},
		performanceSnapshots,
		sessionEntries,
		tyreSets
	});
	return {
		input,
		weekendSessionId: session.weekendSessionId,
		eventSessionDefinitionId: session.eventSessionDefinitionId,
		pointsSystemId: session.pointsSystemId,
		materialization
	};
}

export async function materializeSessionInTransaction(
	tx: Transaction,
	eventSessionDefinitionId: string,
	options: RaceInputMaterializationOptions = {}
): Promise<MaterializedCurrentSession> {
	const session = await resolveCurrentSession(tx, eventSessionDefinitionId);
	return materializeResolvedSession(tx, session, options);
}

export async function materializeSession(
	db: Database,
	eventSessionDefinitionId: string,
	options: RaceInputMaterializationOptions = {}
): Promise<MaterializedCurrentSession> {
	return db.transaction((tx) =>
		materializeSessionInTransaction(tx, eventSessionDefinitionId, options)
	);
}

export async function materializeCurrentSession(db: Database): Promise<MaterializedCurrentSession> {
	return db.transaction(async (tx) => {
		const session = await resolveCurrentSession(tx);
		return materializeResolvedSession(tx, session);
	});
}
