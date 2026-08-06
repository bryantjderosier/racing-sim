CREATE TABLE `inbox_message` (
	`id` text PRIMARY KEY NOT NULL,
	`world_date` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`priority` integer NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`dedupe_key` text NOT NULL,
	`requires_decision` integer NOT NULL,
	`is_blocking` integer NOT NULL,
	`deadline_world_date` text,
	`created_at` text NOT NULL,
	`read_at` text,
	`resolved_at` text,
	CONSTRAINT "inbox_message_priority_check" CHECK("inbox_message"."priority" BETWEEN 0 AND 100),
	CONSTRAINT "inbox_message_blocking_requires_decision_check" CHECK("inbox_message"."is_blocking" = 0 OR "inbox_message"."requires_decision" = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_message_dedupe_unique` ON `inbox_message` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `inbox_message_status_priority_idx` ON `inbox_message` (`status`,`priority`);--> statement-breakpoint
CREATE INDEX `inbox_message_world_date_idx` ON `inbox_message` (`world_date`);--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 10;
