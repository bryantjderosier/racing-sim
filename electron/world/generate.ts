import type { DuckDBConnection } from '@duckdb/node-api';
import {
	AFFILIATE_BASE,
	AFFILIATES,
	AGE_BY_TIER,
	BAND_CASH_MULT,
	CASH_BASE,
	CIRCUITS,
	COMPONENT_TYPES,
	COMPONENT_WEIGHT_G,
	COST_CAP,
	DRIVER_ATTRS,
	FACILITY_ACADEMY_ID,
	HQ_BY_TIER_BAND,
	NAMES,
	NAT_WEIGHTS,
	OVERALL_BY_TIER,
	PART_PERF_BY_TIER_BAND,
	POTENTIAL_BY_POOL,
	SERIES_ROUNDS,
	SPONSOR_PAYOUT_BASE,
	SPONSORS,
	TEAMS,
	type Band,
	type TeamSeed
} from './data.js';
import { createRng, type Rng } from './rng.js';
import { lit, run, runMany } from './sql.js';

export type NewGameOptions = {
	saveDisplayName?: string;
	playerDisplayName: string;
	playerTeamId: number;
	seasonYear?: number;
	seed?: number;
};

const COMPOUNDS = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;

function clamp(n: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, n));
}

function wearBandTriple(wear: number): [number, number, number] {
	if (wear < 0.9) return [5, 4, 3];
	if (wear <= 1.1) return [4, 3, 2];
	return [3, 2, 1];
}

function shiftSofter(triple: [number, number, number], steps: number): [number, number, number] {
	let [s, m, h] = triple;
	for (let i = 0; i < steps; i++) {
		const ns = Math.min(5, s + 1);
		const nm = Math.min(5, m + 1);
		const nh = Math.min(5, h + 1);
		if (!(ns > nm && nm > nh)) break;
		s = ns;
		m = nm;
		h = nh;
	}
	return [s, m, h];
}

function pickNat(rng: Rng, teamNat?: string): string {
	if (teamNat && rng.next() < 0.15) return teamNat;
	const total = NAT_WEIGHTS.reduce((a, [, w]) => a + w, 0);
	let roll = rng.next() * total;
	for (const [nat, w] of NAT_WEIGHTS) {
		roll -= w;
		if (roll <= 0) return nat;
	}
	return 'GBR';
}

function pickName(rng: Rng, nat: string): { first: string; last: string } {
	const pool = NAMES[nat] ?? NAMES.DEFAULT!;
	return { first: rng.pick(pool.first), last: rng.pick(pool.last) };
}

