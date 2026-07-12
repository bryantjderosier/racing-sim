import {
	boolean,
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	unique
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const entityTypeEnum = pgEnum('entity_type', ['driver', 'staff', 'team']);

export const staffRoleEnum = pgEnum('staff_role', [
	'aero',
	'mechanical',
	'powertrain',
	'race_engineer',
	'scout',
	'pit_crew'
]);

export const potentialTierEnum = pgEnum('potential_tier', ['bronze', 'silver', 'gold', 'elite']);

export const sessionTypeEnum = pgEnum('session_type', [
	'practice',
	'qualifying_q1',
	'qualifying_q2',
	'qualifying_q3',
	'qualifying_single',
	'race'
]);

export const tireCompoundEnum = pgEnum('tire_compound', [
	'soft',
	'medium',
	'hard',
	'intermediate',
	'wet'
]);

export const raceResultStatusEnum = pgEnum('race_result_status', [
	'finished',
	'dnf',
	'dsq',
	'dns',
	'retired'
]);

export const paceDirectiveEnum = pgEnum('pace_directive', [
	'conserve',
	'balanced',
	'push',
	'maximum'
]);

export const energyDirectiveEnum = pgEnum('energy_directive', [
	'harvest',
	'balanced',
	'overtake'
]);

export const combatOrderEnum = pgEnum('combat_order', [
	'hold_traffic',
	'do_not_fight_teammate',
	'aggressive_overtake',
	'defend_position',
	'swap_positions'
]);

export const trackMoistureEnum = pgEnum('track_moisture', ['dry', 'damp', 'wet', 'flooded']);

export const safetyCarStateEnum = pgEnum('safety_car_state', ['none', 'vsc', 'safety_car']);

export const pitErrorTypeEnum = pgEnum('pit_error_type', [
	'none',
	'jammed_wheel_nut',
	'cross_threaded_hub',
	'unsafe_release'
]);

export const knowledgeTrimTypeEnum = pgEnum('knowledge_trim_type', [
	'qualifying_trim',
	'race_trim',
	'compound_knowledge',
	'wet_weather_trim'
]);

export const partSlotEnum = pgEnum('part_slot', [
	'front_wing',
	'rear_wing',
	'underfloor',
	'sidepods',
	'power_unit',
	'gearbox',
	'suspension'
]);

export const manufacturingStatusEnum = pgEnum('manufacturing_status', [
	'queued',
	'fabricating',
	'completed',
	'cancelled'
]);

export const rdFocusEnum = pgEnum('r_and_d_focus', ['current_car', 'next_year']);

export const facilityTypeEnum = pgEnum('facility_type', [
	'wind_tunnel',
	'cfd_lab',
	'design_studio',
	'weather_hub',
	'scouting_hq',
	'logistics_hub',
	'simulator',
	'fitness_center',
	'staff_academy',
	'foundry',
	'rig_testing',
	'powertrain_factory'
]);

export const ledgerTransactionTypeEnum = pgEnum('ledger_transaction_type', [
	'sponsor_payout',
	'sponsor_bonus',
	'prize_money',
	'part_fabrication',
	'rd_testing',
	'salary',
	'staff_salary',
	'buyout_fee',
	'engine_lease',
	'engine_supply_fee',
	'facility_construction',
	'freight_travel',
	'marketing',
	'fine',
	'emergency_procurement',
	'hospitality'
]);

export const sponsorSlotTypeEnum = pgEnum('sponsor_slot_type', ['title', 'major', 'minor']);

export const sponsorPayoutTypeEnum = pgEnum('sponsor_payout_type', [
	'upfront',
	'per_race',
	'bonus'
]);

export const costCapBreachEnum = pgEnum('cost_cap_breach', ['none', 'minor', 'major']);

export const regulationImpactEnum = pgEnum('regulation_impact', [
	'minor_tweak',
	'major_overhaul',
	'category_ban'
]);

export const aiArchetypeEnum = pgEnum('ai_archetype', [
	'aggressive_spender',
	'long_term_builder',
	'pragmatic_pivot'
]);

export const pointsSchemeIdEnum = pgEnum('points_scheme_id', [
	'classic',
	'top_8',
	'flat_field',
	'win_heavy',
	'double_points_finale',
	'sprint_weekend',
	'fastest_lap_pole_bonus',
	'all_finishers'
]);

export const partFlawTypeEnum = pgEnum('part_flaw_type', [
	'pitch_sensitivity',
	'dirty_air_collapse',
	'curb_fragility',
	'thermal_tire_spike'
]);

export const teamStatusEnum = pgEnum('team_status', [
	'ACTIVE',
	'DEFUNCT',
	'UNMANAGED_AI',
	'PLAYER_MANAGED'
]);

// ─── World / teams ────────────────────────────────────────────────────────────

export const suppliers = pgTable('suppliers', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	powerCeiling: doublePrecision('power_ceiling').notNull(),
	annualLeaseFee: doublePrecision('annual_lease_fee').notNull(),
	isWorks: boolean('is_works').notNull().default(false)
});

