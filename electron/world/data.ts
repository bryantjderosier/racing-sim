export type TrackType = 'PERMANENT' | 'STREET' | 'HYBRID';
export type Downforce = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
export type Band = 'T' | 'M' | 'B';

export type Climate = 'temperate' | 'cool' | 'tropical' | 'hot_dry';

export type CircuitSeed = {
	id: number;
	name: string;
	city: string;
	country: string;
	trackType: TrackType;
	downforce: Downforce;
	wear: number;
	lapM: number;
	pitMs: number;
	fuel: number;
	brake: number;
	climate: Climate;
};

export type TeamSeed = {
	id: number;
	name: string;
	short: string;
	nat: string;
	primary: string;
	secondary: string;
	band: Band;
	tierId: number;
};

/** Fixed 30 venues from circuit-catalog.md */
export const CIRCUITS: CircuitSeed[] = [
	{ id: 1, name: 'Riviera Harbor', city: 'Menton Bay', country: 'France', trackType: 'STREET', downforce: 'VERY_HIGH', wear: 0.78, lapM: 3840, pitMs: 28000, fuel: 0.88, brake: 1.18, climate: 'temperate' },
	{ id: 2, name: 'Baltic Quays', city: 'Ventspils', country: 'Latvia', trackType: 'STREET', downforce: 'VERY_HIGH', wear: 0.82, lapM: 4120, pitMs: 30000, fuel: 0.9, brake: 1.15, climate: 'cool' },
	{ id: 3, name: 'Yokohama Bay Sprint', city: 'Kanazawa-ku', country: 'Japan', trackType: 'STREET', downforce: 'VERY_HIGH', wear: 0.8, lapM: 4360, pitMs: 29000, fuel: 0.88, brake: 1.2, climate: 'temperate' },
	{ id: 4, name: 'Sentosa Causeway', city: 'Sentosa', country: 'Singapore', trackType: 'STREET', downforce: 'VERY_HIGH', wear: 0.76, lapM: 4580, pitMs: 31000, fuel: 0.86, brake: 1.22, climate: 'tropical' },
	{ id: 5, name: 'Aegean Cliff Circuit', city: 'Naxos Ridge', country: 'Greece', trackType: 'HYBRID', downforce: 'VERY_HIGH', wear: 0.84, lapM: 4720, pitMs: 26000, fuel: 0.9, brake: 1.16, climate: 'hot_dry' },
	{ id: 6, name: 'Copacabana Street', city: 'Leme', country: 'Brazil', trackType: 'STREET', downforce: 'HIGH', wear: 0.85, lapM: 4450, pitMs: 27000, fuel: 0.92, brake: 1.12, climate: 'tropical' },
	{ id: 7, name: 'Quebec Citadel GP', city: 'Cap-Blanc', country: 'Canada', trackType: 'STREET', downforce: 'HIGH', wear: 0.83, lapM: 4680, pitMs: 25000, fuel: 0.94, brake: 1.1, climate: 'cool' },
	{ id: 8, name: 'Pearl Delta Circuit', city: 'Xiangzhou', country: 'China', trackType: 'HYBRID', downforce: 'HIGH', wear: 0.95, lapM: 5120, pitMs: 24000, fuel: 0.96, brake: 1.08, climate: 'temperate' },
	{ id: 9, name: 'Ardennes Parkway', city: 'Rochefort', country: 'Belgium', trackType: 'PERMANENT', downforce: 'HIGH', wear: 0.98, lapM: 5480, pitMs: 21000, fuel: 0.98, brake: 1.1, climate: 'temperate' },
	{ id: 10, name: 'Castelletto Circuito', city: 'Castelletto', country: 'Italy', trackType: 'PERMANENT', downforce: 'HIGH', wear: 1.02, lapM: 5260, pitMs: 20000, fuel: 0.97, brake: 1.12, climate: 'temperate' },
	{ id: 11, name: 'Atlas Mountains GP', city: 'Ifrane', country: 'Morocco', trackType: 'PERMANENT', downforce: 'HIGH', wear: 1.05, lapM: 5610, pitMs: 22000, fuel: 0.95, brake: 1.08, climate: 'hot_dry' },
	{ id: 12, name: 'Java Grand Park', city: 'Bogor', country: 'Indonesia', trackType: 'HYBRID', downforce: 'HIGH', wear: 1.0, lapM: 4980, pitMs: 23000, fuel: 0.96, brake: 1.1, climate: 'tropical' },
	{ id: 13, name: 'Caribbean Harbor', city: 'Port Castries', country: 'Saint Lucia', trackType: 'HYBRID', downforce: 'HIGH', wear: 0.92, lapM: 4840, pitMs: 25000, fuel: 0.94, brake: 1.08, climate: 'tropical' },
	{ id: 14, name: 'Northcliffe GP', city: 'Guildford Heath', country: 'United Kingdom', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.0, lapM: 5340, pitMs: 20000, fuel: 1.0, brake: 1.0, climate: 'temperate' },
	{ id: 15, name: 'Nordic Lakes', city: 'Tampere', country: 'Finland', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 0.96, lapM: 5020, pitMs: 19000, fuel: 1.0, brake: 1.02, climate: 'cool' },
	{ id: 16, name: 'Jeju Coastal', city: 'Seogwipo', country: 'South Korea', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.04, lapM: 5560, pitMs: 21000, fuel: 1.02, brake: 0.98, climate: 'temperate' },
	{ id: 17, name: 'Cascadia GP', city: 'Everett', country: 'United States', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.08, lapM: 5720, pitMs: 22000, fuel: 1.0, brake: 1.0, climate: 'temperate' },
	{ id: 18, name: 'Nile Delta Circuit', city: 'Mansoura', country: 'Egypt', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.06, lapM: 5410, pitMs: 20000, fuel: 1.02, brake: 0.98, climate: 'hot_dry' },
	{ id: 19, name: 'Andes Altiplano', city: 'Oruro', country: 'Bolivia', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.0, lapM: 5890, pitMs: 23000, fuel: 0.98, brake: 1.02, climate: 'cool' },
	{ id: 20, name: 'Siberian Iceport', city: 'Irkutsk', country: 'Russia', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 0.94, lapM: 5180, pitMs: 21000, fuel: 1.0, brake: 1.0, climate: 'cool' },
	{ id: 21, name: 'Dubai Marina Strip', city: 'Jumeirah', country: 'United Arab Emirates', trackType: 'STREET', downforce: 'MEDIUM', wear: 0.88, lapM: 4760, pitMs: 26000, fuel: 1.0, brake: 1.05, climate: 'hot_dry' },
	{ id: 22, name: 'Thames Barrier GP', city: 'Woolwich', country: 'United Kingdom', trackType: 'STREET', downforce: 'MEDIUM', wear: 0.86, lapM: 4620, pitMs: 24000, fuel: 1.02, brake: 1.04, climate: 'temperate' },
	{ id: 23, name: 'Bavarian Ring', city: 'Ingolstadt', country: 'Germany', trackType: 'PERMANENT', downforce: 'MEDIUM', wear: 1.18, lapM: 6840, pitMs: 22000, fuel: 1.0, brake: 1.0, climate: 'temperate' },
	{ id: 24, name: 'Iberian Plateau', city: 'Zaragoza', country: 'Spain', trackType: 'PERMANENT', downforce: 'LOW', wear: 1.22, lapM: 7120, pitMs: 21000, fuel: 1.12, brake: 0.9, climate: 'hot_dry' },
	{ id: 25, name: 'Highlands Circuit', city: 'Toowoomba', country: 'Australia', trackType: 'PERMANENT', downforce: 'LOW', wear: 1.28, lapM: 6980, pitMs: 20000, fuel: 1.14, brake: 0.88, climate: 'temperate' },
	{ id: 26, name: 'Pampas Circuit', city: 'Rosario', country: 'Argentina', trackType: 'PERMANENT', downforce: 'LOW', wear: 1.2, lapM: 6050, pitMs: 19000, fuel: 1.1, brake: 0.92, climate: 'temperate' },
	{ id: 27, name: 'Cape Fold Ring', city: 'Stellenbosch', country: 'South Africa', trackType: 'PERMANENT', downforce: 'LOW', wear: 1.25, lapM: 7360, pitMs: 22000, fuel: 1.15, brake: 0.88, climate: 'hot_dry' },
	{ id: 28, name: 'Caspian Steppe', city: 'Aktau', country: 'Kazakhstan', trackType: 'PERMANENT', downforce: 'LOW', wear: 1.15, lapM: 5920, pitMs: 20000, fuel: 1.1, brake: 0.9, climate: 'hot_dry' },
	{ id: 29, name: 'Sonora Desert Ring', city: 'Hermosillo', country: 'Mexico', trackType: 'PERMANENT', downforce: 'VERY_LOW', wear: 1.3, lapM: 7480, pitMs: 21000, fuel: 1.2, brake: 0.85, climate: 'hot_dry' },
	{ id: 30, name: 'Fujioka Speedway', city: 'Shizuoka', country: 'Japan', trackType: 'PERMANENT', downforce: 'VERY_LOW', wear: 1.12, lapM: 6620, pitMs: 18000, fuel: 1.18, brake: 0.88, climate: 'temperate' }
];

