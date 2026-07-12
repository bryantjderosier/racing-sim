import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, getDb, setActiveDbPath } from '../electron/db/connection.ts';
import { bootstrapCareer } from '../electron/sim/career/bootstrap.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';
import {
	beginWeekend,
	clearWeekend,
	commitInteractiveWeekend,
	createPractice,
	createRace,
	getHqSnapshot,
	raceFinish,
	raceStepLap,
	runPracticeStintView,
	runWeekendQualifying
} from '../electron/sim/game/index.ts';
import { nextIncompleteRound } from '../electron/sim/season/calendar.ts';
import { getStandingsTable } from '../electron/sim/season/standings.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'weekend-flow-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);
clearWeekend();

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' WEEKEND FLOW (practice → quali → race → commit)');
console.log('══════════════════════════════════════════════════════════════');

const boot = await bootstrapCareer(store, {
	displayName: 'Weekend Flow',
	playerTeamId: 1,
	raceCount: 2
});
const db = await getDb();
const playerTeamId = boot.career.playerTeamId;

const standingsBefore = await getStandingsTable(db, 2026, 1, 'team');
const playerPtsBefore =
	standingsBefore.find((r) => r.entityId === playerTeamId)?.points ?? 0;

const weekend = await beginWeekend(db, playerTeamId);
assert(weekend.entrants.length >= 10, 'grid loaded');

const practice = await createPractice(db, playerTeamId);
assert(practice.setup.frontWingAngle != null, 'practice setup');

const stint = runPracticeStintView({
	intent: 'qualifying_trim',
	lapCount: 3,
	pace: 'push'
});
assert(stint.lapCount === 3, 'practice stint laps');
assert(stint.briefLines.length > 0, 'engineering brief');

const quali = runWeekendQualifying({ format: 'div1_knockout' });
assert(quali.grid.length === weekend.entrants.length, 'quali grid size');
assert(quali.grid[0].position === 1, 'pole is P1');
assert(quali.poleMs != null && quali.poleMs > 0, 'pole time');

const race = createRace({ laps: 4, seed: 42 });
assert(race.totalLaps === 4, 'race created');
assert(race.telemetry.cars[0].position === 1, 'grid order from quali');

while (true) {
	const step = raceStepLap(1);
	if (step.complete) break;
}

const finished = raceFinish();
assert(finished.classification.length === weekend.entrants.length, 'classification');

const committed = await commitInteractiveWeekend(db, { weeksAfterRace: 0 });
assert(committed.raceEventId > 0, 'race event persisted');
assert(committed.awards.length > 0, 'points awards');
assert(committed.nextRound != null, 'next round after commit');
assert(committed.nextRound!.raceIndex === 2, 'calendar advanced to round 2');

const incomplete = await nextIncompleteRound(db, 2026);
assert(incomplete?.raceIndex === 2, 'round 1 completed');

const standingsAfter = await getStandingsTable(db, 2026, 1, 'team');
const playerPtsAfter =
	standingsAfter.find((r) => r.entityId === playerTeamId)?.points ?? 0;
assert(
	playerPtsAfter !== playerPtsBefore ||
		committed.awards.some((a) => a.teamId === playerTeamId),
	'standings moved'
);

const hq = await getHqSnapshot(db, boot.career);
assert(hq.nextRound?.raceIndex === 2, 'hq next round');

clearWeekend();
await store.closeCareer();

console.log('\nAll weekend-flow checks passed.');