export const teams = pgTable('teams', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	shortName: text('short_name').notNull(),
	nationalityCode: text('nationality_code'),
	primaryColor: text('primary_color').notNull().default('#FFFFFF'),
	secondaryColor: text('secondary_color').notNull().default('#000000'),
	status: teamStatusEnum('status').notNull().default('UNMANAGED_AI'),
	liquidCash: doublePrecision('liquid_cash').notNull(),
	costCapLimit: doublePrecision('cost_cap_limit').notNull(),
	costCapSpent: doublePrecision('cost_cap_spent').notNull().default(0),
	engineSupplierId: integer('engine_supplier_id'),
	division: integer('division').notNull(),
	constructorsStanding: integer('constructors_standing'),
	reputation: doublePrecision('reputation').notNull().default(50),
	rdPivotCurrent: doublePrecision('rd_pivot_current').notNull().default(1),
	wtHoursRemaining: doublePrecision('wt_hours_remaining').notNull().default(0),
	cfdHoursRemaining: doublePrecision('cfd_hours_remaining').notNull().default(0)
});

export const cars = pgTable(
	'cars',
	{
		id: integer('id').primaryKey(),
		teamId: integer('team_id').notNull(),
		carNumber: integer('car_number').notNull(),
		powerUnitId: integer('power_unit_id')
	},
	(t) => [unique('cars_team_number').on(t.teamId, t.carNumber)]
);

export const aiTeamProfiles = pgTable('ai_team_profiles', {
	teamId: integer('team_id').primaryKey(),
	archetype: aiArchetypeEnum('archetype').notNull(),
	rAndDFocusBias: doublePrecision('r_and_d_focus_bias').notNull(),
	facilityInvestmentRate: doublePrecision('facility_investment_rate').notNull(),
	costCapRiskTolerance: doublePrecision('cost_cap_risk_tolerance').notNull()
});

// ─── Personnel ────────────────────────────────────────────────────────────────

export const drivers = pgTable('drivers', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	nationalityCode: text('nationality_code').notNull(),
	birthplace: text('birthplace').notNull(),
	age: integer('age').notNull(),
	teamId: integer('team_id'),
	carId: integer('car_id'),
	isKarting: boolean('is_karting').notNull().default(false),
	potentialTier: potentialTierEnum('potential_tier'),
	injuryProneness: doublePrecision('injury_proneness').notNull(),
	longevity: integer('longevity').notNull(),
	morale: doublePrecision('morale').notNull().default(50)
});