/** Pre-season test venues (fixed) */
export const PRE_SEASON_CIRCUIT_IDS = [14, 15, 23] as const;

export const TEAMS: TeamSeed[] = [
	{ id: 1, name: 'Steinmann Motorsport', short: 'STEIN', nat: 'DEU', primary: '#C8102E', secondary: '#FFFFFF', band: 'T', tierId: 1 },
	{ id: 2, name: 'Scuderia Rossini', short: 'ROSSI', nat: 'ITA', primary: '#DC0000', secondary: '#FFD700', band: 'T', tierId: 1 },
	{ id: 3, name: 'Kitano Sport', short: 'KITANO', nat: 'JPN', primary: '#E10600', secondary: '#111111', band: 'T', tierId: 1 },
	{ id: 4, name: 'Windsor Racing', short: 'WINDSOR', nat: 'GBR', primary: '#00A3E0', secondary: '#FFFFFF', band: 'M', tierId: 1 },
	{ id: 5, name: 'Van Dort Racing', short: 'VANDORT', nat: 'NLD', primary: '#FF6200', secondary: '#00205B', band: 'M', tierId: 1 },
	{ id: 6, name: 'Rezzato Corsa', short: 'REZZATO', nat: 'ITA', primary: '#009639', secondary: '#FFFFFF', band: 'M', tierId: 1 },
	{ id: 7, name: 'Panther Racing Team', short: 'PANTHER', nat: 'USA', primary: '#1E22AA', secondary: '#C4CED4', band: 'M', tierId: 1 },
	{ id: 8, name: 'Thornton Motorsport', short: 'THORN', nat: 'GBR', primary: '#005F57', secondary: '#F7F7F7', band: 'B', tierId: 1 },
	{ id: 9, name: 'Vélan Racing', short: 'VELAN', nat: 'FRA', primary: '#FFD100', secondary: '#00205B', band: 'B', tierId: 1 },
	{ id: 10, name: 'Chariot Motor Group', short: 'CHARIOT', nat: 'CHE', primary: '#00A19A', secondary: '#111111', band: 'B', tierId: 1 },
	{ id: 11, name: 'Firebird MRT', short: 'FIRE', nat: 'USA', primary: '#FF4500', secondary: '#1A1A1A', band: 'T', tierId: 2 },
	{ id: 12, name: 'Silva Racing', short: 'SILVA', nat: 'BRA', primary: '#009C3B', secondary: '#FFDF00', band: 'T', tierId: 2 },
	{ id: 13, name: 'Octane Racing', short: 'OCTANE', nat: 'AUS', primary: '#00843D', secondary: '#FFCD00', band: 'T', tierId: 2 },
	{ id: 14, name: 'Vexala Motorsport', short: 'VEXALA', nat: 'ESP', primary: '#AA151B', secondary: '#F1BF00', band: 'M', tierId: 2 },
	{ id: 15, name: 'Dragon Race Eng.', short: 'DRAGON', nat: 'CHN', primary: '#DE2910', secondary: '#FFDE00', band: 'M', tierId: 2 },
	{ id: 16, name: 'Munich Autowerke', short: 'MUNICH', nat: 'DEU', primary: '#0066B3', secondary: '#FFFFFF', band: 'M', tierId: 2 },
	{ id: 17, name: 'Black Sea RT', short: 'BLACKSEA', nat: 'TUR', primary: '#E30A17', secondary: '#FFFFFF', band: 'M', tierId: 2 },
	{ id: 18, name: 'Predator Racing', short: 'PRED', nat: 'ZAF', primary: '#007A4D', secondary: '#FFB81C', band: 'B', tierId: 2 },
	{ id: 19, name: 'Nordvik GP', short: 'NORDVIK', nat: 'SWE', primary: '#006AA7', secondary: '#FECC00', band: 'B', tierId: 2 },
	{ id: 20, name: 'Hokkaido Speed', short: 'HOKKAIDO', nat: 'JPN', primary: '#BC002D', secondary: '#FFFFFF', band: 'B', tierId: 2 },
	{ id: 21, name: 'Cascade GP', short: 'CASCADE', nat: 'CAN', primary: '#FF0000', secondary: '#FFFFFF', band: 'T', tierId: 3 },
	{ id: 22, name: 'Iberia Team', short: 'IBERIA', nat: 'PRT', primary: '#046A38', secondary: '#DA291C', band: 'T', tierId: 3 },
	{ id: 23, name: 'Lumen Racing', short: 'LUMEN', nat: 'FRA', primary: '#002395', secondary: '#FFFFFF', band: 'T', tierId: 3 },
	{ id: 24, name: 'Adriatic Motors', short: 'ADRIATIC', nat: 'HRV', primary: '#171796', secondary: '#FF0000', band: 'M', tierId: 3 },
	{ id: 25, name: 'Andes Squadra', short: 'ANDES', nat: 'ARG', primary: '#74ACDF', secondary: '#FFFFFF', band: 'M', tierId: 3 },
	{ id: 26, name: 'Meridian RT', short: 'MERIDIAN', nat: 'NZL', primary: '#00247D', secondary: '#CC0000', band: 'M', tierId: 3 },
	{ id: 27, name: 'Orbis Racing', short: 'ORBIS', nat: 'POL', primary: '#DC143C', secondary: '#FFFFFF', band: 'M', tierId: 3 },
	{ id: 28, name: 'Sahara Works', short: 'SAHARA', nat: 'MAR', primary: '#C1272D', secondary: '#006233', band: 'B', tierId: 3 },
	{ id: 29, name: 'Baltic Engineering', short: 'BALTIC', nat: 'EST', primary: '#0072CE', secondary: '#000000', band: 'B', tierId: 3 },
	{ id: 30, name: 'Gulfstream GP', short: 'GULF', nat: 'ARE', primary: '#000000', secondary: '#C4A35A', band: 'B', tierId: 3 },
	{ id: 31, name: 'Helvetia Racing', short: 'HELVETIA', nat: 'CHE', primary: '#FF0000', secondary: '#FFFFFF', band: 'T', tierId: 4 },
	{ id: 32, name: 'Carpathian RT', short: 'CARPATH', nat: 'ROU', primary: '#002B7F', secondary: '#FCD116', band: 'T', tierId: 4 },
	{ id: 33, name: 'Tyrol Motorsport', short: 'TYROL', nat: 'AUT', primary: '#ED2939', secondary: '#FFFFFF', band: 'T', tierId: 4 },
	{ id: 34, name: 'Ligurian Squad', short: 'LIGURIA', nat: 'ITA', primary: '#009246', secondary: '#CE2B37', band: 'M', tierId: 4 },
	{ id: 35, name: 'Danube Racing', short: 'DANUBE', nat: 'HUN', primary: '#436F4D', secondary: '#FFFFFF', band: 'M', tierId: 4 },
	{ id: 36, name: 'Armorican GP', short: 'ARMOR', nat: 'FRA', primary: '#002654', secondary: '#ED2939', band: 'M', tierId: 4 },
	{ id: 37, name: 'Bohemia Race Co.', short: 'BOHEMIA', nat: 'CZE', primary: '#D7141A', secondary: '#11457E', band: 'M', tierId: 4 },
	{ id: 38, name: 'Caledonia RT', short: 'CALEDON', nat: 'GBR', primary: '#005EB8', secondary: '#FFFFFF', band: 'B', tierId: 4 },
	{ id: 39, name: 'Lusitan Works', short: 'LUSITAN', nat: 'PRT', primary: '#006600', secondary: '#FF0000', band: 'B', tierId: 4 },
	{ id: 40, name: 'Skagerrak Racing', short: 'SKAGER', nat: 'NOR', primary: '#BA0C2F', secondary: '#00205B', band: 'B', tierId: 4 },
	{ id: 41, name: 'Midland Juniors', short: 'MIDLAND', nat: 'GBR', primary: '#012169', secondary: '#C8102E', band: 'T', tierId: 5 },
	{ id: 42, name: 'Emilia Rookies', short: 'EMILIA', nat: 'ITA', primary: '#009246', secondary: '#FFFFFF', band: 'T', tierId: 5 },
	{ id: 43, name: 'Rhineland Academy', short: 'RHINE', nat: 'DEU', primary: '#000000', secondary: '#DD0000', band: 'T', tierId: 5 },
	{ id: 44, name: 'Loire Development', short: 'LOIRE', nat: 'FRA', primary: '#002395', secondary: '#FFFFFF', band: 'M', tierId: 5 },
	{ id: 45, name: 'Valencia Pathway', short: 'VALENCIA', nat: 'ESP', primary: '#AA151B', secondary: '#F1BF00', band: 'M', tierId: 5 },
	{ id: 46, name: 'Osaka Feeder', short: 'OSAKA', nat: 'JPN', primary: '#BC002D', secondary: '#FFFFFF', band: 'M', tierId: 5 },
	{ id: 47, name: 'Ohio Valley RT', short: 'OHIO', nat: 'USA', primary: '#3C3B6E', secondary: '#B22234', band: 'M', tierId: 5 },
	{ id: 48, name: 'Flanders Start', short: 'FLANDERS', nat: 'BEL', primary: '#000000', secondary: '#FDDA24', band: 'B', tierId: 5 },
	{ id: 49, name: 'Silesia Juniors', short: 'SILESIA', nat: 'POL', primary: '#DC143C', secondary: '#FFFFFF', band: 'B', tierId: 5 },
	{ id: 50, name: 'Algarve Cadets', short: 'ALGARVE', nat: 'PRT', primary: '#046A38', secondary: '#DA291C', band: 'B', tierId: 5 }
];

