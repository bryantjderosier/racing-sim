import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import {
	mulberry32,
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

const RACE_LAPS = 24;
const SEED = 20260711;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'chaos-race.duckdb');
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
			car: tweakCar(loaded.car, 3, 0, 2),
			driver: tweakDriver(loaded.driver, { braking: 2, aggression: 5 }),
			compound: 'soft'
		},
		{
			id: 3,
			name: 'Jules Moreau',
			car: tweakCar(loaded.car, -2, 3, 0),
			driver: tweakDriver(loaded.driver, { composure: -8, aggression: 15 }),
			compound: 'soft'
		},
		{
			id: 4,
			name: 'Sam Chen',
			car: tweakCar(loaded.car, 1, -1, 1),
			driver: tweakDriver(loaded.driver, { focus: 2 }),
			compound: 'soft'
		},
		{
			id: 5,
			name: 'Riley Sato',
			car: tweakCar(loaded.car, -2, -1, -2),
			driver: tweakDriver(loaded.driver, { composure: 5, aggression: -10 }),
			compound: 'soft'
		},
		{
			id: 6,
			name: 'Noah Petrov',
			car: tweakCar(loaded.car, 2, 2, -1),
			driver: tweakDriver(loaded.driver, { tyreManagement: 3 }),
			compound: 'soft'
		}
	];

	const quali = simulateQualifying(loaded.track, qualiField, {
		format: 'div1_knockout',
		attemptsPerSession: 2,
		cutoffs: { q1Eliminate: 2, q2Eliminate: 2 }
	});
	const byId = new Map(qualiField.map((e) => [e.id, e]));

	const raceField: RaceEntrant[] = quali.grid.map((g) => {
		const e = byId.get(g.entrantId)!;
		const aggressive = e.id === 3;
		return {
			id: e.id,
			name: e.name,
			car: e.car,
			driver: e.driver,
			gridPosition: g.position,
			pace: aggressive ? 'maximum' : 'push',
			compound: 'soft',
			fuelKg: 40,
			reliability: e.id === 5 ? 38 : e.id === 6 ? 55 : 92,
			lightweightAmp: e.id === 5 ? 1.4 : 1,
			pitCrewSpeed: 70,
			pits: [
				{
					afterLap: 11 + (e.id % 3),
					compound: 'medium',
					fuelKg: 38,
					paceAfter: aggressive ? 'push' : 'balanced'
				}
			]
		};
	});

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` CHAOS FEATURE — ${loaded.trackName} (seed ${SEED})`);
	console.log(` ${RACE_LAPS} laps · incidents · mechanical · SC/VSC`);
	console.log('══════════════════════════════════════════════════════════════\n');

	const race = simulateFeatureRace(loaded.track, raceField, {
		laps: RACE_LAPS,
		chaos: true,
		rng: mulberry32(SEED)
	});

	console.log('INCIDENTS');
	if (race.incidents.length === 0) console.log('  (none)');
	for (const i of race.incidents) {
		console.log(
			`  L${String(i.lapNumber).padStart(2)} ${i.name.padEnd(16)} [${i.kind}] ${i.label}` +
				(i.timeLossMs ? ` +${(i.timeLossMs / 1000).toFixed(1)}s` : '') +
				(i.triggeredSafety !== 'none' ? ` → ${i.triggeredSafety}` : '')
		);
	}

	console.log('\nSAFETY PERIODS');
	if (race.safetyPeriods.length === 0) console.log('  (none)');
	for (const s of race.safetyPeriods) {
		console.log(`  L${s.startLap}–L${s.endLap}  ${s.state}`);
	}

	console.log('\nPITS');
	for (const p of race.pitEvents) {
		console.log(
			`  L${p.lapNumber} ${p.name.padEnd(16)} ${p.compoundIn}→${p.compoundOut}` +
				(p.underSafety !== 'none' ? ` (${p.underSafety} pit)` : '')
		);
	}

	for (let lap = 1; lap <= race.laps; lap++) {
		const show =
			lap === 1 ||
			lap === race.laps ||
			race.incidents.some((i) => i.lapNumber === lap) ||
			race.safetyPeriods.some((s) => lap >= s.startLap && lap <= s.endLap) ||
			lap % 8 === 0;
		if (!show) continue;
		const rows = race.lines.filter((l) => l.lapNumber === lap && !l.retired);
		const sc = rows[0]?.safetyCarState ?? 'none';
		console.log(`\n── LAP ${lap}${sc !== 'none' ? ` [${sc}]` : ''} ${'─'.repeat(40)}`);
		console.log('Pos Driver              Lap      Chaos   Gap      Rel   Life');
		for (const r of rows) {
			console.log(
				`${String(r.position).padStart(2)}  ${r.name.padEnd(18)} ${fmt(r.lapTimeMs)}  ${r.chaosMs ? fmt(r.chaosMs) : '   —   '}  ${gap(r.gapToLeaderMs).padEnd(8)} ${r.reliability.toFixed(0).padStart(3)}  ${r.tireLife.toFixed(2)}`
			);
		}
		const dnfThisLap = race.incidents.filter(
			(i) => i.lapNumber === lap && (i.severity === 'dnf' || i.severity === 'terminal')
		);
		for (const d of dnfThisLap) console.log(`     DNF ${d.name} — ${d.label}`);
	}

	console.log('\n══════════════════════════════════════════════════════════════');
	console.log(' CLASSIFICATION');
	console.log('Pos Driver              Status    Total/Laps     Gap      Rel');
	for (const c of race.classification) {
		console.log(
			` ${String(c.position).padStart(2)} ${c.name.padEnd(18)} ${c.status.padEnd(8)} ` +
				(c.status === 'finished'
					? `${fmt(c.totalMs)}  ${gap(c.gapToLeaderMs).padEnd(8)}`
					: `DNF L${c.lapsCompleted}          `) +
				` ${c.endReliability.toFixed(0)}`
		);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