export const staff = pgTable('staff', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	nationalityCode: text('nationality_code').notNull(),
	birthplace: text('birthplace').notNull(),
	role: staffRoleEnum('role').notNull(),
	teamId: integer('team_id'),
	assignedDriverId: integer('assigned_driver_id'),
	isScouted: boolean('is_scouted').notNull().default(false),
	morale: doublePrecision('morale').notNull().default(50),
	ego: doublePrecision('ego').notNull().default(50),
	loyalty: doublePrecision('loyalty').notNull().default(50),
	fatiguePct: doublePrecision('fatigue_pct').notNull().default(0)
});

export const attributes = pgTable(
	'attributes',
	{
		id: integer('id').primaryKey(),
		entityId: integer('entity_id').notNull(),
		entityType: entityTypeEnum('entity_type').notNull(),
		attrName: text('attr_name').notNull(),
		currentValue: integer('current_value').notNull(),
		ceiling: integer('ceiling').notNull()
	},
	(t) => [unique('attributes_entity_attr').on(t.entityId, t.entityType, t.attrName)]
);

export const scoutingReports = pgTable('scouting_reports', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	entityId: integer('entity_id').notNull(),
	entityType: entityTypeEnum('entity_type').notNull(),
	confidenceLevel: integer('confidence_level').notNull().default(0),
	lastScoutDate: integer('last_scout_date')
});

export const contracts = pgTable('contracts', {
	id: integer('id').primaryKey(),
	entityId: integer('entity_id').notNull(),
	entityType: entityTypeEnum('entity_type').notNull(),
	teamId: integer('team_id').notNull(),
	salaryAnnual: doublePrecision('salary_annual').notNull(),
	yearsRemaining: integer('years_remaining').notNull(),
	buyoutFee: doublePrecision('buyout_fee').notNull().default(0),
	releaseClause: doublePrecision('release_clause'),
	performanceBonus: doublePrecision('performance_bonus'),
	isNumberOne: boolean('is_number_one').notNull().default(false),
	isActive: boolean('is_active').notNull().default(true)
});

// ─── Facilities / finance / sponsors ──────────────────────────────────────────

export const facilities = pgTable(
	'facilities',
	{
		id: integer('id').primaryKey(),
		teamId: integer('team_id').notNull(),
		facilityType: facilityTypeEnum('facility_type').notNull(),
		tier: integer('tier').notNull().default(0),
		conditionPct: doublePrecision('condition_pct').notNull().default(100),
		constructionFinishDate: integer('construction_finish_date'),
		isUnderConstruction: boolean('is_under_construction').notNull().default(false),
		operationalCostAnnual: doublePrecision('operational_cost_annual').notNull().default(0)
	},
	(t) => [unique('facilities_team_type').on(t.teamId, t.facilityType)]
);

export const financialLedger = pgTable('financial_ledger', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	amount: doublePrecision('amount').notNull(),
	transactionType: ledgerTransactionTypeEnum('transaction_type').notNull(),
	isCostCapApplicable: boolean('is_cost_cap_applicable').notNull(),
	seasonIndex: integer('season_index').notNull(),
	timestamp: integer('timestamp').notNull()
});

export const sponsors = pgTable('sponsors', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	nationalityCode: text('nationality_code'),
	minMarketability: integer('min_marketability').notNull().default(0),
	minTeamStanding: integer('min_team_standing'),
	ethicsSensitivity: doublePrecision('ethics_sensitivity').notNull().default(0)
});

export const sponsorContracts = pgTable('sponsor_contracts', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	sponsorId: integer('sponsor_id').notNull(),
	slotType: sponsorSlotTypeEnum('slot_type').notNull(),
	payoutType: sponsorPayoutTypeEnum('payout_type').notNull(),
	amount: doublePrecision('amount').notNull(),
	bonusTargetPosition: integer('bonus_target_position'),
	remainingRaces: integer('remaining_races'),
	yearsRemaining: integer('years_remaining'),
	isActive: boolean('is_active').notNull().default(true)
});

// ─── R&D / parts ──────────────────────────────────────────────────────────────

