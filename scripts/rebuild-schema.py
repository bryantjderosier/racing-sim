#!/usr/bin/env python3
"""One-shot rebuild of drizzle/0000_initial_schema.sql from locked design docs."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIG = (ROOT / "drizzle/0000_initial_schema.sql").read_text()
BP = "--> statement-breakpoint\n"


def enums() -> str:
	return f"""-- Global simulation enums
CREATE TYPE driver_gender AS ENUM ('MALE', 'FEMALE', 'NON_BINARY');
{BP}CREATE TYPE attribute_name_enum AS ENUM (
	'qualifying_pace', 'pace_consistency', 'high_speed_courage', 'throttle_application', 'grid_launch',
	'apex_precision', 'smoothness', 'kerb_riding', 'street_circuit_affinity', 'wet_weather_control',
	'late_braking', 'brake_trailing', 'lockup_avoidance', 'corner_entry_speed', 'brake_bias_management',
	'overtaking_aggression', 'defensive_positioning', 'dirty_air_tolerance', 'spatial_awareness', 'first_lap_navigation',
	'setup_feedback', 'tire_preservation', 'fuel_ers_management', 'strategy_adaptability', 'car_preservation',
	'work_ethic', 'pressure_tolerance', 'focus', 'team_player', 'marketability'
);
{BP}CREATE TYPE change_reason_enum AS ENUM (
	'YOUTH_DEVELOPMENT', 'AGE_DEGRADATION', 'TRAINING_SESSION', 'CRITICAL_INJURY', 'MORALE_SHIFT', 'FACILITY_BONUS'
);
{BP}CREATE TYPE employee_type_enum AS ENUM ('DRIVER', 'STAFF');
{BP}CREATE TYPE driver_role_enum AS ENUM ('FIRST_DRIVER', 'SECOND_DRIVER', 'RESERVE_DRIVER', 'ACADEMY_DRIVER');
{BP}CREATE TYPE staff_role_enum AS ENUM ('TEAM_PRINCIPAL', 'TECHNICAL_DIRECTOR', 'HEAD_OF_AERODYNAMICS', 'RACE_ENGINEER', 'CHIEF_SCOUT');
{BP}CREATE TYPE contract_termination_enum AS ENUM ('COMPLETED', 'MUTUAL_RESIGNATION', 'FIRED_BY_TEAM', 'POACHED_BY_RIVAL', 'RETIRED');
{BP}CREATE TYPE transaction_category_enum AS ENUM (
	'SPONSOR_UPFRONT', 'SPONSOR_MILESTONE', 'PRIZE_MONEY', 'BUYOUT_INFLOW', 'DRIVER_SALARY', 'STAFF_SALARY',
	'SIGNING_BONUS', 'PERFORMANCE_BONUS', 'BUYOUT_OUTFLOW', 'ENGINEERING_R_D', 'HQ_FACILITY_UPGRADE',
	'MERCHANDISE_REVENUE', 'REGULATORY_FINE', 'AFFILIATE_SUBSIDY', 'PART_SALE', 'PART_PURCHASE',
	'OTHER_REVENUE', 'OTHER_EXPENSE'
);
{BP}CREATE TYPE scouted_entity_enum AS ENUM ('DRIVER', 'STAFF');
{BP}CREATE TYPE team_status_enum AS ENUM ('ACTIVE', 'DEFUNCT', 'UNMANAGED_AI', 'PLAYER_MANAGED');
{BP}CREATE TYPE personnel_role_enum AS ENUM (
	'TEAM_PRINCIPAL', 'TECHNICAL_DIRECTOR', 'HEAD_OF_AERODYNAMICS', 'RACE_ENGINEER', 'CHIEF_SCOUT'
);
{BP}CREATE TYPE personnel_specialty_enum AS ENUM (
	'AERO_FOCUS', 'CHASSIS_FOCUS', 'POWERTRAIN_OPTIMIZATION', 'FINANCIAL_EFFICIENCY',
	'SPONSOR_NEGOTIATION', 'DRIVER_PSYCHOLOGY', 'YOUTH_SCOUTING'
);
{BP}CREATE TYPE roster_seat_enum AS ENUM (
	'CAR_1_PRIMARY', 'CAR_2_PRIMARY', 'RESERVE_SEAT', 'ACADEMY_SEAT',
	'BOX_TEAM_PRINCIPAL', 'BOX_TECHNICAL_DIRECTOR', 'BOX_AERO_CHIEF',
	'CAR_1_RACE_ENGINEER', 'CAR_2_RACE_ENGINEER', 'BOX_CHIEF_SCOUT'
);
{BP}CREATE TYPE car_component_enum AS ENUM (
	'CHASSIS', 'FRONT_WING', 'REAR_WING', 'UNDERBODY', 'SUSPENSION', 'BRAKES',
	'ENGINE', 'TURBOCHARGER', 'HYBRID_SYSTEM', 'GEARBOX', 'COOLING_SYSTEM'
);
{BP}CREATE TYPE component_status_enum AS ENUM ('IN_INVENTORY', 'INSTALLED', 'PARKED_ILLEGAL', 'RETIRED');
{BP}CREATE TYPE project_status_enum AS ENUM ('DESIGNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
{BP}CREATE TYPE series_regulation_type_enum AS ENUM ('OPEN_DEVELOPMENT', 'SPEC_PART', 'BANNED');
{BP}CREATE TYPE sponsor_tier_enum AS ENUM ('TITLE_SPONSOR', 'MAJOR_PARTNER', 'MINOR_PARTNER');
{BP}CREATE TYPE sponsor_objective_type_enum AS ENUM (
	'FINISH_POSITION', 'CHAMPIONSHIP_LEAD', 'QUALIFYING_TARGET', 'CLEAN_WEEKEND'
);
{BP}CREATE TYPE objective_status_enum AS ENUM ('PENDING_WEEKEND', 'MET', 'FAILED', 'ACTIVE_SEASONAL');
{BP}CREATE TYPE facility_category_enum AS ENUM (
	'AERODYNAMICS', 'POWERTRAIN', 'VEHICLE_DYNAMICS', 'OPERATIONS', 'COMMERCIAL'
);
{BP}CREATE TYPE facility_project_type_enum AS ENUM ('UPGRADE_LEVEL', 'REFURBISHMENT');
{BP}CREATE TYPE facility_project_status_enum AS ENUM ('CONSTRUCTING', 'PAUSED', 'COMPLETED');
{BP}CREATE TYPE maintenance_action_enum AS ENUM (
	'ROUTINE_UPKEEP', 'EMERGENCY_REPAIR', 'PREVENTATIVE_RUN', 'MAJOR_OVERHAUL'
);
{BP}CREATE TYPE facility_operating_mode_enum AS ENUM ('STANDARD', 'OVERCLOCK', 'ECO_MODE', 'STANDBY');
{BP}CREATE TYPE circuit_layout_type_enum AS ENUM ('HIGH_SPEED', 'BALANCED', 'HIGH_DOWNFORCE', 'STREET_CIRCUIT');
{BP}CREATE TYPE climate_zone_enum AS ENUM ('MEDITERRANEAN', 'TEMPERATE_MARITIME', 'TROPICAL_MONSOON', 'DESERT_ARID');
{BP}CREATE TYPE track_type_enum AS ENUM ('PERMANENT', 'STREET', 'HYBRID');
{BP}CREATE TYPE downforce_demand_enum AS ENUM ('VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW');
{BP}CREATE TYPE event_type_enum AS ENUM (
	'OFF_SEASON_PHASE', 'PRE_SEASON_TEST', 'RACE_WEEKEND', 'FACTORY_BREAK', 'SPONSOR_SUMMIT'
);
{BP}CREATE TYPE event_status_enum AS ENUM ('SCHEDULED', 'ACTIVE', 'RESOLVED');
{BP}CREATE TYPE session_type_enum AS ENUM (
	'PRACTICE_1', 'PRACTICE_2', 'PRACTICE_3', 'QUALIFYING', 'SPRINT_QUALIFYING', 'SPRINT_RACE', 'MAIN_RACE'
);
{BP}CREATE TYPE weather_season_enum AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');
{BP}CREATE TYPE tire_compound AS ENUM ('SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET');
{BP}CREATE TYPE physical_compound_type AS ENUM ('C1', 'C2', 'C3', 'C4', 'C5');
{BP}CREATE TYPE incident_severity AS ENUM ('YELLOW_FLAG', 'VSC', 'SAFETY_CAR', 'RED_FLAG', 'MECHANICAL_RETIREMENT');
{BP}CREATE TYPE session_retirement_reason AS ENUM ('FINISHED', 'ACCIDENT_CRASH', 'MECHANICAL_FAILURE', 'DISQUALIFIED', 'DID_NOT_START');
{BP}CREATE TYPE tire_availability_state AS ENUM ('FRESH', 'USED', 'RETURNED_FIA', 'PUNCTURED_DEAD');
{BP}CREATE TYPE penalty_source AS ENUM (
	'GEARBOX_SWAP', 'ENGINE_ELEMENT_EXCEEDED', 'ON_TRACK_COLLISION', 'PARC_FERME_VIOLATION'
);
{BP}CREATE TYPE game_phase_enum AS ENUM ('PRE_SEASON', 'IN_SEASON', 'END_OF_SEASON', 'OFF_SEASON');
{BP}CREATE TYPE player_status_enum AS ENUM ('EMPLOYED', 'UNEMPLOYED');
{BP}CREATE TYPE sporting_regs_version_enum AS ENUM ('CURRENT', 'PENDING');
{BP}CREATE TYPE qualifying_format_enum AS ENUM ('NONE_REVERSE_STANDINGS', 'SINGLE_SESSION', 'Q1_Q2_Q3');
{BP}CREATE TYPE parc_ferme_after_enum AS ENUM ('NONE', 'AFTER_QUALIFYING', 'AFTER_SPRINT_QUALIFYING');
{BP}CREATE TYPE grid_order_rule_enum AS ENUM ('QUALIFYING_RESULT', 'REVERSE_CHAMPIONSHIP_POINTS', 'PREVIOUS_RACE_RESULT');
{BP}CREATE TYPE red_flag_restart_mode_enum AS ENUM ('STANDING', 'ROLLING', 'COUNT_BACK');
{BP}CREATE TYPE loan_status_enum AS ENUM ('ACTIVE', 'COMPLETED', 'RECALLED', 'CANCELLED');
{BP}CREATE TYPE affiliation_status_enum AS ENUM ('ACTIVE', 'ENDED');
{BP}CREATE TYPE part_transfer_offer_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
{BP}CREATE TYPE driver_career_stage_enum AS ENUM ('KARTING', 'SINGLE_SEATER', 'RETIRED');
{BP}CREATE TYPE standing_entity_enum AS ENUM ('DRIVER', 'CONSTRUCTOR');
{BP}CREATE TYPE regulation_proposal_status_enum AS ENUM ('ACTIVE', 'PASSED', 'FAILED', 'REPLACED', 'EXPIRED');
"""


TECH = {
	1: '{"CHASSIS":"OPEN_DEVELOPMENT","FRONT_WING":"OPEN_DEVELOPMENT","REAR_WING":"OPEN_DEVELOPMENT","UNDERBODY":"OPEN_DEVELOPMENT","SUSPENSION":"OPEN_DEVELOPMENT","BRAKES":"OPEN_DEVELOPMENT","ENGINE":"OPEN_DEVELOPMENT","TURBOCHARGER":"OPEN_DEVELOPMENT","HYBRID_SYSTEM":"OPEN_DEVELOPMENT","GEARBOX":"OPEN_DEVELOPMENT","COOLING_SYSTEM":"OPEN_DEVELOPMENT"}',
	2: '{"CHASSIS":"OPEN_DEVELOPMENT","FRONT_WING":"OPEN_DEVELOPMENT","REAR_WING":"OPEN_DEVELOPMENT","UNDERBODY":"OPEN_DEVELOPMENT","SUSPENSION":"OPEN_DEVELOPMENT","BRAKES":"OPEN_DEVELOPMENT","ENGINE":"SPEC_PART","TURBOCHARGER":"SPEC_PART","HYBRID_SYSTEM":"SPEC_PART","GEARBOX":"OPEN_DEVELOPMENT","COOLING_SYSTEM":"OPEN_DEVELOPMENT"}',
	3: '{"CHASSIS":"SPEC_PART","FRONT_WING":"OPEN_DEVELOPMENT","REAR_WING":"OPEN_DEVELOPMENT","UNDERBODY":"OPEN_DEVELOPMENT","SUSPENSION":"OPEN_DEVELOPMENT","BRAKES":"OPEN_DEVELOPMENT","ENGINE":"SPEC_PART","TURBOCHARGER":"SPEC_PART","HYBRID_SYSTEM":"SPEC_PART","GEARBOX":"OPEN_DEVELOPMENT","COOLING_SYSTEM":"OPEN_DEVELOPMENT"}',
	4: '{"CHASSIS":"SPEC_PART","FRONT_WING":"OPEN_DEVELOPMENT","REAR_WING":"OPEN_DEVELOPMENT","UNDERBODY":"SPEC_PART","SUSPENSION":"OPEN_DEVELOPMENT","BRAKES":"SPEC_PART","ENGINE":"SPEC_PART","TURBOCHARGER":"SPEC_PART","HYBRID_SYSTEM":"BANNED","GEARBOX":"SPEC_PART","COOLING_SYSTEM":"SPEC_PART"}',
	5: '{"CHASSIS":"SPEC_PART","FRONT_WING":"SPEC_PART","REAR_WING":"SPEC_PART","UNDERBODY":"SPEC_PART","SUSPENSION":"SPEC_PART","BRAKES":"SPEC_PART","ENGINE":"SPEC_PART","TURBOCHARGER":"SPEC_PART","HYBRID_SYSTEM":"BANNED","GEARBOX":"SPEC_PART","COOLING_SYSTEM":"SPEC_PART"}',
}


def main() -> None:
	parts: list[str] = [enums()]
	parts.append(f"""CREATE TABLE points_systems (
	id INTEGER PRIMARY KEY,
	code VARCHAR(32) NOT NULL UNIQUE,
	name VARCHAR(100) NOT NULL,
	main_race_payouts INT[] NOT NULL,
	sprint_race_payouts INT[] NOT NULL,
	points_fastest_lap UTINYINT NOT NULL DEFAULT 0,
	fastest_lap_requires_top_10 BOOLEAN NOT NULL DEFAULT TRUE,
	points_pole_position UTINYINT NOT NULL DEFAULT 0
);
{BP}CREATE TABLE series (
	id UTINYINT PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	short_name VARCHAR(10) NOT NULL UNIQUE,
	tier_level UTINYINT NOT NULL UNIQUE,
	total_rounds UTINYINT NOT NULL DEFAULT 10,
	promotion_slots UTINYINT NOT NULL DEFAULT 0,
	relegation_slots UTINYINT NOT NULL DEFAULT 0,
	base_entry_fee BIGINT NOT NULL DEFAULT 0,
	season_prize_pool BIGINT NOT NULL,
	technical_regulations JSON NOT NULL,
	CONSTRAINT check_slots CHECK (promotion_slots >= 0 AND relegation_slots >= 0),
	CONSTRAINT check_pyramid_bounds CHECK (tier_level BETWEEN 1 AND 10)
);
{BP}CREATE INDEX idx_series_pyramid_hierarchy ON series(tier_level);
""")

	parts.append(ORIG[ORIG.index("CREATE TABLE facility_types") : ORIG.index("CREATE TABLE drivers")])
	parts.append(f"""CREATE TABLE drivers (
	id INTEGER PRIMARY KEY,
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	nationality VARCHAR(3) NOT NULL,
	birth_date DATE NOT NULL,
	birth_city VARCHAR(100),
	birth_region VARCHAR(100),
	gender driver_gender NOT NULL,
	height_cm UTINYINT NOT NULL,
	weight_kg UTINYINT NOT NULL,
	portrait_id VARCHAR(100),
	generation_season USMALLINT NOT NULL,
	career_stage driver_career_stage_enum NOT NULL DEFAULT 'SINGLE_SEATER',
	is_retired BOOLEAN NOT NULL DEFAULT FALSE
);
{BP}""")
	parts.append(ORIG[ORIG.index("CREATE TABLE personnel") : ORIG.index("CREATE TABLE car_components")])
	parts.append(f"""CREATE TABLE car_components (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	component_type car_component_enum NOT NULL,
	season_id USMALLINT NOT NULL,
	performance_rating UTINYINT NOT NULL,
	reliability_rating UTINYINT NOT NULL,
	weight_g UINTEGER NOT NULL,
	current_wear DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
	status component_status_enum NOT NULL DEFAULT 'IN_INVENTORY',
	CONSTRAINT check_component_wear CHECK (current_wear BETWEEN 0.00 AND 100.00),
	CONSTRAINT check_component_ratings CHECK (
		performance_rating BETWEEN 1 AND 100 AND reliability_rating BETWEEN 1 AND 100
	)
);
{BP}CREATE INDEX idx_team_component_inventory ON car_components(team_id, component_type, status);
{BP}""")
	parts.append(ORIG[ORIG.index("CREATE TABLE component_expertise") : ORIG.index("CREATE TABLE team_sponsors")])
	parts.append(f"""CREATE TABLE team_sponsors (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	sponsor_id INTEGER REFERENCES sponsors(id),
	assigned_slot sponsor_tier_enum NOT NULL,
	start_season_id USMALLINT NOT NULL,
	duration_seasons UTINYINT NOT NULL,
	seasons_remaining UTINYINT NOT NULL,
	actual_per_race_payout BIGINT NOT NULL,
	is_ownership_affiliate BOOLEAN NOT NULL DEFAULT FALSE,
	parent_team_id INTEGER REFERENCES teams(id),
	CONSTRAINT unique_slot_per_team UNIQUE (team_id, assigned_slot),
	CONSTRAINT check_contract_lifespan CHECK (duration_seasons > 0 AND seasons_remaining <= duration_seasons),
	CONSTRAINT check_affiliate_title CHECK (
		(is_ownership_affiliate = FALSE AND sponsor_id IS NOT NULL AND parent_team_id IS NULL) OR
		(is_ownership_affiliate = TRUE AND assigned_slot = 'TITLE_SPONSOR' AND parent_team_id IS NOT NULL)
	)
);
{BP}CREATE INDEX idx_team_active_sponsors ON team_sponsors(team_id);
{BP}""")
	parts.append(ORIG[ORIG.index("CREATE TABLE sponsor_objectives") : ORIG.index("CREATE TABLE series_standings")])
	parts.append(f"""CREATE TABLE series_standings (
	id INTEGER PRIMARY KEY,
	series_id UTINYINT NOT NULL REFERENCES series(id),
	season_id USMALLINT NOT NULL,
	entity_type standing_entity_enum NOT NULL,
	driver_id INTEGER REFERENCES drivers(id),
	team_id INTEGER REFERENCES teams(id),
	points INTEGER NOT NULL DEFAULT 0,
	current_rank UTINYINT NOT NULL,
	wins_count UTINYINT NOT NULL DEFAULT 0,
	podiums_count UTINYINT NOT NULL DEFAULT 0,
	poles_count UTINYINT NOT NULL DEFAULT 0,
	CONSTRAINT check_standings_entity CHECK (
		(entity_type = 'DRIVER' AND driver_id IS NOT NULL AND team_id IS NULL) OR
		(entity_type = 'CONSTRUCTOR' AND team_id IS NOT NULL AND driver_id IS NULL)
	),
	CONSTRAINT check_rank_floor CHECK (current_rank > 0)
);
{BP}CREATE INDEX idx_leaderboard_render ON series_standings(series_id, season_id, entity_type, current_rank);
{BP}CREATE UNIQUE INDEX idx_unique_standing_entry ON series_standings(
	series_id, season_id, entity_type, COALESCE(driver_id, -1), COALESCE(team_id, -1)
);
{BP}""")

	tire = ORIG[ORIG.index("CREATE TABLE weekend_tire_sets") : ORIG.index("INSERT INTO series")]
	tire = tire.replace(
		"\tfunctional_label tire_compound NOT NULL,\n\tstate tire_availability_state",
		"\tfunctional_label tire_compound NOT NULL,\n\tactual_physical_core physical_compound_type,\n\tstate tire_availability_state",
	)
	parts.append(tire)

	parts.append(f"""CREATE TABLE game_state (
	id UTINYINT PRIMARY KEY DEFAULT 1,
	season_year USMALLINT NOT NULL DEFAULT 2026,
	current_week UTINYINT NOT NULL DEFAULT 1,
	phase game_phase_enum NOT NULL DEFAULT 'PRE_SEASON',
	player_display_name VARCHAR(100) NOT NULL DEFAULT 'Player',
	player_team_id INTEGER REFERENCES teams(id),
	player_status player_status_enum NOT NULL DEFAULT 'UNEMPLOYED',
	CONSTRAINT check_singleton_game_state CHECK (id = 1),
	CONSTRAINT check_game_week CHECK (current_week BETWEEN 1 AND 52)
);
{BP}CREATE TABLE player_tenures (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	board_confidence UTINYINT NOT NULL DEFAULT 55,
	target_constructors_position UTINYINT NOT NULL DEFAULT 5,
	warning_issued BOOLEAN NOT NULL DEFAULT FALSE,
	consecutive_low_checks UTINYINT NOT NULL DEFAULT 0,
	hire_season USMALLINT NOT NULL,
	hire_week UTINYINT NOT NULL,
	ended_season USMALLINT,
	ended_week UTINYINT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT check_board_confidence CHECK (board_confidence BETWEEN 0 AND 100),
	CONSTRAINT check_target_position CHECK (target_constructors_position BETWEEN 1 AND 10)
);
{BP}CREATE INDEX idx_active_player_tenure ON player_tenures(team_id, is_active);
{BP}CREATE TABLE series_sporting_regulations (
	series_id UTINYINT NOT NULL REFERENCES series(id),
	version sporting_regs_version_enum NOT NULL,
	practice_session_count UTINYINT NOT NULL,
	qualifying_format qualifying_format_enum NOT NULL,
	sprint_enabled BOOLEAN NOT NULL DEFAULT FALSE,
	sprint_qualifying_enabled BOOLEAN NOT NULL DEFAULT FALSE,
	main_race_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	parc_ferme_after parc_ferme_after_enum NOT NULL,
	main_race_target_distance_meters UINTEGER NOT NULL,
	main_race_time_limit_minutes USMALLINT NOT NULL,
	sprint_target_distance_meters UINTEGER,
	formation_lap_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	standing_start BOOLEAN NOT NULL DEFAULT TRUE,
	grid_order_rule grid_order_rule_enum NOT NULL DEFAULT 'QUALIFYING_RESULT',
	reverse_grid_top_n UTINYINT NOT NULL DEFAULT 0,
	safety_car_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	vsc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	red_flag_restart_mode red_flag_restart_mode_enum NOT NULL DEFAULT 'STANDING',
	drs_enabled BOOLEAN NOT NULL DEFAULT FALSE,
	drs_activation_lap UTINYINT,
	wet_weather_tyre_rules_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	dry_compounds_available UTINYINT NOT NULL DEFAULT 3,
	mandatory_pit_stop BOOLEAN NOT NULL DEFAULT FALSE,
	mandatory_different_dry_compounds BOOLEAN NOT NULL DEFAULT FALSE,
	tyre_sets_soft UTINYINT NOT NULL DEFAULT 2,
	tyre_sets_medium UTINYINT NOT NULL DEFAULT 2,
	tyre_sets_hard UTINYINT NOT NULL DEFAULT 2,
	tyre_sets_inter UTINYINT NOT NULL DEFAULT 2,
	tyre_sets_wet UTINYINT NOT NULL DEFAULT 2,
	engine_allocation_per_season UTINYINT NOT NULL DEFAULT 4,
	turbo_allocation_per_season UTINYINT NOT NULL DEFAULT 4,
	hybrid_allocation_per_season UTINYINT NOT NULL DEFAULT 0,
	gearbox_allocation_per_season UTINYINT NOT NULL DEFAULT 4,
	grid_penalty_per_extra_element UTINYINT NOT NULL DEFAULT 5,
	main_points_system_id INTEGER NOT NULL REFERENCES points_systems(id),
	sprint_points_system_id INTEGER NOT NULL REFERENCES points_systems(id),
	track_limits_strictness UTINYINT NOT NULL DEFAULT 5,
	collision_penalty_severity UTINYINT NOT NULL DEFAULT 5,
	unsafe_release_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	PRIMARY KEY (series_id, version),
	CONSTRAINT check_practice_count CHECK (practice_session_count BETWEEN 0 AND 3),
	CONSTRAINT check_dry_compounds CHECK (dry_compounds_available BETWEEN 2 AND 3),
	CONSTRAINT check_steward_scales CHECK (
		track_limits_strictness BETWEEN 1 AND 10 AND collision_penalty_severity BETWEEN 1 AND 10
	)
);
{BP}CREATE TABLE series_regulation_proposals (
	id INTEGER PRIMARY KEY,
	series_id UTINYINT NOT NULL REFERENCES series(id),
	open_week UTINYINT NOT NULL,
	close_week UTINYINT NOT NULL,
	status regulation_proposal_status_enum NOT NULL DEFAULT 'ACTIVE',
	proposed_regs JSON NOT NULL,
	CONSTRAINT check_proposal_weeks CHECK (
		open_week BETWEEN 1 AND 52 AND close_week BETWEEN 1 AND 52 AND close_week >= open_week
	)
);
{BP}CREATE INDEX idx_active_proposals_by_series ON series_regulation_proposals(series_id, status);
{BP}CREATE TABLE series_regulation_votes (
	proposal_id INTEGER NOT NULL REFERENCES series_regulation_proposals(id),
	team_id INTEGER NOT NULL REFERENCES teams(id),
	vote BOOLEAN,
	PRIMARY KEY (proposal_id, team_id)
);
{BP}CREATE TABLE loans (
	id INTEGER PRIMARY KEY,
	contract_id INTEGER NOT NULL REFERENCES contracts(id),
	from_team_id INTEGER NOT NULL REFERENCES teams(id),
	to_team_id INTEGER NOT NULL REFERENCES teams(id),
	start_season USMALLINT NOT NULL,
	start_week UTINYINT NOT NULL,
	end_season USMALLINT NOT NULL,
	end_week UTINYINT NOT NULL,
	recalled BOOLEAN NOT NULL DEFAULT FALSE,
	recall_season USMALLINT,
	recall_week UTINYINT,
	status loan_status_enum NOT NULL DEFAULT 'ACTIVE',
	CONSTRAINT check_loan_weeks CHECK (start_week BETWEEN 1 AND 52 AND end_week BETWEEN 1 AND 52)
);
{BP}CREATE INDEX idx_active_loans ON loans(status, to_team_id);
{BP}CREATE INDEX idx_loans_by_contract ON loans(contract_id, status);
{BP}CREATE TABLE team_affiliations (
	id INTEGER PRIMARY KEY,
	parent_team_id INTEGER NOT NULL REFERENCES teams(id),
	child_team_id INTEGER NOT NULL UNIQUE REFERENCES teams(id),
	start_season USMALLINT NOT NULL,
	end_season USMALLINT,
	status affiliation_status_enum NOT NULL DEFAULT 'ACTIVE',
	fixed_base_subsidy BIGINT NOT NULL,
	top_up_amount BIGINT NOT NULL DEFAULT 0,
	CONSTRAINT check_affiliation_funding CHECK (fixed_base_subsidy >= 0 AND top_up_amount >= 0)
);
{BP}CREATE INDEX idx_parent_affiliates ON team_affiliations(parent_team_id, status);
{BP}CREATE TABLE part_transfer_offers (
	id INTEGER PRIMARY KEY,
	component_id INTEGER NOT NULL REFERENCES car_components(id),
	from_team_id INTEGER NOT NULL REFERENCES teams(id),
	to_team_id INTEGER NOT NULL REFERENCES teams(id),
	offered_price BIGINT NOT NULL,
	status part_transfer_offer_status_enum NOT NULL DEFAULT 'PENDING',
	created_week UTINYINT NOT NULL,
	expires_week UTINYINT NOT NULL,
	season_year USMALLINT NOT NULL,
	CONSTRAINT check_offer_price CHECK (offered_price > 0),
	CONSTRAINT check_offer_weeks CHECK (created_week BETWEEN 1 AND 52 AND expires_week BETWEEN 1 AND 52)
);
{BP}CREATE INDEX idx_pending_part_offers ON part_transfer_offers(to_team_id, status);
{BP}CREATE TABLE circuit_compound_maps (
	circuit_id INTEGER NOT NULL REFERENCES circuits(id),
	series_id UTINYINT NOT NULL REFERENCES series(id),
	soft_core physical_compound_type NOT NULL,
	medium_core physical_compound_type NOT NULL,
	hard_core physical_compound_type NOT NULL,
	is_override BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (circuit_id, series_id)
);
{BP}CREATE INDEX idx_compound_maps_by_series ON circuit_compound_maps(series_id);
{BP}CREATE TABLE team_loan_relationships (
	from_team_id INTEGER NOT NULL REFERENCES teams(id),
	to_team_id INTEGER NOT NULL REFERENCES teams(id),
	relationship_score TINYINT NOT NULL DEFAULT 0,
	penalty_expires_season USMALLINT,
	PRIMARY KEY (from_team_id, to_team_id)
);
{BP}""")

	points_rows = [
		(1, "F1_MODERN", "F1 Modern Top 10", "[25,18,15,12,10,8,6,4,2,1]", "[]", 1),
		(2, "F1_CLASSIC_TOP8", "F1 Classic Top 8", "[10,8,6,5,4,3,2,1]", "[]", 0),
		(3, "F1_CLASSIC_TOP6", "F1 Classic Top 6", "[9,6,4,3,2,1]", "[]", 0),
		(4, "MODERN_TOP10_FLAT", "Modern Top 10 Flat", "[25,20,16,12,10,8,6,4,2,1]", "[]", 0),
		(5, "MODERN_TOP12", "Modern Top 12", "[25,20,16,14,12,10,8,6,4,3,2,1]", "[]", 0),
		(6, "WINNERS_HEAVY", "Winners Heavy", "[50,25,15,10,8,6,4,2,1]", "[]", 0),
		(7, "FULL_FIELD_20", "Full Field 20", "[20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]", "[]", 0),
		(8, "FULL_FIELD_LINEAR_15", "Full Field Linear Soft", "[20,18,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,2,1,1]", "[]", 0),
		(9, "JUNIOR_TOP10", "Junior Top 10", "[20,15,12,10,8,6,4,3,2,1]", "[]", 0),
		(10, "JUNIOR_TOP8", "Junior Top 8", "[15,12,10,8,6,4,2,1]", "[]", 0),
		(11, "JUNIOR_TOP15", "Junior Top 15", "[25,20,16,14,12,10,8,7,6,5,4,3,2,1,1]", "[]", 0),
		(12, "REVERSE_INCENTIVE", "Reverse Incentive", "[12,10,9,8,7,6,5,4,3,2,1,1,1,1,1,1,1,1,1,1]", "[]", 0),
		(13, "SPRINT_F1", "Sprint F1", "[]", "[8,7,6,5,4,3,2,1]", 0),
		(14, "SPRINT_TOP6", "Sprint Top 6", "[]", "[6,5,4,3,2,1]", 0),
		(15, "SPRINT_TOP10", "Sprint Top 10", "[]", "[10,9,8,7,6,5,4,3,2,1]", 0),
		(16, "SPRINT_NONE", "Sprint None", "[]", "[]", 0),
	]
	seed = [
		"INSERT INTO points_systems (id, code, name, main_race_payouts, sprint_race_payouts, points_fastest_lap, fastest_lap_requires_top_10, points_pole_position) VALUES\n",
		",\n".join(
			f"\t({i}, '{c}', '{n}', {m}, {s}, {fl}, TRUE, 0)" for i, c, n, m, s, fl in points_rows
		),
		f";\n{BP}",
	]
	series = [
		(1, "Formula Premier", "FP", 1, 22, 0, 2, 100000000),
		(2, "Intercontinental Super Cup", "ISC", 2, 18, 2, 2, 50000000),
		(3, "Atlantic Open Championship", "AOC", 3, 14, 2, 2, 25000000),
		(4, "Continental Racing Series", "CRS", 4, 12, 2, 2, 12000000),
		(5, "National Development Cup", "NDC", 5, 10, 2, 0, 5000000),
	]
	seed.append(
		"INSERT INTO series (id, name, short_name, tier_level, total_rounds, promotion_slots, relegation_slots, base_entry_fee, season_prize_pool, technical_regulations) VALUES\n"
	)
	seed.append(
		",\n".join(
			f"\t({i}, '{name}', '{short}', {tier}, {rounds}, {promo}, {releg}, 0, {pool}, '{TECH[i]}')"
			for i, name, short, tier, rounds, promo, releg, pool in series
		)
	)
	seed.append(f";\n{BP}")

	# sporting: FP 1/13, ISC 5/15, AOC 9/14, CRS 11/16, NDC 7/16
	sporting = [
		(1, 3, "Q1_Q2_Q3", True, True, "AFTER_SPRINT_QUALIFYING", 305000, 120, 100000, True, True, True, 3, 3, True, True, 6, 3, 2, 4, 3, 4, 4, 3, 4, 10, 1, 13, 8, 8),
		(2, 3, "Q1_Q2_Q3", True, True, "AFTER_SPRINT_QUALIFYING", 250000, 120, 100000, True, True, True, 3, 3, True, True, 5, 3, 2, 3, 2, 4, 4, 3, 3, 10, 5, 15, 7, 7),
		(3, 2, "Q1_Q2_Q3", True, False, "AFTER_QUALIFYING", 200000, 90, 80000, True, True, True, 3, 3, True, True, 4, 3, 2, 3, 2, 4, 4, 3, 4, 5, 9, 14, 6, 6),
		(4, 2, "SINGLE_SESSION", False, False, "AFTER_QUALIFYING", 150000, 75, None, True, True, False, None, 2, True, False, 3, 3, 2, 2, 2, 5, 5, 0, 4, 5, 11, 16, 5, 5),
		(5, 1, "SINGLE_SESSION", False, False, "AFTER_QUALIFYING", 100000, 60, None, True, False, False, None, 2, False, False, 2, 2, 2, 2, 2, 5, 5, 0, 5, 5, 7, 16, 4, 4),
	]

	def sql_bool(v: bool) -> str:
		return "TRUE" if v else "FALSE"

	def sql_opt(v) -> str:
		return "NULL" if v is None else str(v)

	rows = []
	for ver in ("CURRENT", "PENDING"):
		for r in sporting:
			(
				sid, prac, quali, sprint, sprint_q, parc, dist, time, sprint_dist,
				sc, vsc, drs, drs_lap, dry, mand_pit, mand_comp,
				ts, tm, th, ti, tw, eng, turbo, hyb, gear, pen, main_pts, sprint_pts, tl, col,
			) = r
			rows.append(
				"\t("
				f"{sid}, '{ver}', {prac}, '{quali}', {sql_bool(sprint)}, {sql_bool(sprint_q)}, TRUE, '{parc}', "
				f"{dist}, {time}, {sql_opt(sprint_dist)}, TRUE, TRUE, 'QUALIFYING_RESULT', 0, "
				f"{sql_bool(sc)}, {sql_bool(vsc)}, 'STANDING', {sql_bool(drs)}, {sql_opt(drs_lap)}, TRUE, {dry}, "
				f"{sql_bool(mand_pit)}, {sql_bool(mand_comp)}, {ts}, {tm}, {th}, {ti}, {tw}, "
				f"{eng}, {turbo}, {hyb}, {gear}, {pen}, {main_pts}, {sprint_pts}, {tl}, {col}, TRUE)"
			)

	seed.append(
		"""INSERT INTO series_sporting_regulations (
	series_id, version, practice_session_count, qualifying_format, sprint_enabled, sprint_qualifying_enabled,
	main_race_enabled, parc_ferme_after, main_race_target_distance_meters, main_race_time_limit_minutes,
	sprint_target_distance_meters, formation_lap_enabled, standing_start, grid_order_rule, reverse_grid_top_n,
	safety_car_enabled, vsc_enabled, red_flag_restart_mode, drs_enabled, drs_activation_lap,
	wet_weather_tyre_rules_enabled, dry_compounds_available, mandatory_pit_stop, mandatory_different_dry_compounds,
	tyre_sets_soft, tyre_sets_medium, tyre_sets_hard, tyre_sets_inter, tyre_sets_wet,
	engine_allocation_per_season, turbo_allocation_per_season, hybrid_allocation_per_season, gearbox_allocation_per_season,
	grid_penalty_per_extra_element, main_points_system_id, sprint_points_system_id,
	track_limits_strictness, collision_penalty_severity, unsafe_release_enabled
) VALUES
"""
	)
	seed.append(",\n".join(rows))
	seed.append(f";\n{BP}")
	seed.append(
		"INSERT INTO game_state (id, season_year, current_week, phase, player_display_name, player_team_id, player_status) VALUES\n"
		"\t(1, 2026, 1, 'PRE_SEASON', 'Player', NULL, 'UNEMPLOYED');\n"
	)
	parts.append("".join(seed))

	out = "".join(parts)
	while f"\n{BP}{BP}" in out:
		out = out.replace(f"\n{BP}{BP}", f"\n{BP}")
	path = ROOT / "drizzle/0000_initial_schema.sql"
	path.write_text(out)
	print(f"Wrote {path} ({len(out.splitlines())} lines)")


if __name__ == "__main__":
	main()
