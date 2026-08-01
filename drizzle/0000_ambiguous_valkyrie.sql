CREATE TABLE `car_setup` (
	`id` text PRIMARY KEY NOT NULL,
	`event_entry_id` text NOT NULL,
	`weekend_session_id` text,
	`front_wing_angle` real NOT NULL,
	`rear_wing_angle` real NOT NULL,
	`ride_height_front_mm` real NOT NULL,
	`ride_height_rear_mm` real NOT NULL,
	`suspension_stiffness` real NOT NULL,
	`brake_bias_percent` real NOT NULL,
	`diff_coast` real NOT NULL,
	`diff_power` real NOT NULL,
	`team_setup_knowledge` integer NOT NULL,
	FOREIGN KEY (`event_entry_id`) REFERENCES `event_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `car_setup_event_entry_idx` ON `car_setup` (`event_entry_id`,`weekend_session_id`);--> statement-breakpoint
CREATE TABLE `championship` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`display_name` text NOT NULL,
	`short_code` text NOT NULL,
	`ladder_rank` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_code_unique` ON `championship` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `championship_short_code_unique` ON `championship` (`short_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `championship_ladder_rank_unique` ON `championship` (`ladder_rank`);--> statement-breakpoint
CREATE TABLE `championship_event` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_season_id` text NOT NULL,
	`circuit_layout_version_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`start_date` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`circuit_layout_version_id`) REFERENCES `circuit_layout_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_event_round_unique` ON `championship_event` (`championship_season_id`,`round_number`);--> statement-breakpoint
CREATE TABLE `championship_season` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_id` text NOT NULL,
	`season_year` integer NOT NULL,
	`ruleset_id` text NOT NULL,
	FOREIGN KEY (`championship_id`) REFERENCES `championship`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruleset_id`) REFERENCES `championship_season_ruleset`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_season_year_unique` ON `championship_season` (`championship_id`,`season_year`);--> statement-breakpoint
CREATE TABLE `championship_season_ruleset` (
	`id` text PRIMARY KEY NOT NULL,
	`entries_per_team` integer NOT NULL,
	`weekend_format_template_id` text NOT NULL,
	`refueling_enabled` integer NOT NULL,
	`ers_enabled` integer NOT NULL,
	`drs_enabled` integer NOT NULL,
	`constructor_conversion_allowed` integer NOT NULL,
	`age_cap_max` integer,
	`personnel_limits_payload` text NOT NULL,
	`personnel_limits_schema_version` text NOT NULL,
	`testing_limits_payload` text NOT NULL,
	`testing_limits_schema_version` text NOT NULL,
	`race_distance_rule_payload` text NOT NULL,
	`race_distance_rule_schema_version` text NOT NULL,
	FOREIGN KEY (`weekend_format_template_id`) REFERENCES `weekend_format_template`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chassis_instance` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`chassis_design_version_id` text NOT NULL,
	`serial_number` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chassis_design_version_id`) REFERENCES `part_design_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chassis_instance_serial_unique` ON `chassis_instance` (`serial_number`);--> statement-breakpoint
CREATE TABLE `circuit` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`nation_id` text,
	`timezone` text NOT NULL,
	`first_appearance_year` integer NOT NULL,
	FOREIGN KEY (`nation_id`) REFERENCES `nationality`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `circuit_short_name_unique` ON `circuit` (`short_name`);--> statement-breakpoint
CREATE TABLE `circuit_layout_version` (
	`id` text PRIMARY KEY NOT NULL,
	`circuit_id` text NOT NULL,
	`version_label` text NOT NULL,
	`effective_from_year` integer NOT NULL,
	`length_km` real NOT NULL,
	`type` text NOT NULL,
	`overtaking_difficulty` integer NOT NULL,
	`abrasion` integer NOT NULL,
	`downforce_importance` integer NOT NULL,
	`power_importance` integer NOT NULL,
	`braking_demand` integer NOT NULL,
	`traction_demand` integer NOT NULL,
	`elevation_change` integer NOT NULL,
	`wall_proximity` integer NOT NULL,
	`cooling_demand` integer NOT NULL,
	`grip_baseline` real NOT NULL,
	`pit_loss_seconds` real NOT NULL,
	`pit_lane_speed_factor` real NOT NULL,
	`safety_car_likelihood` real NOT NULL,
	`vsc_likelihood` real NOT NULL,
	`qualifying_lap_delta_sensitivity` real NOT NULL,
	`fuel_consumption_modifier` real NOT NULL,
	`ers_harvest_modifier` real NOT NULL,
	`top_speed_zone_factor` real NOT NULL,
	`corner_count` integer NOT NULL,
	`possible_drs_zone_count` integer NOT NULL,
	`sectors_payload` text NOT NULL,
	`waypoints_payload` text NOT NULL,
	`marshal_zones_payload` text NOT NULL,
	`climate_profile_payload` text NOT NULL,
	`geometry_schema_version` text NOT NULL,
	`climate_profile_schema_version` text NOT NULL,
	FOREIGN KEY (`circuit_id`) REFERENCES `circuit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `circuit_layout_version_unique` ON `circuit_layout_version` (`circuit_id`,`version_label`);--> statement-breakpoint
CREATE TABLE `driver` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`display_name` text,
	`date_of_birth` text NOT NULL,
	`nationality_id` text NOT NULL,
	`portrait_id` text NOT NULL,
	`biography_seed` text NOT NULL,
	`preferred_number` integer,
	`career_start_year` integer NOT NULL,
	`retired_at` text,
	`reputation` integer NOT NULL,
	`ambition` integer NOT NULL,
	`loyalty` integer NOT NULL,
	`temperament` integer NOT NULL,
	`leadership` integer NOT NULL,
	`media_handling` integer NOT NULL,
	`development_rate` integer NOT NULL,
	`peak_age_start` integer NOT NULL,
	`peak_age_end` integer NOT NULL,
	`decline_rate` integer NOT NULL,
	`pace` integer NOT NULL,
	`race_craft` integer NOT NULL,
	`consistency` integer NOT NULL,
	`tyre_management` integer NOT NULL,
	`fuel_management` integer NOT NULL,
	`ers_management` integer NOT NULL,
	`wet_pace` integer NOT NULL,
	`qualifying_pace` integer NOT NULL,
	`starts` integer NOT NULL,
	`focus` integer NOT NULL,
	`feedback` integer NOT NULL,
	`adaptability` integer NOT NULL,
	`aggression` integer NOT NULL,
	`composure` integer NOT NULL,
	`pace_potential` integer NOT NULL,
	`race_craft_potential` integer NOT NULL,
	`consistency_potential` integer NOT NULL,
	`tyre_management_potential` integer NOT NULL,
	`fuel_management_potential` integer NOT NULL,
	`ers_management_potential` integer NOT NULL,
	`wet_pace_potential` integer NOT NULL,
	`qualifying_pace_potential` integer NOT NULL,
	`starts_potential` integer NOT NULL,
	`focus_potential` integer NOT NULL,
	`feedback_potential` integer NOT NULL,
	`adaptability_potential` integer NOT NULL,
	`aggression_potential` integer NOT NULL,
	`composure_potential` integer NOT NULL,
	FOREIGN KEY (`nationality_id`) REFERENCES `nationality`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `driver_nationality_idx` ON `driver` (`nationality_id`);--> statement-breakpoint
CREATE TABLE `driver_championship_experience` (
	`driver_id` text NOT NULL,
	`championship_id` text NOT NULL,
	`starts` integer NOT NULL,
	`wins` integer NOT NULL,
	`podiums` integer NOT NULL,
	`championships` integer NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`championship_id`) REFERENCES `championship`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_championship_experience_unique` ON `driver_championship_experience` (`driver_id`,`championship_id`);--> statement-breakpoint
CREATE TABLE `driver_contract` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`team_id` text,
	`off_screen_series_id` text,
	`is_virtual_off_screen` integer NOT NULL,
	`wage_per_year_minor` integer NOT NULL,
	`signing_bonus_minor` integer NOT NULL,
	`break_clause_fee_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`terminated_date` text,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `driver_contract_driver_dates_idx` ON `driver_contract` (`driver_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `driver_contract_bonus` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`bonus_type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`trigger_payload` text NOT NULL,
	`trigger_schema_version` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `driver_contract`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `driver_contract_bonus_contract_idx` ON `driver_contract_bonus` (`contract_id`);--> statement-breakpoint
CREATE TABLE `driver_health` (
	`driver_id` text PRIMARY KEY NOT NULL,
	`injury_severity` text NOT NULL,
	`injury_days_remaining` integer NOT NULL,
	`fatigue` integer NOT NULL,
	`morale` integer NOT NULL,
	`form` integer NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "driver_health_fatigue_check" CHECK("driver_health"."fatigue" BETWEEN 0 AND 100),
	CONSTRAINT "driver_health_morale_check" CHECK("driver_health"."morale" BETWEEN 0 AND 100),
	CONSTRAINT "driver_health_form_check" CHECK("driver_health"."form" BETWEEN -10 AND 10)
);
--> statement-breakpoint
CREATE TABLE `driver_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`other_driver_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`value` integer NOT NULL,
	`effective_date` text NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`other_driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_relationship_pair_unique` ON `driver_relationship` (`driver_id`,`other_driver_id`);--> statement-breakpoint
CREATE TABLE `event_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_event_id` text NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`chassis_instance_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`car_number` integer NOT NULL,
	`baseline_resolved_snapshot_id` text,
	FOREIGN KEY (`championship_event_id`) REFERENCES `championship_event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chassis_instance_id`) REFERENCES `chassis_instance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`baseline_resolved_snapshot_id`) REFERENCES `resolved_performance_snapshot`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_entry_team_number_unique` ON `event_entry` (`championship_event_id`,`team_season_entry_id`,`car_number`);--> statement-breakpoint
CREATE TABLE `event_session_definition` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_event_id` text NOT NULL,
	`source_slot_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`session_kind` text NOT NULL,
	`scheduled_start` text NOT NULL,
	`scheduled_laps` integer,
	`scheduled_minutes` integer,
	`drs_enabled_override` integer,
	`grid_source_session_definition_id` text,
	`reverse_grid_count` integer NOT NULL,
	`mandatory_pit_stops` integer NOT NULL,
	`required_compound_rule_id` text,
	`points_system_id` text,
	`fastest_lap_point_eligible` integer NOT NULL,
	`parc_ferme_from_previous` integer NOT NULL,
	FOREIGN KEY (`championship_event_id`) REFERENCES `championship_event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_slot_id`) REFERENCES `weekend_format_session_slot`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grid_source_session_definition_id`) REFERENCES `event_session_definition`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`required_compound_rule_id`) REFERENCES `required_compound_rule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`points_system_id`) REFERENCES `points_system`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_session_definition_sequence_unique` ON `event_session_definition` (`championship_event_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `event_tyre_allocation` (
	`id` text PRIMARY KEY NOT NULL,
	`event_entry_id` text NOT NULL,
	`tyre_compound_spec_id` text NOT NULL,
	`sets_entitled` integer NOT NULL,
	FOREIGN KEY (`event_entry_id`) REFERENCES `event_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tyre_compound_spec_id`) REFERENCES `tyre_compound_spec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_tyre_allocation_unique` ON `event_tyre_allocation` (`event_entry_id`,`tyre_compound_spec_id`);--> statement-breakpoint
