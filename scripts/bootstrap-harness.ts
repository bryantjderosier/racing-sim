import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, setActiveDbPath } from '../electron/db/connection.ts';
import {
	bootstrapCareer,
	listNewCareerTeamOptions
} from '../electron/sim/career/bootstrap.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'bootstrap-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' NEW-CAREER BOOTSTRAP');
console.log('══════════════════════════════════════════════════════════════');

const options = listNewCareerTeamOptions();
assert(options.length === 20, '20 team options');
assert(options[0].id === 1 && options[0].name.length > 0, 'first team Apex-ish');
assert(options.every((t) => t.division === 1), 'all div 1');

const chosen = options[4]; // Vertex Racing
const boot = await bootstrapCareer(store, {
	displayName: 'Bootstrap Save',
	playerTeamId: chosen.id,
	raceCount: 1
});

assert(boot.career.active, 'career active');
assert(boot.career.playerTeamId === chosen.id, 'player team id');
assert(boot.hq.clock.week === 1, 'week 1');
assert(boot.hq.clock.seasonYear === 2026, 'season 2026');
assert(boot.hq.nextRound != null, 'next round present');
assert(boot.hq.team.id === chosen.id, 'hq team matches');
assert(boot.hq.team.name === chosen.name, 'hq team name');
assert(boot.hq.costCap.limit > 0, 'cost cap');
assert(boot.season.created, 'season created');
assert(boot.season.nextRound != null, 'season next round');

const id = boot.career.id;
await store.closeCareer();
const reopened = await store.openCareer(id);
assert(reopened.playerTeamId === chosen.id, 'reopen keeps player team');
assert(reopened.seasonYear === 2026, 'reopen clock year');

await store.closeCareer();
await store.deleteCareer(id);

let bad = false;
try {
	await bootstrapCareer(store, { displayName: 'Bad', playerTeamId: 999 });
} catch {
	bad = true;
}
assert(bad, 'rejects invalid playerTeamId');

console.log('\nAll bootstrap checks passed.');