function birthDate(seasonYear: number, age: number, rng: Rng): string {
	const year = seasonYear - age;
	const month = rng.int(1, 12);
	const day = rng.int(1, 28);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function rollOverallInRange(rng: Rng, lo: number, hi: number, band: Band): number {
	const span = hi - lo;
	const bias = band === 'T' ? 0.65 : band === 'B' ? 0.35 : 0.5;
	const centered = lo + Math.floor(span * (bias + (rng.next() - 0.5) * 0.5));
	return clamp(centered, lo, hi);
}

function rollPotential(rng: Rng, pool: string, current: number, age: number): number {
	const [plo, phi] = POTENTIAL_BY_POOL[pool] ?? [50, 90];
	let pot = rng.int(plo, phi);
	if (age >= 30) pot = Math.min(pot, current + rng.int(0, 6));
	return Math.max(pot, current);
}

function attrValues(rng: Rng, overall: number): number[] {
	return DRIVER_ATTRS.map(() => clamp(overall + rng.int(-8, 8), 1, 100));
}

function stubSalary(tierId: number, overall: number, kind: 'race' | 'reserve' | 'academy' | 'staff' = 'race'): number {
	const tierBase = [0, 2_000_000, 600_000, 200_000, 80_000, 30_000][tierId] ?? 30_000;
	const scaled = tierBase * (overall / 50) ** 2;
	const mult = kind === 'academy' ? 0.4 : kind === 'reserve' ? 0.55 : kind === 'staff' ? 0.35 : 1;
	return Math.round(scaled * mult);
}

function academyLevel(team: TeamSeed): number | null {
	if (team.tierId === 1) return team.band === 'T' ? 2 : 1;
	if (team.tierId === 2 && team.band === 'T') return 1;
	return null;
}

function academySeats(level: number): number {
	return level === 1 ? 2 : level === 2 ? 3 : 4;
}

async function clearWorld(conn: DuckDBConnection) {
	await runMany(conn, [
		`UPDATE game_state SET player_team_id = NULL, player_status = 'UNEMPLOYED' WHERE id = 1`,
		'DELETE FROM player_tenures',
		'DELETE FROM inbox_messages',
		'DELETE FROM circuit_compound_maps',
		'DELETE FROM circuit_weather_profile',
		'DELETE FROM calendar_events',
		'DELETE FROM team_sponsors',
		'DELETE FROM team_sponsor_market_reputation',
		'DELETE FROM team_affiliations',
		'DELETE FROM team_roster',
		'DELETE FROM contracts',
		'DELETE FROM development_projects',
		'DELETE FROM facility_projects',
		'DELETE FROM cars',
		'DELETE FROM car_components',
		'DELETE FROM component_expertise',
		'DELETE FROM team_facilities',
		'DELETE FROM team_finances',
		'DELETE FROM driver_attributes',
		'DELETE FROM drivers',
		'DELETE FROM personnel',
		'DELETE FROM teams',
		'DELETE FROM sponsors',
		'DELETE FROM circuits',
		'DELETE FROM facility_types'
	]);
}

async function seedFacilities(conn: DuckDBConnection) {
	await run(
		conn,
		`INSERT INTO facility_types VALUES
		(1, 'Wind Tunnel', 'AERODYNAMICS', 'Physical aero development', 8000000, 400000, 5),
		(2, 'CFD Cluster', 'AERODYNAMICS', 'Computational aero capacity', 5000000, 250000, 5),
		(3, 'Engine Dyno', 'POWERTRAIN', 'Power unit test bed', 6000000, 300000, 5),
		(4, 'Driver Simulator', 'VEHICLE_DYNAMICS', 'Setup and driver prep', 3500000, 150000, 5),
		(5, 'Design Office', 'OPERATIONS', 'Engineering throughput', 4000000, 200000, 5),
		(${FACILITY_ACADEMY_ID}, 'Driver Academy', 'YOUTH', 'Junior driver development seats', 2500000, 120000, 3)`
	);
}

async function seedCircuits(conn: DuckDBConnection) {
	const values = CIRCUITS.map(
		(c) =>
			`(${c.id}, ${lit(c.name)}, ${lit(c.city)}, ${lit(c.country)}, '${c.trackType}', ${c.lapM}, ${c.pitMs}, ${c.wear}, ${c.fuel}, ${c.brake}, '${c.downforce}')`
	).join(',\n');
	await run(
		conn,
		`INSERT INTO circuits (id, name, location_city, location_country, track_type, lap_length_meters, base_pit_loss_ms, tire_wear_modifier, fuel_burn_modifier, brake_strain_modifier, downforce_demand) VALUES ${values}`
	);
}

async function seedWeatherProfiles(conn: DuckDBConnection) {
	type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
	const seasons: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
	const defaults: Record<
		string,
		Record<Season, { min: number; max: number; vol: number; precip: Record<string, number>; wind: Record<string, number> }>
	> = {
		temperate: {
			SPRING: { min: 8, max: 18, vol: 1.1, precip: { clear: 0.45, light: 0.3, heavy: 0.15, storm: 0.1 }, wind: { mean_kph: 14, gust_kph: 28 } },
			SUMMER: { min: 16, max: 28, vol: 0.9, precip: { clear: 0.55, light: 0.25, heavy: 0.15, storm: 0.05 }, wind: { mean_kph: 12, gust_kph: 24 } },
			AUTUMN: { min: 7, max: 16, vol: 1.2, precip: { clear: 0.35, light: 0.35, heavy: 0.2, storm: 0.1 }, wind: { mean_kph: 16, gust_kph: 32 } },
			WINTER: { min: 0, max: 10, vol: 1.15, precip: { clear: 0.4, light: 0.35, heavy: 0.2, storm: 0.05 }, wind: { mean_kph: 18, gust_kph: 35 } }
		},
		cool: {
			SPRING: { min: 2, max: 12, vol: 1.2, precip: { clear: 0.35, light: 0.35, heavy: 0.2, storm: 0.1 }, wind: { mean_kph: 16, gust_kph: 30 } },
			SUMMER: { min: 10, max: 22, vol: 1.0, precip: { clear: 0.5, light: 0.3, heavy: 0.15, storm: 0.05 }, wind: { mean_kph: 14, gust_kph: 26 } },
			AUTUMN: { min: 1, max: 11, vol: 1.25, precip: { clear: 0.3, light: 0.35, heavy: 0.25, storm: 0.1 }, wind: { mean_kph: 18, gust_kph: 34 } },
			WINTER: { min: -12, max: 2, vol: 1.3, precip: { clear: 0.35, light: 0.35, heavy: 0.25, storm: 0.05 }, wind: { mean_kph: 20, gust_kph: 38 } }
		},
		tropical: {
			SPRING: { min: 24, max: 32, vol: 1.15, precip: { clear: 0.35, light: 0.3, heavy: 0.2, storm: 0.15 }, wind: { mean_kph: 12, gust_kph: 28 } },
			SUMMER: { min: 26, max: 34, vol: 1.25, precip: { clear: 0.25, light: 0.3, heavy: 0.25, storm: 0.2 }, wind: { mean_kph: 14, gust_kph: 40 } },
			AUTUMN: { min: 24, max: 32, vol: 1.2, precip: { clear: 0.3, light: 0.3, heavy: 0.25, storm: 0.15 }, wind: { mean_kph: 12, gust_kph: 30 } },
			WINTER: { min: 22, max: 30, vol: 0.95, precip: { clear: 0.45, light: 0.3, heavy: 0.15, storm: 0.1 }, wind: { mean_kph: 10, gust_kph: 22 } }
		},
		hot_dry: {
			SPRING: { min: 16, max: 30, vol: 0.85, precip: { clear: 0.7, light: 0.2, heavy: 0.08, storm: 0.02 }, wind: { mean_kph: 18, gust_kph: 36 } },
			SUMMER: { min: 28, max: 42, vol: 0.8, precip: { clear: 0.8, light: 0.15, heavy: 0.04, storm: 0.01 }, wind: { mean_kph: 16, gust_kph: 34 } },
			AUTUMN: { min: 18, max: 32, vol: 0.9, precip: { clear: 0.7, light: 0.2, heavy: 0.08, storm: 0.02 }, wind: { mean_kph: 16, gust_kph: 32 } },
			WINTER: { min: 8, max: 22, vol: 0.95, precip: { clear: 0.75, light: 0.18, heavy: 0.05, storm: 0.02 }, wind: { mean_kph: 14, gust_kph: 28 } }
		}
	};

	let id = 1;
	const rows: string[] = [];
	for (const c of CIRCUITS) {
		const band = defaults[c.climate]!;
		for (const season of seasons) {
			const d = band[season];
			rows.push(
				`(${id++}, ${c.id}, '${season}', ${d.min}, ${d.max}, ${d.vol}, '${JSON.stringify(d.precip).replaceAll("'", "''")}'::JSON, '${JSON.stringify(d.wind).replaceAll("'", "''")}'::JSON)`
			);
		}
	}
	await run(
		conn,
		`INSERT INTO circuit_weather_profile (id, circuit_id, calendar_season, expected_min_temp_c, expected_max_temp_c, weather_volatility, precipitation_weights, wind_profile_config) VALUES ${rows.join(',\n')}`
	);
}

async function seedCompounds(conn: DuckDBConnection) {
	const clean: string[] = [];
	for (const c of CIRCUITS) {
		const base = wearBandTriple(c.wear);
		for (let seriesId = 1; seriesId <= 5; seriesId++) {
			const [s, m, h] = shiftSofter(base, seriesId - 1);
			clean.push(
				`(${c.id}, ${seriesId}, '${COMPOUNDS[s - 1]}', '${COMPOUNDS[m - 1]}', '${COMPOUNDS[h - 1]}', FALSE)`
			);
		}
	}
	await run(
		conn,
		`INSERT INTO circuit_compound_maps (circuit_id, series_id, soft_core, medium_core, hard_core, is_override) VALUES ${clean.join(',\n')}`
	);
}

async function seedTeams(conn: DuckDBConnection, seasonYear: number) {
	const teamRows = TEAMS.map((t) => {
		const hq = HQ_BY_TIER_BAND[t.tierId]![t.band];
		return `(${t.id}, ${lit(t.name)}, ${lit(t.short)}, ${lit(t.nat)}, ${lit(t.primary)}, ${lit(t.secondary)}, 'UNMANAGED_AI', ${t.tierId}, 40, 0, ${hq})`;
	}).join(',\n');
	await run(
		conn,
		`INSERT INTO teams (id, name, short_name, nationality, primary_color, secondary_color, status, tier_id, wind_tunnel_hours, cfd_capacity_flops, hq_level) VALUES ${teamRows}`
	);

	const finRows = TEAMS.map((t) => {
		const cash = Math.round(CASH_BASE[t.tierId]! * BAND_CASH_MULT[t.band]);
		const cap = COST_CAP[t.tierId]!;
		return `(${t.id}, ${cash}, 0, ${cap}, ${seasonYear})`;
	}).join(',\n');
	await run(
		conn,
		`INSERT INTO team_finances (team_id, cash_balance, current_cost_cap_spent, max_cost_cap_limit, season_id) VALUES ${finRows}`
	);

	const facRows: string[] = [];
	let facId = 1;
	for (const t of TEAMS) {
		const hq = HQ_BY_TIER_BAND[t.tierId]![t.band];
		for (const typeId of [1, 2, 3, 4, 5]) {
			facRows.push(`(${facId++}, ${t.id}, ${typeId}, ${seasonYear}, ${Math.max(1, hq - 1)}, 100.00, FALSE)`);
		}
		const acad = academyLevel(t);
		if (acad !== null) {
			facRows.push(`(${facId++}, ${t.id}, ${FACILITY_ACADEMY_ID}, ${seasonYear}, ${acad}, 100.00, FALSE)`);
		}
	}
	await run(
		conn,
		`INSERT INTO team_facilities (id, team_id, facility_type_id, season_id, current_level, facility_condition, is_shut_down) VALUES ${facRows.join(',\n')}`
	);

	const affRows = AFFILIATES.map(([parent, child], i) => {
		const childTeam = TEAMS.find((t) => t.id === child)!;
		const base = AFFILIATE_BASE[childTeam.tierId] ?? 2_000_000;
		return `(${i + 1}, ${parent}, ${child}, ${seasonYear}, NULL, 'ACTIVE', ${base}, 0)`;
	}).join(',\n');
	await run(
		conn,
		`INSERT INTO team_affiliations (id, parent_team_id, child_team_id, start_season, end_season, status, fixed_base_subsidy, top_up_amount) VALUES ${affRows}`
	);
}

async function seedSponsors(conn: DuckDBConnection, rng: Rng, seasonYear: number) {
	const sponsorRows = SPONSORS.map((s) => {
		const upfront = s.tier === 'TITLE_SPONSOR' ? 5_000_000 : s.tier === 'MAJOR_PARTNER' ? 1_500_000 : 250_000;
		const perRace = s.tier === 'TITLE_SPONSOR' ? 400_000 : s.tier === 'MAJOR_PARTNER' ? 120_000 : 30_000;
		const rep = Math.max(1, Math.round(s.stars * 8));
		return `(${s.id}, ${lit(s.name)}, '${s.tier}', ${s.stars}, ${rep}, ${upfront}, ${perRace}, NULL, NULL, 0, 2)`;
	}).join(',\n');
	await run(
		conn,
		`INSERT INTO sponsors (id, name, tier, star_rating, min_reputation_req, base_upfront_payment, base_per_race_payout, objective_type, objective_threshold, objective_bonus, deal_duration_seasons) VALUES ${sponsorRows}`
	);

	const titles = SPONSORS.filter((s) => s.tier === 'TITLE_SPONSOR');
	const majors = SPONSORS.filter((s) => s.tier === 'MAJOR_PARTNER');
	const minors = SPONSORS.filter((s) => s.tier === 'MINOR_PARTNER');
	const affiliateChildIds = new Set(AFFILIATES.map(([, child]) => child));
	const parentByChild = new Map(AFFILIATES.map(([p, c]) => [c, p]));

	const starMult = (stars: number) => 0.7 + (stars / 10) * 0.6;

	let dealId = 1;
	for (const team of TEAMS) {
		const bandMult = BAND_CASH_MULT[team.band];
		const pay = SPONSOR_PAYOUT_BASE[team.tierId]!;

		if (affiliateChildIds.has(team.id)) {
			const parentId = parentByChild.get(team.id)!;
			await run(
				conn,
				`INSERT INTO team_sponsors (id, team_id, sponsor_id, assigned_slot, slot_index, start_season_id, duration_seasons, seasons_remaining, actual_per_race_payout, is_ownership_affiliate, parent_team_id) VALUES (${dealId++}, ${team.id}, NULL, 'TITLE_SPONSOR', 1, ${seasonYear}, 5, 5, 0, TRUE, ${parentId})`
			);
		} else {
			const title = rng.pick(titles);
			const dur = rng.int(2, 4);
			const payout = Math.round(pay.TITLE_SPONSOR * bandMult * starMult(title.stars));
			await run(
				conn,
				`INSERT INTO team_sponsors (id, team_id, sponsor_id, assigned_slot, slot_index, start_season_id, duration_seasons, seasons_remaining, actual_per_race_payout, is_ownership_affiliate, parent_team_id) VALUES (${dealId++}, ${team.id}, ${title.id}, 'TITLE_SPONSOR', 1, ${seasonYear}, ${dur}, ${dur}, ${payout}, FALSE, NULL)`
			);
		}

		const major = rng.pick(majors);
		const majorDur = rng.int(1, 3);
		await run(
			conn,
			`INSERT INTO team_sponsors (id, team_id, sponsor_id, assigned_slot, slot_index, start_season_id, duration_seasons, seasons_remaining, actual_per_race_payout, is_ownership_affiliate, parent_team_id) VALUES (${dealId++}, ${team.id}, ${major.id}, 'MAJOR_PARTNER', 1, ${seasonYear}, ${majorDur}, ${majorDur}, ${Math.round(pay.MAJOR_PARTNER * bandMult * starMult(major.stars))}, FALSE, NULL)`
		);

		const minorCount = rng.int(1, 2);
		const shuffledMinors = rng.shuffle(minors);
		for (let i = 0; i < minorCount; i++) {
			const minor = shuffledMinors[i]!;
			const minorDur = rng.int(1, 2);
			await run(
				conn,
				`INSERT INTO team_sponsors (id, team_id, sponsor_id, assigned_slot, slot_index, start_season_id, duration_seasons, seasons_remaining, actual_per_race_payout, is_ownership_affiliate, parent_team_id) VALUES (${dealId++}, ${team.id}, ${minor.id}, 'MINOR_PARTNER', ${i + 1}, ${seasonYear}, ${minorDur}, ${minorDur}, ${Math.round(pay.MINOR_PARTNER * bandMult * starMult(minor.stars))}, FALSE, NULL)`
			);
		}
	}

	const repBase = [0, 70, 58, 48, 40, 35];
	const bandDelta: Record<Band, number> = { T: 8, M: 0, B: -8 };
	const repRows = TEAMS.map((t) => {
		const score = clamp(repBase[t.tierId]! + bandDelta[t.band], 1, 100);
		const fans = clamp(score - 5, 1, 100);
		return `(${t.id}, ${seasonYear}, ${score}, ${fans}, 1.00, 0)`;
	}).join(',\n');
	await run(
		conn,
		`INSERT INTO team_sponsor_market_reputation (team_id, season_id, reputation_score, fanbase_popularity_index, leverage_coefficient, recent_trend_delta) VALUES ${repRows}`
	);
}

async function seedCars(conn: DuckDBConnection, rng: Rng, seasonYear: number) {
	let componentId = 1;
	let carId = 1;
	const colByType: Record<(typeof COMPONENT_TYPES)[number], string> = {
		CHASSIS: 'chassis_part_id',
		FRONT_WING: 'front_wing_part_id',
		REAR_WING: 'rear_wing_part_id',
		UNDERBODY: 'underbody_part_id',
		SUSPENSION: 'suspension_part_id',
		BRAKES: 'brakes_part_id',
		ENGINE: 'engine_part_id',
		TURBOCHARGER: 'turbocharger_part_id',
		HYBRID_SYSTEM: 'hybrid_system_part_id',
		GEARBOX: 'gearbox_part_id',
		COOLING_SYSTEM: 'cooling_system_part_id'
	};

	for (const team of TEAMS) {
		const basePerf = PART_PERF_BY_TIER_BAND[team.tierId]![team.band];
		for (const carNumber of [1, 2]) {
			const partIds: number[] = [];
			for (const type of COMPONENT_TYPES) {
				const id = componentId++;
				partIds.push(id);
				const perf = clamp(basePerf + rng.int(-3, 3), 1, 100);
				const reliability = clamp(55 + rng.int(-5, 5), 1, 100);
				await run(
					conn,
					`INSERT INTO car_components (id, team_id, component_type, season_id, performance_rating, reliability_rating, weight_g, current_wear, status) VALUES (${id}, ${team.id}, '${type}', ${seasonYear}, ${perf}, ${reliability}, ${COMPONENT_WEIGHT_G[type]}, 0.00, 'INSTALLED')`
				);
			}
			const cols = COMPONENT_TYPES.map((t) => colByType[t]).join(', ');
			const vals = partIds.join(', ');
			await run(
				conn,
				`INSERT INTO cars (id, team_id, car_number, season_id, chassis_name, structural_condition, energy_store_soc, ${cols}) VALUES (${carId++}, ${team.id}, ${carNumber}, ${seasonYear}, ${lit(`${team.short}-${carNumber}`)}, 100.00, 100.00, ${vals})`
			);
		}
	}
}

async function seedComponentExpertise(conn: DuckDBConnection, rng: Rng, seasonYear: number) {
	let id = 1;
	const rows: string[] = [];
	for (const team of TEAMS) {
		const base = PART_PERF_BY_TIER_BAND[team.tierId]![team.band];
		for (const type of COMPONENT_TYPES) {
			const expertise = clamp(base + rng.int(-5, 5), 1, 100);
			const maxRel = clamp(expertise + 15, 1, 100);
			rows.push(`(${id++}, ${team.id}, '${type}', ${expertise}, ${maxRel}, ${seasonYear})`);
		}
	}
	await run(
		conn,
		`INSERT INTO component_expertise (id, team_id, component_type, expertise_rating, max_reliability_cap, season_id) VALUES ${rows.join(',\n')}`
	);
}

type IdCounter = { driver: number; staff: number; contract: number; roster: number };

async function insertDriver(
	conn: DuckDBConnection,
	ids: IdCounter,
	rng: Rng,
	opts: {
		seasonYear: number;
		age: number;
		overall: number;
		potential: number;
		nat: string;
		stage: 'KARTING' | 'SINGLE_SEATER';
	}
): Promise<number> {
	const id = ids.driver++;
	const { first, last } = pickName(rng, opts.nat);
	const gender = rng.next() < 0.12 ? 'FEMALE' : 'MALE';
	const height = rng.int(165, 188);
	const weight = rng.int(58, 78);
	await run(
		conn,
		`INSERT INTO drivers (id, first_name, last_name, nationality, birth_date, gender, height_cm, weight_kg, generation_season, career_stage, current_overall, potential_overall, is_retired) VALUES (${id}, ${lit(first)}, ${lit(last)}, ${lit(opts.nat)}, ${lit(birthDate(opts.seasonYear, opts.age, rng))}, '${gender}', ${height}, ${weight}, ${opts.seasonYear}, '${opts.stage}', ${opts.overall}, ${opts.potential}, FALSE)`
	);
	const attrs = attrValues(rng, opts.overall);
	await run(
		conn,
		`INSERT INTO driver_attributes (driver_id, ${DRIVER_ATTRS.join(', ')}) VALUES (${id}, ${attrs.join(', ')})`
	);
	return id;
}

async function seatStaff(
	conn: DuckDBConnection,
	ids: IdCounter,
	rng: Rng,
	team: TeamSeed,
	seasonYear: number,
	includePrincipal: boolean
) {
	const roles: { role: string; seat: string; specialty: string | null }[] = [
		{ role: 'TECHNICAL_DIRECTOR', seat: 'BOX_TECHNICAL_DIRECTOR', specialty: 'AERO_FOCUS' },
		{ role: 'HEAD_OF_AERODYNAMICS', seat: 'BOX_AERO_CHIEF', specialty: 'AERO_FOCUS' },
		{ role: 'RACE_ENGINEER', seat: 'CAR_1_RACE_ENGINEER', specialty: 'CHASSIS_FOCUS' },
		{ role: 'RACE_ENGINEER', seat: 'CAR_2_RACE_ENGINEER', specialty: 'CHASSIS_FOCUS' },
		{ role: 'CHIEF_SCOUT', seat: 'BOX_CHIEF_SCOUT', specialty: 'YOUTH_SCOUTING' }
	];
	if (includePrincipal) {
		roles.unshift({ role: 'TEAM_PRINCIPAL', seat: 'BOX_TEAM_PRINCIPAL', specialty: 'SPONSOR_NEGOTIATION' });
	}

	const skillBase = OVERALL_BY_TIER[team.tierId]!.race;
	for (const r of roles) {
		const staffId = ids.staff++;
		const nat = pickNat(rng, team.nat);
		const { first, last } = pickName(rng, nat);
		const skill = rollOverallInRange(rng, skillBase[0], skillBase[1], team.band);
		const pot = Math.min(99, skill + rng.int(0, 10));
		const age = rng.int(32, 58);
		await run(
			conn,
			`INSERT INTO personnel (id, first_name, last_name, nationality, birth_date, gender, role, specialty, true_skill, true_potential, generation_season, is_retired) VALUES (${staffId}, ${lit(first)}, ${lit(last)}, ${lit(nat)}, ${lit(birthDate(seasonYear, age, rng))}, 'MALE', '${r.role}', ${r.specialty ? lit(r.specialty) : 'NULL'}, ${skill}, ${pot}, ${seasonYear}, FALSE)`
		);
		const contractId = ids.contract++;
		const years = rng.int(1, 3);
		await run(
			conn,
			`INSERT INTO contracts (id, team_id, employee_type, staff_id, staff_role, start_season, end_season, base_salary_per_year, is_active) VALUES (${contractId}, ${team.id}, 'STAFF', ${staffId}, '${r.role}', ${seasonYear}, ${seasonYear + years - 1}, ${stubSalary(team.tierId, skill, 'staff')}, TRUE)`
		);
		const rosterId = ids.roster++;
		await run(
			conn,
			`INSERT INTO team_roster (id, team_id, employee_type, staff_id, assigned_seat, season_id) VALUES (${rosterId}, ${team.id}, 'STAFF', ${staffId}, '${r.seat}', ${seasonYear})`
		);
	}
}

async function seedDriversAndStaff(
	conn: DuckDBConnection,
	rng: Rng,
	seasonYear: number,
	playerTeamId: number
) {
	const ids: IdCounter = { driver: 1, staff: 1, contract: 1, roster: 1 };

	for (const team of TEAMS) {
		await seatStaff(conn, ids, rng, team, seasonYear, team.id !== playerTeamId);

		const ages = AGE_BY_TIER[team.tierId]!;
		const ov = OVERALL_BY_TIER[team.tierId]!;
		const seats: { role: string; seat: string; ageRange: [number, number]; ovRange: [number, number]; years: [number, number]; pay: 'race' | 'reserve' }[] = [
			{ role: 'FIRST_DRIVER', seat: 'CAR_1_PRIMARY', ageRange: ages.race, ovRange: ov.race, years: [1, 3], pay: 'race' },
			{ role: 'SECOND_DRIVER', seat: 'CAR_2_PRIMARY', ageRange: ages.race, ovRange: ov.race, years: [1, 3], pay: 'race' },
			{ role: 'RESERVE_DRIVER', seat: 'RESERVE_SEAT', ageRange: ages.reserve, ovRange: ov.reserve, years: [1, 2], pay: 'reserve' }
		];

		const overalls: number[] = [];
		for (const s of seats) {
			const age = rng.int(s.ageRange[0], s.ageRange[1]);
			let overall = rollOverallInRange(rng, s.ovRange[0], s.ovRange[1], team.band);
			if (overalls.length && overall > overalls[overalls.length - 1]!) {
				overall = overalls[overalls.length - 1]!;
			}
			overalls.push(overall);
			const potential = rollPotential(rng, String(team.tierId), overall, age);
			const nat = pickNat(rng, team.nat);
			const driverId = await insertDriver(conn, ids, rng, {
				seasonYear,
				age,
				overall,
				potential,
				nat,
				stage: 'SINGLE_SEATER'
			});
			const years = rng.int(s.years[0], s.years[1]);
			const contractId = ids.contract++;
			await run(
				conn,
				`INSERT INTO contracts (id, team_id, employee_type, driver_id, driver_role, start_season, end_season, base_salary_per_year, is_active) VALUES (${contractId}, ${team.id}, 'DRIVER', ${driverId}, '${s.role}', ${seasonYear}, ${seasonYear + years - 1}, ${stubSalary(team.tierId, overall, s.pay)}, TRUE)`
			);
			const rosterId = ids.roster++;
			await run(
				conn,
				`INSERT INTO team_roster (id, team_id, employee_type, driver_id, assigned_seat, season_id) VALUES (${rosterId}, ${team.id}, 'DRIVER', ${driverId}, '${s.seat}', ${seasonYear})`
			);
		}

		const acad = academyLevel(team);
		if (acad !== null) {
			const n = academySeats(acad);
			const reserveFloor = ov.reserve[0];
			for (let i = 0; i < n; i++) {
				const age = rng.int(16, 22);
				const overall = rng.int(Math.max(25, reserveFloor - 18), Math.max(30, reserveFloor - 4));
				const potential = rollPotential(rng, 'academy', overall, age);
				const nat = pickNat(rng, team.nat);
				const driverId = await insertDriver(conn, ids, rng, {
					seasonYear,
					age,
					overall,
					potential,
					nat,
					stage: 'SINGLE_SEATER'
				});
				const years = rng.int(2, 4);
				const contractId = ids.contract++;
				await run(
					conn,
					`INSERT INTO contracts (id, team_id, employee_type, driver_id, driver_role, start_season, end_season, base_salary_per_year, is_active) VALUES (${contractId}, ${team.id}, 'DRIVER', ${driverId}, 'ACADEMY_DRIVER', ${seasonYear}, ${seasonYear + years - 1}, ${stubSalary(team.tierId, overall, 'academy')}, TRUE)`
				);
				const rosterId = ids.roster++;
				await run(
					conn,
					`INSERT INTO team_roster (id, team_id, employee_type, driver_id, assigned_seat, season_id) VALUES (${rosterId}, ${team.id}, 'DRIVER', ${driverId}, 'ACADEMY_SEAT_${i + 1}', ${seasonYear})`
				);
			}
		}
	}

	// Free agents ~45
	for (let i = 0; i < 45; i++) {
		const age = rng.int(18, 34);
		const overall = rng.int(35, 60);
		const potential = rollPotential(rng, 'fa', overall, age);
		await insertDriver(conn, ids, rng, {
			seasonYear,
			age,
			overall,
			potential,
			nat: pickNat(rng),
			stage: 'SINGLE_SEATER'
		});
	}

	// Karting 90
	for (let i = 0; i < 90; i++) {
		const age = rng.int(14, 18);
		const overall = rng.int(28, 45);
		const potential = rollPotential(rng, 'karting', overall, age);
		await insertDriver(conn, ids, rng, {
			seasonYear,
			age,
			overall,
			potential,
			nat: pickNat(rng),
			stage: 'KARTING'
		});
	}

	// Free-agent staff ~25
	const staffRoles = ['TECHNICAL_DIRECTOR', 'HEAD_OF_AERODYNAMICS', 'RACE_ENGINEER', 'CHIEF_SCOUT', 'TEAM_PRINCIPAL'] as const;
	for (let i = 0; i < 25; i++) {
		const staffId = ids.staff++;
		const role = rng.pick([...staffRoles]);
		const nat = pickNat(rng);
		const { first, last } = pickName(rng, nat);
		const skill = rng.int(40, 75);
		await run(
			conn,
			`INSERT INTO personnel (id, first_name, last_name, nationality, birth_date, gender, role, specialty, true_skill, true_potential, generation_season, is_retired) VALUES (${staffId}, ${lit(first)}, ${lit(last)}, ${lit(nat)}, ${lit(birthDate(seasonYear, rng.int(30, 55), rng))}, 'MALE', '${role}', NULL, ${skill}, ${Math.min(99, skill + rng.int(0, 12))}, ${seasonYear}, FALSE)`
		);
	}
}

async function seedCalendar(conn: DuckDBConnection, rng: Rng, seasonYear: number) {
	let eventId = 1;
	const circuitWeek = new Set<string>(); // `${week}:${circuitId}`

	const testCounts: Record<number, number> = { 1: 3, 2: 2, 3: 2, 4: 1, 5: 1 };
	const testVenues = [14, 15, 23, 9, 10, 16, 17];
	for (let seriesId = 1; seriesId <= 5; seriesId++) {
		const count = testCounts[seriesId]!;
		for (let i = 0; i < count; i++) {
			const week = i + 1;
			let circuitId: number | null = null;
			for (const candidate of testVenues) {
				const key = `${week}:${candidate}`;
				if (!circuitWeek.has(key)) {
					circuitId = candidate;
					circuitWeek.add(key);
					break;
				}
			}
			if (circuitId === null) continue;
			const start = `${seasonYear}-01-${String(7 + i * 7).padStart(2, '0')} 10:00:00`;
			await run(
				conn,
				`INSERT INTO calendar_events (id, series_id, season_id, week_id, round_number, event_type, circuit_id, status, scheduled_start_date) VALUES (${eventId++}, ${seriesId}, ${seasonYear}, ${week}, NULL, 'PRE_SEASON_TEST', ${circuitId}, 'SCHEDULED', ${lit(start)})`
			);
		}
	}

	const maxBackToBack: Record<number, number> = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2 };

	for (let seriesId = 1; seriesId <= 5; seriesId++) {
		const rounds = SERIES_ROUNDS[seriesId]!;
		const pool = rng.shuffle(CIRCUITS.map((c) => c.id)).slice(0, rounds);
		const weeks: number[] = [];
		let cursor = 4;
		let b2b = 0;
		const maxB2b = maxBackToBack[seriesId]!;

		for (let r = 0; r < rounds; r++) {
			let placed = false;
			for (let attempt = 0; attempt < 80 && !placed; attempt++) {
				const gap = b2b >= maxB2b || rng.next() > 0.2 ? rng.int(2, 3) : 1;
				const week = Math.min(48, cursor + (attempt === 0 ? 0 : attempt));
				const circuitId = pool[r]!;
				const key = `${week}:${circuitId}`;
				const seriesWeekTaken = weeks.includes(week);
				if (week > 48 || seriesWeekTaken || circuitWeek.has(key)) continue;

				const prev = weeks[weeks.length - 1];
				if (prev !== undefined && week === prev + 1) {
					if (b2b >= maxB2b) continue;
					b2b++;
				} else {
					b2b = 0;
				}

				weeks.push(week);
				circuitWeek.add(key);
				cursor = week + gap;
				placed = true;

				const month = Math.min(12, 2 + Math.floor((week - 1) / 4));
				const day = 1 + ((week * 3) % 27);
				const start = `${seasonYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 14:00:00`;
				await run(
					conn,
					`INSERT INTO calendar_events (id, series_id, season_id, week_id, round_number, event_type, circuit_id, status, scheduled_start_date) VALUES (${eventId++}, ${seriesId}, ${seasonYear}, ${week}, ${r + 1}, 'RACE_WEEKEND', ${circuitId}, 'SCHEDULED', ${lit(start)})`
				);
			}
			if (!placed) {
				// fallback: find any free week
				for (let week = 4; week <= 48; week++) {
					const circuitId = pool[r]!;
					const key = `${week}:${circuitId}`;
					if (weeks.includes(week) || circuitWeek.has(key)) continue;
					weeks.push(week);
					circuitWeek.add(key);
					const start = `${seasonYear}-06-${String(Math.min(28, week)).padStart(2, '0')} 14:00:00`;
					await run(
						conn,
						`INSERT INTO calendar_events (id, series_id, season_id, week_id, round_number, event_type, circuit_id, status, scheduled_start_date) VALUES (${eventId++}, ${seriesId}, ${seasonYear}, ${week}, ${r + 1}, 'RACE_WEEKEND', ${circuitId}, 'SCHEDULED', ${lit(start)})`
					);
					break;
				}
			}
		}
	}
}

