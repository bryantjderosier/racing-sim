import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import { aiTeamProfiles, blueprints, regulatoryHistory, teams } from '../electron/db/schema.ts';
import type { RegProposal } from '../electron/sim/regs/index.ts';
import { getActiveRegulations, runWinterRegulations } from '../electron/sim/regs/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'winter-regs.duckdb');
const migrationsFolder = join(root, 'drizzle');

const PROPOSALS: RegProposal[] = [
	{
		id: 1,
		description: 'Front wing endplate simplification',
		impact: 'minor_tweak',
		affectedSlot: 'front_wing',
		performancePenaltyPct: 10
	},
	{
		id: 2,
		description: 'Rear wing beam-wing ban package',
		impact: 'major_overhaul',
		affectedSlot: 'rear_wing',
		performancePenaltyPct: 40
	},
	{
		id: 3,
		description: 'Underfloor ground-effect category ban',
		impact: 'category_ban',
		affectedSlot: 'underfloor',
		performancePenaltyPct: 100
	}
];

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	// Team 1 heavily next-year pivoted; team 2 current-car
	await db.update(teams).set({ rdPivotCurrent: 0.2 }).where(eq(teams.id, 1));
	await db.update(teams).set({ rdPivotCurrent: 1.0 }).where(eq(teams.id, 2));

	const allTeams = await db.select().from(teams);
	for (const t of allTeams) {
		if (t.id === 1) continue;
		await db.insert(aiTeamProfiles).values({
			teamId: t.id,
			archetype: t.id % 3 === 0 ? 'aggressive_spender' : 'long_term_builder',
			rAndDFocusBias: 0.5,
			facilityInvestmentRate: 0.5,
			costCapRiskTolerance: 0.3
		});
	}

	const fwBefore = await db
		.select()
		.from(blueprints)
		.where(and(eq(blueprints.teamId, 1), eq(blueprints.slot, 'front_wing')))
		.limit(1)
		.then((r) => r[0]!);
	const fwBeforeT2 = await db
		.select()
		.from(blueprints)
		.where(and(eq(blueprints.teamId, 2), eq(blueprints.slot, 'front_wing')))
		.limit(1)
		.then((r) => r[0]!);
	const floorBefore = await db
		.select()
		.from(blueprints)
		.where(and(eq(blueprints.teamId, 1), eq(blueprints.slot, 'underfloor')))
		.limit(1)
		.then((r) => r[0]!);

	console.log('══════════════════════════════════════════════════════════════');
	console.log(' WINTER REGULATIONS');
	console.log('══════════════════════════════════════════════════════════════');
	console.log(`\nTeam1 pivot current=${0.2} (next-year credit high)`);
	console.log(`Team2 pivot current=${1.0} (no next-year credit)`);
	console.log(`FW PP before: T1=${fwBefore.performancePoints} T2=${fwBeforeT2.performancePoints}`);

	const result = await runWinterRegulations(db, {
		seasonYear: 2026,
		applyToSeasonYear: 2027,
		playerTeamId: 1,
		playerVotes: [
			{ proposalId: 1, voteFor: true, politicalCapitalSpent: 3 },
			{ proposalId: 2, voteFor: true, politicalCapitalSpent: 0 },
			{ proposalId: 3, voteFor: false, politicalCapitalSpent: 2 }
		],
		proposals: PROPOSALS,
		rng: () => 0.42
	});

	console.log(`\n── Ballot (${result.votesCast} votes cast)`);
	for (const p of result.proposals) {
		const t = result.tallies.find((x) => x.proposalId === p.id)!;
		console.log(
			`  #${p.id} [${p.impact}] ${p.affectedSlot}: ${t.passed ? 'PASS' : 'FAIL'}` +
				`  yes ${t.yesWeight.toFixed(1)}/${t.votesFor}  no ${t.noWeight.toFixed(1)}/${t.votesAgainst}`
		);
		console.log(`      ${p.description}`);
	}

	console.log(`\n── Applied ${result.passed.length} rules`);
	for (const p of result.passed) {
		console.log(
			`  ${p.proposal.impact} ${p.proposal.affectedSlot}: touched ${p.blueprintsTouched} invalidated ${p.invalidated}`
		);
	}

	const fwAfterT1 = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, fwBefore.id))
		.limit(1)
		.then((r) => r[0]!);
	const fwAfterT2 = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, fwBeforeT2.id))
		.limit(1)
		.then((r) => r[0]!);
	const floorAfter = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, floorBefore.id))
		.limit(1)
		.then((r) => r[0]!);

	console.log(
		`\n── Front wing after minor (if passed): T1 ${fwBefore.performancePoints}→${fwAfterT1.performancePoints}  T2 ${fwBeforeT2.performancePoints}→${fwAfterT2.performancePoints}`
	);
	console.log(
		`── Underfloor after ban (if passed): ${floorBefore.performancePoints}→${floorAfter.performancePoints} invalidated=${floorAfter.isInvalidated}`
	);

	const active = await getActiveRegulations(db, 2027);
	console.log(`── regulatory_history 2027 active: ${active.length}`);
	for (const r of active) {
		console.log(`   ${r.impactType} ${r.affectedSlot}: ${r.ruleDescription}`);
	}

	const hist = await db.select().from(regulatoryHistory);
	if (result.votesCast !== allTeams.length * 3) {
		throw new Error('Expected one vote per team per proposal');
	}
	if (result.tallies.length !== 3) throw new Error('Expected 3 tallies');
	if (result.passed.length < 1) throw new Error('Expected at least one passed proposal');

	const minorPassed = result.passed.some((p) => p.proposal.id === 1);
	if (minorPassed) {
		if (fwAfterT1.performancePoints >= fwBefore.performancePoints) {
			throw new Error('Team1 FW should regress on minor pass');
		}
		if (fwAfterT2.performancePoints >= fwBeforeT2.performancePoints) {
			throw new Error('Team2 FW should regress on minor pass');
		}
		// Team1 has more pivot credit → smaller cut than team2
		const cut1 = fwBefore.performancePoints - fwAfterT1.performancePoints;
		const cut2 = fwBeforeT2.performancePoints - fwAfterT2.performancePoints;
		if (cut1 >= cut2) {
			throw new Error(`Pivot credit should shrink T1 cut (${cut1}) vs T2 (${cut2})`);
		}
		console.log(`── Pivot offset OK: T1 cut ${cut1} < T2 cut ${cut2}`);
	}

	const banPassed = result.passed.some((p) => p.proposal.id === 3);
	if (banPassed && !floorAfter.isInvalidated) {
		throw new Error('Category ban should invalidate underfloor');
	}

	if (hist.length !== result.passed.length) {
		throw new Error('History rows should match passed rules');
	}

	console.log('\nAll winter-regs checks passed.');
} finally {
	await db.close();
}
