CREATE TABLE `official_weekend_result_package` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_event_id` text NOT NULL,
	`championship_season_id` text NOT NULL,
	`package_schema_version` text NOT NULL,
	`execution_detail` text NOT NULL,
	`formula_version` text NOT NULL,
	`engine_version` text NOT NULL,
	`input_hash` text NOT NULL,
	`result_hash` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`championship_event_id`) REFERENCES `championship_event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `official_weekend_result_package_event_unique` ON `official_weekend_result_package` (`championship_event_id`);--> statement-breakpoint
CREATE INDEX `official_weekend_result_package_season_idx` ON `official_weekend_result_package` (`championship_season_id`);--> statement-breakpoint
ALTER TABLE `championship_weekend_settlement` ADD `official_result_package_id` text REFERENCES official_weekend_result_package(id);
--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 13;
