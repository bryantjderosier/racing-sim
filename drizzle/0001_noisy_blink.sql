ALTER TABLE `session_car_checkpoint` ADD `simulation_state_payload` text NOT NULL DEFAULT '{}';--> statement-breakpoint
ALTER TABLE `session_car_checkpoint` ADD `simulation_state_schema_version` text NOT NULL DEFAULT 'simulation-v1';--> statement-breakpoint
ALTER TABLE `session_checkpoint` ADD `resume_state_payload` text NOT NULL DEFAULT '{}';--> statement-breakpoint
ALTER TABLE `session_checkpoint` ADD `resume_state_schema_version` text NOT NULL DEFAULT 'resume-v1';
