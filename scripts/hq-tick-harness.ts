import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, setActiveDbPath } from '../electron/db/connection.ts';
import { bootstrapCareer } from '../electron/sim/career/bootstrap.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';
import { tickHqWeek } from '../electron/sim/game/week.ts';
import { getDb } from '../electron/db/connection.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'hq-tick-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' HQ WEEK TICK');
console.log('══════════════════════════════════════════════════════════════');

const boot = await bootstrapCareer(store, {
	displayName: 'HQ Tick Save',
	playerTeamId: 1,
	raceCount: 1
});
const db = await getDb();

const week1 = boot.hq.clock.week;
const wt1 = boot.hq.team.wtHours;
const cond1 = Math.min(...boot.hq.facilities.map((f) => f.conditionPct));
assert(week1 === 1, 'start week 1');
assert(boot.hq.facilities.some((f) => f.tier > 0), 'has tiered facilities');

const t1 = await tickHqWeek(db, boot.career);
assert(t1.tick.week === 2, 'tick → week 2');
assert(t1.hq.clock.week === t1.tick.week, 'hq week matches tick');
assert(t1.hq.team.id === 1, 'player team stable');
assert(t1.tick.facilitiesDecayed > 0, 'facilities decayed without maintain');
assert(t1.hq.team.wtHours === wt1 || t1.hq.team.wtHours > 0, 'WT refreshed');
const condAfterDecay = Math.min(...t1.hq.facilities.map((f) => f.conditionPct));
assert(condAfterDecay < cond1 || t1.tick.facilitiesDecayed > 0, 'condition dropped or decay counted');
assert(t1.tick.aiTeamsActed >= 0, 'ai count present');
assert(t1.tick.scoutingTickCount >= 0, 'scouting count present');

const t2 = await tickHqWeek(db, boot.career, { maintainFacilities: true });
assert(t2.tick.week === 3, 'tick → week 3');
assert(t2.tick.facilitiesMaintained > 0, 'facilities maintained');
assert(t2.hq.clock.week === 3, 'hq week 3');
const condAfterMaint = Math.min(...t2.hq.facilities.map((f) => f.conditionPct));
assert(condAfterMaint === 100, 'maintained facilities at 100');

await store.closeCareer();
console.log('\nAll hq-tick checks passed.');
