ALTER TABLE "scouting_reports" ADD COLUMN "is_assigned" boolean;
--> statement-breakpoint
UPDATE "scouting_reports" SET "is_assigned" = false WHERE "is_assigned" IS NULL;
