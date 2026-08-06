CREATE TABLE `inbox_message_action` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_message_id` text NOT NULL,
	`action_type` text NOT NULL,
	`previous_status` text NOT NULL,
	`next_status` text NOT NULL,
	`deferred_until_world_date` text,
	`action_world_date` text NOT NULL,
	`note` text,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inbox_message_id`) REFERENCES `inbox_message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_message_action_idempotency_unique` ON `inbox_message_action` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `inbox_message_action_message_created_idx` ON `inbox_message_action` (`inbox_message_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `inbox_message` ADD `deferred_until_world_date` text;--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 11;
