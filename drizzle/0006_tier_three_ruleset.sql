ALTER TABLE `championship_season_ruleset` ADD `grid_policy_payload` text NOT NULL DEFAULT '{}';--> statement-breakpoint
ALTER TABLE `championship_season_ruleset` ADD `grid_policy_schema_version` text NOT NULL DEFAULT 'grid-policy-v1';
