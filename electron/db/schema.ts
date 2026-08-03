import { sql } from 'drizzle-orm';
import {
	blob,
	check,
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const saveGame = sqliteTable(
	'save_game',
	{
		id: text('id').primaryKey(),
		singletonKey: integer('singleton_key').notNull().default(1),
		displayName: text('display_name').notNull(),
		schemaVersion: integer('schema_version').notNull(),
		gameVersion: text('game_version').notNull(),
		contentDataVersion: text('content_data_version').notNull(),
		worldDate: text('world_date').notNull(),
		rngAlgorithm: text('rng_algorithm').notNull(),
		rngState: blob('rng_state', { mode: 'buffer' }).notNull(),
		managerFirstName: text('manager_first_name'),
		managerLastName: text('manager_last_name'),
		managerNationalityId: text('manager_nationality_id').references(() => nationality.id),
		managerBackstoryCode: text('manager_backstory_code'),
		managerAvatarPayload: text('manager_avatar_payload'),
		managerAvatarSchemaVersion: text('manager_avatar_schema_version'),
		playerTeamId: text('player_team_id').references((): AnySQLiteColumn => team.id),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [
		check('save_game_singleton_key_check', sql`${table.singletonKey} = 1`),
		uniqueIndex('save_game_singleton_key_unique').on(table.singletonKey),
		index('save_game_player_team_idx').on(table.playerTeamId),
		index('save_game_manager_nationality_idx').on(table.managerNationalityId)
	]
);

export const saveMigrationHistory = sqliteTable(
	'save_migration_history',
	{
		id: text('id').primaryKey(),
		saveId: text('save_id')
			.notNull()
			.references(() => saveGame.id, { onDelete: 'cascade' }),
		fromSchemaVersion: integer('from_schema_version').notNull(),
		toSchemaVersion: integer('to_schema_version').notNull(),
		appliedAt: text('applied_at').notNull(),
		notes: text('notes')
	},
	(table) => [index('save_migration_history_save_applied_idx').on(table.saveId, table.appliedAt)]
);

export const nationality = sqliteTable(
	'nationality',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		displayName: text('display_name').notNull()
	},
	(table) => [uniqueIndex('nationality_code_unique').on(table.code)]
);

export const team = sqliteTable(
	'team',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		name: text('name').notNull(),
		shortName: text('short_name').notNull(),
		nationalityId: text('nationality_id').references(() => nationality.id),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		uniqueIndex('team_code_unique').on(table.code),
		index('team_nationality_idx').on(table.nationalityId)
	]
);

export const championship = sqliteTable(
	'championship',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		displayName: text('display_name').notNull(),
		shortCode: text('short_code').notNull(),
		ladderRank: integer('ladder_rank').notNull()
	},
	(table) => [
		uniqueIndex('championship_code_unique').on(table.code),
		uniqueIndex('championship_short_code_unique').on(table.shortCode),
		uniqueIndex('championship_ladder_rank_unique').on(table.ladderRank)
	]
);

export const weekendFormatTemplate = sqliteTable(
	'weekend_format_template',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		version: integer('version').notNull(),
		displayName: text('display_name').notNull()
	},
	(table) => [
		uniqueIndex('weekend_format_template_code_version_unique').on(table.code, table.version)
	]
);

export const requiredCompoundRule = sqliteTable(
	'required_compound_rule',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		version: integer('version').notNull(),
		payload: text('payload').notNull(),
		payloadSchemaVersion: text('payload_schema_version').notNull()
	},
	(table) => [
		uniqueIndex('required_compound_rule_code_version_unique').on(table.code, table.version)
	]
);

export const pointsSystem = sqliteTable(
	'points_system',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		version: integer('version').notNull(),
		polePoints: real('pole_points').notNull(),
		fastestLapPoints: real('fastest_lap_points').notNull(),
		fastestLapMinFinishPosition: integer('fastest_lap_min_finish_position'),
		fastestLapRequiresClassified: integer('fastest_lap_requires_classified', {
			mode: 'boolean'
		}).notNull(),
		shortenedRaceAllocationMode: text('shortened_race_allocation_mode').notNull(),
		shortenedRaceDistancePctThreshold: real('shortened_race_distance_pct_threshold'),
		classificationRequirePctDistance: real('classification_require_pct_distance'),
		notes: text('notes')
	},
	(table) => [uniqueIndex('points_system_code_version_unique').on(table.code, table.version)]
);

export const championshipSeasonRuleset = sqliteTable('championship_season_ruleset', {
	id: text('id').primaryKey(),
	entriesPerTeam: integer('entries_per_team').notNull(),
	weekendFormatTemplateId: text('weekend_format_template_id')
		.notNull()
		.references(() => weekendFormatTemplate.id),
	refuelingEnabled: integer('refueling_enabled', { mode: 'boolean' }).notNull(),
	ersEnabled: integer('ers_enabled', { mode: 'boolean' }).notNull(),
	drsEnabled: integer('drs_enabled', { mode: 'boolean' }).notNull(),
	constructorConversionAllowed: integer('constructor_conversion_allowed', {
		mode: 'boolean'
	}).notNull(),
	ageCapMax: integer('age_cap_max'),
	personnelLimitsPayload: text('personnel_limits_payload').notNull(),
	personnelLimitsSchemaVersion: text('personnel_limits_schema_version').notNull(),
	testingLimitsPayload: text('testing_limits_payload').notNull(),
	testingLimitsSchemaVersion: text('testing_limits_schema_version').notNull(),
	raceDistanceRulePayload: text('race_distance_rule_payload').notNull(),
	raceDistanceRuleSchemaVersion: text('race_distance_rule_schema_version').notNull()
});

