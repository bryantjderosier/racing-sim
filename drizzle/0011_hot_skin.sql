ALTER TABLE `development_project` ADD `start_world_date` text NOT NULL;--> statement-breakpoint
ALTER TABLE `development_project` ADD `completed_world_date` text;--> statement-breakpoint
ALTER TABLE `development_project_stage` ADD `started_world_date` text;--> statement-breakpoint
ALTER TABLE `development_project_stage` ADD `completed_world_date` text;--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 7;
