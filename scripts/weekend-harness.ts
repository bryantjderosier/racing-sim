import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import { simulateWeekend, type WeekendEntrant } from '../electron/sim/weekend/index.ts';
import type { CarPerformance, DriverLapAttrs } from '../electron/sim/lap/index.ts';
import type { PracticePersonnel } from '../electron/sim/practice/index.ts';

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

function tweakDriver(base: DriverLapAttrs, delta: Partial<DriverLapAttrs>): DriverLapAttrs {
	const clamp = (n: number) => Math.max(1, Math.min(99, n));
	return {
		braking: clamp(base.braking + (delta.braking ?? 0)),
		cornering: clamp(base.cornering + (delta.cornering ?? 0)),
		traction: clamp(base.traction + (delta.traction ?? 0)),
		tyreManagement: clamp(base.tyreManagement + (delta.tyreManagement ?? 0)),
		wetDriving: clamp(base.wetDriving + (delta.wetDriving ?? 0)),
		composure: clamp(base.composure + (delta.composure ?? 0)),
		focus: clamp(base.focus + (delta.focus ?? 0)),
		aggression: clamp(base.aggression + (delta.aggression ?? 0))
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

function personnel(feedback: number, setup: number, analysis: number): PracticePersonnel {
	return { driverFeedback: feedback, engineerSetup: setup, engineerAnalysis: analysis };
}

const SEED = 42;
const RACE_LAPS = 20;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'weekend.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	const ids = await seedPracticeFixture(db);
	const loaded = await loadPracticeEntrant(db, {
		teamId: ids.teamId,
		trackId: ids.trackId
	});

	const field: WeekendEntrant[] = [
		{
			id: 1,
			name: loaded.driverName,
			car: loaded.car,
			driver: loaded.driver,
			personnel: loaded.personnel,
			reliability: 92
		},
		{
			id: 2,
			name: 'Casey Okonkwo',
			car: tweakCar(loaded.car, 3, 0, 2),
			driver: tweakDriver(loaded.driver, { braking: 2 }),
			personnel: personnel(80, 84, 82),
			reliability: 90
		},
		{
			id: 3,
			name: 'Jules Moreau',
			car: tweakCar(loaded.car, -2, 2, 0),
			driver: tweakDriver(loaded.driver, { composure: -5, aggression: 12 }),
			personnel: personnel(55, 50, 48),
			racePace: 'maximum',
			reliability: 88
		},
		{
			id: 4,
			name: 'Sam Chen',
			car: tweakCar(loaded.car, 1, -1, 1),
			driver: tweakDriver(loaded.driver, { focus: 2 }),
			personnel: personnel(70, 72, 68),
			reliability: 91
		},
		{
			id: 5,
			name: 'Riley Sato',
			car: tweakCar(loaded.car, -2, -1, -2),
			driver: tweakDriver(loaded.driver, { composure: 4 }),
			personnel: personnel(40, 35, 38),
			reliability: 42,
			lightweightAmp: 1.35
		},
		{
			id: 6,
			name: 'Noah Petrov',
			car: tweakCar(loaded.car, 2, 2, -1),
			driver: tweakDriver(loaded.driver, { tyreManagement: 3 }),
			personnel: personnel(75, 78, 74),
			reliability: 70
		}
	];

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` RACE WEEKEND — ${loaded.trackName} (seed ${SEED})`);
	console.log(' Practice → Qualifying → Feature');
	console.log('══════════════════════════════════════════════════════════════\n');

	const weekend = simulateWeekend(field, {
		track: loaded.track,
		format: 'div1_knockout',
		raceLaps: RACE_LAPS,
		practiceStints: 2,
		practiceLapsPerStint: 4,
		seed: SEED,
		qualiCutoffs: { q1Eliminate: 2, q2Eliminate: 2 },
		chaos: true
	});

	console.log('── PRACTICE');
	console.log('Driver              Best       SetupΔ→     QualiTrim  Brief');
	for (const p of weekend.practice) {
		console.log(
			`${p.name.padEnd(18)} ${fmt(p.bestLapMs)}  ${p.setupDistanceBefore.toFixed(2)}→${p.setupDistanceAfter.toFixed(2)}   T${p.qualifyingTrimTier}         ${p.briefClarity}`
		);
	}

	console.log('\n── QUALIFYING GRID');
	console.log('Pos Driver              Best       Via');
	for (const g of weekend.qualifying.grid) {
		console.log(
			` P${String(g.position).padEnd(2)} ${g.name.padEnd(18)} ${g.bestMs != null ? fmt(g.bestMs) : '—'}  ${g.session}`
		);
	}

	console.log('\n── RACE INCIDENTS');
	if (weekend.race.incidents.length === 0) console.log('  (none)');
	for (const i of weekend.race.incidents) {
		console.log(
			`  L${i.lapNumber} ${i.name}: ${i.label}` +
				(i.triggeredSafety !== 'none' ? ` → ${i.triggeredSafety}` : '')
		);
	}

	console.log('\n── SAFETY');
	if (weekend.race.safetyPeriods.length === 0) console.log('  (none)');
	for (const s of weekend.race.safetyPeriods) {
		console.log(`  L${s.startLap}–${s.endLap} ${s.state}`);
	}

	console.log('\n── CLASSIFICATION');
	console.log('Pos Driver              Status    Total        Gap');
	for (const c of weekend.race.classification) {
		console.log(
			` ${String(c.position).padStart(2)} ${c.name.padEnd(18)} ${c.status.padEnd(8)} ` +
				(c.status === 'finished'
					? `${fmt(c.totalMs)}  ${gap(c.gapToLeaderMs)}`
					: `DNF L${c.lapsCompleted}`)
		);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
