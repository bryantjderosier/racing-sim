import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import {
	simulateFeatureRace,
	simulateQualifying,
	type QualifyingEntrant,
	type RaceEntrant
} from '../electron/sim/race/index.ts';
import type { CarPerformance, DriverLapAttrs } from '../electron/sim/lap/index.ts';

function fmt(ms: number) {
	const s = Math.abs(ms) / 1000;
	const min = Math.floor(s / 60);
	const rem = s - min * 60;
	return `${min}:${rem.toFixed(3).padStart(6, '0')}`;
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
		aggression: clamp(base.aggression)
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

const RACE_LAPS = 28;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'feature-race.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	const ids = await seedPracticeFixture(db);
	const loaded = await loadPracticeEntrant(db, {
		teamId: ids.teamId,
		trackId: ids.trackId
	});

	const qualiField: QualifyingEntrant[] = [
		{ id: 1, name: loaded.driverName, car: loaded.car, driver: loaded.driver, compound: 'soft' },
		{
			id: 2,
			name: 'Casey Okonkwo',
			car: tweakCar(loaded.car, 8, 0, 5),
			driver: tweakDriver(loaded.driver, 4),
			compound: 'soft',
			qualifyingTrimTier: 2
		},
		{
			id: 3,
			name: 'Jules Moreau',
			car: tweakCar(loaded.car, -5, 6, 0),
			driver: tweakDriver(loaded.driver, -2),
			compound: 'soft'
		},
		{
			id: 4,
			name: 'Sam Chen',
			car: tweakCar(loaded.car, 2, -4, 3),
			driver: tweakDriver(loaded.driver, 1),
			compound: 'soft'
		},
		{
			id: 5,
			name: 'Riley Sato',
			car: tweakCar(loaded.car, -8, -3, -5),
			driver: tweakDriver(loaded.driver, -6),
			compound: 'soft'
		},
		{
			id: 6,
			name: 'Noah Petrov',
			car: tweakCar(loaded.car, 4, 4, -2),
			driver: tweakDriver(loaded.driver, 2),
			compound: 'soft'
		}
	];

	const quali = simulateQualifying(loaded.track, qualiField, {
		format: 'div1_knockout',
		attemptsPerSession: 2,
		cutoffs: { q1Eliminate: 2, q2Eliminate: 2 }
	});

	const byId = new Map(qualiField.map((e) => [e.id, e]));

	/** One-stop strategies: soft→medium or medium→hard, pit windows differ. */
	const strategies: Record<
		number,
		{ startCompound: 'soft' | 'medium' | 'hard'; startFuel: number; pitLap: number; next: 'soft' | 'medium' | 'hard'; nextFuel: number; pace: 'push' | 'balanced' | 'conserve' }
	> = {
		1: { startCompound: 'soft', startFuel: 42, pitLap: 12, next: 'medium', nextFuel: 40, pace: 'push' },
		2: { startCompound: 'soft', startFuel: 38, pitLap: 10, next: 'medium', nextFuel: 44, pace: 'push' },
		3: { startCompound: 'medium', startFuel: 48, pitLap: 15, next: 'hard', nextFuel: 36, pace: 'balanced' },
		4: { startCompound: 'soft', startFuel: 40, pitLap: 11, next: 'hard', nextFuel: 42, pace: 'push' },
		5: { startCompound: 'hard', startFuel: 55, pitLap: 18, next: 'medium', nextFuel: 32, pace: 'conserve' },
		6: { startCompound: 'medium', startFuel: 45, pitLap: 14, next: 'medium', nextFuel: 40, pace: 'balanced' }
	};

	const raceField: RaceEntrant[] = quali.grid.map((g) => {
		const e = byId.get(g.entrantId)!;
		const s = strategies[e.id];
		return {
			id: e.id,
			name: e.name,
			car: e.car,
			driver: e.driver,
			gridPosition: g.position,
			pace: s.pace,
			compound: s.startCompound,
			fuelKg: s.startFuel,
			pitCrewSpeed: 65 + e.id * 4,
			pits: [
				{
					afterLap: s.pitLap,
					compound: s.next,
					fuelKg: s.nextFuel,
					paceAfter: s.pace === 'conserve' ? 'balanced' : 'push'
				}
			]
		};
	});

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` FEATURE RACE — ${loaded.trackName}`);
	console.log(` ${RACE_LAPS} laps · 1-stop · pits + tire change + refuel`);
	console.log('══════════════════════════════════════════════════════════════\n');

	console.log('GRID / STRATEGY');
	console.log('Pos Driver              Start        Pit@  Next');
	for (const r of raceField.sort((a, b) => a.gridPosition - b.gridPosition)) {
		const p = r.pits![0];
		console.log(
			` P${r.gridPosition}  ${r.name.padEnd(18)} ${r.compound}/${r.fuelKg}kg   L${String(p.afterLap).padStart(2)}  ${p.compound}/${p.fuelKg}kg`
		);
	}

	const race = simulateFeatureRace(loaded.track, raceField, {
		laps: RACE_LAPS,
		pitLaneLossSeconds: 21
	});

	console.log('\nPIT STOPS');
	console.log('Lap Driver              In→Out           Fuel        Stationary  Total');
	for (const p of race.pitEvents) {
		console.log(
			` L${String(p.lapNumber).padStart(2)} ${p.name.padEnd(18)} ${p.compoundIn}→${p.compoundOut.padEnd(12)} ${p.fuelBefore.toFixed(0)}→${p.fuelAfter.toFixed(0)}kg   ${(p.stationaryMs / 1000).toFixed(2)}s       ${(p.totalPitMs / 1000).toFixed(2)}s`
		);
	}

	for (let lap = 1; lap <= race.laps; lap++) {
		const show =
			lap === 1 ||
			lap === race.laps ||
			race.pitEvents.some((p) => p.lapNumber === lap) ||
			lap % 7 === 0;
		if (!show) continue;

		const rows = race.lines.filter((l) => l.lapNumber === lap);
		console.log(`\n── LAP ${lap} ${'─'.repeat(52)}`);
		console.log(
			'Pos Driver              Lap      Pit    Gap      Cmp   Life  Fuel'
		);
		for (const r of rows) {
			console.log(
				`${String(r.position).padStart(2)}  ${r.name.padEnd(18)} ${fmt(r.lapTimeMs)}  ${r.pitted ? fmt(r.pitMs) : '   —   '}  ${gap(r.gapToLeaderMs).padEnd(8)} ${r.compound.padEnd(5)} ${r.tireLife.toFixed(2)}  ${r.fuelKg.toFixed(1)}`
			);
		}
	}

	console.log('\n══════════════════════════════════════════════════════════════');
	console.log(' CLASSIFICATION');
	console.log('══════════════════════════════════════════════════════════════');
	console.log('Pos Driver              Total      Gap      Stops Best');
	for (const c of race.classification) {
		console.log(
			` ${String(c.position).padStart(2)} ${c.name.padEnd(18)} ${fmt(c.totalMs)}  ${gap(c.gapToLeaderMs).padEnd(8)}  ${c.stops}   ${fmt(c.bestLapMs)} (L${c.bestLapNumber})`
		);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