export const weekendFormatSessionSlot = sqliteTable(
	'weekend_format_session_slot',
	{
		id: text('id').primaryKey(),
		templateId: text('template_id')
			.notNull()
			.references(() => weekendFormatTemplate.id),
		sequence: integer('sequence').notNull(),
		sessionKind: text('session_kind').notNull(),
		targetLaps: integer('target_laps'),
		targetMinutes: integer('target_minutes'),
		isScored: integer('is_scored', { mode: 'boolean' }).notNull(),
		gridSourceSlotId: text('grid_source_slot_id').references(
			(): AnySQLiteColumn => weekendFormatSessionSlot.id
		),
		reverseGridCount: integer('reverse_grid_count').notNull(),
		mandatoryPitStops: integer('mandatory_pit_stops').notNull(),
		requiredCompoundRuleId: text('required_compound_rule_id').references(
			() => requiredCompoundRule.id
		),
		pointsSystemId: text('points_system_id').references(() => pointsSystem.id),
		fastestLapPointEligible: integer('fastest_lap_point_eligible', { mode: 'boolean' }).notNull(),
		parcFermeFromPrevious: integer('parc_ferme_from_previous', { mode: 'boolean' }).notNull()
	},
	(table) => [
		uniqueIndex('weekend_format_session_slot_sequence_unique').on(table.templateId, table.sequence)
	]
);

export const rulesetSupplyContractTier = sqliteTable(
	'ruleset_supply_contract_tier',
	{
		rulesetId: text('ruleset_id')
			.notNull()
			.references(() => championshipSeasonRuleset.id, { onDelete: 'cascade' }),
		tier: text('tier').notNull()
	},
	(table) => [uniqueIndex('ruleset_supply_contract_tier_unique').on(table.rulesetId, table.tier)]
);

export const championshipSeason = sqliteTable(
	'championship_season',
	{
		id: text('id').primaryKey(),
		championshipId: text('championship_id')
			.notNull()
			.references(() => championship.id),
		seasonYear: integer('season_year').notNull(),
		rulesetId: text('ruleset_id')
			.notNull()
			.references(() => championshipSeasonRuleset.id)
	},
	(table) => [
		uniqueIndex('championship_season_year_unique').on(table.championshipId, table.seasonYear)
	]
);

export const rulesetPartCategoryRule = sqliteTable(
	'ruleset_part_category_rule',
	{
		id: text('id').primaryKey(),
		rulesetId: text('ruleset_id')
			.notNull()
			.references(() => championshipSeasonRuleset.id),
		partCategory: text('part_category').notNull(),
		participantStatus: text('participant_status').notNull(),
		procurementMode: text('procurement_mode').notNull(),
		upgradeMode: text('upgrade_mode').notNull()
	},
	(table) => [
		uniqueIndex('ruleset_part_category_rule_scope_unique').on(
			table.rulesetId,
			table.partCategory,
			table.participantStatus
		)
	]
);

export const pointsSystemPlacePoint = sqliteTable(
	'points_system_place_point',
	{
		pointsSystemId: text('points_system_id')
			.notNull()
			.references(() => pointsSystem.id),
		position: integer('position').notNull(),
		points: real('points').notNull()
	},
	(table) => [
		uniqueIndex('points_system_place_point_unique').on(table.pointsSystemId, table.position)
	]
);

