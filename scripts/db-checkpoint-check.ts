import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	CheckpointSequenceError,
	readCheckpoint,
	writeCheckpoint
} from '../electron/db/checkpoint-repository.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const ids = {
	nationality: '00000000-0000-4000-8000-000000000010',
	team: '00000000-0000-4000-8000-000000000011',
	template: '00000000-0000-4000-8000-000000000012',
	ruleset: '00000000-0000-4000-8000-000000000013',
	season: '00000000-0000-4000-8000-000000000014',
	teamSeasonEntry: '00000000-0000-4000-8000-000000000015',
	partDesign: '00000000-0000-4000-8000-000000000016',
	chassis: '00000000-0000-4000-8000-000000000017',
	circuit: '00000000-0000-4000-8000-000000000018',
	layout: '00000000-0000-4000-8000-000000000019',
	event: '00000000-0000-4000-8000-000000000020',
	slot: '00000000-0000-4000-8000-000000000021',
	sessionDefinition: '00000000-0000-4000-8000-000000000022',
	snapshot: '00000000-0000-4000-8000-000000000023',
	driver: '00000000-0000-4000-8000-000000000024',
	eventEntry: '00000000-0000-4000-8000-000000000025',
	weekendSession: '00000000-0000-4000-8000-000000000026',
	sessionEntry: '00000000-0000-4000-8000-000000000027'
};
const now = '2030-01-01T00:00:00.000Z';
const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-checkpoint-check-'));
const savePath = join(tempDir, 'checkpoint.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Checkpoint Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		now
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		await save.db.insert(schema.nationality).values({
			id: ids.nationality,
			code: 'TST',
			displayName: 'Testland'
		});
		await save.db.insert(schema.team).values({
			id: ids.team,
			code: 'TST',
			name: 'Test Racing',
			shortName: 'Test',
			nationalityId: ids.nationality,
			createdAt: now
		});
		await save.db.insert(schema.weekendFormatTemplate).values({
			id: ids.template,
			code: 'checkpoint_test',
			version: 1,
			displayName: 'Checkpoint Test Weekend'
		});
		await save.db.insert(schema.championshipSeasonRuleset).values({
			id: ids.ruleset,
			entriesPerTeam: 1,
			weekendFormatTemplateId: ids.template,
			refuelingEnabled: false,
			ersEnabled: true,
			drsEnabled: true,
			constructorConversionAllowed: true,
			ageCapMax: null,
			personnelLimitsPayload: '{}',
			personnelLimitsSchemaVersion: 'test-v1',
			testingLimitsPayload: '{}',
			testingLimitsSchemaVersion: 'test-v1',
			raceDistanceRulePayload: '{}',
			raceDistanceRuleSchemaVersion: 'test-v1'
		});
		await save.db.insert(schema.championshipSeason).values({
			id: ids.season,
			championshipId: '00000000-0000-4000-8000-000000000003',
			seasonYear: 2030,
			rulesetId: ids.ruleset
		});
		await save.db.insert(schema.teamSeasonEntry).values({
			id: ids.teamSeasonEntry,
			teamId: ids.team,
			championshipSeasonId: ids.season,
			constructorStatus: 'active',
			entriesCount: 1,
			createdAt: now
		});
		await save.db.insert(schema.partDesignVersion).values({
			id: ids.partDesign,
			teamId: ids.team,
			partCategory: 'chassis',
			version: 1,
			formulaVersion: 'test-v1',
			inputsHash: 'test-inputs',
			performancePayload: '{}',
			performanceSchemaVersion: 'test-v1',
			reliabilityPayload: '{}',
			reliabilitySchemaVersion: 'test-v1',
			createdAt: now
		});
		await save.db.insert(schema.chassisInstance).values({
			id: ids.chassis,
			teamSeasonEntryId: ids.teamSeasonEntry,
			chassisDesignVersionId: ids.partDesign,
			serialNumber: 'TST-001',
			status: 'ready'
		});
		await save.db.insert(schema.circuit).values({
			id: ids.circuit,
			name: 'Test Circuit',
			shortName: 'TST',
			nationId: ids.nationality,
			timezone: 'UTC',
			firstAppearanceYear: 2030
		});
		await save.db.insert(schema.circuitLayoutVersion).values({
			id: ids.layout,
			circuitId: ids.circuit,
			versionLabel: 'v1',
			effectiveFromYear: 2030,
			lengthKm: 4.2,
			type: 'permanent',
			overtakingDifficulty: 50,
			abrasion: 50,
			downforceImportance: 50,
			powerImportance: 50,
			brakingDemand: 50,
			tractionDemand: 50,
			elevationChange: 10,
			wallProximity: 20,
			coolingDemand: 40,
			gripBaseline: 1,
			pitLossSeconds: 20,
			pitLaneSpeedFactor: 1,
			safetyCarLikelihood: 0.1,
			vscLikelihood: 0.1,
			qualifyingLapDeltaSensitivity: 1,
			fuelConsumptionModifier: 1,
			ersHarvestModifier: 1,
			topSpeedZoneFactor: 1,
			cornerCount: 12,
			possibleDrsZoneCount: 2,
			sectorsPayload: '[]',
			waypointsPayload: '[]',
			marshalZonesPayload: '[]',
			climateProfilePayload: '{}',
			geometrySchemaVersion: 'test-v1',
			climateProfileSchemaVersion: 'test-v1'
		});
		await save.db.insert(schema.championshipEvent).values({
			id: ids.event,
			championshipSeasonId: ids.season,
			circuitLayoutVersionId: ids.layout,
			roundNumber: 1,
			startDate: '2030-01-02',
			name: 'Test Grand Prix'
		});
		await save.db.insert(schema.weekendFormatSessionSlot).values({
			id: ids.slot,
			templateId: ids.template,
			sequence: 1,
			sessionKind: 'race',
			targetLaps: 10,
			targetMinutes: null,
			isScored: true,
			gridSourceSlotId: null,
			reverseGridCount: 0,
			mandatoryPitStops: 0,
			requiredCompoundRuleId: null,
			pointsSystemId: null,
			fastestLapPointEligible: false,
			parcFermeFromPrevious: false
		});
		await save.db.insert(schema.eventSessionDefinition).values({
			id: ids.sessionDefinition,
			championshipEventId: ids.event,
			sourceSlotId: ids.slot,
			sequence: 1,
			sessionKind: 'race',
			scheduledStart: now,
			scheduledLaps: 10,
			scheduledMinutes: null,
			drsEnabledOverride: null,
			gridSourceSessionDefinitionId: null,
			reverseGridCount: 0,
			mandatoryPitStops: 0,
			requiredCompoundRuleId: null,
			pointsSystemId: null,
			fastestLapPointEligible: false,
			parcFermeFromPrevious: false
		});
		await save.db.insert(schema.resolvedPerformanceSnapshot).values({
			id: ids.snapshot,
			rulesetId: ids.ruleset,
			formulaVersion: 'test-v1',
			inputsHash: 'test-inputs',
			createdAt: now,
			topSpeed: 1,
			acceleration: 1,
			corneringHigh: 1,
			corneringLow: 1,
			brakingStability: 1,
			drag: 1,
			coolingEfficiency: 1,
			fuelEfficiency: 1,
			ersDeployPower: 1,
			ersHarvestEfficiency: 1,
			ersBatteryCapacity: 1,
			reliabilityOverall: 90,
			dryWeightKg: 798
		});
		await save.db.insert(schema.driver).values({
			id: ids.driver,
			firstName: 'Test',
			lastName: 'Driver',
			displayName: 'Test Driver',
			dateOfBirth: '2010-01-01',
			nationalityId: ids.nationality,
			portraitId: 'test-portrait',
			biographySeed: 'test-biography',
			preferredNumber: 1,
			careerStartYear: 2030,
			retiredAt: null,
			reputation: 50,
			ambition: 50,
			loyalty: 50,
			temperament: 50,
			leadership: 50,
			mediaHandling: 50,
			developmentRate: 50,
			peakAgeStart: 25,
			peakAgeEnd: 30,
			declineRate: 50,
			pace: 70,
			raceCraft: 70,
			consistency: 70,
			tyreManagement: 70,
			fuelManagement: 70,
			ersManagement: 70,
			wetPace: 70,
			qualifyingPace: 70,
			starts: 70,
			focus: 70,
			feedback: 70,
			adaptability: 70,
			aggression: 50,
			composure: 70,
			pacePotential: 80,
			raceCraftPotential: 80,
			consistencyPotential: 80,
			tyreManagementPotential: 80,
			fuelManagementPotential: 80,
			ersManagementPotential: 80,
			wetPacePotential: 80,
			qualifyingPacePotential: 80,
			startsPotential: 80,
			focusPotential: 80,
			feedbackPotential: 80,
			adaptabilityPotential: 80,
			aggressionPotential: 80,
			composurePotential: 80
		});
		await save.db.insert(schema.eventEntry).values({
			id: ids.eventEntry,
			championshipEventId: ids.event,
			teamSeasonEntryId: ids.teamSeasonEntry,
			chassisInstanceId: ids.chassis,
			driverId: ids.driver,
			carNumber: 1,
			baselineResolvedSnapshotId: ids.snapshot
		});
		await save.db.insert(schema.weekendSession).values({
			id: ids.weekendSession,
			eventSessionDefinitionId: ids.sessionDefinition,
			status: 'live',
			tempC: 22,
			rainNow: 0,
			rainInMinutes: 0,
			trackWetness: 0,
			activeCheckpointId: null
		});
		await save.db.insert(schema.sessionEntry).values({
			id: ids.sessionEntry,
			weekendSessionId: ids.weekendSession,
			eventEntryId: ids.eventEntry,
			driverId: ids.driver,
			gridSlot: 1,
			startStatus: 'started',
			resolvedPerformanceSnapshotId: ids.snapshot
		});

		const first = {
			weekendSessionId: ids.weekendSession,
			checkpointSeq: 1,
			simClockMs: 12_345,
			rngAlgorithm: 'xoshiro128ss',
			rngStates: { pace_variance: { s0: 1, s1: 2, s2: 3, s3: 4 } },
			phase: 'green' as const,
			safetyCarState: { payload: { active: false }, schemaVersion: 'safety-v1' },
			weatherState: {
				payload: { weatherClockMs: 12_345, rainIntensityBp: 0 },
				schemaVersion: 'weather-v1'
			},
			strategyState: { payload: { nextSequence: 2 }, schemaVersion: 'strategy-v1' },
			resumeState: { payload: { step: 123 }, schemaVersion: 'resume-v1' },
			leaderSessionEntryId: ids.sessionEntry,
			checkpointedAt: now,
			cars: [
				{
					sessionEntryId: ids.sessionEntry,
					currentLap: 3,
					sectorIndex: 2,
					waypointProgress: 0.5,
					racePosition: 1,
					gapToLeaderMs: 0,
					intervalAheadMs: 0,
					currentLapTimeMs: 45_000,
					lastSectorTimeMs: 15_000,
					sectorTimesMs: [15_000, 14_500],
					pitPhase: 'on_track' as const,
					pitPhaseElapsedMs: 0,
					fuelKg: 22.5,
					mountedTyreSetId: null,
					ersChargePercent: 72,
					engineMode: 'balanced' as const,
					pitStopsCompleted: 0,
					penalty: { seconds: 0 },
					penaltySchemaVersion: 'penalty-v1',
					simulationState: {
						payload: { sessionEntryId: ids.sessionEntry },
						schemaVersion: 'simulation-v1'
					},
					retirementState: 'running' as const,
					retirementReason: null
				}
			]
		};
		const written = await writeCheckpoint(save.db, first);
		const restored = await readCheckpoint(save.db, ids.weekendSession);
		assert.deepEqual(restored, { checkpointId: written.checkpointId, ...first });
		const second = {
			...first,
			checkpointSeq: 2,
			simClockMs: 23_456,
			cars: [{ ...first.cars[0], currentLap: 4, racePosition: 2 }]
		};
		const secondWritten = await writeCheckpoint(save.db, second);
		const secondRestored = await readCheckpoint(save.db, ids.weekendSession);
		assert.deepEqual(secondRestored, { checkpointId: secondWritten.checkpointId, ...second });
		await assert.rejects(
			() => writeCheckpoint(save.db, first),
			(error: unknown) => error instanceof CheckpointSequenceError
		);
		await assert.rejects(() =>
			writeCheckpoint(save.db, {
				...second,
				checkpointSeq: 3,
				cars: [{ ...second.cars[0], sessionEntryId: 'missing-session-entry' }]
			})
		);
		const afterRollback = await readCheckpoint(save.db, ids.weekendSession);
		assert.equal(afterRollback?.checkpointSeq, 2);
		assert.equal(afterRollback?.cars[0]?.racePosition, 2);
		const session = await save.db
			.select({ activeCheckpointId: schema.weekendSession.activeCheckpointId })
			.from(schema.weekendSession);
		assert.equal(session[0]?.activeCheckpointId, secondWritten.checkpointId);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Checkpoint repository valid: round-trip, monotonic sequence, and rollback checks passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
