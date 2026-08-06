CREATE TABLE `development_project` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`part_category` text NOT NULL,
	`project_kind` text NOT NULL,
	`status` text NOT NULL,
	`current_stage` text NOT NULL,
	`base_design_version_id` text,
	`performance_delta_payload` text NOT NULL,
	`performance_delta_schema_version` text NOT NULL,
	`reliability_delta_payload` text NOT NULL,
	`reliability_delta_schema_version` text NOT NULL,
	`total_cost_minor` integer NOT NULL,
	`spent_cost_minor` integer NOT NULL,
	`started_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_design_version_id`) REFERENCES `part_design_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `development_project_team_status_idx` ON `development_project` (`team_season_entry_id`,`status`,`part_category`);--> statement-breakpoint
CREATE INDEX `development_project_updated_idx` ON `development_project` (`updated_at`);--> statement-breakpoint
CREATE TABLE `development_project_result` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`part_design_version_id` text NOT NULL,
	`part_instance_id` text,
	`chassis_instance_id` text,
	`manufactured_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `development_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_design_version_id`) REFERENCES `part_design_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`part_instance_id`) REFERENCES `part_instance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chassis_instance_id`) REFERENCES `chassis_instance`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "development_project_result_one_asset_check" CHECK(("development_project_result"."part_instance_id" IS NOT NULL AND "development_project_result"."chassis_instance_id" IS NULL) OR ("development_project_result"."part_instance_id" IS NULL AND "development_project_result"."chassis_instance_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `development_project_result_project_unique` ON `development_project_result` (`project_id`);--> statement-breakpoint
CREATE TABLE `development_project_stage` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stage` text NOT NULL,
	`sequence` integer NOT NULL,
	`status` text NOT NULL,
	`duration_days` integer NOT NULL,
	`cost_minor` integer NOT NULL,
	`remaining_days` integer NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `development_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `development_project_stage_project_stage_unique` ON `development_project_stage` (`project_id`,`stage`);--> statement-breakpoint
CREATE UNIQUE INDEX `development_project_stage_project_sequence_unique` ON `development_project_stage` (`project_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `development_project_stage_status_idx` ON `development_project_stage` (`project_id`,`status`);--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 6;
