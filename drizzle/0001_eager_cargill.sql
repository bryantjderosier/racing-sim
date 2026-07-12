CREATE TABLE "attribute_progress" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"attr_name" text NOT NULL,
	"xp" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "attribute_progress_unique" UNIQUE("entity_id","entity_type","attr_name")
);
--> statement-breakpoint
CREATE TABLE "world_clock" (
	"id" integer PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"week" integer NOT NULL,
	"day" integer NOT NULL,
	"tick_index" integer DEFAULT 0 NOT NULL
);