export const driver = sqliteTable(
	'driver',
	{
		id: text('id').primaryKey(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		displayName: text('display_name'),
		dateOfBirth: text('date_of_birth').notNull(),
		nationalityId: text('nationality_id')
			.notNull()
			.references(() => nationality.id),
		portraitId: text('portrait_id').notNull(),
		biographySeed: text('biography_seed').notNull(),
		preferredNumber: integer('preferred_number'),
		careerStartYear: integer('career_start_year').notNull(),
		retiredAt: text('retired_at'),
		reputation: integer('reputation').notNull(),
		ambition: integer('ambition').notNull(),
		loyalty: integer('loyalty').notNull(),
		temperament: integer('temperament').notNull(),
		leadership: integer('leadership').notNull(),
		mediaHandling: integer('media_handling').notNull(),
		developmentRate: integer('development_rate').notNull(),
		peakAgeStart: integer('peak_age_start').notNull(),
		peakAgeEnd: integer('peak_age_end').notNull(),
		declineRate: integer('decline_rate').notNull(),
		pace: integer('pace').notNull(),
		raceCraft: integer('race_craft').notNull(),
		consistency: integer('consistency').notNull(),
		tyreManagement: integer('tyre_management').notNull(),
		fuelManagement: integer('fuel_management').notNull(),
		ersManagement: integer('ers_management').notNull(),
		wetPace: integer('wet_pace').notNull(),
		qualifyingPace: integer('qualifying_pace').notNull(),
		starts: integer('starts').notNull(),
		focus: integer('focus').notNull(),
		feedback: integer('feedback').notNull(),
		adaptability: integer('adaptability').notNull(),
		aggression: integer('aggression').notNull(),
		composure: integer('composure').notNull(),
		pacePotential: integer('pace_potential').notNull(),
		raceCraftPotential: integer('race_craft_potential').notNull(),
		consistencyPotential: integer('consistency_potential').notNull(),
		tyreManagementPotential: integer('tyre_management_potential').notNull(),
		fuelManagementPotential: integer('fuel_management_potential').notNull(),
		ersManagementPotential: integer('ers_management_potential').notNull(),
		wetPacePotential: integer('wet_pace_potential').notNull(),
		qualifyingPacePotential: integer('qualifying_pace_potential').notNull(),
		startsPotential: integer('starts_potential').notNull(),
		focusPotential: integer('focus_potential').notNull(),
		feedbackPotential: integer('feedback_potential').notNull(),
		adaptabilityPotential: integer('adaptability_potential').notNull(),
		aggressionPotential: integer('aggression_potential').notNull(),
		composurePotential: integer('composure_potential').notNull()
	},
	(table) => [index('driver_nationality_idx').on(table.nationalityId)]
);

export const driverHealth = sqliteTable(
	'driver_health',
	{
		driverId: text('driver_id')
			.primaryKey()
			.references(() => driver.id, { onDelete: 'cascade' }),
		injurySeverity: text('injury_severity').notNull(),
		injuryDaysRemaining: integer('injury_days_remaining').notNull(),
		fatigue: integer('fatigue').notNull(),
		morale: integer('morale').notNull(),
		form: integer('form').notNull()
	},
	(table) => [
		check('driver_health_fatigue_check', sql`${table.fatigue} BETWEEN 0 AND 100`),
		check('driver_health_morale_check', sql`${table.morale} BETWEEN 0 AND 100`),
		check('driver_health_form_check', sql`${table.form} BETWEEN -10 AND 10`)
	]
);

export const licensePointAward = sqliteTable(
	'license_point_award',
	{
		id: text('id').primaryKey(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id, { onDelete: 'cascade' }),
		points: real('points').notNull(),
		sourceType: text('source_type').notNull(),
		sourceId: text('source_id'),
		awardedAt: text('awarded_at').notNull(),
		expiresAt: text('expires_at')
	},
	(table) => [index('license_point_award_driver_idx').on(table.driverId, table.awardedAt)]
);

export const driverContract = sqliteTable(
	'driver_contract',
	{
		id: text('id').primaryKey(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		teamId: text('team_id').references(() => team.id),
		offScreenSeriesId: text('off_screen_series_id'),
		isVirtualOffScreen: integer('is_virtual_off_screen', { mode: 'boolean' }).notNull(),
		wagePerYearMinor: integer('wage_per_year_minor').notNull(),
		signingBonusMinor: integer('signing_bonus_minor').notNull(),
		breakClauseFeeMinor: integer('break_clause_fee_minor').notNull(),
		currencyCode: text('currency_code').notNull(),
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		terminatedDate: text('terminated_date')
	},
	(table) => [
		index('driver_contract_driver_dates_idx').on(table.driverId, table.startDate, table.endDate)
	]
);

export const driverContractBonus = sqliteTable(
	'driver_contract_bonus',
	{
		id: text('id').primaryKey(),
		contractId: text('contract_id')
			.notNull()
			.references(() => driverContract.id, { onDelete: 'cascade' }),
		bonusType: text('bonus_type').notNull(),
		amountMinor: integer('amount_minor').notNull(),
		currencyCode: text('currency_code').notNull(),
		triggerPayload: text('trigger_payload').notNull(),
		triggerSchemaVersion: text('trigger_schema_version').notNull()
	},
	(table) => [index('driver_contract_bonus_contract_idx').on(table.contractId)]
);

export const seatAssignment = sqliteTable(
	'seat_assignment',
	{
		id: text('id').primaryKey(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		teamSeasonEntryId: text('team_season_entry_id').references(() => teamSeasonEntry.id),
		seatRole: text('seat_role').notNull(),
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		isPrimary: integer('is_primary', { mode: 'boolean' }).notNull()
	},
	(table) => [
		index('seat_assignment_driver_dates_idx').on(table.driverId, table.startDate, table.endDate)
	]
);

export const driverRelationship = sqliteTable(
	'driver_relationship',
	{
		id: text('id').primaryKey(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id, { onDelete: 'cascade' }),
		otherDriverId: text('other_driver_id')
			.notNull()
			.references(() => driver.id, { onDelete: 'cascade' }),
		relationshipType: text('relationship_type').notNull(),
		value: integer('value').notNull(),
		effectiveDate: text('effective_date').notNull()
	},
	(table) => [
		uniqueIndex('driver_relationship_pair_unique').on(table.driverId, table.otherDriverId)
	]
);

export const driverChampionshipExperience = sqliteTable(
	'driver_championship_experience',
	{
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id, { onDelete: 'cascade' }),
		championshipId: text('championship_id')
			.notNull()
			.references(() => championship.id),
		starts: integer('starts').notNull(),
		wins: integer('wins').notNull(),
		podiums: integer('podiums').notNull(),
		championships: integer('championships').notNull()
	},
	(table) => [
		uniqueIndex('driver_championship_experience_unique').on(table.driverId, table.championshipId)
	]
);

export const scoutingReport = sqliteTable(
	'scouting_report',
	{
		id: text('id').primaryKey(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id),
		confidence: integer('confidence').notNull(),
		createdAt: text('created_at').notNull(),
		expiresAt: text('expires_at')
	},
	(table) => [index('scouting_report_driver_team_idx').on(table.driverId, table.teamId)]
);

export const scoutingAttributeKnowledge = sqliteTable(
	'scouting_attribute_knowledge',
	{
		id: text('id').primaryKey(),
		reportId: text('report_id')
			.notNull()
			.references(() => scoutingReport.id, { onDelete: 'cascade' }),
		attribute: text('attribute').notNull(),
		knownValue: integer('known_value'),
		minimumValue: integer('minimum_value'),
		maximumValue: integer('maximum_value'),
		confidence: integer('confidence').notNull()
	},
	(table) => [
		uniqueIndex('scouting_attribute_knowledge_unique').on(table.reportId, table.attribute)
	]
);

export const teamSeasonEntry = sqliteTable(
	'team_season_entry',
	{
		id: text('id').primaryKey(),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id),
		championshipSeasonId: text('championship_season_id')
			.notNull()
			.references(() => championshipSeason.id),
		constructorStatus: text('constructor_status').notNull(),
		entriesCount: integer('entries_count').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		uniqueIndex('team_season_entry_team_season_unique').on(table.teamId, table.championshipSeasonId)
	]
);

export const supplyContract = sqliteTable(
	'supply_contract',
	{
		id: text('id').primaryKey(),
		teamSeasonEntryId: text('team_season_entry_id')
			.notNull()
			.references(() => teamSeasonEntry.id),
		supplierTeamId: text('supplier_team_id')
			.notNull()
			.references(() => team.id),
		partCategory: text('part_category').notNull(),
		contractTier: text('contract_tier').notNull(),
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		annualCostMinor: integer('annual_cost_minor').notNull(),
		currencyCode: text('currency_code').notNull()
	},
	(table) => [
		index('supply_contract_team_dates_idx').on(
			table.teamSeasonEntryId,
			table.startDate,
			table.endDate
		)
	]
);

export const partDesignVersion = sqliteTable(
	'part_design_version',
	{
		id: text('id').primaryKey(),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id),
		partCategory: text('part_category').notNull(),
		version: integer('version').notNull(),
		formulaVersion: text('formula_version').notNull(),
		inputsHash: text('inputs_hash').notNull(),
		performancePayload: text('performance_payload').notNull(),
		performanceSchemaVersion: text('performance_schema_version').notNull(),
		reliabilityPayload: text('reliability_payload').notNull(),
		reliabilitySchemaVersion: text('reliability_schema_version').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		uniqueIndex('part_design_version_team_category_version_unique').on(
			table.teamId,
			table.partCategory,
			table.version
		)
	]
);