export const blueprints = pgTable('blueprints', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	slot: partSlotEnum('slot').notNull(),
	name: text('name').notNull(),
	performancePoints: integer('performance_points').notNull(),
	performanceKnownMin: integer('performance_known_min'),
	performanceKnownMax: integer('performance_known_max'),
	scoutConfidence: integer('scout_confidence').notNull().default(0),
	baseReliability: integer('base_reliability').notNull(),
	pitchSensitivity: doublePrecision('pitch_sensitivity').notNull().default(0),
	dragCoefficient: doublePrecision('drag_coefficient').notNull().default(0),
	weightKg: doublePrecision('weight_kg'),
	seasonYear: integer('season_year').notNull(),
	isInvalidated: boolean('is_invalidated').notNull().default(false)
});

export const blueprintFlaws = pgTable('blueprint_flaws', {
	id: integer('id').primaryKey(),
	blueprintId: integer('blueprint_id').notNull(),
	flawType: partFlawTypeEnum('flaw_type').notNull(),
	severity: doublePrecision('severity').notNull(),
	isRevealed: boolean('is_revealed').notNull().default(false)
});

export const rdProjects = pgTable('rd_projects', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	slot: partSlotEnum('slot').notNull(),
	focus: rdFocusEnum('focus').notNull(),
	progress: doublePrecision('progress').notNull().default(0),
	allocatedWtHours: doublePrecision('allocated_wt_hours').notNull().default(0),
	allocatedCfdHours: doublePrecision('allocated_cfd_hours').notNull().default(0),
	leadDesignerId: integer('lead_designer_id'),
	resultingBlueprintId: integer('resulting_blueprint_id'),
	status: manufacturingStatusEnum('status').notNull()
});

export const parts = pgTable('parts', {
	id: integer('id').primaryKey(),
	blueprintId: integer('blueprint_id').notNull(),
	teamId: integer('team_id').notNull(),
	slot: partSlotEnum('slot').notNull(),
	currentReliability: doublePrecision('current_reliability').notNull(),
	maxConditionCeiling: doublePrecision('max_condition_ceiling').notNull(),
	weightKg: doublePrecision('weight_kg').notNull(),
	isLightweight: boolean('is_lightweight').notNull().default(false),
	isScrapped: boolean('is_scrapped').notNull().default(false),
	mountedOnCarId: integer('mounted_on_car_id')
});

export const manufacturingQueue = pgTable('manufacturing_queue', {
	id: integer('id').primaryKey(),
	teamId: integer('team_id').notNull(),
	blueprintId: integer('blueprint_id').notNull(),
	isLightweight: boolean('is_lightweight').notNull().default(false),
	completionDate: integer('completion_date').notNull(),
	status: manufacturingStatusEnum('status').notNull()
});

export const freightInventory = pgTable('freight_inventory', {
	id: integer('id').primaryKey(),
	raceEventId: integer('race_event_id').notNull(),
	partId: integer('part_id').notNull(),
	isSpare: boolean('is_spare').notNull().default(true)
});

// ─── Tracks / season / championship ───────────────────────────────────────────

export const tracks = pgTable('tracks', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	nationalityCode: text('nationality_code'),
	lengthKm: doublePrecision('length_km'),
	sectorCount: integer('sector_count').notNull().default(3),
	aeroEfficiencyWeight: doublePrecision('aero_efficiency_weight').notNull(),
	mechanicalGripWeight: doublePrecision('mechanical_grip_weight').notNull(),
	tireAbrasionFactor: doublePrecision('tire_abrasion_factor').notNull(),
	pitLossSeconds: doublePrecision('pit_loss_seconds'),
	baseGrip: doublePrecision('base_grip').notNull().default(0.95),
	maxGrip: doublePrecision('max_grip').notNull().default(1.02),
	climateRainProbability: doublePrecision('climate_rain_probability').notNull().default(0.15)
});