/** parent team id → child team id */
export const AFFILIATES: [number, number][] = [
	[1, 43],
	[2, 42],
	[3, 46],
	[4, 41],
	[11, 47],
	[12, 25],
	[31, 48]
];

export const SERIES_ROUNDS: Record<number, number> = {
	1: 22,
	2: 18,
	3: 14,
	4: 12,
	5: 10
};

export const HQ_BY_TIER_BAND: Record<number, Record<Band, number>> = {
	1: { T: 4, M: 3, B: 2 },
	2: { T: 3, M: 2, B: 2 },
	3: { T: 2, M: 2, B: 1 },
	4: { T: 2, M: 1, B: 1 },
	5: { T: 1, M: 1, B: 1 }
};

export const CASH_BASE = [0, 80_000_000, 40_000_000, 20_000_000, 10_000_000, 4_000_000];
export const COST_CAP = [0, 135_000_000, 80_000_000, 45_000_000, 25_000_000, 12_000_000];
export const BAND_CASH_MULT: Record<Band, number> = { T: 1.25, M: 1.0, B: 0.75 };

export const AFFILIATE_BASE: Record<number, number> = {
	2: 25_000_000,
	3: 12_000_000,
	4: 5_000_000,
	5: 2_000_000
};

/** Driver Academy facility_types.id */
export const FACILITY_ACADEMY_ID = 6;