export const chassisInstance = sqliteTable(
	'chassis_instance',
	{
		id: text('id').primaryKey(),
		teamSeasonEntryId: text('team_season_entry_id')
			.notNull()
			.references(() => teamSeasonEntry.id),
		chassisDesignVersionId: text('chassis_design_version_id')
			.notNull()
			.references(() => partDesignVersion.id),
		serialNumber: text('serial_number').notNull(),
		status: text('status').notNull()
	},
	(table) => [uniqueIndex('chassis_instance_serial_unique').on(table.serialNumber)]
);

export const partInstance = sqliteTable(
	'part_instance',
	{
		id: text('id').primaryKey(),
		teamSeasonEntryId: text('team_season_entry_id')
			.notNull()
			.references(() => teamSeasonEntry.id),
		partDesignVersionId: text('part_design_version_id')
			.notNull()
			.references(() => partDesignVersion.id),
		serialNumber: text('serial_number').notNull(),
		status: text('status').notNull()
	},
	(table) => [uniqueIndex('part_instance_serial_unique').on(table.serialNumber)]
);

export const partInstallation = sqliteTable(
	'part_installation',
	{
		id: text('id').primaryKey(),
		partInstanceId: text('part_instance_id')
			.notNull()
			.references(() => partInstance.id),
		chassisInstanceId: text('chassis_instance_id')
			.notNull()
			.references(() => chassisInstance.id),
		slot: text('slot').notNull(),
		installedAt: text('installed_at').notNull(),
		removedAt: text('removed_at')
	},
	(table) => [
		index('part_installation_chassis_dates_idx').on(
			table.chassisInstanceId,
			table.installedAt,
			table.removedAt
		)
	]
);

export const circuit = sqliteTable(
	'circuit',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		shortName: text('short_name').notNull(),
		nationId: text('nation_id').references(() => nationality.id),
		timezone: text('timezone').notNull(),
		firstAppearanceYear: integer('first_appearance_year').notNull()
	},
	(table) => [uniqueIndex('circuit_short_name_unique').on(table.shortName)]
);