export const seasons = pgTable(
	'seasons',
	{
		seasonYear: integer('season_year').notNull(),
		division: integer('division').notNull(),
		pointsScheme: pointsSchemeIdEnum('points_scheme').notNull().default('classic'),
		rdPivotRaceIndex: integer('rd_pivot_race_index').notNull().default(11),
		rdPivotLocked: boolean('rd_pivot_locked').notNull().default(false),
		wtHoursWeeklyCap: doublePrecision('wt_hours_weekly_cap').notNull(),
		cfdHoursWeeklyCap: doublePrecision('cfd_hours_weekly_cap').notNull()
	},
	(t) => [primaryKey({ name: 'seasons_pk', columns: [t.seasonYear, t.division] })]
);

export const pointsSchemeRows = pgTable(
	'points_scheme_rows',
	{
		schemeId: pointsSchemeIdEnum('scheme_id').notNull(),
		finishingPosition: integer('finishing_position').notNull(),
		points: integer('points').notNull()
	},
	(t) => [primaryKey({ name: 'points_scheme_rows_pk', columns: [t.schemeId, t.finishingPosition] })]
);

export const seasonCalendar = pgTable(
	'season_calendar',
	{
		id: integer('id').primaryKey(),
		seasonYear: integer('season_year').notNull(),
		raceIndex: integer('race_index').notNull(),
		trackId: integer('track_id').notNull(),
		isCompleted: boolean('is_completed').notNull().default(false)
	},
	(t) => [unique('season_calendar_year_index').on(t.seasonYear, t.raceIndex)]
);

export const championshipStandings = pgTable('championship_standings', {
	id: integer('id').primaryKey(),
	seasonYear: integer('season_year').notNull(),
	division: integer('division').notNull(),
	entityId: integer('entity_id').notNull(),
	entityType: entityTypeEnum('entity_type').notNull(),
	teamId: integer('team_id'),
	points: integer('points').notNull().default(0),
	position: integer('position')
});

export const regulatoryHistory = pgTable('regulatory_history', {
	id: integer('id').primaryKey(),
	seasonYear: integer('season_year').notNull(),
	ruleDescription: text('rule_description').notNull(),
	impactType: regulationImpactEnum('impact_type').notNull(),
	affectedSlot: partSlotEnum('affected_slot'),
	performancePenaltyPct: doublePrecision('performance_penalty_pct').notNull(),
	isActive: boolean('is_active').notNull().default(true)
});

export const regulationVotes = pgTable('regulation_votes', {
	id: integer('id').primaryKey(),
	seasonYear: integer('season_year').notNull(),
	proposalId: integer('proposal_id').notNull(),
	teamId: integer('team_id').notNull(),
	voteFor: boolean('vote_for').notNull(),
	politicalCapitalSpent: doublePrecision('political_capital_spent').notNull().default(0)
});

// ─── Race weekend ─────────────────────────────────────────────────────────────

export const raceEvents = pgTable('race_events', {
	id: integer('id').primaryKey(),
	calendarId: integer('calendar_id').notNull(),
	trackId: integer('track_id').notNull(),
	sessionType: sessionTypeEnum('session_type').notNull(),
	ambientTempC: doublePrecision('ambient_temp_c'),
	trackTempC: doublePrecision('track_temp_c'),
	moisture: trackMoistureEnum('moisture').notNull().default('dry'),
	safetyCarState: safetyCarStateEnum('safety_car_state').notNull().default('none'),
	trackGripMultiplier: doublePrecision('track_grip_multiplier').notNull().default(1),
	isCompleted: boolean('is_completed').notNull().default(false)
});

