CREATE TABLE `ai_world_action` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_id` text NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`world_date` text NOT NULL,
	`action_type` text NOT NULL,
	`status` text NOT NULL,
	`reason_code` text NOT NULL,
	`summary` text NOT NULL,
	`development_project_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`decision_id`) REFERENCES `ai_world_decision`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`development_project_id`) REFERENCES `development_project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_world_action_decision_unique` ON `ai_world_action` (`decision_id`);--> statement-breakpoint
CREATE INDEX `ai_world_action_team_date_idx` ON `ai_world_action` (`team_season_entry_id`,`world_date`);--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 12;