CREATE TABLE `layout_record` (
	`id` text PRIMARY KEY NOT NULL,
	`circuit_layout_version_id` text NOT NULL,
	`championship_id` text NOT NULL,
	`session_kind` text NOT NULL,
	`lap_time_ms` integer NOT NULL,
	`driver_id` text NOT NULL,
	`season_year` integer NOT NULL,
	FOREIGN KEY (`circuit_layout_version_id`) REFERENCES `circuit_layout_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`championship_id`) REFERENCES `championship`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `layout_record_lookup_idx` ON `layout_record` (`circuit_layout_version_id`,`championship_id`,`season_year`);--> statement-breakpoint
CREATE TABLE `license_point_award` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`points` real NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`awarded_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `license_point_award_driver_idx` ON `license_point_award` (`driver_id`,`awarded_at`);--> statement-breakpoint
CREATE TABLE `nationality` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nationality_code_unique` ON `nationality` (`code`);--> statement-breakpoint
CREATE TABLE `part_design_version` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`part_category` text NOT NULL,
	`version` integer NOT NULL,
	`formula_version` text NOT NULL,
	`inputs_hash` text NOT NULL,
	`performance_payload` text NOT NULL,
	`performance_schema_version` text NOT NULL,
	`reliability_payload` text NOT NULL,
	`reliability_schema_version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `part_design_version_team_category_version_unique` ON `part_design_version` (`team_id`,`part_category`,`version`);--> statement-breakpoint
CREATE TABLE `part_installation` (
	`id` text PRIMARY KEY NOT NULL,
	`part_instance_id` text NOT NULL,
	`chassis_instance_id` text NOT NULL,
	`slot` text NOT NULL,
	`installed_at` text NOT NULL,
	`removed_at` text,
	FOREIGN KEY (`part_instance_id`) REFERENCES `part_instance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chassis_instance_id`) REFERENCES `chassis_instance`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `part_installation_chassis_dates_idx` ON `part_installation` (`chassis_instance_id`,`installed_at`,`removed_at`);--> statement-breakpoint
CREATE TABLE `part_instance` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`part_design_version_id` text NOT NULL,
	`serial_number` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`part_design_version_id`) REFERENCES `part_design_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `part_instance_serial_unique` ON `part_instance` (`serial_number`);--> statement-breakpoint
CREATE TABLE `points_system` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` integer NOT NULL,
	`pole_points` real NOT NULL,
	`fastest_lap_points` real NOT NULL,
	`fastest_lap_min_finish_position` integer,
	`fastest_lap_requires_classified` integer NOT NULL,
	`shortened_race_allocation_mode` text NOT NULL,
	`shortened_race_distance_pct_threshold` real,
	`classification_require_pct_distance` real,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `points_system_code_version_unique` ON `points_system` (`code`,`version`);--> statement-breakpoint