export const circuitLayoutVersion = sqliteTable(
	'circuit_layout_version',
	{
		id: text('id').primaryKey(),
		circuitId: text('circuit_id')
			.notNull()
			.references(() => circuit.id),
		versionLabel: text('version_label').notNull(),
		effectiveFromYear: integer('effective_from_year').notNull(),
		lengthKm: real('length_km').notNull(),
		type: text('type').notNull(),
		overtakingDifficulty: integer('overtaking_difficulty').notNull(),
		abrasion: integer('abrasion').notNull(),
		downforceImportance: integer('downforce_importance').notNull(),
		powerImportance: integer('power_importance').notNull(),
		brakingDemand: integer('braking_demand').notNull(),
		tractionDemand: integer('traction_demand').notNull(),
		elevationChange: integer('elevation_change').notNull(),
		wallProximity: integer('wall_proximity').notNull(),
		coolingDemand: integer('cooling_demand').notNull(),
		gripBaseline: real('grip_baseline').notNull(),
		pitLossSeconds: real('pit_loss_seconds').notNull(),
		pitLaneSpeedFactor: real('pit_lane_speed_factor').notNull(),
		safetyCarLikelihood: real('safety_car_likelihood').notNull(),
		vscLikelihood: real('vsc_likelihood').notNull(),
		qualifyingLapDeltaSensitivity: real('qualifying_lap_delta_sensitivity').notNull(),
		fuelConsumptionModifier: real('fuel_consumption_modifier').notNull(),
		ersHarvestModifier: real('ers_harvest_modifier').notNull(),
		topSpeedZoneFactor: real('top_speed_zone_factor').notNull(),
		cornerCount: integer('corner_count').notNull(),
		possibleDrsZoneCount: integer('possible_drs_zone_count').notNull(),
		sectorsPayload: text('sectors_payload').notNull(),
		waypointsPayload: text('waypoints_payload').notNull(),
		marshalZonesPayload: text('marshal_zones_payload').notNull(),
		climateProfilePayload: text('climate_profile_payload').notNull(),
		geometrySchemaVersion: text('geometry_schema_version').notNull(),
		climateProfileSchemaVersion: text('climate_profile_schema_version').notNull()
	},
	(table) => [uniqueIndex('circuit_layout_version_unique').on(table.circuitId, table.versionLabel)]
);

export const championshipEvent = sqliteTable(
	'championship_event',
	{
		id: text('id').primaryKey(),
		championshipSeasonId: text('championship_season_id')
			.notNull()
			.references(() => championshipSeason.id),
		circuitLayoutVersionId: text('circuit_layout_version_id')
			.notNull()
			.references(() => circuitLayoutVersion.id),
		roundNumber: integer('round_number').notNull(),
		startDate: text('start_date').notNull(),
		name: text('name').notNull()
	},
	(table) => [
		uniqueIndex('championship_event_round_unique').on(table.championshipSeasonId, table.roundNumber)
	]
);

export const eventSessionDefinition = sqliteTable(
	'event_session_definition',
	{
		id: text('id').primaryKey(),
		championshipEventId: text('championship_event_id')
			.notNull()
			.references(() => championshipEvent.id),
		sourceSlotId: text('source_slot_id')
			.notNull()
			.references(() => weekendFormatSessionSlot.id),
		sequence: integer('sequence').notNull(),
		sessionKind: text('session_kind').notNull(),
		scheduledStart: text('scheduled_start').notNull(),
		scheduledLaps: integer('scheduled_laps'),
		scheduledMinutes: integer('scheduled_minutes'),
		drsEnabledOverride: integer('drs_enabled_override', { mode: 'boolean' }),
		gridSourceSessionDefinitionId: text('grid_source_session_definition_id').references(
			(): AnySQLiteColumn => eventSessionDefinition.id
		),
		reverseGridCount: integer('reverse_grid_count').notNull(),
		mandatoryPitStops: integer('mandatory_pit_stops').notNull(),
		requiredCompoundRuleId: text('required_compound_rule_id').references(
			() => requiredCompoundRule.id
		),
		pointsSystemId: text('points_system_id').references(() => pointsSystem.id),
		fastestLapPointEligible: integer('fastest_lap_point_eligible', { mode: 'boolean' }).notNull(),
		parcFermeFromPrevious: integer('parc_ferme_from_previous', { mode: 'boolean' }).notNull()
	},
	(table) => [
		uniqueIndex('event_session_definition_sequence_unique').on(
			table.championshipEventId,
			table.sequence
		)
	]
);

export const eventEntry = sqliteTable(
	'event_entry',
	{
		id: text('id').primaryKey(),
		championshipEventId: text('championship_event_id')
			.notNull()
			.references(() => championshipEvent.id),
		teamSeasonEntryId: text('team_season_entry_id')
			.notNull()
			.references(() => teamSeasonEntry.id),
		chassisInstanceId: text('chassis_instance_id')
			.notNull()
			.references(() => chassisInstance.id),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		carNumber: integer('car_number').notNull(),
		baselineResolvedSnapshotId: text('baseline_resolved_snapshot_id').references(
			() => resolvedPerformanceSnapshot.id
		)
	},
	(table) => [
		uniqueIndex('event_entry_team_number_unique').on(
			table.championshipEventId,
			table.teamSeasonEntryId,
			table.carNumber
		)
	]
);

export const weekendSession = sqliteTable(
	'weekend_session',
	{
		id: text('id').primaryKey(),
		eventSessionDefinitionId: text('event_session_definition_id')
			.notNull()
			.references(() => eventSessionDefinition.id),
		status: text('status').notNull(),
		tempC: real('temp_c'),
		rainNow: real('rain_now'),
		rainInMinutes: real('rain_in_minutes'),
		trackWetness: integer('track_wetness'),
		simulationInputPayload: text('simulation_input_payload').notNull().default('{}'),
		simulationInputSchemaVersion: text('simulation_input_schema_version')
			.notNull()
			.default('race-input-v1'),
		activeCheckpointId: text('active_checkpoint_id')
	},
	(table) => [uniqueIndex('weekend_session_definition_unique').on(table.eventSessionDefinitionId)]
);

