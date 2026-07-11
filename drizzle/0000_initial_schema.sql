CREATE TYPE team_status_enum AS ENUM ('ACTIVE', 'DEFUNCT', 'UNMANAGED_AI', 'PLAYER_MANAGED');
--> statement-breakpoint
CREATE TABLE teams (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	short_name TEXT NOT NULL,
	nationality TEXT NOT NULL,
	primary_color TEXT NOT NULL,
	secondary_color TEXT NOT NULL,
	status team_status_enum NOT NULL DEFAULT 'UNMANAGED_AI',
	tier_id SMALLINT NOT NULL,
	wind_tunnel_hours SMALLINT NOT NULL DEFAULT 40,
	cfd_capacity_flops BIGINT NOT NULL DEFAULT 0,
	hq_level SMALLINT NOT NULL DEFAULT 1
);