export const COMPONENT_TYPES = [
	'CHASSIS',
	'FRONT_WING',
	'REAR_WING',
	'UNDERBODY',
	'SUSPENSION',
	'BRAKES',
	'ENGINE',
	'TURBOCHARGER',
	'HYBRID_SYSTEM',
	'GEARBOX',
	'COOLING_SYSTEM'
] as const;

export const COMPONENT_WEIGHT_G: Record<(typeof COMPONENT_TYPES)[number], number> = {
	CHASSIS: 72000,
	FRONT_WING: 8500,
	REAR_WING: 9000,
	UNDERBODY: 28000,
	SUSPENSION: 32000,
	BRAKES: 12000,
	ENGINE: 145000,
	TURBOCHARGER: 18000,
	HYBRID_SYSTEM: 35000,
	GEARBOX: 40000,
	COOLING_SYSTEM: 15000
};

/** Baseline part performance by tier × band */
export const PART_PERF_BY_TIER_BAND: Record<number, Record<Band, number>> = {
	1: { T: 88, M: 80, B: 72 },
	2: { T: 78, M: 70, B: 62 },
	3: { T: 68, M: 60, B: 52 },
	4: { T: 58, M: 50, B: 42 },
	5: { T: 48, M: 40, B: 34 }
};

export const DRIVER_ATTRS = [
	'qualifying_pace',
	'pace_consistency',
	'high_speed_courage',
	'throttle_application',
	'grid_launch',
	'apex_precision',
	'smoothness',
	'kerb_riding',
	'street_circuit_affinity',
	'wet_weather_control',
	'late_braking',
	'brake_trailing',
	'lockup_avoidance',
	'corner_entry_speed',
	'brake_bias_management',
	'overtaking_aggression',
	'defensive_positioning',
	'dirty_air_tolerance',
	'spatial_awareness',
	'first_lap_navigation',
	'setup_feedback',
	'tire_preservation',
	'fuel_ers_management',
	'strategy_adaptability',
	'car_preservation',
	'work_ethic',
	'pressure_tolerance',
	'focus',
	'team_player',
	'marketability'
] as const;

