import {
	bigint,
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text
} from 'drizzle-orm/pg-core';

export const teamStatusEnum = pgEnum('team_status_enum', [
	'ACTIVE',
	'DEFUNCT',
	'UNMANAGED_AI',
	'PLAYER_MANAGED'
]);

export const gamePhaseEnum = pgEnum('game_phase_enum', [
	'PRE_SEASON',
	'IN_SEASON',
	'END_OF_SEASON',
	'OFF_SEASON'
]);

export const playerStatusEnum = pgEnum('player_status_enum', ['EMPLOYED', 'UNEMPLOYED']);

export const driverCareerStageEnum = pgEnum('driver_career_stage_enum', [
	'KARTING',
	'SINGLE_SEATER',
	'RETIRED'
]);

export const componentStatusEnum = pgEnum('component_status_enum', [
	'IN_INVENTORY',
	'INSTALLED',
	'PARKED_ILLEGAL',
	'RETIRED'
]);

export const standingEntityEnum = pgEnum('standing_entity_enum', ['DRIVER', 'CONSTRUCTOR']);

export const sportingRegsVersionEnum = pgEnum('sporting_regs_version_enum', ['CURRENT', 'PENDING']);

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

export const series = pgTable('series', {
	id: smallint('id').primaryKey(),
	name: text('name').notNull(),
	shortName: text('short_name').notNull(),
	tierLevel: smallint('tier_level').notNull(),
	totalRounds: smallint('total_rounds').notNull().default(10),
	promotionSlots: smallint('promotion_slots').notNull().default(0),
	relegationSlots: smallint('relegation_slots').notNull().default(0),
	baseEntryFee: bigint('base_entry_fee', { mode: 'bigint' }).notNull().default(0n),
	seasonPrizePool: bigint('season_prize_pool', { mode: 'bigint' }).notNull(),
	technicalRegulations: jsonb('technical_regulations').notNull()
});

export const pointsSystems = pgTable('points_systems', {
	id: integer('id').primaryKey(),
	code: text('code').notNull(),
	name: text('name').notNull(),
	mainRacePayouts: integer('main_race_payouts').array().notNull(),
	sprintRacePayouts: integer('sprint_race_payouts').array().notNull(),
	pointsFastestLap: smallint('points_fastest_lap').notNull().default(0),
	fastestLapRequiresTop10: boolean('fastest_lap_requires_top_10').notNull().default(true),
	pointsPolePosition: smallint('points_pole_position').notNull().default(0)
});

export const gameState = pgTable('game_state', {
	id: smallint('id').primaryKey().default(1),
	seasonYear: smallint('season_year').notNull().default(2026),
	currentWeek: smallint('current_week').notNull().default(1),
	currentDay: smallint('current_day').notNull().default(1),
	phase: gamePhaseEnum('phase').notNull().default('PRE_SEASON'),
	playerDisplayName: text('player_display_name').notNull().default('Player'),
	playerTeamId: integer('player_team_id'),
	playerStatus: playerStatusEnum('player_status').notNull().default('UNEMPLOYED')
});

export const seriesSportingRegulations = pgTable(
	'series_sporting_regulations',
	{
		seriesId: smallint('series_id').notNull(),
		version: sportingRegsVersionEnum('version').notNull(),
		practiceSessionCount: smallint('practice_session_count').notNull(),
		sprintEnabled: boolean('sprint_enabled').notNull().default(false),
		mainRaceTargetDistanceMeters: integer('main_race_target_distance_meters').notNull(),
		mainRaceTimeLimitMinutes: smallint('main_race_time_limit_minutes').notNull(),
		sprintTargetDistanceMeters: integer('sprint_target_distance_meters'),
		mainPointsSystemId: integer('main_points_system_id').notNull(),
		sprintPointsSystemId: integer('sprint_points_system_id').notNull()
	},
	(t) => [primaryKey({ columns: [t.seriesId, t.version] })]
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Series = typeof series.$inferSelect;
export type GameState = typeof gameState.$inferSelect;
