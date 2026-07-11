import { bigint, integer, pgEnum, pgTable, smallint, text } from 'drizzle-orm/pg-core';

export const teamStatusEnum = pgEnum('team_status_enum', [
	'ACTIVE',
	'DEFUNCT',
	'UNMANAGED_AI',
	'PLAYER_MANAGED'
]);

export const teams = pgTable('teams', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	shortName: text('short_name').notNull(),
	nationality: text('nationality').notNull(),
	primaryColor: text('primary_color').notNull(),
	secondaryColor: text('secondary_color').notNull(),
	status: teamStatusEnum('status').notNull().default('UNMANAGED_AI'),
	tierId: smallint('tier_id').notNull(),
	windTunnelHours: smallint('wind_tunnel_hours').notNull().default(40),
	cfdCapacityFlops: bigint('cfd_capacity_flops', { mode: 'bigint' }).notNull().default(0n),
	hqLevel: smallint('hq_level').notNull().default(1)
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