export type OverallBand = { race: [number, number]; reserve: [number, number] };

export const OVERALL_BY_TIER: Record<number, OverallBand> = {
	1: { race: [78, 92], reserve: [70, 82] },
	2: { race: [68, 82], reserve: [60, 72] },
	3: { race: [58, 72], reserve: [50, 62] },
	4: { race: [48, 62], reserve: [42, 54] },
	5: { race: [38, 52], reserve: [32, 44] }
};

export const AGE_BY_TIER: Record<number, { race: [number, number]; reserve: [number, number] }> = {
	1: { race: [22, 36], reserve: [18, 28] },
	2: { race: [20, 32], reserve: [18, 26] },
	3: { race: [18, 28], reserve: [17, 24] },
	4: { race: [17, 26], reserve: [16, 22] },
	5: { race: [16, 24], reserve: [16, 20] }
};

export const POTENTIAL_BY_POOL: Record<string, [number, number]> = {
	karting: [60, 99],
	academy: [55, 95],
	fa: [50, 88],
	1: [78, 99],
	2: [70, 97],
	3: [62, 95],
	4: [55, 92],
	5: [50, 90]
};

export const NAT_WEIGHTS: [string, number][] = [
	['GBR', 12],
	['ITA', 10],
	['DEU', 10],
	['FRA', 9],
	['ESP', 8],
	['NLD', 7],
	['BRA', 7],
	['USA', 7],
	['JPN', 6],
	['AUS', 5],
	['MEX', 3],
	['CAN', 3],
	['FIN', 3],
	['DNK', 2],
	['SWE', 2],
	['BEL', 2],
	['AUT', 2],
	['CHE', 2],
	['POL', 2],
	['PRT', 2],
	['ARG', 2],
	['CHN', 2],
	['THA', 1],
	['NZL', 1],
	['ZAF', 1]
];

