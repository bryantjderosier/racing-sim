CREATE TABLE `championship_driver_finish_count` (
	`id` text PRIMARY KEY NOT NULL,
	`standing_id` text NOT NULL,
	`finishing_position` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`standing_id`) REFERENCES `championship_driver_standing`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_driver_finish_count_unique` ON `championship_driver_finish_count` (`standing_id`,`finishing_position`);--> statement-breakpoint
CREATE TABLE `championship_driver_standing` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_season_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`points` real DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`second_places` integer DEFAULT 0 NOT NULL,
	`third_places` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_driver_standing_season_driver_unique` ON `championship_driver_standing` (`championship_season_id`,`driver_id`);--> statement-breakpoint
CREATE TABLE `championship_team_finish_count` (
	`id` text PRIMARY KEY NOT NULL,
	`standing_id` text NOT NULL,
	`finishing_position` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`standing_id`) REFERENCES `championship_team_standing`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_team_finish_count_unique` ON `championship_team_finish_count` (`standing_id`,`finishing_position`);--> statement-breakpoint
CREATE TABLE `championship_team_standing` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_season_id` text NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`points` real DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`second_places` integer DEFAULT 0 NOT NULL,
	`third_places` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_team_standing_season_entry_unique` ON `championship_team_standing` (`championship_season_id`,`team_season_entry_id`);--> statement-breakpoint
CREATE TABLE `championship_weekend_settlement` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_event_id` text NOT NULL,
	`championship_season_id` text NOT NULL,
	`settled_at` text NOT NULL,
	`advanced_to_world_date` text NOT NULL,
	FOREIGN KEY (`championship_event_id`) REFERENCES `championship_event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`championship_season_id`) REFERENCES `championship_season`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_weekend_settlement_event_unique` ON `championship_weekend_settlement` (`championship_event_id`);--> statement-breakpoint
CREATE TABLE `championship_weekend_settlement_award` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`session_point_award_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`points` real NOT NULL,
	FOREIGN KEY (`settlement_id`) REFERENCES `championship_weekend_settlement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_point_award_id`) REFERENCES `session_point_award`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_weekend_settlement_award_source_unique` ON `championship_weekend_settlement_award` (`session_point_award_id`);