export const sessionEntry = sqliteTable(
	'session_entry',
	{
		id: text('id').primaryKey(),
		weekendSessionId: text('weekend_session_id')
			.notNull()
			.references(() => weekendSession.id),
		eventEntryId: text('event_entry_id')
			.notNull()
			.references(() => eventEntry.id),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		gridSlot: integer('grid_slot'),
		startStatus: text('start_status').notNull(),
		resolvedPerformanceSnapshotId: text('resolved_performance_snapshot_id')
			.notNull()
			.references(() => resolvedPerformanceSnapshot.id)
	},
	(table) => [uniqueIndex('session_entry_driver_unique').on(table.weekendSessionId, table.driverId)]
);

export const sessionResult = sqliteTable(
	'session_result',
	{
		id: text('id').primaryKey(),
		sessionEntryId: text('session_entry_id')
			.notNull()
			.references(() => sessionEntry.id, { onDelete: 'cascade' }),
		weekendSessionId: text('weekend_session_id')
			.notNull()
			.references(() => weekendSession.id),
		classificationPosition: integer('classification_position'),
		classificationStatus: text('classification_status').notNull(),
		lapsCompleted: integer('laps_completed').notNull(),
		bestLapMs: integer('best_lap_ms'),
		bestLapNumber: integer('best_lap_number'),
		totalTimeMs: integer('total_time_ms'),
		gapToLeaderMs: integer('gap_to_leader_ms'),
		lapsBehind: integer('laps_behind').notNull(),
		finalizedAt: text('finalized_at').notNull()
	},
	(table) => [
		check('session_result_laps_check', sql`${table.lapsCompleted} >= 0`),
		check(
			'session_result_position_check',
			sql`${table.classificationPosition} IS NULL OR ${table.classificationPosition} >= 1`
		),
		uniqueIndex('session_result_entry_unique').on(table.sessionEntryId),
		uniqueIndex('session_result_position_unique').on(
			table.weekendSessionId,
			table.classificationPosition
		)
	]
);

export const sessionPointAward = sqliteTable(
	'session_point_award',
	{
		id: text('id').primaryKey(),
		sessionResultId: text('session_result_id')
			.notNull()
			.references(() => sessionResult.id, { onDelete: 'cascade' }),
		pointsSystemId: text('points_system_id')
			.notNull()
			.references(() => pointsSystem.id),
		awardKind: text('award_kind').notNull(),
		points: real('points').notNull()
	},
	(table) => [index('session_point_award_result_idx').on(table.sessionResultId)]
);

export const raceResultDetail = sqliteTable('race_result_detail', {
	sessionResultId: text('session_result_id')
		.primaryKey()
		.references(() => sessionResult.id, { onDelete: 'cascade' }),
	pitStops: integer('pit_stops').notNull(),
	lapsLed: integer('laps_led').notNull(),
	retirementReason: text('retirement_reason'),
	positionsGained: integer('positions_gained').notNull()
});

export const resolvedPerformanceSnapshot = sqliteTable(
	'resolved_performance_snapshot',
	{
		id: text('id').primaryKey(),
		rulesetId: text('ruleset_id')
			.notNull()
			.references(() => championshipSeasonRuleset.id),
		formulaVersion: text('formula_version').notNull(),
		inputsHash: text('inputs_hash').notNull(),
		createdAt: text('created_at').notNull(),
		topSpeed: real('top_speed').notNull(),
		acceleration: real('acceleration').notNull(),
		corneringHigh: real('cornering_high').notNull(),
		corneringLow: real('cornering_low').notNull(),
		brakingStability: real('braking_stability').notNull(),
		drag: real('drag').notNull(),
		coolingEfficiency: real('cooling_efficiency').notNull(),
		fuelEfficiency: real('fuel_efficiency').notNull(),
		ersDeployPower: real('ers_deploy_power').notNull(),
		ersHarvestEfficiency: real('ers_harvest_efficiency').notNull(),
		ersBatteryCapacity: real('ers_battery_capacity').notNull(),
		reliabilityOverall: integer('reliability_overall').notNull(),
		dryWeightKg: real('dry_weight_kg').notNull()
	},
	(table) => [
		index('resolved_performance_snapshot_ruleset_idx').on(table.rulesetId, table.createdAt)
	]
);

export const carSetup = sqliteTable(
	'car_setup',
	{
		id: text('id').primaryKey(),
		eventEntryId: text('event_entry_id')
			.notNull()
			.references(() => eventEntry.id),
		weekendSessionId: text('weekend_session_id').references(() => weekendSession.id),
		frontWingAngle: real('front_wing_angle').notNull(),
		rearWingAngle: real('rear_wing_angle').notNull(),
		rideHeightFrontMm: real('ride_height_front_mm').notNull(),
		rideHeightRearMm: real('ride_height_rear_mm').notNull(),
		suspensionStiffness: real('suspension_stiffness').notNull(),
		brakeBiasPercent: real('brake_bias_percent').notNull(),
		diffCoast: real('diff_coast').notNull(),
		diffPower: real('diff_power').notNull(),
		teamSetupKnowledge: integer('team_setup_knowledge').notNull()
	},
	(table) => [index('car_setup_event_entry_idx').on(table.eventEntryId, table.weekendSessionId)]
);

export const sessionDamageComponent = sqliteTable(
	'session_damage_component',
	{
		id: text('id').primaryKey(),
		sessionEntryId: text('session_entry_id')
			.notNull()
			.references(() => sessionEntry.id, { onDelete: 'cascade' }),
		component: text('component').notNull(),
		severity: integer('severity').notNull(),
		performancePenaltyPayload: text('performance_penalty_payload').notNull(),
		performancePenaltySchemaVersion: text('performance_penalty_schema_version').notNull()
	},
	(table) => [index('session_damage_component_entry_idx').on(table.sessionEntryId)]
);