async function updateGameState(
	conn: DuckDBConnection,
	rng: Rng,
	opts: Required<Pick<NewGameOptions, 'playerDisplayName' | 'playerTeamId' | 'seasonYear'>>
) {
	const team = TEAMS.find((t) => t.id === opts.playerTeamId)!;
	const targetRange: Record<Band, [number, number]> = {
		T: [1, 3],
		M: [4, 7],
		B: [7, 10]
	};
	const [lo, hi] = targetRange[team.band];
	const target = rng.int(lo, hi);

	await run(
		conn,
		`UPDATE game_state SET season_year = ${opts.seasonYear}, current_week = 1, current_day = 1, phase = 'PRE_SEASON', player_display_name = ${lit(opts.playerDisplayName)}, player_team_id = ${opts.playerTeamId}, player_status = 'EMPLOYED' WHERE id = 1`
	);
	await run(conn, `UPDATE teams SET status = 'PLAYER_MANAGED' WHERE id = ${opts.playerTeamId}`);
	await run(
		conn,
		`INSERT INTO player_tenures (id, team_id, board_confidence, target_constructors_position, warning_issued, consecutive_low_checks, hire_season, hire_week, is_active) VALUES (1, ${opts.playerTeamId}, 55, ${target}, FALSE, 0, ${opts.seasonYear}, 1, TRUE)`
	);
}

