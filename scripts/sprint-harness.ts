import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import { simulateSprintRace, type SprintEntrant } from '../electron/sim/race/index.ts';
import type { CarPerformance, DriverLapAttrs } from '../electron/sim/lap/index.ts';

function fmt(ms: number) {
	const s = Math.abs(ms) / 1000;
	const min = Math.floor(s / 60);
	const rem = s - min * 60;
	const body = `${min}:${rem.toFixed(3).padStart(6, '0')}`;
	return ms < 0 ? `-${body}` : body;
}

function gap(ms: number) {
	if (ms === 0) return '—';
	return `+${(ms / 1000).toFixed(3)}`;
}

function tweakDriver(base: DriverLapAttrs, delta: number): DriverLapAttrs {
	const clamp = (n: number) => Math.max(1, Math.min(99, n + delta));
	return {
		braking: clamp(base.braking),
		cornering: clamp(base.cornering),
		traction: clamp(base.traction),
		tyreManagement: clamp(base.tyreManagement),
		wetDriving: clamp(base.wetDriving),
		composure: clamp(base.composure),
		focus: clamp(base.focus),
		aggression: clamp(base.aggression + Math.round(delta / 2))
	};
}

function tweakCar(base: CarPerformance, aero: number, mech: number, power: number): CarPerformance {
	return {
		...base,
		aeroPoints: base.aeroPoints + aero,
		mechanicalPoints: base.mechanicalPoints + mech,
		powerPoints: base.powerPoints + power
	};
}

const SPRINT_LAPS = 18;
const START_FUEL_KG = 48; // enough for distance; no refuel

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'sprint-race.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	const ids = await seedPracticeFixture(db);
	const loaded = await loadPracticeEntrant(db, {
		teamId: ids.teamId,
		trackId: ids.trackId
	});

	const field: SprintEntrant[] = [
		{
			id: 1,
			name: loaded.driverName,
			car: loaded.car,
			driver: loaded.driver,
			gridPosition: 3,
			pace: 'push',
			compound: 'soft',
			fuelKg: START_FUEL_KG
		},
		{
			id: 2,
			name: 'Casey Okonkwo',
			car: tweakCar(loaded.car, 8, 0, 5),
			driver: tweakDriver(loaded.driver, 4),
			gridPosition: 1,
			pace: 'push',
			compound: 'soft',
			fuelKg: START_FUEL_KG
		},
		{
			id: 3,
			name: 'Jules Moreau',
			car: tweakCar(loaded.car, -5, 6, 0),
			driver: tweakDriver(loaded.driver, -2),
			gridPosition: 2,
			pace: 'balanced',
			compound: 'medium',
			fuelKg: START_FUEL_KG
		},
		{
			id: 4,
			name: 'Sam Chen',
			car: tweakCar(loaded.car, 2, -4, 3),
			driver: tweakDriver(loaded.driver, 1),
			gridPosition: 4,
			pace: 'push',
			compound: 'soft',
			fuelKg: START_FUEL_KG
		},
		{
			id: 5,
			name: 'Riley Sato',
			car: tweakCar(loaded.car, -8, -3, -5),
			driver: tweakDriver(loaded.driver, -6),
			gridPosition: 5,
			pace: 'conserve',
			compound: 'hard',
			fuelKg: START_FUEL_KG
		},
		{
			id: 6,
			name: 'Noah Petrov',
			car: tweakCar(loaded.car, 4, 4, -2),
			driver: tweakDriver(loaded.driver, 2),
			gridPosition: 6,
			pace: 'balanced',
			compound: 'medium',
			fuelKg: START_FUEL_KG
		}
	];

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` SPRINT RACE — ${loaded.trackName}`);
	console.log(` ${SPRINT_LAPS} laps · no pits · no refuel · fuel ${START_FUEL_KG}kg`);
	console.log('══════════════════════════════════════════════════════════════\n');

	console.log('GRID');
	console.log('Pos  Driver              Pace       Compound');
	for (const e of [...field].sort((a, b) => a.gridPosition - b.gridPosition)) {
		console.log(
			` P${e.gridPosition}  ${e.name.padEnd(18)} ${(e.pace ?? 'balanced').padEnd(10)} ${e.compound}`
		);
	}

	const race = simulateSprintRace(loaded.track, field, {
		laps: SPRINT_LAPS,
		gripGainPerLap: 0.0035,
		gripCap: 1.02
	});

	for (let lap = 1; lap <= race.laps; lap++) {
		const rows = race.lines.filter((l) => l.lapNumber === lap);
		console.log(`\n── LAP ${lap} ${'─'.repeat(56)}`);
		console.log(
			'Pos Driver              S1       S2       S3     | Lap time  Gap     Int    Life  Temp  Fuel'
		);
		for (const r of rows) {
			const [s1, s2, s3] = r.sectorTimesMs;
			console.log(
				`${String(r.position).padStart(2)}  ${r.name.padEnd(18)} ${fmt(s1)} ${fmt(s2)} ${fmt(s3)} | ${fmt(r.lapTimeMs)}  ${gap(r.gapToLeaderMs).padEnd(7)} ${gap(r.intervalMs).padEnd(6)} ${r.tireLife.toFixed(2)}  ${r.tireCoreTemp.toFixed(0).padStart(3)}°  ${r.fuelKg.toFixed(1)}`
			);
		}
	}

	console.log('\n══════════════════════════════════════════════════════════════');
	console.log(' CLASSIFICATION');
	console.log('══════════════════════════════════════════════════════════════');
	console.log('Pos Driver              Total      Gap      Best lap       Tire  Fuel');
	for (const c of race.classification) {
		console.log(
			` ${String(c.position).padStart(2)} ${c.name.padEnd(18)} ${fmt(c.totalMs)}  ${gap(c.gapToLeaderMs).padEnd(7)} ${fmt(c.bestLapMs)} (L${c.bestLapNumber})  ${c.endTireLife.toFixed(2)}  ${c.endFuelKg.toFixed(1)}kg`
		);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
