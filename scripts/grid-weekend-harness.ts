import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadGridEntrants } from '../electron/sim/bridge/index.ts';
import { seedFullGrid, FULL_GRID_SIZE } from '../electron/sim/seed/grid-fixture.ts';
import { simulateWeekend, type WeekendEntrant } from '../electron/sim/weekend/index.ts';

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

const SEED = 42;
const RACE_LAPS = 18;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'full-grid-weekend.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	const { trackId, teamIds } = await seedFullGrid(db);
	const loaded = await loadGridEntrants(db, { trackId, division: 1 });

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` FULL GRID WEEKEND — ${loaded.trackName}`);
	console.log(` ${loaded.entrants.length} cars · tight talent band · seed ${SEED}`);
	console.log('══════════════════════════════════════════════════════════════\n');

	if (loaded.entrants.length !== FULL_GRID_SIZE) {
		throw new Error(`Expected ${FULL_GRID_SIZE} entrants, got ${loaded.entrants.length}`);
	}

	const aeros = loaded.entrants.map((e) => e.car.aeroPoints);
	const brakings = loaded.entrants.map((e) => e.driver.braking);
	console.log('Field spread (should be tight):');
	console.log(
		`  Aero PP:  min ${Math.min(...aeros)} max ${Math.max(...aeros)} (Δ${Math.max(...aeros) - Math.min(...aeros)})`
	);
	console.log(
		`  Braking:  min ${Math.min(...brakings)} max ${Math.max(...brakings)} (Δ${Math.max(...brakings) - Math.min(...brakings)})`
	);
	console.log(`  Teams:    ${teamIds.length}`);

	const field: WeekendEntrant[] = loaded.entrants.map((e, i) => ({
		id: e.driverId,
		name: e.driverName,
		car: e.car,
		driver: e.driver,
		personnel: e.personnel,
		reliability: 88 + (i % 5),
		raceFuelKg: 38,
		racePace: 'push'
	}));

	const weekend = simulateWeekend(field, {
		track: loaded.track,
		format: 'div1_knockout',
		raceLaps: RACE_LAPS,
		practiceStints: 1,
		practiceLapsPerStint: 3,
		seed: SEED,
		qualiCutoffs: { q1Eliminate: 5, q2Eliminate: 5 },
		chaos: true
	});

	console.log('\n── QUALIFYING (Q3 top 10)');
	console.log('Pos Driver              Best       Via');
	for (const g of weekend.qualifying.grid.slice(0, 10)) {
		console.log(
			` P${String(g.position).padEnd(2)} ${g.name.padEnd(18)} ${g.bestMs != null ? fmt(g.bestMs) : '—'}  ${g.session}`
		);
	}
	console.log('  …');
	for (const g of weekend.qualifying.grid.slice(15)) {
		console.log(
			` P${String(g.position).padEnd(2)} ${g.name.padEnd(18)} ${g.bestMs != null ? fmt(g.bestMs) : '—'}  ${g.session}`
		);
	}

	const pole = weekend.qualifying.poleMs;
	const last = weekend.qualifying.grid[weekend.qualifying.grid.length - 1]?.bestMs;
	if (pole != null && last != null) {
		console.log(`\nQuali spread P1–P20: ${((last - pole) / 1000).toFixed(3)}s`);
	}

	console.log('\n── RACE CLASSIFICATION (top 8 / DNFs)');
	const finished = weekend.race.classification.filter((c) => c.status === 'finished');
	const dnfs = weekend.race.classification.filter((c) => c.status === 'dnf');
	for (const c of finished.slice(0, 8)) {
		console.log(` P${c.position} ${c.name.padEnd(18)} ${fmt(c.totalMs)}  ${gap(c.gapToLeaderMs)}`);
	}
	if (finished.length > 8) {
		const lastF = finished[finished.length - 1];
		console.log(
			` P${lastF.position} ${lastF.name.padEnd(18)} ${fmt(lastF.totalMs)}  ${gap(lastF.gapToLeaderMs)}`
		);
	}
	for (const c of dnfs) {
		console.log(` DNF ${c.name} (L${c.lapsCompleted})`);
	}

	if (finished.length >= 2) {
		const winnerGap = finished[finished.length - 1].gapToLeaderMs;
		console.log(
			`\nRace spread P1–P${finished.length}: ${(winnerGap / 1000).toFixed(1)}s over ${RACE_LAPS} laps` +
				` (~${(winnerGap / 1000 / RACE_LAPS).toFixed(2)}s/lap)`
		);
	}

	console.log(`\nIncidents: ${weekend.race.incidents.length}`);
	for (const i of weekend.race.incidents.slice(0, 8)) {
		console.log(`  L${i.lapNumber} ${i.name}: ${i.label}`);
	}

	console.log('\nDone.');
} finally {
	await db.close();
}