export const lapData = pgTable('lap_data', {
	id: integer('id').primaryKey(),
	raceEventId: integer('race_event_id').notNull(),
	driverId: integer('driver_id').notNull(),
	lapNumber: integer('lap_number').notNull(),
	lapTimeMs: integer('lap_time_ms').notNull(),
	sector1Ms: integer('sector_1_ms'),
	sector2Ms: integer('sector_2_ms'),
	sector3Ms: integer('sector_3_ms'),
	tireCompound: tireCompoundEnum('tire_compound'),
	tireWearDelta: doublePrecision('tire_wear_delta'),
	tireCoreTemp: doublePrecision('tire_core_temp'),
	paceDirective: paceDirectiveEnum('pace_directive'),
	energyDirective: energyDirectiveEnum('energy_directive'),
	fuelRemainingKg: doublePrecision('fuel_remaining_kg')
});

export const raceResults = pgTable('race_results', {
	id: integer('id').primaryKey(),
	raceEventId: integer('race_event_id').notNull(),
	driverId: integer('driver_id').notNull(),
	teamId: integer('team_id').notNull(),
	finishingPosition: integer('finishing_position').notNull(),
	pointsEarned: integer('points_earned').notNull().default(0),
	gridPosition: integer('grid_position'),
	status: raceResultStatusEnum('status')
});

export const carSetupSnapshots = pgTable('car_setup_snapshots', {
	id: integer('id').primaryKey(),
	raceEventId: integer('race_event_id').notNull(),
	teamId: integer('team_id').notNull(),
	driverId: integer('driver_id').notNull(),
	frontWingId: integer('front_wing_id'),
	rearWingId: integer('rear_wing_id'),
	underfloorId: integer('underfloor_id'),
	sidepodsId: integer('sidepods_id'),
	frontWingAngle: doublePrecision('front_wing_angle'),
	rearWingAngle: doublePrecision('rear_wing_angle'),
	frontArb: integer('front_arb'),
	rearArb: integer('rear_arb'),
	frontRideHeightMm: doublePrecision('front_ride_height_mm'),
	rearRideHeightMm: doublePrecision('rear_ride_height_mm'),
	frontCamber: doublePrecision('front_camber'),
	rearCamber: doublePrecision('rear_camber'),
	frontToe: doublePrecision('front_toe'),
	rearToe: doublePrecision('rear_toe'),
	brakeBias: doublePrecision('brake_bias'),
	downforceLevel: doublePrecision('downforce_level'),
	dragLevel: doublePrecision('drag_level'),
	mechanicalBalance: doublePrecision('mechanical_balance')
});

export const sessionKnowledge = pgTable(
	'session_knowledge',
	{
		id: integer('id').primaryKey(),
		raceEventId: integer('race_event_id').notNull(),
		teamId: integer('team_id').notNull(),
		driverId: integer('driver_id').notNull(),
		trimType: knowledgeTrimTypeEnum('trim_type').notNull(),
		tireCompound: tireCompoundEnum('tire_compound'),
		tier: integer('tier').notNull().default(0)
	},
	(t) => [
		unique('session_knowledge_unique').on(
			t.raceEventId,
			t.teamId,
			t.driverId,
			t.trimType,
			t.tireCompound
		)
	]
);

// ─── World clock / progression ────────────────────────────────────────────────

export const worldClock = pgTable('world_clock', {
	id: integer('id').primaryKey(),
	seasonYear: integer('season_year').notNull(),
	week: integer('week').notNull(),
	day: integer('day').notNull(),
	/** Epoch-ish counter of weeks advanced (for ledger timestamps). */
	tickIndex: integer('tick_index').notNull().default(0)
});

export const attributeProgress = pgTable(
	'attribute_progress',
	{
		id: integer('id').primaryKey(),
		entityId: integer('entity_id').notNull(),
		entityType: entityTypeEnum('entity_type').notNull(),
		attrName: text('attr_name').notNull(),
		/** 0–100 toward next +1 current_value. */
		xp: doublePrecision('xp').notNull().default(0)
	},
	(t) => [unique('attribute_progress_unique').on(t.entityId, t.entityType, t.attrName)]
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Track = typeof tracks.$inferSelect;
