import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { seasons, teams, worldClock } from '../electron/db/schema.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { runSeason } from '../electron/sim/season/index.ts';

const SEASON_YEAR = 2026;
const RACES = 4;
const PIVOT_AT = 2;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'season-loop.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` SEASON LOOP — ${SEASON_YEAR} · ${RACES} races · pivot @ R${PIVOT_AT}`);
	console.log('══════════════════════════════════════════════════════════════');

	const result = await runSeason(db, {
		seasonYear: SEASON_YEAR,
		raceCount: RACES,
		rdPivotRaceIndex: PIVOT_AT,
		pointsScheme: 'classic',
		raceLaps: 8,
		practiceStints: 1,
		practiceLapsPerStint: 2,
		chaos: false,
		weeksAfterRace: 1,
		playerTeamId: 1,
		playerPivotFraction: 0.4,
		seed: 42,
		onRound: (r) => {
			const pole = r.weekend.qualifying.grid[0];
			console.log(
				`\n── R${r.raceIndex}  winner ${r.winner?.name ?? '?'} (+${r.winner?.points ?? 0}pts)` +
					`  pole ${pole?.name ?? '?'}` +
					(r.pivotApplied ? '  [PIVOT GATE]' : '')
			);
			const top = r.weekend.race.classification
				.filter((c) => c.status === 'finished')
				.slice(0, 5);
			for (const c of top) {
				const pts = r.awards.find((a) => a.driverId === c.entrantId)?.points ?? 0;
				console.log(`   P${c.position} ${c.name.padEnd(18)} +${pts}`);
			}
		}
	});

	console.log('\n── DRIVERS');
	for (const row of result.drivers.slice(0, 8)) {
		console.log(`  P${row.position} driver#${row.entityId}  ${row.points} pts`);
	}

	console.log('\n── CONSTRUCTORS');
	for (const row of result.constructors.slice(0, 8)) {
		const [t] = await db.select().from(teams).where(eq(teams.id, row.entityId)).limit(1);
		console.log(`  P${row.position} ${t?.shortName?.padEnd(6) ?? row.entityId}  ${row.points} pts`);
	}

	const [season] = await db
		.select()
		.from(seasons)
		.where(eq(seasons.seasonYear, SEASON_YEAR))
		.limit(1);
	const [player] = await db.select().from(teams).where(eq(teams.id, 1)).limit(1);
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);

	console.log(`\n── Pivot locked=${season?.rdPivotLocked}  player current=${player?.rdPivotCurrent}`);
	console.log(`── Clock ${clock?.seasonYear} W${clock?.week} (tick ${clock?.tickIndex})`);
	console.log(`── Complete=${result.complete} rounds=${result.rounds.length}`);

	if (!result.complete) throw new Error('Season did not complete');
	if (result.rounds.length !== RACES) throw new Error(`Expected ${RACES} rounds`);
	if (!result.rounds.some((r) => r.pivotApplied)) throw new Error('Pivot gate never fired');
	if (!season?.rdPivotLocked) throw new Error('Pivot not locked');
	if (player?.rdPivotCurrent !== 0.4) throw new Error('Player pivot not applied');
	if ((result.constructors[0]?.points ?? 0) <= 0) throw new Error('No constructor points');
	if ((clock?.tickIndex ?? 0) < RACES) throw new Error('World clock did not advance');

	console.log('\nAll season-loop checks passed.');
} finally {
	await db.close();
}
