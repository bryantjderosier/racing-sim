CREATE TABLE `ai_team_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`archetype` text NOT NULL,
	`development_priority` text NOT NULL,
	`driver_strategy` text NOT NULL,
	`supplier_strategy` text NOT NULL,
	`risk_tolerance` integer NOT NULL,
	`spending_discipline` integer NOT NULL,
	`talent_focus` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_team_profile_risk_tolerance_check" CHECK("ai_team_profile"."risk_tolerance" BETWEEN 0 AND 100),
	CONSTRAINT "ai_team_profile_spending_discipline_check" CHECK("ai_team_profile"."spending_discipline" BETWEEN 0 AND 100),
	CONSTRAINT "ai_team_profile_talent_focus_check" CHECK("ai_team_profile"."talent_focus" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_team_profile_team_season_entry_unique` ON `ai_team_profile` (`team_season_entry_id`);--> statement-breakpoint
CREATE TABLE `ai_world_decision` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`world_date` text NOT NULL,
	`decision_type` text NOT NULL,
	`priority` integer NOT NULL,
	`reason_code` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_world_decision_priority_check" CHECK("ai_world_decision"."priority" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_world_decision_team_date_unique` ON `ai_world_decision` (`team_season_entry_id`,`world_date`);--> statement-breakpoint
CREATE INDEX `ai_world_decision_date_idx` ON `ai_world_decision` (`world_date`);
--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 9;
