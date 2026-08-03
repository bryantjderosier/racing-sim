ALTER TABLE `save_game` ADD `manager_first_name` text;--> statement-breakpoint
ALTER TABLE `save_game` ADD `manager_last_name` text;--> statement-breakpoint
ALTER TABLE `save_game` ADD `player_team_id` text REFERENCES team(id);--> statement-breakpoint
CREATE INDEX `save_game_player_team_idx` ON `save_game` (`player_team_id`);