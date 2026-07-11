-- Global simulation enums
CREATE TYPE driver_gender AS ENUM ('MALE', 'FEMALE', 'NON_BINARY');
--> statement-breakpoint
CREATE TYPE attribute_name_enum AS ENUM (
	'qualifying_pace', 'pace_consistency', 'high_speed_courage', 'throttle_application', 'grid_launch',
	'apex_precision', 'smoothness', 'kerb_riding', 'street_circuit_affinity', 'wet_weather_control',
	'late_braking', 'brake_trailing', 'lockup_avoidance', 'corner_entry_speed', 'brake_bias_management',
	'overtaking_aggression', 'defensive_positioning', 'dirty_air_tolerance', 'spatial_awareness', 'first_lap_navigation',
	'setup_feedback', 'tire_preservation', 'fuel_ers_management', 'strategy_adaptability', 'car_preservation',
	'work_ethic', 'pressure_tolerance', 'focus', 'team_player', 'marketability'
);
--> statement-breakpoint
CREATE TYPE change_reason_enum AS ENUM (
	'YOUTH_DEVELOPMENT', 'AGE_DEGRADATION', 'TRAINING_SESSION', 'CRITICAL_INJURY', 'MORALE_SHIFT', 'FACILITY_BONUS'
);
--> statement-breakpoint
CREATE TYPE employee_type_enum AS ENUM ('DRIVER', 'STAFF');
--> statement-breakpoint
CREATE TYPE driver_role_enum AS ENUM ('FIRST_DRIVER', 'SECOND_DRIVER', 'RESERVE_DRIVER', 'ACADEMY_DRIVER');
--> statement-breakpoint
CREATE TYPE staff_role_enum AS ENUM ('TEAM_PRINCIPAL', 'TECHNICAL_DIRECTOR', 'HEAD_OF_AERODYNAMICS', 'RACE_ENGINEER', 'CHIEF_SCOUT');
--> statement-breakpoint
CREATE TYPE contract_termination_enum AS ENUM ('COMPLETED', 'MUTUAL_RESIGNATION', 'FIRED_BY_TEAM', 'POACHED_BY_RIVAL', 'RETIRED');
--> statement-breakpoint
CREATE TYPE transaction_category_enum AS ENUM (
	'SPONSOR_UPFRONT', 'SPONSOR_MILESTONE', 'PRIZE_MONEY', 'BUYOUT_INFLOW', 'DRIVER_SALARY', 'STAFF_SALARY',
	'SIGNING_BONUS', 'PERFORMANCE_BONUS', 'BUYOUT_OUTFLOW', 'ENGINEERING_R_D', 'HQ_FACILITY_UPGRADE',
	'MERCHANDISE_REVENUE', 'REGULATORY_FINE', 'OTHER_REVENUE', 'OTHER_EXPENSE'
);
--> statement-breakpoint
CREATE TYPE scouted_entity_enum AS ENUM ('DRIVER', 'STAFF');
--> statement-breakpoint
CREATE TYPE team_status_enum AS ENUM ('ACTIVE', 'DEFUNCT', 'UNMANAGED_AI', 'PLAYER_MANAGED');
--> statement-breakpoint
CREATE TYPE personnel_role_enum AS ENUM (
	'TEAM_PRINCIPAL', 'TECHNICAL_DIRECTOR', 'HEAD_OF_AERODYNAMICS', 'RACE_ENGINEER', 'CHIEF_SCOUT'
);
--> statement-breakpoint
CREATE TYPE personnel_specialty_enum AS ENUM (
	'AERO_FOCUS', 'CHASSIS_FOCUS', 'POWERTRAIN_OPTIMIZATION', 'FINANCIAL_EFFICIENCY',
	'SPONSOR_NEGOTIATION', 'DRIVER_PSYCHOLOGY', 'YOUTH_SCOUTING'
);
--> statement-breakpoint
CREATE TYPE roster_seat_enum AS ENUM (
	'CAR_1_PRIMARY', 'CAR_2_PRIMARY', 'RESERVE_SEAT', 'ACADEMY_SEAT',
	'BOX_TEAM_PRINCIPAL', 'BOX_TECHNICAL_DIRECTOR', 'BOX_AERO_CHIEF',
	'CAR_1_RACE_ENGINEER', 'CAR_2_RACE_ENGINEER', 'BOX_CHIEF_SCOUT'
);
--> statement-breakpoint
CREATE TYPE car_component_enum AS ENUM (
	'CHASSIS', 'FRONT_WING', 'REAR_WING', 'UNDERBODY', 'SUSPENSION', 'BRAKES',
	'ENGINE', 'TURBOCHARGER', 'HYBRID_SYSTEM', 'GEARBOX', 'COOLING_SYSTEM'
);
--> statement-breakpoint
CREATE TYPE project_status_enum AS ENUM ('DESIGNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE series_regulation_type_enum AS ENUM ('OPEN_DEVELOPMENT', 'SPEC_PART', 'BANNED');
--> statement-breakpoint
CREATE TYPE sponsor_tier_enum AS ENUM ('TITLE_SPONSOR', 'MAJOR_PARTNER', 'MINOR_PARTNER');
--> statement-breakpoint
CREATE TYPE sponsor_objective_type_enum AS ENUM (
	'FINISH_POSITION', 'CHAMPIONSHIP_LEAD', 'QUALIFYING_TARGET', 'CLEAN_WEEKEND'
);
--> statement-breakpoint
CREATE TYPE objective_status_enum AS ENUM ('PENDING_WEEKEND', 'MET', 'FAILED', 'ACTIVE_SEASONAL');
--> statement-breakpoint
CREATE TYPE facility_category_enum AS ENUM (
	'AERODYNAMICS', 'POWERTRAIN', 'VEHICLE_DYNAMICS', 'OPERATIONS', 'COMMERCIAL'
);
--> statement-breakpoint
CREATE TYPE facility_project_type_enum AS ENUM ('UPGRADE_LEVEL', 'REFURBISHMENT');
--> statement-breakpoint
CREATE TYPE facility_project_status_enum AS ENUM ('CONSTRUCTING', 'PAUSED', 'COMPLETED');
--> statement-breakpoint
CREATE TYPE maintenance_action_enum AS ENUM (
	'ROUTINE_UPKEEP', 'EMERGENCY_REPAIR', 'PREVENTATIVE_RUN', 'MAJOR_OVERHAUL'
);
--> statement-breakpoint
CREATE TYPE facility_operating_mode_enum AS ENUM ('STANDARD', 'OVERCLOCK', 'ECO_MODE', 'STANDBY');
--> statement-breakpoint
CREATE TYPE circuit_layout_type_enum AS ENUM ('HIGH_SPEED', 'BALANCED', 'HIGH_DOWNFORCE', 'STREET_CIRCUIT');
--> statement-breakpoint
CREATE TYPE climate_zone_enum AS ENUM ('MEDITERRANEAN', 'TEMPERATE_MARITIME', 'TROPICAL_MONSOON', 'DESERT_ARID');
--> statement-breakpoint
CREATE TYPE track_type_enum AS ENUM ('PERMANENT', 'STREET', 'HYBRID');
--> statement-breakpoint
CREATE TYPE downforce_demand_enum AS ENUM ('VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW');
--> statement-breakpoint
CREATE TYPE event_type_enum AS ENUM (
	'OFF_SEASON_PHASE', 'PRE_SEASON_TEST', 'RACE_WEEKEND', 'FACTORY_BREAK', 'SPONSOR_SUMMIT'
);
--> statement-breakpoint
CREATE TYPE event_status_enum AS ENUM ('SCHEDULED', 'ACTIVE', 'RESOLVED');
--> statement-breakpoint
CREATE TYPE session_type_enum AS ENUM (
	'PRACTICE_1', 'PRACTICE_2', 'PRACTICE_3', 'QUALIFYING', 'SPRINT_RACE', 'MAIN_RACE'
);
--> statement-breakpoint
CREATE TYPE weather_season_enum AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');
--> statement-breakpoint
CREATE TYPE tire_compound AS ENUM ('SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET');
--> statement-breakpoint
CREATE TYPE physical_compound_type AS ENUM ('C1', 'C2', 'C3', 'C4', 'C5', 'C6');
--> statement-breakpoint
CREATE TYPE incident_severity AS ENUM ('YELLOW_FLAG', 'VSC', 'SAFETY_CAR', 'RED_FLAG', 'MECHANICAL_RETIREMENT');
--> statement-breakpoint
CREATE TYPE session_retirement_reason AS ENUM ('FINISHED', 'ACCIDENT_CRASH', 'MECHANICAL_FAILURE', 'DISQUALIFIED', 'DID_NOT_START');
--> statement-breakpoint
CREATE TYPE tire_availability_state AS ENUM ('FRESH', 'USED', 'RETURNED_FIA', 'PUNCTURED_DEAD');
--> statement-breakpoint
CREATE TYPE penalty_source AS ENUM (
	'GEARBOX_SWAP', 'ENGINE_ELEMENT_EXCEEDED', 'ON_TRACK_COLLISION', 'PARC_FERME_VIOLATION'
);
--> statement-breakpoint
CREATE TABLE points_systems (
	id INTEGER PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	main_race_payouts INT[] NOT NULL,
	sprint_race_payouts INT[] NOT NULL,
	points_fastest_lap UTINYINT NOT NULL DEFAULT 0,
	fastest_lap_requires_top_10 BOOLEAN NOT NULL DEFAULT TRUE,
	points_pole_position UTINYINT NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE series (
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
	points_system_matrix JSON NOT NULL,
	CONSTRAINT check_slots CHECK (promotion_slots >= 0 AND relegation_slots >= 0),
	CONSTRAINT check_pyramid_bounds CHECK (tier_level BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE INDEX idx_series_pyramid_hierarchy ON series(tier_level);
--> statement-breakpoint
CREATE TABLE facility_types (
	id UTINYINT PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	category facility_category_enum NOT NULL,
	description VARCHAR(255) NOT NULL,
	base_construction_cost BIGINT NOT NULL,
	base_maintenance_cost BIGINT NOT NULL,
	max_level_cap UTINYINT NOT NULL DEFAULT 5
);
--> statement-breakpoint
CREATE INDEX idx_facility_config_category ON facility_types(category);
--> statement-breakpoint
CREATE TABLE sponsors (
	id INTEGER PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	tier sponsor_tier_enum NOT NULL,
	min_reputation_req UTINYINT NOT NULL DEFAULT 10,
	base_upfront_payment BIGINT NOT NULL DEFAULT 0,
	base_per_race_payout BIGINT NOT NULL DEFAULT 0,
	objective_type sponsor_objective_type_enum,
	objective_threshold UTINYINT,
	objective_bonus BIGINT NOT NULL DEFAULT 0,
	deal_duration_seasons UTINYINT NOT NULL DEFAULT 1,
	CONSTRAINT check_reputation_bounds CHECK (min_reputation_req BETWEEN 1 AND 100),
	CONSTRAINT check_financial_floors CHECK (
		base_upfront_payment >= 0 AND base_per_race_payout >= 0 AND objective_bonus >= 0
	)
);
--> statement-breakpoint
CREATE INDEX idx_sponsor_market_tier ON sponsors(tier, min_reputation_req);
--> statement-breakpoint
CREATE TABLE circuits (
	id INTEGER PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	location_city VARCHAR(100) NOT NULL,
	location_country VARCHAR(100) NOT NULL,
	track_type track_type_enum NOT NULL,
	lap_length_meters UINTEGER NOT NULL,
	base_pit_loss_ms UINTEGER NOT NULL,
	tire_wear_modifier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
	fuel_burn_modifier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
	brake_strain_modifier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
	downforce_demand downforce_demand_enum NOT NULL,
	CONSTRAINT check_track_distance CHECK (lap_length_meters > 500),
	CONSTRAINT check_pit_window CHECK (base_pit_loss_ms BETWEEN 5000 AND 45000)
);
--> statement-breakpoint
CREATE INDEX idx_circuits_by_country ON circuits(location_country);
--> statement-breakpoint
CREATE TABLE upgrade_templates (
	id INTEGER PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	description VARCHAR(255),
	component_type car_component_enum NOT NULL,
	required_hq_level UTINYINT NOT NULL DEFAULT 1,
	tier_index UTINYINT NOT NULL DEFAULT 1,
	base_financial_cost BIGINT NOT NULL,
	base_duration_weeks UTINYINT NOT NULL DEFAULT 1,
	performance_delta TINYINT NOT NULL DEFAULT 0,
	reliability_delta TINYINT NOT NULL DEFAULT 0,
	weight_delta_g INTEGER NOT NULL DEFAULT 0,
	CONSTRAINT check_template_duration CHECK (base_duration_weeks >= 0),
	CONSTRAINT check_template_cost CHECK (base_financial_cost >= 0)
);
--> statement-breakpoint
CREATE INDEX idx_templates_by_component ON upgrade_templates(component_type);
--> statement-breakpoint
CREATE TABLE drivers (
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
	is_retired BOOLEAN NOT NULL DEFAULT FALSE
);
--> statement-breakpoint
CREATE TABLE personnel (
	id INTEGER PRIMARY KEY,
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	nationality VARCHAR(3) NOT NULL,
	birth_date DATE NOT NULL,
	gender driver_gender NOT NULL,
	role personnel_role_enum NOT NULL,
	specialty personnel_specialty_enum,
	true_skill UTINYINT NOT NULL DEFAULT 50,
	true_potential UTINYINT NOT NULL DEFAULT 50,
	role_attributes JSON,
	generation_season USMALLINT NOT NULL,
	is_retired BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT check_personnel_ratings CHECK (true_skill BETWEEN 1 AND 100 AND true_potential BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX idx_staff_market_lookup ON personnel(role, is_retired);
--> statement-breakpoint
CREATE TABLE teams (
	id INTEGER PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	short_name VARCHAR(10) NOT NULL UNIQUE,
	nationality VARCHAR(3) NOT NULL,
	primary_color VARCHAR(7) NOT NULL,
	secondary_color VARCHAR(7) NOT NULL,
	status team_status_enum NOT NULL DEFAULT 'UNMANAGED_AI',
	tier_id UTINYINT NOT NULL REFERENCES series(id),
	wind_tunnel_hours UTINYINT NOT NULL DEFAULT 40,
	cfd_capacity_flops UINTEGER NOT NULL DEFAULT 0,
	hq_level UTINYINT NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX idx_team_tier_ranking ON teams(tier_id);
--> statement-breakpoint
CREATE TABLE driver_attributes (
	driver_id INTEGER PRIMARY KEY REFERENCES drivers(id),
	qualifying_pace UTINYINT NOT NULL DEFAULT 50,
	pace_consistency UTINYINT NOT NULL DEFAULT 50,
	high_speed_courage UTINYINT NOT NULL DEFAULT 50,
	throttle_application UTINYINT NOT NULL DEFAULT 50,
	grid_launch UTINYINT NOT NULL DEFAULT 50,
	apex_precision UTINYINT NOT NULL DEFAULT 50,
	smoothness UTINYINT NOT NULL DEFAULT 50,
	kerb_riding UTINYINT NOT NULL DEFAULT 50,
	street_circuit_affinity UTINYINT NOT NULL DEFAULT 50,
	wet_weather_control UTINYINT NOT NULL DEFAULT 50,
	late_braking UTINYINT NOT NULL DEFAULT 50,
	brake_trailing UTINYINT NOT NULL DEFAULT 50,
	lockup_avoidance UTINYINT NOT NULL DEFAULT 50,
	corner_entry_speed UTINYINT NOT NULL DEFAULT 50,
	brake_bias_management UTINYINT NOT NULL DEFAULT 50,
	overtaking_aggression UTINYINT NOT NULL DEFAULT 50,
	defensive_positioning UTINYINT NOT NULL DEFAULT 50,
	dirty_air_tolerance UTINYINT NOT NULL DEFAULT 50,
	spatial_awareness UTINYINT NOT NULL DEFAULT 50,
	first_lap_navigation UTINYINT NOT NULL DEFAULT 50,
	setup_feedback UTINYINT NOT NULL DEFAULT 50,
	tire_preservation UTINYINT NOT NULL DEFAULT 50,
	fuel_ers_management UTINYINT NOT NULL DEFAULT 50,
	strategy_adaptability UTINYINT NOT NULL DEFAULT 50,
	car_preservation UTINYINT NOT NULL DEFAULT 50,
	work_ethic UTINYINT NOT NULL DEFAULT 50,
	pressure_tolerance UTINYINT NOT NULL DEFAULT 50,
	focus UTINYINT NOT NULL DEFAULT 50,
	team_player UTINYINT NOT NULL DEFAULT 50,
	marketability UTINYINT NOT NULL DEFAULT 50,
	CONSTRAINT check_ratings_range CHECK (
		qualifying_pace BETWEEN 1 AND 100 AND pace_consistency BETWEEN 1 AND 100 AND high_speed_courage BETWEEN 1 AND 100 AND throttle_application BETWEEN 1 AND 100 AND grid_launch BETWEEN 1 AND 100 AND
		apex_precision BETWEEN 1 AND 100 AND smoothness BETWEEN 1 AND 100 AND kerb_riding BETWEEN 1 AND 100 AND street_circuit_affinity BETWEEN 1 AND 100 AND wet_weather_control BETWEEN 1 AND 100 AND
		late_braking BETWEEN 1 AND 100 AND brake_trailing BETWEEN 1 AND 100 AND lockup_avoidance BETWEEN 1 AND 100 AND corner_entry_speed BETWEEN 1 AND 100 AND brake_bias_management BETWEEN 1 AND 100 AND
		overtaking_aggression BETWEEN 1 AND 100 AND defensive_positioning BETWEEN 1 AND 100 AND dirty_air_tolerance BETWEEN 1 AND 100 AND spatial_awareness BETWEEN 1 AND 100 AND first_lap_navigation BETWEEN 1 AND 100 AND
		setup_feedback BETWEEN 1 AND 100 AND tire_preservation BETWEEN 1 AND 100 AND fuel_ers_management BETWEEN 1 AND 100 AND strategy_adaptability BETWEEN 1 AND 100 AND car_preservation BETWEEN 1 AND 100 AND
		work_ethic BETWEEN 1 AND 100 AND pressure_tolerance BETWEEN 1 AND 100 AND focus BETWEEN 1 AND 100 AND team_player BETWEEN 1 AND 100 AND marketability BETWEEN 1 AND 100
	)
);
--> statement-breakpoint
CREATE TABLE driver_attribute_history (
	id INTEGER PRIMARY KEY,
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	attribute_name attribute_name_enum NOT NULL,
	old_value UTINYINT NOT NULL,
	new_value UTINYINT NOT NULL,
	change_reason change_reason_enum NOT NULL,
	notes VARCHAR(255),
	CONSTRAINT check_values_range CHECK (old_value BETWEEN 1 AND 100 AND new_value BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX idx_driver_history_lookup ON driver_attribute_history(driver_id, attribute_name);
--> statement-breakpoint
CREATE TABLE team_finances (
	team_id INTEGER PRIMARY KEY REFERENCES teams(id),
	cash_balance BIGINT NOT NULL DEFAULT 0,
	current_cost_cap_spent BIGINT NOT NULL DEFAULT 0,
	max_cost_cap_limit BIGINT NOT NULL DEFAULT 135000000,
	season_id USMALLINT NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_finances_season_sync ON team_finances(team_id, season_id);
--> statement-breakpoint
CREATE TABLE team_transactions (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	category transaction_category_enum NOT NULL,
	amount BIGINT NOT NULL,
	counts_toward_cost_cap BOOLEAN NOT NULL DEFAULT FALSE,
	description VARCHAR(255) NOT NULL,
	CONSTRAINT check_transaction_amount CHECK (amount <> 0)
);
--> statement-breakpoint
CREATE INDEX idx_team_ledger ON team_transactions(team_id, season_id);
--> statement-breakpoint
CREATE INDEX idx_cost_cap_compliance ON team_transactions(team_id, season_id, counts_toward_cost_cap);
--> statement-breakpoint
CREATE TABLE team_sponsor_market_reputation (
	team_id INTEGER PRIMARY KEY REFERENCES teams(id),
	season_id USMALLINT NOT NULL,
	reputation_score UTINYINT NOT NULL DEFAULT 20,
	fanbase_popularity_index UTINYINT NOT NULL DEFAULT 10,
	leverage_coefficient DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
	recent_trend_delta TINYINT NOT NULL DEFAULT 0,
	CONSTRAINT check_reputation_scale CHECK (reputation_score BETWEEN 1 AND 100),
	CONSTRAINT check_popularity_scale CHECK (fanbase_popularity_index BETWEEN 1 AND 100),
	CONSTRAINT check_leverage_bounds CHECK (leverage_coefficient BETWEEN 0.50 AND 2.00)
);
--> statement-breakpoint
CREATE INDEX idx_reputation_market_sync ON team_sponsor_market_reputation(team_id, season_id);
--> statement-breakpoint
CREATE TABLE team_facilities (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	facility_type_id UTINYINT NOT NULL REFERENCES facility_types(id),
	season_id USMALLINT NOT NULL,
	current_level UTINYINT NOT NULL DEFAULT 1,
	facility_condition DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
	is_shut_down BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT unique_team_facility_node UNIQUE (team_id, facility_type_id, season_id),
	CONSTRAINT check_facility_level_floor CHECK (current_level >= 0)
);
--> statement-breakpoint
CREATE INDEX idx_team_active_infrastructure ON team_facilities(team_id, season_id, is_shut_down);
--> statement-breakpoint
CREATE TABLE team_facilities_conditioning (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	facility_type_id UTINYINT NOT NULL REFERENCES facility_types(id),
	season_id USMALLINT NOT NULL,
	operational_efficiency DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
	calibration_index DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
	thermal_load_factor DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
	operating_mode facility_operating_mode_enum NOT NULL DEFAULT 'STANDARD',
	last_calibrated_week UTINYINT NOT NULL DEFAULT 1,
	CONSTRAINT unique_team_facility_conditioning UNIQUE (team_id, facility_type_id, season_id),
	CONSTRAINT check_conditioning_percentages CHECK (
		operational_efficiency BETWEEN 0.00 AND 100.00 AND
		calibration_index BETWEEN 0.00 AND 100.00 AND
		thermal_load_factor BETWEEN 0.00 AND 100.00
	)
);
--> statement-breakpoint
CREATE INDEX idx_facility_efficiency_metrics ON team_facilities_conditioning(team_id, operational_efficiency);
--> statement-breakpoint
CREATE TABLE facility_projects (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	facility_type_id UTINYINT NOT NULL REFERENCES facility_types(id),
	project_type facility_project_type_enum NOT NULL,
	status facility_project_status_enum NOT NULL DEFAULT 'CONSTRUCTING',
	season_id USMALLINT NOT NULL,
	start_week UTINYINT NOT NULL,
	target_level UTINYINT NOT NULL,
	weeks_remaining UTINYINT NOT NULL,
	total_financial_cost BIGINT NOT NULL,
	CONSTRAINT check_project_countdown CHECK (weeks_remaining >= 0)
);
--> statement-breakpoint
CREATE INDEX idx_active_facility_builds ON facility_projects(team_id, status);
--> statement-breakpoint
CREATE TABLE facility_maintenance_ledgers (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	facility_type_id UTINYINT NOT NULL REFERENCES facility_types(id),
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	action_type maintenance_action_enum NOT NULL,
	maintenance_cost BIGINT NOT NULL DEFAULT 0,
	counts_toward_cost_cap BOOLEAN NOT NULL DEFAULT FALSE,
	snapshot_level UTINYINT NOT NULL,
	snapshot_condition DECIMAL(5, 2) NOT NULL,
	CONSTRAINT check_ledger_financials CHECK (maintenance_cost >= 0),
	CONSTRAINT check_snapshot_integrity CHECK (snapshot_condition BETWEEN 0.00 AND 100.00)
);
--> statement-breakpoint
CREATE INDEX idx_facility_audit_history ON facility_maintenance_ledgers(team_id, facility_type_id, season_id);
--> statement-breakpoint
CREATE TABLE car_components (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	component_type car_component_enum NOT NULL,
	season_id USMALLINT NOT NULL,
	performance_rating UTINYINT NOT NULL,
	reliability_rating UTINYINT NOT NULL,
	weight_g UINTEGER NOT NULL,
	current_wear DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
	is_scrapped BOOLEAN NOT NULL DEFAULT FALSE
);
--> statement-breakpoint
CREATE INDEX idx_team_component_inventory ON car_components(team_id, component_type, is_scrapped);
--> statement-breakpoint
CREATE TABLE component_expertise (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	component_type car_component_enum NOT NULL,
	expertise_rating UTINYINT NOT NULL DEFAULT 10,
	max_reliability_cap UTINYINT NOT NULL DEFAULT 60,
	season_id USMALLINT NOT NULL,
	CONSTRAINT unique_team_component_season UNIQUE (team_id, component_type, season_id),
	CONSTRAINT check_expertise_bounds CHECK (
		expertise_rating BETWEEN 1 AND 100 AND max_reliability_cap BETWEEN 1 AND 100
	)
);
--> statement-breakpoint
CREATE INDEX idx_team_engineering_profile ON component_expertise(team_id, season_id);
--> statement-breakpoint
CREATE TABLE component_upgrades (
	id INTEGER PRIMARY KEY,
	component_id INTEGER NOT NULL REFERENCES car_components(id),
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	performance_delta TINYINT NOT NULL DEFAULT 0,
	reliability_delta TINYINT NOT NULL DEFAULT 0,
	weight_delta_g INTEGER NOT NULL DEFAULT 0,
	financial_cost BIGINT NOT NULL DEFAULT 0,
	description VARCHAR(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_component_upgrade_stack ON component_upgrades(component_id);
--> statement-breakpoint
CREATE TABLE development_projects (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	component_type car_component_enum NOT NULL,
	status project_status_enum NOT NULL DEFAULT 'DESIGNING',
	season_id USMALLINT NOT NULL,
	start_week UTINYINT NOT NULL,
	target_weeks UTINYINT NOT NULL,
	allocated_staff_count UTINYINT NOT NULL DEFAULT 1,
	wind_tunnel_hours_spent UTINYINT NOT NULL DEFAULT 0,
	cfd_flops_spent UINTEGER NOT NULL DEFAULT 0,
	financial_cost BIGINT NOT NULL,
	current_progress_points DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
	target_points DECIMAL(7, 2) NOT NULL,
	target_performance_boost UTINYINT NOT NULL DEFAULT 0,
	target_reliability_boost UTINYINT NOT NULL DEFAULT 0,
	CONSTRAINT check_project_durations CHECK (target_weeks > 0),
	CONSTRAINT check_project_points CHECK (target_points > 0.00 AND current_progress_points BETWEEN 0.00 AND target_points),
	CONSTRAINT check_project_boosts CHECK (target_performance_boost >= 0 AND target_reliability_boost >= 0)
);
--> statement-breakpoint
CREATE INDEX idx_active_rd_pipelines ON development_projects(team_id, status);
--> statement-breakpoint
CREATE TABLE cars (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	car_number UTINYINT NOT NULL,
	season_id USMALLINT NOT NULL,
	chassis_name VARCHAR(50) NOT NULL,
	structural_condition DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
	energy_store_soc DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
	chassis_part_id INTEGER NOT NULL REFERENCES car_components(id),
	front_wing_part_id INTEGER NOT NULL REFERENCES car_components(id),
	rear_wing_part_id INTEGER NOT NULL REFERENCES car_components(id),
	underbody_part_id INTEGER NOT NULL REFERENCES car_components(id),
	suspension_part_id INTEGER NOT NULL REFERENCES car_components(id),
	brakes_part_id INTEGER NOT NULL REFERENCES car_components(id),
	engine_part_id INTEGER NOT NULL REFERENCES car_components(id),
	turbocharger_part_id INTEGER NOT NULL REFERENCES car_components(id),
	hybrid_system_part_id INTEGER NOT NULL REFERENCES car_components(id),
	gearbox_part_id INTEGER NOT NULL REFERENCES car_components(id),
	cooling_system_part_id INTEGER NOT NULL REFERENCES car_components(id),
	CONSTRAINT check_car_number CHECK (car_number BETWEEN 1 AND 99),
	CONSTRAINT check_car_integrity CHECK (
		structural_condition BETWEEN 0.00 AND 100.00 AND energy_store_soc BETWEEN 0.00 AND 100.00
	),
	CONSTRAINT unique_team_car_number UNIQUE (team_id, car_number, season_id)
);
--> statement-breakpoint
CREATE INDEX idx_team_garage_cars ON cars(team_id, season_id);
--> statement-breakpoint
CREATE TABLE contracts (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	employee_type employee_type_enum NOT NULL,
	driver_id INTEGER REFERENCES drivers(id),
	staff_id INTEGER REFERENCES personnel(id),
	driver_role driver_role_enum,
	staff_role staff_role_enum,
	start_season USMALLINT NOT NULL,
	end_season USMALLINT NOT NULL,
	base_salary_per_year BIGINT NOT NULL DEFAULT 0,
	signing_bonus BIGINT NOT NULL DEFAULT 0,
	win_bonus BIGINT NOT NULL DEFAULT 0,
	podium_bonus BIGINT NOT NULL DEFAULT 0,
	buyout_clause BIGINT NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	termination_reason contract_termination_enum,
	CONSTRAINT check_employee_entity CHECK (
		(employee_type = 'DRIVER' AND driver_id IS NOT NULL AND staff_id IS NULL AND driver_role IS NOT NULL AND staff_role IS NULL) OR
		(employee_type = 'STAFF' AND staff_id IS NOT NULL AND driver_id IS NULL AND staff_role IS NOT NULL AND driver_role IS NULL)
	),
	CONSTRAINT check_contract_duration CHECK (end_season >= start_season),
	CONSTRAINT check_financial_floors CHECK (
		base_salary_per_year >= 0 AND signing_bonus >= 0 AND
		win_bonus >= 0 AND podium_bonus >= 0 AND buyout_clause >= 0
	)
);
--> statement-breakpoint
CREATE INDEX idx_active_team_contracts ON contracts(team_id, is_active);
--> statement-breakpoint
CREATE INDEX idx_driver_contract_history ON contracts(driver_id);
--> statement-breakpoint
CREATE TABLE team_roster (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	employee_type employee_type_enum NOT NULL,
	driver_id INTEGER REFERENCES drivers(id),
	staff_id INTEGER REFERENCES personnel(id),
	assigned_seat roster_seat_enum NOT NULL,
	season_id USMALLINT NOT NULL,
	CONSTRAINT check_roster_entity CHECK (
		(employee_type = 'DRIVER' AND driver_id IS NOT NULL AND staff_id IS NULL) OR
		(employee_type = 'STAFF' AND staff_id IS NOT NULL AND driver_id IS NULL)
	),
	CONSTRAINT unique_employee_seat_per_season UNIQUE (team_id, assigned_seat, season_id)
);
--> statement-breakpoint
CREATE INDEX idx_active_roster ON team_roster(team_id, season_id);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_driver_current_seat ON team_roster(driver_id, season_id);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_staff_current_seat ON team_roster(staff_id, season_id);
--> statement-breakpoint
CREATE TABLE scouting_reports (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	entity_type scouted_entity_enum NOT NULL,
	entity_id INTEGER NOT NULL,
	observed_attributes JSON NOT NULL,
	confidence_rating UTINYINT NOT NULL DEFAULT 0,
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	CONSTRAINT check_confidence_range CHECK (confidence_rating BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_team_scouting_target ON scouting_reports(team_id, entity_type, entity_id);
--> statement-breakpoint
CREATE TABLE sponsor_tier_values (
	id INTEGER PRIMARY KEY,
	series_id UTINYINT NOT NULL REFERENCES series(id),
	sponsor_tier sponsor_tier_enum NOT NULL,
	upfront_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
	per_race_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
	milestone_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
	max_allowed_upfront BIGINT NOT NULL,
	max_allowed_per_race BIGINT NOT NULL,
	CONSTRAINT unique_matrix_node UNIQUE (series_id, sponsor_tier)
);
--> statement-breakpoint
CREATE INDEX idx_tier_value_lookup ON sponsor_tier_values(series_id);
--> statement-breakpoint
CREATE TABLE team_sponsors (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	sponsor_id INTEGER NOT NULL REFERENCES sponsors(id),
	assigned_slot sponsor_tier_enum NOT NULL,
	start_season_id USMALLINT NOT NULL,
	duration_seasons UTINYINT NOT NULL,
	seasons_remaining UTINYINT NOT NULL,
	actual_per_race_payout BIGINT NOT NULL,
	CONSTRAINT unique_slot_per_team UNIQUE (team_id, assigned_slot),
	CONSTRAINT check_contract_lifespan CHECK (duration_seasons > 0 AND seasons_remaining <= duration_seasons)
);
--> statement-breakpoint
CREATE INDEX idx_team_active_sponsors ON team_sponsors(team_id);
--> statement-breakpoint
CREATE TABLE sponsor_objectives (
	id INTEGER PRIMARY KEY,
	team_id INTEGER NOT NULL REFERENCES teams(id),
	sponsor_id INTEGER NOT NULL REFERENCES sponsors(id),
	season_id USMALLINT NOT NULL,
	objective_type sponsor_objective_type_enum NOT NULL,
	target_threshold UTINYINT NOT NULL,
	is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,
	status objective_status_enum NOT NULL DEFAULT 'PENDING_WEEKEND',
	bonus_payout BIGINT NOT NULL,
	last_evaluated_round UTINYINT,
	streak_count UTINYINT NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX idx_active_sponsor_goals ON sponsor_objectives(team_id, status);
--> statement-breakpoint
CREATE TABLE circuit_weather_profile (
	id INTEGER PRIMARY KEY,
	circuit_id INTEGER NOT NULL REFERENCES circuits(id),
	calendar_season weather_season_enum NOT NULL,
	expected_min_temp_c TINYINT NOT NULL DEFAULT 15,
	expected_max_temp_c TINYINT NOT NULL DEFAULT 35,
	weather_volatility DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
	precipitation_weights JSON NOT NULL,
	wind_profile_config JSON NOT NULL,
	CONSTRAINT unique_circuit_weather_node UNIQUE (circuit_id, calendar_season)
);
--> statement-breakpoint
CREATE INDEX idx_weather_profile_lookup ON circuit_weather_profile(circuit_id);
--> statement-breakpoint
CREATE TABLE calendar_events (
	id INTEGER PRIMARY KEY,
	series_id UTINYINT NOT NULL REFERENCES series(id),
	season_id USMALLINT NOT NULL,
	week_id UTINYINT NOT NULL,
	round_number UTINYINT,
	event_type event_type_enum NOT NULL,
	circuit_id INTEGER REFERENCES circuits(id),
	status event_status_enum NOT NULL DEFAULT 'SCHEDULED',
	scheduled_start_date TIMESTAMP NOT NULL,
	CONSTRAINT check_calendar_weeks CHECK (week_id BETWEEN 1 AND 52),
	CONSTRAINT check_round_context CHECK (
		(event_type = 'RACE_WEEKEND' AND round_number IS NOT NULL AND circuit_id IS NOT NULL) OR
		(event_type != 'RACE_WEEKEND' AND round_number IS NULL)
	)
);
--> statement-breakpoint
CREATE INDEX idx_calendar_timeline ON calendar_events(season_id, week_id, status);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_one_event_per_series_week ON calendar_events(series_id, season_id, week_id);
--> statement-breakpoint
CREATE TABLE series_standings (
	id INTEGER PRIMARY KEY,
	series_id UTINYINT NOT NULL REFERENCES series(id),
	season_id USMALLINT NOT NULL,
	entity_type employee_type_enum NOT NULL,
	driver_id INTEGER REFERENCES drivers(id),
	team_id INTEGER REFERENCES teams(id),
	points INTEGER NOT NULL DEFAULT 0,
	current_rank UTINYINT NOT NULL,
	wins_count UTINYINT NOT NULL DEFAULT 0,
	podiums_count UTINYINT NOT NULL DEFAULT 0,
	poles_count UTINYINT NOT NULL DEFAULT 0,
	CONSTRAINT check_standings_entity CHECK (
		(entity_type = 'DRIVER' AND driver_id IS NOT NULL AND team_id IS NULL) OR
		(entity_type = 'STAFF' AND team_id IS NOT NULL AND driver_id IS NULL)
	),
	CONSTRAINT check_rank_floor CHECK (current_rank > 0)
);
--> statement-breakpoint
CREATE INDEX idx_leaderboard_render ON series_standings(series_id, season_id, entity_type, current_rank);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_unique_standing_entry ON series_standings(
	series_id, season_id, entity_type, COALESCE(driver_id, -1), COALESCE(team_id, -1)
);
--> statement-breakpoint
CREATE TABLE weekend_tire_sets (
	id BIGINT PRIMARY KEY,
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	set_number UTINYINT NOT NULL,
	functional_label tire_compound NOT NULL,
	state tire_availability_state NOT NULL DEFAULT 'FRESH',
	current_wear_percent UTINYINT NOT NULL DEFAULT 0,
	peak_thermal_damage UTINYINT NOT NULL DEFAULT 0,
	CONSTRAINT check_set_index CHECK (set_number >= 1),
	CONSTRAINT check_tyre_wear CHECK (current_wear_percent BETWEEN 0 AND 100),
	CONSTRAINT check_thermal_wear CHECK (peak_thermal_damage BETWEEN 0 AND 100),
	CONSTRAINT unique_driver_tyre_slot UNIQUE (calendar_event_id, driver_id, functional_label, set_number)
);
--> statement-breakpoint
CREATE INDEX idx_tyre_garage_manifest ON weekend_tire_sets(calendar_event_id, driver_id, state);
--> statement-breakpoint
CREATE INDEX idx_tyre_compound_availability ON weekend_tire_sets(calendar_event_id, functional_label, state);
--> statement-breakpoint
CREATE TABLE weekend_penalties (
	id INTEGER PRIMARY KEY,
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	source penalty_source NOT NULL,
	grid_places_drop UTINYINT NOT NULL DEFAULT 0,
	forces_pit_lane_start BOOLEAN NOT NULL DEFAULT FALSE,
	is_applied BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT check_grid_drop CHECK (grid_places_drop <= 100)
);
--> statement-breakpoint
CREATE INDEX idx_unapplied_weekend_penalties ON weekend_penalties(calendar_event_id, is_applied);
--> statement-breakpoint
CREATE TABLE starting_grids (
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	session_type session_type_enum NOT NULL,
	final_grid_position UTINYINT NOT NULL,
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	is_pit_lane_start BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT check_grid_slot CHECK (final_grid_position >= 1),
	PRIMARY KEY (calendar_event_id, session_type, final_grid_position),
	CONSTRAINT unique_driver_grid_slot UNIQUE (calendar_event_id, session_type, driver_id)
);
--> statement-breakpoint
CREATE INDEX idx_resolved_grid_formation ON starting_grids(calendar_event_id, session_type);
--> statement-breakpoint
CREATE TABLE session_incidents (
	id BIGINT PRIMARY KEY,
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	session_type session_type_enum NOT NULL,
	lap_number UTINYINT NOT NULL,
	severity incident_severity NOT NULL,
	laps_cleared UTINYINT NOT NULL DEFAULT 0,
	primary_driver_id INTEGER NOT NULL REFERENCES drivers(id),
	secondary_driver_id INTEGER REFERENCES drivers(id),
	ui_description VARCHAR(150) NOT NULL,
	CONSTRAINT check_incident_lap CHECK (lap_number >= 1)
);
--> statement-breakpoint
CREATE INDEX idx_live_session_incidents ON session_incidents(calendar_event_id, session_type, lap_number);
--> statement-breakpoint
CREATE INDEX idx_driver_incident_history ON session_incidents(primary_driver_id);
--> statement-breakpoint
CREATE TABLE session_results (
	id INTEGER PRIMARY KEY,
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	session_type session_type_enum NOT NULL,
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	team_id INTEGER NOT NULL REFERENCES teams(id),
	starting_position UTINYINT NOT NULL,
	finishing_position UTINYINT NOT NULL,
	total_time_seconds DOUBLE,
	gap_to_leader_seconds DOUBLE,
	points_earned UTINYINT NOT NULL DEFAULT 0,
	has_fastest_lap BOOLEAN NOT NULL DEFAULT FALSE,
	retirement_status session_retirement_reason NOT NULL DEFAULT 'FINISHED',
	CONSTRAINT check_starting_box CHECK (starting_position >= 1),
	CONSTRAINT check_finishing_rank CHECK (finishing_position >= 1),
	CONSTRAINT unique_driver_session_result UNIQUE (calendar_event_id, session_type, driver_id)
);
--> statement-breakpoint
CREATE INDEX idx_results_leaderboards ON session_results(calendar_event_id, session_type, finishing_position);
--> statement-breakpoint
CREATE INDEX idx_results_driver_career ON session_results(driver_id, points_earned);
--> statement-breakpoint
CREATE INDEX idx_results_team_championship ON session_results(team_id, points_earned);
--> statement-breakpoint
CREATE TABLE lap_telemetry_logs (
	id BIGINT PRIMARY KEY,
	calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id),
	session_type session_type_enum NOT NULL,
	driver_id INTEGER NOT NULL REFERENCES drivers(id),
	lap_number UTINYINT NOT NULL,
	lap_time_seconds FLOAT NOT NULL,
	position_on_lap UTINYINT NOT NULL,
	compound_used tire_compound NOT NULL,
	actual_physical_core physical_compound_type NOT NULL,
	tire_age_laps UTINYINT NOT NULL,
	tire_health_percent UTINYINT NOT NULL,
	fuel_remaining_kg FLOAT NOT NULL,
	ers_deployed_percent UTINYINT NOT NULL,
	track_water_depth UTINYINT NOT NULL,
	active_track_status incident_severity,
	is_pit_lap BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT check_lap_position CHECK (position_on_lap >= 1),
	CONSTRAINT check_percentages CHECK (
		tire_health_percent BETWEEN 0 AND 100 AND
		ers_deployed_percent BETWEEN 0 AND 100 AND
		track_water_depth BETWEEN 0 AND 100
	),
	CONSTRAINT unique_driver_lap UNIQUE (calendar_event_id, session_type, driver_id, lap_number)
);
--> statement-breakpoint
CREATE INDEX idx_telemetry_race_pace ON lap_telemetry_logs(calendar_event_id, session_type, lap_number);
--> statement-breakpoint
CREATE INDEX idx_telemetry_driver_stints ON lap_telemetry_logs(calendar_event_id, driver_id);
--> statement-breakpoint
CREATE INDEX idx_telemetry_compound_degradation ON lap_telemetry_logs(actual_physical_core, tire_health_percent);
--> statement-breakpoint
INSERT INTO series (
	id, name, short_name, tier_level, total_rounds, promotion_slots, relegation_slots,
	base_entry_fee, season_prize_pool, technical_regulations, points_system_matrix
) VALUES (
	1, 'Formula Premier', 'FP1', 1, 10, 0, 0, 0, 100000000,
	'{"CHASSIS":"OPEN_DEVELOPMENT","ENGINE":"OPEN_DEVELOPMENT"}',
	'{"finishing_points":[25,18,15,12,10,8,6,4,2,1],"fastest_lap_bonus":1,"pole_position_bonus":0}'
);
