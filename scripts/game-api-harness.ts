import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, getDb, setActiveDbPath } from '../electron/db/connection.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';
import {
	advanceWeek,
	beginWeekend,
	clearWeekend,
	createRace,
	ensureSeason,
	getHqSnapshot,
	raceCommand,
	raceFinish,
	raceStepLap
} from '../electron/sim/game/index.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'game-api-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);
clearWeekend();

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' GAME API + DTOs');
console.log('══════════════════════════════════════════════════════════════');

const career = await store.createCareer({ displayName: 'Game API Test' });
const db = await getDb();

const season = await ensureSeason(db, career.playerTeamId, { raceCount: 1 });
assert(season.created, 'season created');
assert(season.nextRound != null, 'has next round');
assert(season.nextRound!.trackName.length > 0, 'track name');

const hq = await getHqSnapshot(db, career);
assert(hq.team.cash > 0, 'team cash');
assert(hq.costCap.limit > 0, 'cost cap');
assert(hq.clock.seasonYear === 2026, 'clock year');
assert(hq.nextRound != null, 'hq next round');
assert(hq.standingsDrivers.length > 0, 'driver standings');
assert(hq.standingsTeams.length > 0, 'team standings');

const week0 = hq.clock.week;
const tick = await advanceWeek(db, career.playerTeamId);
assert(tick.week === week0 + 1 || (week0 === 52 && tick.week === 1), 'week advanced');

const weekend = await beginWeekend(db, career.playerTeamId);
assert(weekend.entrants.length >= 2, 'grid loaded');
assert(weekend.trackName.length > 0, 'weekend track');

const race = createRace({ laps: 3, seed: 99 });
assert(race.totalLaps === 3, 'race laps');
assert(race.telemetry.cars.length === weekend.entrants.length, 'telemetry field');

const playerDriverId = weekend.entrants.find((e) => e.teamId === career.playerTeamId)!.driverId;
raceCommand({ type: 'setPace', entrantId: playerDriverId, pace: 'push' });

const stepped = raceStepLap(1);
assert(stepped.telemetry.lap === 1, 'after lap 1');
assert(stepped.telemetry.cars.some((c) => c.fuelKg < 55), 'fuel burned');
assert(stepped.lines.length > 0, 'lap lines');

const finished = raceFinish();
assert(finished.classification.length === weekend.entrants.length, 'classification');
assert(finished.classification.every((c) => c.lapsCompleted === 3 || c.status === 'dnf'), 'laps done');

clearWeekend();
await store.closeCareer();

console.log('\nAll game-api checks passed.');
