CREATE TABLE `finance_account` (
	`id` text PRIMARY KEY NOT NULL,
	`team_season_entry_id` text NOT NULL,
	`currency_code` text NOT NULL,
	`opening_balance_minor` integer NOT NULL,
	`current_balance_minor` integer NOT NULL,
	`budget_cap_minor` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_season_entry_id`) REFERENCES `team_season_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "finance_account_opening_balance_check" CHECK("finance_account"."opening_balance_minor" >= 0),
	CONSTRAINT "finance_account_current_balance_check" CHECK("finance_account"."current_balance_minor" >= 0),
	CONSTRAINT "finance_account_budget_cap_check" CHECK("finance_account"."budget_cap_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_account_team_season_entry_unique` ON `finance_account` (`team_season_entry_id`);--> statement-breakpoint
CREATE TABLE `finance_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`world_date` text NOT NULL,
	`posted_at` text NOT NULL,
	`transaction_type` text NOT NULL,
	`category` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`idempotency_key` text NOT NULL,
	`description` text NOT NULL,
	`balance_after_minor` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `finance_account`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "finance_transaction_amount_nonzero_check" CHECK("finance_transaction"."amount_minor" <> 0),
	CONSTRAINT "finance_transaction_balance_check" CHECK("finance_transaction"."balance_after_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_transaction_idempotency_unique` ON `finance_transaction` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `finance_transaction_account_date_idx` ON `finance_transaction` (`account_id`,`world_date`);
--> statement-breakpoint
UPDATE `save_game` SET `schema_version` = 8;
