import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { openDbAt } from '../electron/db/node.ts';
import {
	contracts,
	drivers,
	seasonCalendar,
	seasons,
	teams,
	worldClock
} from '../electron/db/schema.ts';
import { runCareerYear } from '../electron/sim/career/index.ts';
import { seedDriverContracts } from '../electron/sim/market/index.ts';
import type { RegProposal } from '../electron/sim/regs/index.ts';
import { seedFullGrid } from '../electron/sim/seed/grid-fixture.ts';

const YEAR = 2026;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, '.tmp', 'offseason.duckdb');
const migrationsFolder = join(root, 'drizzle');

const WINTER: RegProposal[] = [
	{
		id: 1,
		description: 'Front wing endplate simplification',
		impact: 'minor_tweak',
		affectedSlot: 'front_wing',
		performancePenaltyPct: 10
	},
	{
		id: 2,
		description: 'Sidepod inlet geometry freeze',
		impact: 'minor_tweak',
		affectedSlot: 'sidepods',
		performancePenaltyPct: 10
	},
	{
		id: 3,
		description: 'Rear wing beam-wing package',
		impact: 'major_overhaul',
		affectedSlot: 'rear_wing',
		performancePenaltyPct: 40
	}
];

await mkdir(dirname(dbPath), { recursive: true });
const db = await openDbAt(dbPath, { migrateFolder: migrationsFolder });

try {
	await seedFullGrid(db);

	const allDrivers = await db.select().from(drivers);
	await seedDriverContracts(
		db,
		allDrivers.map((d, i) => ({
			driverId: d.id,
			teamId: d.teamId!,
			salaryAnnual: 2_000_000 + i * 25_000,
			yearsRemaining: i % 5 === 0 ? 1 : 3,
			buyoutFee: 2_500_000
		}))
	);

	console.log('══════════════════════════════════════════════════════════════');
	console.log(` CAREER YEAR + OFF-SEASON — ${YEAR}`);
	console.log('══════════════════════════════════════════════════════════════');

	const result = await runCareerYear(db, {
		seasonYear: YEAR,
		raceCount: 2,
		raceCountNext: 3,
		rdPivotRaceIndex: 1,
		rdPivotRaceIndexNext: 2,
		pointsScheme: 'classic',
		raceLaps: 6,
		practiceStints: 1,
		practiceLapsPerStint: 2,
		chaos: false,
		weeksAfterRace: 1,
		playerTeamId: 1,
		playerPivotFraction: 0.5,
		playerVotes: [
			{ proposalId: 1, voteFor: true },
			{ proposalId: 2, voteFor: true },
			{ proposalId: 3, voteFor: false }
		],
		winterProposals: WINTER,
		skipPromotion: true, // single division grid
		marketMaxSignings: 2,
		seed: 7,
		onRound: (r) => {
			console.log(`── R${r.raceIndex} winner ${r.winner?.name ?? '?'} (+${r.winner?.points ?? 0})`);
		}
	});

	if (!result.season.complete) throw new Error('Season incomplete');
	if (!result.offseason) throw new Error('Off-season did not run');

	const off = result.offseason;
	console.log(`\n── Off-season ${off.fromSeasonYear} → ${off.toSeasonYear}`);
	console.log(`  Champion D1 team #${off.standingsChampions[0]?.teamId} (${off.standingsChampions[0]?.points} pts)`);
	console.log(`  Winter passed: ${off.winter?.passed.length ?? 0}/${off.winter?.proposals.length ?? 0}`);
	console.log(`  Contracts aged: ${off.contractsAged}`);
	console.log(`  Market signings: ${off.market?.signings.length ?? 0}`);
	console.log(`  Seasons init: [${off.seasonsInitialized.join(',')}]`);

	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1));
	const nextCal = await db
		.select()
		.from(seasonCalendar)
		.where(eq(seasonCalendar.seasonYear, YEAR + 1));
	const [nextSeason] = await db
		.select()
		.from(seasons)
		.where(and(eq(seasons.seasonYear, YEAR + 1), eq(seasons.division, 1)));
	const [player] = await db.select().from(teams).where(eq(teams.id, 1));
	const aged = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.isActive, true), eq(contracts.yearsRemaining, 0)));
	const [driver1] = await db.select().from(drivers).where(eq(drivers.id, 1));

	console.log(`\n── Rollover`);
	console.log(`  Clock: ${clock.seasonYear} W${clock.week}`);
	console.log(`  Next calendar races: ${nextCal.length} (incomplete=${nextCal.filter((c) => !c.isCompleted).length})`);
	console.log(`  Next season pivotLocked=${nextSeason?.rdPivotLocked} player pivot=${player.rdPivotCurrent}`);
	console.log(`  Contracts at 0 years (heat): ${aged.length}`);
	console.log(`  Driver#1 age: ${driver1.age}`);

	if (clock.seasonYear !== YEAR + 1 || clock.week !== 1) {
		throw new Error('Clock should be next season W1');
	}
	if (nextCal.length !== 3) throw new Error('Expected 3-race next calendar');
	if (nextCal.some((c) => c.isCompleted)) throw new Error('Next calendar should be fresh');
	if (!nextSeason || nextSeason.rdPivotLocked) throw new Error('Next season should be unlocked');
	if (player.rdPivotCurrent !== 1) throw new Error('Teams should reset to 100% current car');
	if (player.costCapSpent !== 0) throw new Error('costCapSpent should reset');
	if ((off.winter?.passed.length ?? 0) < 1) throw new Error('Expected winter rule(s) passed');
	if (off.contractsAged < 1) throw new Error('Expected contracts aged');
	if (driver1.age < 23) throw new Error('Drivers should age +1');

	console.log('\nAll off-season glue checks passed.');
} finally {
	await db.close();
}
