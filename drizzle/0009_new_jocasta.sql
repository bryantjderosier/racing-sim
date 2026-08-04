CREATE TABLE `daily_phase_execution` (
	`id` text PRIMARY KEY NOT NULL,
	`world_date` text NOT NULL,
	`phase` text NOT NULL,
	`status` text NOT NULL,
	`result_payload` text NOT NULL,
	`result_schema_version` text NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_phase_execution_date_phase_unique` ON `daily_phase_execution` (`world_date`,`phase`);--> statement-breakpoint
CREATE INDEX `daily_phase_execution_date_idx` ON `daily_phase_execution` (`world_date`);
--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 5;
