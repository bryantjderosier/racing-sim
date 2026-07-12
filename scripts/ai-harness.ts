import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, sql } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	aiTeamProfiles,
	facilities,
	rdProjects,
	teams
} from '../electron/db/schema.ts';
import { tickAiTeam, tickAllAiManagers } from '../electron/sim/ai/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';
import { advanceWorldWeek } from '../electron/sim/world/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'ai-managers.duckdb');
const migrationsFolder = join(root, 'drizzle');

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function rngSeq(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	const profiles = await db.select().from(aiTeamProfiles);
	assert(profiles.length === 19, 'AI profiles seeded for non-player teams');
	assert(
		profiles.some((p) => p.archetype === 'aggressive_spender') &&
			profiles.some((p) => p.archetype === 'long_term_builder') &&
			profiles.some((p) => p.archetype === 'pragmatic_pivot'),
		'all archetypes present'
	);

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' AI MANAGER LOOP');
	console.log('══════════════════════════════════════════════════════════════');
	console.log(`\n── Profiles: ${profiles.length}`);

	const player = await tickAiTeam(db, 1, rngSeq(1));
	assert(player.skippedReasons.includes('player_managed'), 'player skipped');

	const rng = rngSeq(42);
	const batch = await tickAllAiManagers(db, { rng, teamIds: [2, 3, 4] });
	assert(batch.teamsActed === 3, '3 AI acted');
	const started = batch.actions.filter((a) => a.startedProject || a.allocatedHours);
	assert(started.length >= 1, 'AI started or allocated R&D');
	console.log(
		`── Sample tick teams 2–4: started=${batch.actions.filter((a) => a.startedProject).length} allocated=${batch.actions.filter((a) => a.allocatedHours).length}`
	);

	// Enrich builder team cash for facility attempt
	const builder = profiles.find((p) => p.archetype === 'long_term_builder')!;
	await db
		.update(teams)
		.set({ liquidCash: 120_000_000, wtHoursRemaining: 40, cfdHoursRemaining: 80 })
		.where(eq(teams.id, builder.teamId));

	const builderAct = await tickAiTeam(db, builder.teamId, rngSeq(7));
	console.log(
		`── Builder #${builder.teamId}: project=${builderAct.startedProject?.slot ?? '-'} fac=${builderAct.startedFacility?.facilityType ?? '-'} skip=[${builderAct.skippedReasons.slice(0, 3)}]`
	);

	const projectsBefore = await db
		.select({ c: sql<number>`count(*)` })
		.from(rdProjects)
		.where(eq(rdProjects.status, 'fabricating'));

	const week = await advanceWorldWeek(db, {
		skipPayroll: true,
		skipScouting: true,
		skipMorale: true,
		rng: rngSeq(99)
	});
	assert(week.ai != null && week.ai.teamsActed >= 18, 'world tick runs AI');
	assert(
		week.ai!.actions.every((a) => a.teamId !== 1 || a.skippedReasons.includes('player_managed')),
		'player not in AI spend path'
	);

	const [t2] = await db.select().from(teams).where(eq(teams.id, 2)).limit(1);
	assert(t2.costCapSpent >= 0, 'cap tracked');
	const aiProjects = await db
		.select()
		.from(rdProjects)
		.where(and(eq(rdProjects.status, 'fabricating'), sql`${rdProjects.teamId} > 1`));
	assert(aiProjects.length > 0, 'AI has active projects');

	const underConstruction = await db
		.select()
		.from(facilities)
		.where(eq(facilities.isUnderConstruction, true));
	console.log(
		`── After world tick: AI projects=${aiProjects.length} (was ${projectsBefore[0]?.c}) building=${underConstruction.length} cap2=${(t2.costCapSpent / 1e6).toFixed(2)}M`
	);

	console.log('\n── PASS');
} finally {
	await db.close();
}
