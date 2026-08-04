CREATE TABLE `calendar_transition` (
	`id` text PRIMARY KEY NOT NULL,
	`transition_kind` text NOT NULL,
	`from_world_date` text NOT NULL,
	`to_world_date` text NOT NULL,
	`status` text NOT NULL,
	`block_code` text,
	`block_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_transition_edge_unique` ON `calendar_transition` (`transition_kind`,`from_world_date`,`to_world_date`);--> statement-breakpoint
CREATE INDEX `calendar_transition_date_idx` ON `calendar_transition` (`from_world_date`,`to_world_date`);
--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 4;
