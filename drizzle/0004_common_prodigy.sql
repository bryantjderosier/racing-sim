ALTER TABLE `save_game` ADD `manager_nationality_id` text REFERENCES nationality(id);--> statement-breakpoint
ALTER TABLE `save_game` ADD `manager_backstory_code` text;--> statement-breakpoint
ALTER TABLE `save_game` ADD `manager_avatar_payload` text;--> statement-breakpoint
ALTER TABLE `save_game` ADD `manager_avatar_schema_version` text;--> statement-breakpoint
CREATE INDEX `save_game_manager_nationality_idx` ON `save_game` (`manager_nationality_id`);