/**
 * Full world-gen into an already-migrated DuckDB connection.
 * Clears prior world rows (keeps series / points / regs).
 */
export async function generateWorld(conn: DuckDBConnection, options: NewGameOptions): Promise<void> {
	const seasonYear = options.seasonYear ?? 2026;
	const playerTeamId = options.playerTeamId;
	if (!TEAMS.some((t) => t.id === playerTeamId)) {
		throw new Error(`Unknown player team id: ${playerTeamId}`);
	}

	const rng = createRng(options.seed ?? (Date.now() ^ (playerTeamId * 2654435761)));

	await clearWorld(conn);
	await seedFacilities(conn);
	await seedCircuits(conn);
	await seedWeatherProfiles(conn);
	await seedCompounds(conn);
	await seedTeams(conn, seasonYear);
	await seedSponsors(conn, rng, seasonYear);
	await seedCars(conn, rng, seasonYear);
	await seedComponentExpertise(conn, rng, seasonYear);
	await seedDriversAndStaff(conn, rng, seasonYear, playerTeamId);
	await seedCalendar(conn, rng, seasonYear);
	await updateGameState(conn, rng, {
		playerDisplayName: options.playerDisplayName.trim() || 'Player',
		playerTeamId,
		seasonYear
	});
}

export { TEAMS };
