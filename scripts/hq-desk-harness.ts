import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, getDb, setActiveDbPath } from '../electron/db/connection.ts';
import { bootstrapCareer } from '../electron/sim/career/bootstrap.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';
import {
	confirmPlayerRdPivot,
	getCalendarView,
	getHqSnapshot,
	upgradePlayerFacility
} from '../electron/sim/game/index.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'hq-desk-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' HQ DESK');
console.log('══════════════════════════════════════════════════════════════');

const boot = await bootstrapCareer(store, {
	displayName: 'HQ Desk',
	playerTeamId: 1,
	raceCount: 4
});
const db = await getDb();

let hq = await getHqSnapshot(db, boot.career);
assert(hq.calendar.length === 4, 'calendar length');
assert(hq.facilities.length > 0, 'facilities present');
assert(hq.team.wtHoursCap > 0, 'WT cap');
assert(hq.team.cfdHoursCap > 0, 'CFD cap');
assert(hq.pivot.raceIndex > 0, 'pivot race index');
assert(hq.costCap.limit > 0, 'cost cap');

const cal = await getCalendarView(db);
assert(cal.every((c) => c.trackName.length > 0), 'calendar track names');

const target = hq.facilities.find((f) => f.upgradeQuote && !f.isUnderConstruction);
assert(target != null, 'upgradeable facility');
const cashBefore = hq.team.cash;
const built = await upgradePlayerFacility(db, boot.career.playerTeamId, {
	facilityType: target!.facilityType
});
assert(built.cashSpent > 0, 'cash spent on upgrade');
hq = await getHqSnapshot(db, boot.career);
assert(hq.team.cash < cashBefore, 'cash reduced');
assert(
	hq.facilities.some((f) => f.facilityType === target!.facilityType && f.isUnderConstruction),
	'facility under construction'
);

const pivot = await confirmPlayerRdPivot(db, boot.career.playerTeamId, {
	currentFraction: 0.35,
	lockSeason: true
});
assert(pivot.locked, 'pivot locked');
assert(Math.abs(pivot.currentFraction - 0.35) < 1e-6, 'pivot fraction');
hq = await getHqSnapshot(db, boot.career);
assert(hq.pivot.locked, 'snapshot pivot locked');
assert(Math.abs(hq.pivot.currentFraction - 0.35) < 1e-6, 'snapshot fraction');

await store.closeCareer();
console.log('\nAll hq-desk checks passed.');
