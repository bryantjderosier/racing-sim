import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbAt } from '../electron/db/node.ts';
import { loadPracticeEntrant } from '../electron/sim/bridge/index.ts';
import {
	applySetupTweak,
	createPracticeSession,
	runPracticeStint
} from '../electron/sim/practice/index.ts';
import { seedPracticeFixture } from '../electron/sim/seed/practice-fixture.ts';
import { defaultSetupTarget } from '../electron/sim/bridge/track.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

function fmt(ms: number) {
	const s = ms / 1000;
	const min = Math.floor(s / 60);
	const rem = s - min * 60;
	return `${min}:${rem.toFixed(3).padStart(6, '0')}`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'practice-from-db.duckdb');
const migrationsFolder = join(root, 'drizzle');

await mkdir(dirname(dbPath), { recursive: true });

const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });
try {
	const ids = await seedPracticeFixture(db);
	const entrant = await loadPracticeEntrant(db, {
		teamId: ids.teamId,
		trackId: ids.trackId
	});

	console.log('Loaded from DuckDB\n');
	console.log(`  Driver:   ${entrant.driverName}`);
	console.log(`  Engineer: ${entrant.engineerName}`);
	console.log(`  Track:    ${entrant.trackName}`);
	console.log(
		`  Car PP:   aero=${entrant.car.aeroPoints} mech=${entrant.car.mechanicalPoints} power=${entrant.car.powerPoints} kg=${entrant.car.dryWeightKg.toFixed(0)}`
	);
	console.log(
		`  Driver:   braking=${entrant.driver.braking} cornering=${entrant.driver.cornering} feedback→personnel ${entrant.personnel.driverFeedback}`
	);
	console.log(
		`  RE:       setup=${entrant.personnel.engineerSetup} analysis=${entrant.personnel.engineerAnalysis}`
	);
	console.log(`  Parts:    ${entrant.parts.map((p) => p.slot).join(', ')}`);

	assert(entrant.parts.length === 6, '6 mounted parts loaded');
	assert(entrant.car.aeroPoints === 28 + 30 + 35 + 22, 'aero PP summed from blueprints');
	assert(entrant.driver.braking === 78, 'driver braking from attributes');
	assert(entrant.personnel.engineerSetup === 86, 'RE setup from attributes');

	// Start slightly off window, then follow brief
	const target = defaultSetupTarget({
		id: ids.trackId,
		name: entrant.trackName,
		lengthKm: 5.4,
		aeroEfficiencyWeight: 1.2,
		mechanicalGripWeight: 0.9,
		tireAbrasionFactor: 1.1,
		baseGrip: 0.95,
		maxGrip: 1.02
	});
	let session = createPracticeSession(entrant.track, {
		...target,
		rearRideHeightMm: target.rearRideHeightMm + 6,
		rearArb: target.rearArb + 2
	});

	const stint1 = runPracticeStint(
		session,
		entrant.car,
		entrant.driver,
		entrant.personnel,
		{
			fuelKg: 30,
			batteryPct: 85,
			tire: { compound: 'soft', life: 1, coreTemp: 72 },
			pace: 'push',
			energy: 'balanced',
			dirtyAir: 0
		},
		{ lapCount: 4, pace: 'push' }
	);
	session = stint1.session;

	console.log('\nStint 1 (DB entrant, off-window)');
	for (const lap of stint1.result.stint.laps) {
		const [s1, s2, s3] = lap.sectorTimesMs;
		console.log(`  L${lap.lapNumber}  ${fmt(s1)} ${fmt(s2)} ${fmt(s3)}  = ${fmt(lap.lapTimeMs)}`);
	}
	console.log('Brief:');
	for (const line of stint1.result.brief.lines) console.log('  • ' + line);

	assert(stint1.result.brief.clarity === 'high', 'strong DB personnel → high brief');
	assert(stint1.result.trimAwards[0].kind === 'qualifying_trim', 'quali trim from short low-fuel');

	session = applySetupTweak(session, {
		rearRideHeightMm: target.rearRideHeightMm,
		rearArb: target.rearArb
	});

	const stint2 = runPracticeStint(
		session,
		entrant.car,
		entrant.driver,
		entrant.personnel,
		{
			fuelKg: 30,
			batteryPct: 85,
			tire: { compound: 'soft', life: 1, coreTemp: 72 },
			pace: 'push',
			energy: 'balanced',
			dirtyAir: 0
		},
		{ lapCount: 4, pace: 'push' }
	);

	console.log('\nStint 2 (after setup tweak)');
	console.log(
		`  Best ${fmt(stint1.result.stint.bestLapMs)} → ${fmt(stint2.result.stint.bestLapMs)}`
	);
	assert(
		stint2.result.stint.bestLapMs < stint1.result.stint.bestLapMs,
		'DB-backed setup tweak improves lap'
	);

	console.log('\nAll DB bridge checks passed.');
} finally {
	await db.close();
}
