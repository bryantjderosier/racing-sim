ALTER TABLE "teams" ADD COLUMN "wt_hours_cap_mult" double precision;
--> statement-breakpoint
UPDATE "teams" SET "wt_hours_cap_mult" = 1 WHERE "wt_hours_cap_mult" IS NULL;
