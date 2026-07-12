import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { staff } from '../electron/db/schema.ts';
import {
	applyPitStopFatigue,
	autoRotatePitCrew,
	loadPitCrewRoster,
	resolvePitStop,
	seedDefaultPitCrew,
	setPitCrewLineup
} from '../electron/sim/pit-crew/index.ts';
import { simulateFeatureRace } from '../electron/sim/race/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import type { CarPerformance, DriverLapAttrs, TrackLapContext } from '../electron/sim/lap/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'pit-crew.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);
	const ids = await seedDefaultPitCrew(db, 1);
	assert(ids.length === 12, '12 crew seeded');

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' PIT CREW ROSTER');
	console.log('══════════════════════════════════════════════════════════════');

	const roster = await loadPitCrewRoster(db, 1);
	assert(roster.starters.length === 8, '8 starters');
	assert(roster.bench.length === 4, '4 bench');
	console.log(
		`\n── Squad avg speed=${roster.squad.speed.toFixed(1)} cons=${roster.squad.consistency.toFixed(1)} focus=${roster.squad.focus.toFixed(1)}`
	);

	const elite = resolvePitStop({
		squad: roster.squad,
		fuelAddedKg: 0,
		pressure: 'normal',
		rng: () => 0.99
	});
	assert(elite.error == null, 'no error on high roll');
	assert(elite.stationaryMs >= 1900 && elite.stationaryMs <= 4200, 'tire window');

	const stressed = resolvePitStop({
		squad: {
			...roster.squad,
			effectiveConsistency: 35,
			effectiveFocus: 30,
			effectiveSpeed: roster.squad.effectiveSpeed
		},
		fuelAddedKg: 10,
		pressure: 'double_stack',
		rng: () => 0.01
	});
	assert(stressed.error != null, 'error under pressure');
	assert(stressed.stationaryMs > stressed.baseMs, 'error adds time');
	console.log(
		`── Stop normal=${elite.stationaryMs}ms  stressed=${stressed.stationaryMs}ms err=${stressed.error}`
	);

	const fatigueBefore = roster.starters[0]!.fatiguePct;
	await applyPitStopFatigue(db, roster.squad.memberIds, 60);
	const [tired] = await db
		.select()
		.from(staff)
		.where(eq(staff.id, roster.starters[0]!.staffId))
		.limit(1);
	assert(tired != null && tired.fatiguePct >= fatigueBefore + 60, 'fatigue applied');

	const rot = await autoRotatePitCrew(db, 1, 50);
	assert(rot.demoted.length >= 1, 'demoted tired');
	assert(rot.promoted.length >= 1, 'promoted bench');
	console.log(`── Rotate demoted=${rot.demoted.length} promoted=${rot.promoted.length}`);

	await setPitCrewLineup(db, 1, ids.slice(0, 8));
	const fresh = await loadPitCrewRoster(db, 1);
	await applyPitStopFatigue(db, [], 0); // noop
	for (const s of fresh.starters) {
		await db.update(staff).set({ fatiguePct: 5 }).where(eq(staff.id, s.staffId));
	}
	const raceRoster = await loadPitCrewRoster(db, 1);

	const loaded = await loadPracticeEntrant(db, { teamId: 1, trackId: 1 });
	const track: TrackLapContext = {
		...loaded.track,
		setupCurrent: loaded.track.setupCurrent,
		setupTarget: loaded.track.setupTarget
	};
	const driver: DriverLapAttrs = loaded.driver;
	const car: CarPerformance = loaded.car;

	const result = simulateFeatureRace(
		track,
		[
			{
				id: 1,
				name: loaded.driverName,
				car,
				driver,
				gridPosition: 1,
				fuelKg: 80,
				compound: 'medium',
				pitCrewSquad: raceRoster.squad,
				pits: [{ afterLap: 5, compound: 'hard', fuelKg: 40 }]
			},
			{
				id: 2,
				name: 'Rival',
				car: { ...car, aeroPoints: car.aeroPoints - 3 },
				driver,
				gridPosition: 2,
				fuelKg: 80,
				compound: 'medium',
				pitCrewSpeed: 50,
				pits: [{ afterLap: 5, compound: 'hard', fuelKg: 40 }]
			}
		],
		{ laps: 12, chaos: false, rng: () => 0.5 }
	);

	const pit = result.pitEvents.find((p) => p.entrantId === 1);
	assert(pit != null, 'pit event');
	assert((pit!.crewMemberIds?.length ?? 0) === 8, 'crew ids on event');
	await applyPitStopFatigue(db, pit!.crewMemberIds ?? []);
	console.log(
		`── Race stop: stationary=${pit!.stationaryMs}ms error=${pit!.pitError ?? 'none'} crew=${pit!.crewMemberIds?.length}`
	);

	console.log('\n── PASS');
} finally {
	await db.close();
}