export type SponsorSeed = {
	id: number;
	name: string;
	tier: 'TITLE_SPONSOR' | 'MAJOR_PARTNER' | 'MINOR_PARTNER';
	stars: number;
};

export const SPONSORS: SponsorSeed[] = [
	{ id: 1, name: 'Apex Dynamics', tier: 'TITLE_SPONSOR', stars: 10 },
	{ id: 2, name: 'Helios Energy', tier: 'TITLE_SPONSOR', stars: 9 },
	{ id: 3, name: 'Vortex Capital', tier: 'TITLE_SPONSOR', stars: 9 },
	{ id: 4, name: 'Northwind Bank', tier: 'TITLE_SPONSOR', stars: 8 },
	{ id: 5, name: 'Orbit Telecom', tier: 'TITLE_SPONSOR', stars: 8 },
	{ id: 6, name: 'Crimson Steel', tier: 'TITLE_SPONSOR', stars: 8 },
	{ id: 7, name: 'Lumen Soft', tier: 'TITLE_SPONSOR', stars: 7 },
	{ id: 8, name: 'Pacific Freight', tier: 'TITLE_SPONSOR', stars: 7 },
	{ id: 9, name: 'Atlas Oil', tier: 'TITLE_SPONSOR', stars: 9 },
	{ id: 10, name: 'Zenith Watch Co', tier: 'TITLE_SPONSOR', stars: 10 },
	{ id: 11, name: 'Stratos Air', tier: 'TITLE_SPONSOR', stars: 7 },
	{ id: 12, name: 'Nova Pharma', tier: 'TITLE_SPONSOR', stars: 8 },
	{ id: 13, name: 'Ironclad Tools', tier: 'MAJOR_PARTNER', stars: 6 },
	{ id: 14, name: 'Blue Peak Water', tier: 'MAJOR_PARTNER', stars: 5 },
	{ id: 15, name: 'Quantix Semicon', tier: 'MAJOR_PARTNER', stars: 7 },
	{ id: 16, name: 'Falcon Logistics', tier: 'MAJOR_PARTNER', stars: 6 },
	{ id: 17, name: 'Silverline Hotels', tier: 'MAJOR_PARTNER', stars: 7 },
	{ id: 18, name: 'Pulse Fitness', tier: 'MAJOR_PARTNER', stars: 4 },
	{ id: 19, name: 'Cascade Motors', tier: 'MAJOR_PARTNER', stars: 6 },
	{ id: 20, name: 'Ember Tire Co', tier: 'MAJOR_PARTNER', stars: 5 },
	{ id: 21, name: 'Harbor Shipping', tier: 'MAJOR_PARTNER', stars: 5 },
	{ id: 22, name: 'Vertex Cloud', tier: 'MAJOR_PARTNER', stars: 8 },
	{ id: 23, name: 'Kinetic Lubricants', tier: 'MAJOR_PARTNER', stars: 4 },
	{ id: 24, name: 'Aurora Media', tier: 'MAJOR_PARTNER', stars: 6 },
	{ id: 25, name: 'Gridlock Insurance', tier: 'MAJOR_PARTNER', stars: 5 },
	{ id: 26, name: 'Summit Brewing', tier: 'MAJOR_PARTNER', stars: 4 },
	{ id: 27, name: 'Pinnacle Optics', tier: 'MAJOR_PARTNER', stars: 7 },
	{ id: 28, name: 'RapidCharge EV', tier: 'MAJOR_PARTNER', stars: 6 },
	{ id: 29, name: 'Stencil Prints', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 30, name: 'Bolt Snacks', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 31, name: 'Echo Headphones', tier: 'MINOR_PARTNER', stars: 4 },
	{ id: 32, name: 'Drift Apparel', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 33, name: 'Nano Polish', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 34, name: 'Cedar Coffee', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 35, name: 'Skyline Drones', tier: 'MINOR_PARTNER', stars: 4 },
	{ id: 36, name: 'Forge Gloves', tier: 'MINOR_PARTNER', stars: 1 },
	{ id: 37, name: 'Pixel Arcade', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 38, name: 'Reef Sunscreen', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 39, name: 'Torque Gum', tier: 'MINOR_PARTNER', stars: 1 },
	{ id: 40, name: 'Lantern LED', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 41, name: 'Cinder BBQ', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 42, name: 'Volt Energy Drink', tier: 'MINOR_PARTNER', stars: 5 },
	{ id: 43, name: 'Marble Finance App', tier: 'MINOR_PARTNER', stars: 4 },
	{ id: 44, name: 'Hawk Sunglasses', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 45, name: 'ParcelNow', tier: 'MINOR_PARTNER', stars: 2 },
	{ id: 46, name: 'Glide Skincare', tier: 'MINOR_PARTNER', stars: 3 },
	{ id: 47, name: 'Rustic Tools', tier: 'MINOR_PARTNER', stars: 1 },
	{ id: 48, name: 'Beacon GPS', tier: 'MINOR_PARTNER', stars: 4 }
];