export const tyreCompound = sqliteTable(
	'tyre_compound',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull(),
		displayName: text('display_name').notNull()
	},
	(table) => [uniqueIndex('tyre_compound_code_unique').on(table.code)]
);

export const tyreCompoundSpec = sqliteTable(
	'tyre_compound_spec',
	{
		id: text('id').primaryKey(),
		tyreCompoundId: text('tyre_compound_id')
			.notNull()
			.references(() => tyreCompound.id),
		version: integer('version').notNull(),
		gripPeak: real('grip_peak').notNull(),
		degradationRate: real('degradation_rate').notNull(),
		warmUpLaps: real('warm_up_laps').notNull(),
		operatingWindowMinC: real('operating_window_min_c').notNull(),
		operatingWindowMaxC: real('operating_window_max_c').notNull(),
		durability: real('durability').notNull(),
		wetnessCrossover: real('wetness_crossover').notNull(),
		isWet: integer('is_wet', { mode: 'boolean' }).notNull(),
		optimalWetnessMinBp: integer('optimal_wetness_min_bp'),
		optimalWetnessMaxBp: integer('optimal_wetness_max_bp'),
		underWetnessLossPpm: integer('under_wetness_loss_ppm'),
		overWetnessLossPpm: integer('over_wetness_loss_ppm'),
		waterClearingPpm: integer('water_clearing_ppm'),
		dryTrackWearMultiplierPpm: integer('dry_track_wear_multiplier_ppm'),
		operatingTempMinDeciC: integer('operating_temp_min_deci_c'),
		operatingTempMaxDeciC: integer('operating_temp_max_deci_c')
	},
	(table) => [
		uniqueIndex('tyre_compound_spec_version_unique').on(table.tyreCompoundId, table.version)
	]
);

export const eventTyreAllocation = sqliteTable(
	'event_tyre_allocation',
	{
		id: text('id').primaryKey(),
		eventEntryId: text('event_entry_id')
			.notNull()
			.references(() => eventEntry.id),
		tyreCompoundSpecId: text('tyre_compound_spec_id')
			.notNull()
			.references(() => tyreCompoundSpec.id),
		setsEntitled: integer('sets_entitled').notNull()
	},
	(table) => [
		uniqueIndex('event_tyre_allocation_unique').on(table.eventEntryId, table.tyreCompoundSpecId)
	]
);

export const tyreSet = sqliteTable(
	'tyre_set',
	{
		id: text('id').primaryKey(),
		eventEntryId: text('event_entry_id')
			.notNull()
			.references(() => eventEntry.id),
		tyreCompoundSpecId: text('tyre_compound_spec_id')
			.notNull()
			.references(() => tyreCompoundSpec.id),
		setIndex: integer('set_index').notNull(),
		wearPercent: real('wear_percent').notNull(),
		status: text('status').notNull()
	},
	(table) => [
		check('tyre_set_wear_percent_check', sql`${table.wearPercent} BETWEEN 0 AND 100`),
		uniqueIndex('tyre_set_entry_index_unique').on(table.eventEntryId, table.setIndex)
	]
);

export const sessionTyreUsage = sqliteTable(
	'session_tyre_usage',
	{
		id: text('id').primaryKey(),
		sessionEntryId: text('session_entry_id')
			.notNull()
			.references(() => sessionEntry.id, { onDelete: 'cascade' }),
		tyreSetId: text('tyre_set_id')
			.notNull()
			.references(() => tyreSet.id),
		laps: integer('laps').notNull(),
		wearDeltaPercent: real('wear_delta_percent').notNull()
	},
	(table) => [
		uniqueIndex('session_tyre_usage_stint_unique').on(table.sessionEntryId, table.tyreSetId)
	]
);

export const stint = sqliteTable(
	'stint',
	{
		id: text('id').primaryKey(),
		sessionEntryId: text('session_entry_id')
			.notNull()
			.references(() => sessionEntry.id, { onDelete: 'cascade' }),
		tyreSetId: text('tyre_set_id')
			.notNull()
			.references(() => tyreSet.id),
		startLap: integer('start_lap').notNull(),
		endLap: integer('end_lap'),
		fuelStartKg: real('fuel_start_kg'),
		fuelEndKg: real('fuel_end_kg')
	},
	(table) => [index('stint_session_entry_lap_idx').on(table.sessionEntryId, table.startLap)]
);

