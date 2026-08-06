CREATE TABLE `sponsor` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`slot_type` text NOT NULL,
	`priority_payload` text NOT NULL,
	`compatible_championship_codes_payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_code_unique` ON `sponsor` (`code`);--> statement-breakpoint
CREATE INDEX `sponsor_category_slot_idx` ON `sponsor` (`category`,`slot_type`);--> statement-breakpoint
CREATE TABLE `sponsor_offer` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`sponsor_id` text NOT NULL,
	`status` text NOT NULL,
	`available_from` text NOT NULL,
	`expires_at` text NOT NULL,
	`term_seasons` integer NOT NULL,
	`annual_base_payment_minor` integer NOT NULL,
	`signing_bonus_minor` integer NOT NULL,
	`performance_bonus_minor` integer NOT NULL,
	`target_payload` text NOT NULL,
	`obligation_payload` text NOT NULL,
	`fit_payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "sponsor_offer_term_seasons_check" CHECK("sponsor_offer"."term_seasons" BETWEEN 1 AND 3),
	CONSTRAINT "sponsor_offer_base_payment_check" CHECK("sponsor_offer"."annual_base_payment_minor" >= 0),
	CONSTRAINT "sponsor_offer_signing_bonus_check" CHECK("sponsor_offer"."signing_bonus_minor" >= 0),
	CONSTRAINT "sponsor_offer_performance_bonus_check" CHECK("sponsor_offer"."performance_bonus_minor" >= 0),
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_offer_team_sponsor_unique` ON `sponsor_offer` (`team_season_entry_id`,`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_offer_team_status_idx` ON `sponsor_offer` (`team_season_entry_id`,`status`);--> statement-breakpoint
CREATE TABLE `sponsor_contract` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_id` text NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`sponsor_id` text NOT NULL,
	`category` text NOT NULL,
	`slot_type` text NOT NULL,
	`status` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`renewal_window_start_date` text NOT NULL,
	`term_seasons` integer NOT NULL,
	`annual_base_payment_minor` integer NOT NULL,
	`signing_bonus_minor` integer NOT NULL,
	`performance_bonus_minor` integer NOT NULL,
	`target_payload` text NOT NULL,
	`obligation_payload` text NOT NULL,
	`fit_payload` text NOT NULL,
	`signed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "sponsor_contract_term_seasons_check" CHECK("sponsor_contract"."term_seasons" BETWEEN 1 AND 3),
	CONSTRAINT "sponsor_contract_base_payment_check" CHECK("sponsor_contract"."annual_base_payment_minor" >= 0),
	CONSTRAINT "sponsor_contract_signing_bonus_check" CHECK("sponsor_contract"."signing_bonus_minor" >= 0),
	CONSTRAINT "sponsor_contract_performance_bonus_check" CHECK("sponsor_contract"."performance_bonus_minor" >= 0),
	FOREIGN KEY (`offer_id`) REFERENCES `sponsor_offer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_contract_offer_unique` ON `sponsor_contract` (`offer_id`);--> statement-breakpoint
CREATE INDEX `sponsor_contract_team_dates_idx` ON `sponsor_contract` (`team_season_entry_id`,`start_date`,`end_date`);--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 14;
