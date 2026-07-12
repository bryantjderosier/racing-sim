CREATE TYPE "ai_archetype" AS ENUM('aggressive_spender', 'long_term_builder', 'pragmatic_pivot');--> statement-breakpoint
CREATE TYPE "combat_order" AS ENUM('hold_traffic', 'do_not_fight_teammate', 'aggressive_overtake', 'defend_position', 'swap_positions');--> statement-breakpoint
CREATE TYPE "cost_cap_breach" AS ENUM('none', 'minor', 'major');--> statement-breakpoint
CREATE TYPE "energy_directive" AS ENUM('harvest', 'balanced', 'overtake');--> statement-breakpoint
CREATE TYPE "entity_type" AS ENUM('driver', 'staff', 'team');--> statement-breakpoint
CREATE TYPE "facility_type" AS ENUM('wind_tunnel', 'cfd_lab', 'design_studio', 'weather_hub', 'scouting_hq', 'logistics_hub', 'simulator', 'fitness_center', 'staff_academy', 'foundry', 'rig_testing', 'powertrain_factory');--> statement-breakpoint
CREATE TYPE "knowledge_trim_type" AS ENUM('qualifying_trim', 'race_trim', 'compound_knowledge', 'wet_weather_trim');--> statement-breakpoint
CREATE TYPE "ledger_transaction_type" AS ENUM('sponsor_payout', 'sponsor_bonus', 'prize_money', 'part_fabrication', 'rd_testing', 'salary', 'staff_salary', 'buyout_fee', 'engine_lease', 'engine_supply_fee', 'facility_construction', 'freight_travel', 'marketing', 'fine', 'emergency_procurement', 'hospitality');--> statement-breakpoint
CREATE TYPE "manufacturing_status" AS ENUM('queued', 'fabricating', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "pace_directive" AS ENUM('conserve', 'balanced', 'push', 'maximum');--> statement-breakpoint
CREATE TYPE "part_flaw_type" AS ENUM('pitch_sensitivity', 'dirty_air_collapse', 'curb_fragility', 'thermal_tire_spike');--> statement-breakpoint
CREATE TYPE "part_slot" AS ENUM('front_wing', 'rear_wing', 'underfloor', 'sidepods', 'power_unit', 'gearbox', 'suspension');--> statement-breakpoint
CREATE TYPE "pit_error_type" AS ENUM('none', 'jammed_wheel_nut', 'cross_threaded_hub', 'unsafe_release');--> statement-breakpoint
CREATE TYPE "points_scheme_id" AS ENUM('classic', 'top_8', 'flat_field', 'win_heavy', 'double_points_finale', 'sprint_weekend', 'fastest_lap_pole_bonus', 'all_finishers');--> statement-breakpoint
CREATE TYPE "potential_tier" AS ENUM('bronze', 'silver', 'gold', 'elite');--> statement-breakpoint
CREATE TYPE "race_result_status" AS ENUM('finished', 'dnf', 'dsq', 'dns', 'retired');--> statement-breakpoint
CREATE TYPE "r_and_d_focus" AS ENUM('current_car', 'next_year');--> statement-breakpoint
CREATE TYPE "regulation_impact" AS ENUM('minor_tweak', 'major_overhaul', 'category_ban');--> statement-breakpoint
CREATE TYPE "safety_car_state" AS ENUM('none', 'vsc', 'safety_car');--> statement-breakpoint
CREATE TYPE "session_type" AS ENUM('practice', 'qualifying_q1', 'qualifying_q2', 'qualifying_q3', 'qualifying_single', 'race');--> statement-breakpoint
CREATE TYPE "sponsor_payout_type" AS ENUM('upfront', 'per_race', 'bonus');--> statement-breakpoint
CREATE TYPE "sponsor_slot_type" AS ENUM('title', 'major', 'minor');--> statement-breakpoint
CREATE TYPE "staff_role" AS ENUM('aero', 'mechanical', 'powertrain', 'race_engineer', 'scout', 'pit_crew');--> statement-breakpoint
CREATE TYPE "team_status" AS ENUM('ACTIVE', 'DEFUNCT', 'UNMANAGED_AI', 'PLAYER_MANAGED');--> statement-breakpoint
CREATE TYPE "tire_compound" AS ENUM('soft', 'medium', 'hard', 'intermediate', 'wet');--> statement-breakpoint
CREATE TYPE "track_moisture" AS ENUM('dry', 'damp', 'wet', 'flooded');--> statement-breakpoint
CREATE TABLE "ai_team_profiles" (
	"team_id" integer PRIMARY KEY NOT NULL,
	"archetype" "ai_archetype" NOT NULL,
	"r_and_d_focus_bias" double precision NOT NULL,
	"facility_investment_rate" double precision NOT NULL,
	"cost_cap_risk_tolerance" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"attr_name" text NOT NULL,
	"current_value" integer NOT NULL,
	"ceiling" integer NOT NULL,
	CONSTRAINT "attributes_entity_attr" UNIQUE("entity_id","entity_type","attr_name")
);
--> statement-breakpoint
CREATE TABLE "blueprint_flaws" (
	"id" integer PRIMARY KEY NOT NULL,
	"blueprint_id" integer NOT NULL,
	"flaw_type" "part_flaw_type" NOT NULL,
	"severity" double precision NOT NULL,
	"is_revealed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprints" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"slot" "part_slot" NOT NULL,
	"name" text NOT NULL,
	"performance_points" integer NOT NULL,
	"performance_known_min" integer,
	"performance_known_max" integer,
	"scout_confidence" integer DEFAULT 0 NOT NULL,
	"base_reliability" integer NOT NULL,
	"pitch_sensitivity" double precision DEFAULT 0 NOT NULL,
	"drag_coefficient" double precision DEFAULT 0 NOT NULL,
	"weight_kg" double precision,
	"season_year" integer NOT NULL,
	"is_invalidated" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_setup_snapshots" (
	"id" integer PRIMARY KEY NOT NULL,
	"race_event_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"front_wing_id" integer,
	"rear_wing_id" integer,
	"underfloor_id" integer,
	"sidepods_id" integer,
	"front_wing_angle" double precision,
	"rear_wing_angle" double precision,
	"front_arb" integer,
	"rear_arb" integer,
	"front_ride_height_mm" double precision,
	"rear_ride_height_mm" double precision,
	"front_camber" double precision,
	"rear_camber" double precision,
	"front_toe" double precision,
	"rear_toe" double precision,
	"brake_bias" double precision,
	"downforce_level" double precision,
	"drag_level" double precision,
	"mechanical_balance" double precision
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"car_number" integer NOT NULL,
	"power_unit_id" integer,
	CONSTRAINT "cars_team_number" UNIQUE("team_id","car_number")
);
--> statement-breakpoint
CREATE TABLE "championship_standings" (
	"id" integer PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"division" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"team_id" integer,
	"points" integer DEFAULT 0 NOT NULL,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"team_id" integer NOT NULL,
	"salary_annual" double precision NOT NULL,
	"years_remaining" integer NOT NULL,
	"buyout_fee" double precision DEFAULT 0 NOT NULL,
	"release_clause" double precision,
	"performance_bonus" double precision,
	"is_number_one" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nationality_code" text NOT NULL,
	"birthplace" text NOT NULL,
	"age" integer NOT NULL,
	"team_id" integer,
	"car_id" integer,
	"is_karting" boolean DEFAULT false NOT NULL,
	"potential_tier" "potential_tier",
	"injury_proneness" double precision NOT NULL,
	"longevity" integer NOT NULL,
	"morale" double precision DEFAULT 50 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"facility_type" "facility_type" NOT NULL,
	"tier" integer DEFAULT 0 NOT NULL,
	"condition_pct" double precision DEFAULT 100 NOT NULL,
	"construction_finish_date" integer,
	"is_under_construction" boolean DEFAULT false NOT NULL,
	"operational_cost_annual" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "facilities_team_type" UNIQUE("team_id","facility_type")
);
--> statement-breakpoint
CREATE TABLE "financial_ledger" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"transaction_type" "ledger_transaction_type" NOT NULL,
	"is_cost_cap_applicable" boolean NOT NULL,
	"season_index" integer NOT NULL,
	"timestamp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freight_inventory" (
	"id" integer PRIMARY KEY NOT NULL,
	"race_event_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"is_spare" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lap_data" (
	"id" integer PRIMARY KEY NOT NULL,
	"race_event_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"lap_number" integer NOT NULL,
	"lap_time_ms" integer NOT NULL,
	"sector_1_ms" integer,
	"sector_2_ms" integer,
	"sector_3_ms" integer,
	"tire_compound" "tire_compound",
	"tire_wear_delta" double precision,
	"tire_core_temp" double precision,
	"pace_directive" "pace_directive",
	"energy_directive" "energy_directive",
	"fuel_remaining_kg" double precision
);
--> statement-breakpoint
CREATE TABLE "manufacturing_queue" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"blueprint_id" integer NOT NULL,
	"is_lightweight" boolean DEFAULT false NOT NULL,
	"completion_date" integer NOT NULL,
	"status" "manufacturing_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" integer PRIMARY KEY NOT NULL,
	"blueprint_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"slot" "part_slot" NOT NULL,
	"current_reliability" double precision NOT NULL,
	"max_condition_ceiling" double precision NOT NULL,
	"weight_kg" double precision NOT NULL,
	"is_lightweight" boolean DEFAULT false NOT NULL,
	"is_scrapped" boolean DEFAULT false NOT NULL,
	"mounted_on_car_id" integer
);
--> statement-breakpoint
CREATE TABLE "points_scheme_rows" (
	"scheme_id" "points_scheme_id" NOT NULL,
	"finishing_position" integer NOT NULL,
	"points" integer NOT NULL,
	CONSTRAINT "points_scheme_rows_pk" PRIMARY KEY("scheme_id","finishing_position")
);
--> statement-breakpoint
CREATE TABLE "race_events" (
	"id" integer PRIMARY KEY NOT NULL,
	"calendar_id" integer NOT NULL,
	"track_id" integer NOT NULL,
	"session_type" "session_type" NOT NULL,
	"ambient_temp_c" double precision,
	"track_temp_c" double precision,
	"moisture" "track_moisture" DEFAULT 'dry' NOT NULL,
	"safety_car_state" "safety_car_state" DEFAULT 'none' NOT NULL,
	"track_grip_multiplier" double precision DEFAULT 1 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_results" (
	"id" integer PRIMARY KEY NOT NULL,
	"race_event_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"finishing_position" integer NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"grid_position" integer,
	"status" "race_result_status"
);
--> statement-breakpoint
CREATE TABLE "rd_projects" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"slot" "part_slot" NOT NULL,
	"focus" "r_and_d_focus" NOT NULL,
	"progress" double precision DEFAULT 0 NOT NULL,
	"allocated_wt_hours" double precision DEFAULT 0 NOT NULL,
	"allocated_cfd_hours" double precision DEFAULT 0 NOT NULL,
	"lead_designer_id" integer,
	"resulting_blueprint_id" integer,
	"status" "manufacturing_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulation_votes" (
	"id" integer PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"proposal_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"vote_for" boolean NOT NULL,
	"political_capital_spent" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_history" (
	"id" integer PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"rule_description" text NOT NULL,
	"impact_type" "regulation_impact" NOT NULL,
	"affected_slot" "part_slot",
	"performance_penalty_pct" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scouting_reports" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"confidence_level" integer DEFAULT 0 NOT NULL,
	"last_scout_date" integer
);
--> statement-breakpoint
CREATE TABLE "season_calendar" (
	"id" integer PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"race_index" integer NOT NULL,
	"track_id" integer NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "season_calendar_year_index" UNIQUE("season_year","race_index")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"season_year" integer NOT NULL,
	"division" integer NOT NULL,
	"points_scheme" "points_scheme_id" DEFAULT 'classic' NOT NULL,
	"rd_pivot_race_index" integer DEFAULT 11 NOT NULL,
	"rd_pivot_locked" boolean DEFAULT false NOT NULL,
	"wt_hours_weekly_cap" double precision NOT NULL,
	"cfd_hours_weekly_cap" double precision NOT NULL,
	CONSTRAINT "seasons_pk" PRIMARY KEY("season_year","division")
);
--> statement-breakpoint
CREATE TABLE "session_knowledge" (
	"id" integer PRIMARY KEY NOT NULL,
	"race_event_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"trim_type" "knowledge_trim_type" NOT NULL,
	"tire_compound" "tire_compound",
	"tier" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "session_knowledge_unique" UNIQUE("race_event_id","team_id","driver_id","trim_type","tire_compound")
);
--> statement-breakpoint
CREATE TABLE "sponsor_contracts" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"slot_type" "sponsor_slot_type" NOT NULL,
	"payout_type" "sponsor_payout_type" NOT NULL,
	"amount" double precision NOT NULL,
	"bonus_target_position" integer,
	"remaining_races" integer,
	"years_remaining" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nationality_code" text,
	"min_marketability" integer DEFAULT 0 NOT NULL,
	"min_team_standing" integer,
	"ethics_sensitivity" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nationality_code" text NOT NULL,
	"birthplace" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"team_id" integer,
	"assigned_driver_id" integer,
	"is_scouted" boolean DEFAULT false NOT NULL,
	"morale" double precision DEFAULT 50 NOT NULL,
	"ego" double precision DEFAULT 50 NOT NULL,
	"loyalty" double precision DEFAULT 50 NOT NULL,
	"fatigue_pct" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"power_ceiling" double precision NOT NULL,
	"annual_lease_fee" double precision NOT NULL,
	"is_works" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"nationality_code" text,
	"primary_color" text DEFAULT '#FFFFFF' NOT NULL,
	"secondary_color" text DEFAULT '#000000' NOT NULL,
	"status" "team_status" DEFAULT 'UNMANAGED_AI' NOT NULL,
	"liquid_cash" double precision NOT NULL,
	"cost_cap_limit" double precision NOT NULL,
	"cost_cap_spent" double precision DEFAULT 0 NOT NULL,
	"engine_supplier_id" integer,
	"division" integer NOT NULL,
	"constructors_standing" integer,
	"reputation" double precision DEFAULT 50 NOT NULL,
	"rd_pivot_current" double precision DEFAULT 1 NOT NULL,
	"wt_hours_remaining" double precision DEFAULT 0 NOT NULL,
	"cfd_hours_remaining" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nationality_code" text,
	"length_km" double precision,
	"sector_count" integer DEFAULT 3 NOT NULL,
	"aero_efficiency_weight" double precision NOT NULL,
	"mechanical_grip_weight" double precision NOT NULL,
	"tire_abrasion_factor" double precision NOT NULL,
	"pit_loss_seconds" double precision,
	"base_grip" double precision DEFAULT 0.95 NOT NULL,
	"max_grip" double precision DEFAULT 1.02 NOT NULL,
	"climate_rain_probability" double precision DEFAULT 0.15 NOT NULL
);
