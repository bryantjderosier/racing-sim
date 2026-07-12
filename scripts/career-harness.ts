import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, setActiveDbPath } from '../electron/db/connection.ts';
import { teams } from '../electron/db/schema.ts';
import { createCareerStore } from '../electron/sim/career/store.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const careersRoot = join(root, '.tmp', 'careers-harness');
const migrationsFolder = join(root, 'drizzle');

await rm(careersRoot, { recursive: true, force: true });
await mkdir(careersRoot, { recursive: true });
await closeDb();
setActiveDbPath(null);

const store = createCareerStore({ rootDir: careersRoot, migrationsFolder });

console.log('══════════════════════════════════════════════════════════════');
console.log(' CAREER OPEN / SAVE');
console.log('══════════════════════════════════════════════════════════════');

const created = await store.createCareer({ displayName: 'Test Apex 2026' });
assert(created.active, 'created career is active');
assert(created.displayName === 'Test Apex 2026', 'display name');
assert(created.playerTeamId === 1, 'default player team 1');
assert(created.playerTeamName != null, 'player team name');
assert(created.seasonYear === 2026, 'season year from clock');
assert(created.week === 1, 'week 1');
assert(!!created.id, 'has id');

const listed = await store.listCareers();
assert(listed.length === 1, 'list has 1 career');
assert(listed[0].id === created.id, 'list id matches');

const id = created.id;
await store.closeCareer();
assert((await store.getCareerSummary()) == null, 'summary null when closed');

const reopened = await store.openCareer(id);
assert(reopened.active, 'reopened active');
assert(reopened.id === id, 'same id');
assert(reopened.seasonYear === 2026, 'clock persisted');
assert(reopened.playerTeamId === 1, 'player team persisted');

const switched = await store.setPlayerTeam(2);
assert(switched.playerTeamId === 2, 'setPlayerTeam updates meta');
assert(switched.playerTeamName != null, 'team 2 name');

const db = await getDb();
const managed = await db.select().from(teams).where(eq(teams.status, 'PLAYER_MANAGED'));
assert(managed.length === 1 && managed[0].id === 2, 'exactly one PLAYER_MANAGED');

const second = await store.createCareer({ displayName: 'Rival Save', playerTeamId: 3 });
assert(second.playerTeamId === 3, 'create with playerTeamId');
assert(store.getActiveCareerId() === second.id, 'second career now active');

let deleteBlocked = false;
try {
	await store.deleteCareer(second.id);
} catch {
	deleteBlocked = true;
}
assert(deleteBlocked, 'refuse delete while open');

await store.closeCareer();
await store.deleteCareer(second.id);
const afterDelete = await store.listCareers();
assert(afterDelete.length === 1, 'one career remains');
assert(afterDelete[0].id === id, 'first career remains');

await store.openCareer(id);
const summary = await store.getCareerSummary();
assert(summary?.playerTeamId === 2, 'first career still on team 2');

await store.closeCareer();
await store.deleteCareer(id);
assert((await store.listCareers()).length === 0, 'all deleted');

console.log('\nAll career checks passed.');