export const sessionCheckpoint = sqliteTable(
	'session_checkpoint',
	{
		id: text('id').primaryKey(),
		weekendSessionId: text('weekend_session_id')
			.notNull()
			.references(() => weekendSession.id, { onDelete: 'cascade' }),
		checkpointSeq: integer('checkpoint_seq').notNull(),
		simClockMs: integer('sim_clock_ms').notNull(),
		rngAlgorithm: text('rng_algorithm').notNull(),
		rngState: blob('rng_state', { mode: 'buffer' }).notNull(),
		phase: text('phase').notNull(),
		safetyCarStatePayload: text('safety_car_state_payload').notNull(),
		safetyCarStateSchemaVersion: text('safety_car_state_schema_version').notNull(),
		weatherStatePayload: text('weather_state_payload'),
		weatherStateSchemaVersion: text('weather_state_schema_version'),
		strategyStatePayload: text('strategy_state_payload'),
		strategyStateSchemaVersion: text('strategy_state_schema_version'),
		resumeStatePayload: text('resume_state_payload').notNull(),
		resumeStateSchemaVersion: text('resume_state_schema_version').notNull(),
		leaderSessionEntryId: text('leader_session_entry_id').references(() => sessionEntry.id),
		checkpointedAt: text('checkpointed_at').notNull()
	},
	(table) => [
		check('session_checkpoint_sequence_check', sql`${table.checkpointSeq} >= 1`),
		check('session_checkpoint_clock_check', sql`${table.simClockMs} >= 0`),
		uniqueIndex('session_checkpoint_session_unique').on(table.weekendSessionId),
		uniqueIndex('session_checkpoint_sequence_unique').on(
			table.weekendSessionId,
			table.checkpointSeq
		)
	]
);

export const sessionCarCheckpoint = sqliteTable(
	'session_car_checkpoint',
	{
		id: text('id').primaryKey(),
		checkpointId: text('checkpoint_id')
			.notNull()
			.references(() => sessionCheckpoint.id, { onDelete: 'cascade' }),
		sessionEntryId: text('session_entry_id')
			.notNull()
			.references(() => sessionEntry.id, { onDelete: 'cascade' }),
		currentLap: integer('current_lap').notNull(),
		sectorIndex: integer('sector_index').notNull(),
		waypointProgress: real('waypoint_progress').notNull(),
		racePosition: integer('race_position').notNull(),
		gapToLeaderMs: integer('gap_to_leader_ms').notNull(),
		intervalAheadMs: integer('interval_ahead_ms').notNull(),
		currentLapTimeMs: integer('current_lap_time_ms').notNull(),
		lastSectorTimeMs: integer('last_sector_time_ms'),
		sectorTimesMsPayload: text('sector_times_ms_payload').notNull(),
		sectorTimesSchemaVersion: text('sector_times_schema_version').notNull(),
		pitPhase: text('pit_phase').notNull(),
		pitPhaseElapsedMs: integer('pit_phase_elapsed_ms').notNull(),
		fuelKg: real('fuel_kg').notNull(),
		mountedTyreSetId: text('mounted_tyre_set_id').references(() => tyreSet.id),
		ersChargePercent: real('ers_charge_percent').notNull(),
		engineMode: text('engine_mode').notNull(),
		pitStopsCompleted: integer('pit_stops_completed').notNull(),
		penaltyPayload: text('penalty_payload').notNull(),
		penaltySchemaVersion: text('penalty_schema_version').notNull(),
		simulationStatePayload: text('simulation_state_payload').notNull(),
		simulationStateSchemaVersion: text('simulation_state_schema_version').notNull(),
		retirementState: text('retirement_state').notNull(),
		retirementReason: text('retirement_reason')
	},
	(table) => [
		uniqueIndex('session_car_checkpoint_entry_unique').on(table.checkpointId, table.sessionEntryId)
	]
);

export const sessionEvent = sqliteTable(
	'session_event',
	{
		id: text('id').primaryKey(),
		weekendSessionId: text('weekend_session_id')
			.notNull()
			.references(() => weekendSession.id, { onDelete: 'cascade' }),
		sequence: integer('sequence').notNull(),
		simulationTimeMs: integer('simulation_time_ms').notNull(),
		lap: integer('lap').notNull(),
		segmentId: text('segment_id'),
		eventType: text('event_type').notNull(),
		sessionEntryIdsPayload: text('session_entry_ids_payload').notNull(),
		payload: text('payload').notNull(),
		payloadSchemaVersion: text('payload_schema_version').notNull()
	},
	(table) => [
		check('session_event_sequence_check', sql`${table.sequence} >= 1`),
		check('session_event_clock_check', sql`${table.simulationTimeMs} >= 0`),
		uniqueIndex('session_event_sequence_unique').on(table.weekendSessionId, table.sequence)
	]
);

export const sessionTelemetryArchive = sqliteTable(
	'session_telemetry_archive',
	{
		id: text('id').primaryKey(),
		weekendSessionId: text('weekend_session_id')
			.notNull()
			.references(() => weekendSession.id, { onDelete: 'cascade' }),
		archivePath: text('archive_path').notNull(),
		format: text('format').notNull(),
		schemaVersion: text('schema_version').notNull(),
		sha256: text('sha256').notNull(),
		byteLength: integer('byte_length').notNull(),
		createdAt: text('created_at').notNull(),
		purgedAt: text('purged_at')
	},
	(table) => [
		index('session_telemetry_archive_session_idx').on(table.weekendSessionId, table.createdAt)
	]
);

export const layoutRecord = sqliteTable(
	'layout_record',
	{
		id: text('id').primaryKey(),
		circuitLayoutVersionId: text('circuit_layout_version_id')
			.notNull()
			.references(() => circuitLayoutVersion.id),
		championshipId: text('championship_id')
			.notNull()
			.references(() => championship.id),
		sessionKind: text('session_kind').notNull(),
		lapTimeMs: integer('lap_time_ms').notNull(),
		driverId: text('driver_id')
			.notNull()
			.references(() => driver.id),
		seasonYear: integer('season_year').notNull()
	},
	(table) => [
		index('layout_record_lookup_idx').on(
			table.circuitLayoutVersionId,
			table.championshipId,
			table.seasonYear
		)
	]
);
