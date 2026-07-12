import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import {
	simulateQualifying,
	simulateSprintRace,
	type QualifyingEntrant,
	type SprintEntrant
} from '../electron/sim/race/index.ts';
import type { CarPerformance, DriverLapAttrs } from '../electron/sim/lap/index.ts';

function fmt(ms: number | null) {
	if (ms == null) return '   —   ';
	const s = ms / 1000;
	const min = Math.floor(s / 60);
	const rem = s - min * 60;
	return `${min}:${rem.toFixed(3).padStart(6, '0')}`;
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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'quali-sprint.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	const ids = await seedPracticeFixture(db);
	const loaded = await loadPracticeEntrant(db, {
		teamId: ids.teamId,
		trackId: ids.trackId
	});

	const field: QualifyingEntrant[] = [
		{
			id: 1,
			name: loaded.driverName,
			car: loaded.car,
			driver: loaded.driver,
			compound: 'soft',
			qualifyingTrimTier: 1
		},
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
			compound: 'soft',
			qualifyingTrimTier: 1
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

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` QUALIFYING (Div 1 knockout) — ${loaded.trackName}`);
	console.log(' Field 6 → Q1 drop 2, Q2 drop 2, Q3 top 2 (scaled cutoffs)');
	console.log('══════════════════════════════════════════════════════════════\n');

	const quali = simulateQualifying(loaded.track, field, {
		format: 'div1_knockout',
		attemptsPerSession: 2,
		cutoffs: { q1Eliminate: 2, q2Eliminate: 2 }
	});

	for (const session of ['Q1', 'Q2', 'Q3'] as const) {
		const rows = quali.attempts.filter((a) => a.session === session);
		if (rows.length === 0) continue;
		console.log(`── ${session} ${'─'.repeat(50)}`);
		console.log('Driver              Att  S1       S2       S3     | Lap      Effective');
		for (const a of rows) {
			const [s1, s2, s3] = a.sectorTimesMs;
			console.log(
				`${a.name.padEnd(18)}  ${a.attempt}  ${fmt(s1)} ${fmt(s2)} ${fmt(s3)} | ${fmt(a.lapTimeMs)}  ${fmt(a.effectiveLapTimeMs)}`
			);
		}
		const eliminated = quali.eliminations.filter((e) => e.session === session);
		if (eliminated.length) {
			console.log(
				'  Out: ' +
					eliminated
						.map((e) => `${e.name} (${fmt(e.bestMs)} → P${e.gridPosition})`)
						.join(', ')
			);
		}
		console.log('');
	}

	console.log('STARTING GRID');
	console.log('Pos  Driver              Best       Via');
	for (const g of quali.grid) {
		console.log(
			` P${String(g.position).padEnd(2)} ${g.name.padEnd(18)} ${fmt(g.bestMs)}  ${g.session}`
		);
	}
	console.log(`\nPole: ${quali.grid[0]?.name} ${fmt(quali.poleMs)}`);

	// Feed grid into sprint
	const byId = new Map(field.map((e) => [e.id, e]));
	const sprintField: SprintEntrant[] = quali.grid.map((g) => {
		const e = byId.get(g.entrantId)!;
		return {
			id: e.id,
			name: e.name,
			car: e.car,
			driver: e.driver,
			gridPosition: g.position,
			pace: g.position <= 2 ? 'push' : 'balanced',
			compound: g.position <= 3 ? 'soft' : 'medium',
			fuelKg: 48
		};
	});

	console.log('\n══════════════════════════════════════════════════════════════');
	console.log(' SPRINT (12 laps) from quali grid');
	console.log('══════════════════════════════════════════════════════════════');

	const race = simulateSprintRace(loaded.track, sprintField, { laps: 12 });

	for (let lap = 1; lap <= race.laps; lap++) {
		if (lap !== 1 && lap !== race.laps && lap % 4 !== 0) continue; // sample output
		const rows = race.lines.filter((l) => l.lapNumber === lap);
		console.log(`\n── LAP ${lap}`);
		console.log('Pos Driver              Lap time  Gap');
		for (const r of rows) {
			const gap = r.gapToLeaderMs === 0 ? '—' : `+${(r.gapToLeaderMs / 1000).toFixed(3)}`;
			console.log(
				` ${String(r.position).padStart(2)} ${r.name.padEnd(18)} ${fmt(r.lapTimeMs)}  ${gap}`
			);
		}
	}

	console.log('\nCLASSIFICATION');
	for (const c of race.classification) {
		const gap = c.gapToLeaderMs === 0 ? '—' : `+${(c.gapToLeaderMs / 1000).toFixed(3)}`;
		console.log(` P${c.position} ${c.name.padEnd(18)} ${fmt(c.totalMs)}  ${gap}`);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