CREATE TABLE `points_system_place_point` (
	`points_system_id` text NOT NULL,
	`position` integer NOT NULL,
	`points` real NOT NULL,
	FOREIGN KEY (`points_system_id`) REFERENCES `points_system`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `points_system_place_point_unique` ON `points_system_place_point` (`points_system_id`,`position`);--> statement-breakpoint
CREATE TABLE `race_result_detail` (
	`session_result_id` text PRIMARY KEY NOT NULL,
	`pit_stops` integer NOT NULL,
	`laps_led` integer NOT NULL,
	`retirement_reason` text,
	`positions_gained` integer NOT NULL,
	FOREIGN KEY (`session_result_id`) REFERENCES `session_result`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `required_compound_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`payload_schema_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `required_compound_rule_code_version_unique` ON `required_compound_rule` (`code`,`version`);--> statement-breakpoint
CREATE TABLE `resolved_performance_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`ruleset_id` text NOT NULL,
	`formula_version` text NOT NULL,
	`inputs_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`top_speed` real NOT NULL,
	`acceleration` real NOT NULL,
	`cornering_high` real NOT NULL,
	`cornering_low` real NOT NULL,
	`braking_stability` real NOT NULL,
	`drag` real NOT NULL,
	`cooling_efficiency` real NOT NULL,
	`fuel_efficiency` real NOT NULL,
	`ers_deploy_power` real NOT NULL,
	`ers_harvest_efficiency` real NOT NULL,
	`ers_battery_capacity` real NOT NULL,
	`reliability_overall` integer NOT NULL,
	`dry_weight_kg` real NOT NULL,
	FOREIGN KEY (`ruleset_id`) REFERENCES `championship_season_ruleset`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `resolved_performance_snapshot_ruleset_idx` ON `resolved_performance_snapshot` (`ruleset_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ruleset_part_category_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`ruleset_id` text NOT NULL,
	`part_category` text NOT NULL,
	`participant_status` text NOT NULL,
	`procurement_mode` text NOT NULL,
	`upgrade_mode` text NOT NULL,
	FOREIGN KEY (`ruleset_id`) REFERENCES `championship_season_ruleset`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ruleset_part_category_rule_scope_unique` ON `ruleset_part_category_rule` (`ruleset_id`,`part_category`,`participant_status`);--> statement-breakpoint
CREATE TABLE `ruleset_supply_contract_tier` (
	`ruleset_id` text NOT NULL,
	`tier` text NOT NULL,
	FOREIGN KEY (`ruleset_id`) REFERENCES `championship_season_ruleset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ruleset_supply_contract_tier_unique` ON `ruleset_supply_contract_tier` (`ruleset_id`,`tier`);--> statement-breakpoint
CREATE TABLE `save_game` (
	`id` text PRIMARY KEY NOT NULL,
	`singleton_key` integer DEFAULT 1 NOT NULL,
	`display_name` text NOT NULL,
	`schema_version` integer NOT NULL,
	`game_version` text NOT NULL,
	`content_data_version` text NOT NULL,
	`world_date` text NOT NULL,
	`rng_algorithm` text NOT NULL,
	`rng_state` blob NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "save_game_singleton_key_check" CHECK("save_game"."singleton_key" = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `save_game_singleton_key_unique` ON `save_game` (`singleton_key`);--> statement-breakpoint
CREATE TABLE `save_migration_history` (
	`id` text PRIMARY KEY NOT NULL,
	`save_id` text NOT NULL,
	`from_schema_version` integer NOT NULL,
	`to_schema_version` integer NOT NULL,
	`applied_at` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`save_id`) REFERENCES `save_game`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `save_migration_history_save_applied_idx` ON `save_migration_history` (`save_id`,`applied_at`);--> statement-breakpoint
CREATE TABLE `scouting_attribute_knowledge` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`attribute` text NOT NULL,
	`known_value` integer,
	`minimum_value` integer,
	`maximum_value` integer,
	`confidence` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `scouting_report`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scouting_attribute_knowledge_unique` ON `scouting_attribute_knowledge` (`report_id`,`attribute`);--> statement-breakpoint
CREATE TABLE `scouting_report` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`team_id` text NOT NULL,
	`confidence` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scouting_report_driver_team_idx` ON `scouting_report` (`driver_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `seat_assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`team_season_entry_id` text,
	`seat_role` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_primary` integer NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `seat_assignment_driver_dates_idx` ON `seat_assignment` (`driver_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `session_car_checkpoint` (
	`id` text PRIMARY KEY NOT NULL,
	`checkpoint_id` text NOT NULL,
	`session_entry_id` text NOT NULL,
	`current_lap` integer NOT NULL,
	`sector_index` integer NOT NULL,
	`waypoint_progress` real NOT NULL,
	`race_position` integer NOT NULL,
	`gap_to_leader_ms` integer NOT NULL,
	`interval_ahead_ms` integer NOT NULL,
	`current_lap_time_ms` integer NOT NULL,
	`last_sector_time_ms` integer,
	`sector_times_ms_payload` text NOT NULL,
	`sector_times_schema_version` text NOT NULL,
	`pit_phase` text NOT NULL,
	`pit_phase_elapsed_ms` integer NOT NULL,
	`fuel_kg` real NOT NULL,
	`mounted_tyre_set_id` text,
	`ers_charge_percent` real NOT NULL,
	`engine_mode` text NOT NULL,
	`pit_stops_completed` integer NOT NULL,
	`penalty_payload` text NOT NULL,
	`penalty_schema_version` text NOT NULL,
	`retirement_state` text NOT NULL,
	`retirement_reason` text,
	FOREIGN KEY (`checkpoint_id`) REFERENCES `session_checkpoint`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mounted_tyre_set_id`) REFERENCES `tyre_set`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_car_checkpoint_entry_unique` ON `session_car_checkpoint` (`checkpoint_id`,`session_entry_id`);--> statement-breakpoint
CREATE TABLE `session_checkpoint` (
	`id` text PRIMARY KEY NOT NULL,
	`weekend_session_id` text NOT NULL,
	`checkpoint_seq` integer NOT NULL,
	`sim_clock_ms` integer NOT NULL,
	`rng_algorithm` text NOT NULL,
	`rng_state` blob NOT NULL,
	`phase` text NOT NULL,
	`safety_car_state_payload` text NOT NULL,
	`safety_car_state_schema_version` text NOT NULL,
	`weather_state_payload` text,
	`weather_state_schema_version` text,
	`strategy_state_payload` text,
	`strategy_state_schema_version` text,
	`leader_session_entry_id` text,
	`checkpointed_at` text NOT NULL,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leader_session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_checkpoint_sequence_check" CHECK("session_checkpoint"."checkpoint_seq" >= 1),
	CONSTRAINT "session_checkpoint_clock_check" CHECK("session_checkpoint"."sim_clock_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_checkpoint_session_unique` ON `session_checkpoint` (`weekend_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_checkpoint_sequence_unique` ON `session_checkpoint` (`weekend_session_id`,`checkpoint_seq`);--> statement-breakpoint
CREATE TABLE `session_damage_component` (
	`id` text PRIMARY KEY NOT NULL,
	`session_entry_id` text NOT NULL,
	`component` text NOT NULL,
	`severity` integer NOT NULL,
	`performance_penalty_payload` text NOT NULL,
	`performance_penalty_schema_version` text NOT NULL,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_damage_component_entry_idx` ON `session_damage_component` (`session_entry_id`);--> statement-breakpoint
CREATE TABLE `session_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`weekend_session_id` text NOT NULL,
	`event_entry_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`grid_slot` integer,
	`start_status` text NOT NULL,
	`resolved_performance_snapshot_id` text NOT NULL,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_entry_id`) REFERENCES `event_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_performance_snapshot_id`) REFERENCES `resolved_performance_snapshot`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_entry_driver_unique` ON `session_entry` (`weekend_session_id`,`driver_id`);--> statement-breakpoint
CREATE TABLE `session_event` (
	`id` text PRIMARY KEY NOT NULL,
	`weekend_session_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`simulation_time_ms` integer NOT NULL,
	`lap` integer NOT NULL,
	`segment_id` text,
	`event_type` text NOT NULL,
	`session_entry_ids_payload` text NOT NULL,
	`payload` text NOT NULL,
	`payload_schema_version` text NOT NULL,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "session_event_sequence_check" CHECK("session_event"."sequence" >= 1),
	CONSTRAINT "session_event_clock_check" CHECK("session_event"."simulation_time_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_event_sequence_unique` ON `session_event` (`weekend_session_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `session_point_award` (
	`id` text PRIMARY KEY NOT NULL,
	`session_result_id` text NOT NULL,
	`points_system_id` text NOT NULL,
	`award_kind` text NOT NULL,
	`points` real NOT NULL,
	FOREIGN KEY (`session_result_id`) REFERENCES `session_result`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`points_system_id`) REFERENCES `points_system`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_point_award_result_idx` ON `session_point_award` (`session_result_id`);--> statement-breakpoint
CREATE TABLE `session_result` (
	`id` text PRIMARY KEY NOT NULL,
	`session_entry_id` text NOT NULL,
	`weekend_session_id` text NOT NULL,
	`classification_position` integer,
	`classification_status` text NOT NULL,
	`laps_completed` integer NOT NULL,
	`best_lap_ms` integer,
	`best_lap_number` integer,
	`total_time_ms` integer,
	`gap_to_leader_ms` integer,
	`laps_behind` integer NOT NULL,
	`finalized_at` text NOT NULL,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_result_laps_check" CHECK("session_result"."laps_completed" >= 0),
	CONSTRAINT "session_result_position_check" CHECK("session_result"."classification_position" IS NULL OR "session_result"."classification_position" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_result_entry_unique` ON `session_result` (`session_entry_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_result_position_unique` ON `session_result` (`weekend_session_id`,`classification_position`);--> statement-breakpoint
CREATE TABLE `session_telemetry_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`weekend_session_id` text NOT NULL,
	`archive_path` text NOT NULL,
	`format` text NOT NULL,
	`schema_version` text NOT NULL,
	`sha256` text NOT NULL,
	`byte_length` integer NOT NULL,
	`created_at` text NOT NULL,
	`purged_at` text,
	FOREIGN KEY (`weekend_session_id`) REFERENCES `weekend_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_telemetry_archive_session_idx` ON `session_telemetry_archive` (`weekend_session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `session_tyre_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`session_entry_id` text NOT NULL,
	`tyre_set_id` text NOT NULL,
	`laps` integer NOT NULL,
	`wear_delta_percent` real NOT NULL,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tyre_set_id`) REFERENCES `tyre_set`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_tyre_usage_stint_unique` ON `session_tyre_usage` (`session_entry_id`,`tyre_set_id`);--> statement-breakpoint
CREATE TABLE `stint` (
	`id` text PRIMARY KEY NOT NULL,
	`session_entry_id` text NOT NULL,
	`tyre_set_id` text NOT NULL,
	`start_lap` integer NOT NULL,
	`end_lap` integer,
	`fuel_start_kg` real,
	`fuel_end_kg` real,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tyre_set_id`) REFERENCES `tyre_set`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stint_session_entry_lap_idx` ON `stint` (`session_entry_id`,`start_lap`);--> statement-breakpoint
CREATE TABLE `supply_contract` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`supplier_team_id` text NOT NULL,
	`part_category` text NOT NULL,
	`contract_tier` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`annual_cost_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `supply_contract_team_dates_idx` ON `supply_contract` (`team_season_entry_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`nationality_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`nationality_id`) REFERENCES `nationality`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_code_unique` ON `team` (`code`);--> statement-breakpoint
CREATE INDEX `team_nationality_idx` ON `team` (`nationality_id`);--> statement-breakpoint
CREATE TABLE `team_season_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`championship_season_id` text NOT NULL,
	`constructor_status` text NOT NULL,
	`entries_count` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_season_entry_team_season_unique` ON `team_season_entry` (`team_id`,`championship_season_id`);--> statement-breakpoint
CREATE TABLE `tyre_compound` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tyre_compound_code_unique` ON `tyre_compound` (`code`);--> statement-breakpoint
CREATE TABLE `tyre_compound_spec` (
	`id` text PRIMARY KEY NOT NULL,
	`tyre_compound_id` text NOT NULL,
	`version` integer NOT NULL,
	`grip_peak` real NOT NULL,
	`degradation_rate` real NOT NULL,
	`warm_up_laps` real NOT NULL,
	`operating_window_min_c` real NOT NULL,
	`operating_window_max_c` real NOT NULL,
	`durability` real NOT NULL,
	`wetness_crossover` real NOT NULL,
	`is_wet` integer NOT NULL,
	`optimal_wetness_min_bp` integer,
	`optimal_wetness_max_bp` integer,
	`under_wetness_loss_ppm` integer,
	`over_wetness_loss_ppm` integer,
	`water_clearing_ppm` integer,
	`dry_track_wear_multiplier_ppm` integer,
	`operating_temp_min_deci_c` integer,
	`operating_temp_max_deci_c` integer,
	FOREIGN KEY (`tyre_compound_id`) REFERENCES `tyre_compound`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tyre_compound_spec_version_unique` ON `tyre_compound_spec` (`tyre_compound_id`,`version`);--> statement-breakpoint
CREATE TABLE `tyre_set` (
	`id` text PRIMARY KEY NOT NULL,
	`event_entry_id` text NOT NULL,
	`tyre_compound_spec_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`wear_percent` real NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`event_entry_id`) REFERENCES `event_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tyre_compound_spec_id`) REFERENCES `tyre_compound_spec`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tyre_set_wear_percent_check" CHECK("tyre_set"."wear_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tyre_set_entry_index_unique` ON `tyre_set` (`event_entry_id`,`set_index`);--> statement-breakpoint
CREATE TABLE `weekend_format_session_slot` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`session_kind` text NOT NULL,
	`target_laps` integer,
	`target_minutes` integer,
	`is_scored` integer NOT NULL,
	`grid_source_slot_id` text,
	`reverse_grid_count` integer NOT NULL,
	`mandatory_pit_stops` integer NOT NULL,
	`required_compound_rule_id` text,
	`points_system_id` text,
	`fastest_lap_point_eligible` integer NOT NULL,
	`parc_ferme_from_previous` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `weekend_format_template`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grid_source_slot_id`) REFERENCES `weekend_format_session_slot`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`required_compound_rule_id`) REFERENCES `required_compound_rule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`points_system_id`) REFERENCES `points_system`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekend_format_session_slot_sequence_unique` ON `weekend_format_session_slot` (`template_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `weekend_format_template` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` integer NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekend_format_template_code_version_unique` ON `weekend_format_template` (`code`,`version`);--> statement-breakpoint
CREATE TABLE `weekend_session` (
	`id` text PRIMARY KEY NOT NULL,
	`event_session_definition_id` text NOT NULL,
	`status` text NOT NULL,
	`temp_c` real,
	`rain_now` real,
	`rain_in_minutes` real,
	`track_wetness` integer,
	`active_checkpoint_id` text,
	FOREIGN KEY (`event_session_definition_id`) REFERENCES `event_session_definition`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekend_session_definition_unique` ON `weekend_session` (`event_session_definition_id`);