/** Per-race payout baselines by team tier × sponsor slot */
export const SPONSOR_PAYOUT_BASE: Record<number, Record<'TITLE_SPONSOR' | 'MAJOR_PARTNER' | 'MINOR_PARTNER', number>> = {
	1: { TITLE_SPONSOR: 900_000, MAJOR_PARTNER: 320_000, MINOR_PARTNER: 75_000 },
	2: { TITLE_SPONSOR: 450_000, MAJOR_PARTNER: 160_000, MINOR_PARTNER: 40_000 },
	3: { TITLE_SPONSOR: 220_000, MAJOR_PARTNER: 80_000, MINOR_PARTNER: 22_000 },
	4: { TITLE_SPONSOR: 100_000, MAJOR_PARTNER: 40_000, MINOR_PARTNER: 12_000 },
	5: { TITLE_SPONSOR: 40_000, MAJOR_PARTNER: 18_000, MINOR_PARTNER: 6_000 }
};

export const NAMES: Record<string, { first: string[]; last: string[] }> = {
	GBR: {
		first: ['James', 'Oliver', 'Harry', 'George', 'Jack', 'Charlie', 'Oscar', 'Emily', 'Sophie'],
		last: ['Hartley', 'Whitmore', 'Croft', 'Ashford', 'Bennett', 'Clarke', 'Hayes', 'Porter']
	},
	ITA: {
		first: ['Luca', 'Marco', 'Alessandro', 'Matteo', 'Giulia', 'Sofia', 'Andrea', 'Francesco'],
		last: ['Bianchi', 'Rossi', 'Ferrari', 'Conti', 'Romano', 'Moretti', 'Galli', 'Ricci']
	},
	DEU: {
		first: ['Max', 'Leon', 'Paul', 'Felix', 'Jonas', 'Emma', 'Mia', 'Lukas'],
		last: ['Weber', 'Schmidt', 'Müller', 'Fischer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz']
	},
	FRA: {
		first: ['Louis', 'Hugo', 'Noah', 'Lucas', 'Emma', 'Léa', 'Gabriel', 'Arthur'],
		last: ['Dupont', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefevre', 'Roux', 'Fournier']
	},
	ESP: {
		first: ['Carlos', 'Pablo', 'Diego', 'Javier', 'Lucia', 'Maria', 'Sergio', 'Alvaro'],
		last: ['Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Perez', 'Gonzalez', 'Ruiz', 'Torres']
	},
	NLD: {
		first: ['Lars', 'Daan', 'Sem', 'Finn', 'Emma', 'Sophie', 'Max', 'Noah'],
		last: ['de Vries', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos']
	},
	BRA: {
		first: ['Pedro', 'Lucas', 'Gabriel', 'Felipe', 'Ana', 'Julia', 'Rafael', 'Bruno'],
		last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Almeida', 'Ferreira']
	},
	USA: {
		first: ['Logan', 'Mason', 'Ethan', 'Aiden', 'Olivia', 'Ava', 'Jackson', 'Carter'],
		last: ['Miller', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Wilson', 'Anderson']
	},
	JPN: {
		first: ['Haruto', 'Yuto', 'Sota', 'Ren', 'Yui', 'Hina', 'Riku', 'Kaito'],
		last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura']
	},
	AUS: {
		first: ['Jack', 'Noah', 'William', 'Olivia', 'Charlotte', 'Liam', 'Henry', 'Isla'],
		last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Thomas']
	},
	DEFAULT: {
		first: ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Quinn', 'Avery'],
		last: ['Knight', 'Storm', 'Rivera', 'Brooks', 'Reed', 'Fox', 'Stone', 'Lane']
	}
};
