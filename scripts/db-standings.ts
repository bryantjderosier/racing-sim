import { eq } from 'drizzle-orm';
import {
	getDriverChampionshipStandings,
	getTeamChampionshipStandings
} from '../electron/db/settlement-service.js';
import { resolveCurrentSeason } from '../electron/db/season-service.js';
import { closeSaveDatabase, openSaveDatabase } from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';

function argumentValue(name: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function printUsage(): void {
	console.log('Usage: pnpm db:standings -- --save <path> [--season-id <id>]');
}

const savePath = argumentValue('save');
if (process.argv.includes('--help')) {
	printUsage();
	process.exit(0);
}
if (!savePath) {
	printUsage();
	throw new Error('Missing required --save path.');
}

const save = await openSaveDatabase({ targetPath: savePath });
try {
	const currentSeason = await resolveCurrentSeason(save.db);
	const seasonId = argumentValue('season-id') ?? currentSeason?.season.id;
	if (!seasonId) throw new Error('No current championship season was found in the save.');

	const seasonRows = await save.db
		.select({
			id: schema.championshipSeason.id,
			year: schema.championshipSeason.seasonYear,
			championshipName: schema.championship.displayName
		})
		.from(schema.championshipSeason)
		.innerJoin(
			schema.championship,
			eq(schema.championshipSeason.championshipId, schema.championship.id)
		)
		.where(eq(schema.championshipSeason.id, seasonId))
		.limit(1);
	const season = seasonRows[0];
	if (!season) throw new Error(`Championship season was not found: ${seasonId}.`);

	const [drivers, teams] = await Promise.all([
		getDriverChampionshipStandings(save.db, seasonId),
		getTeamChampionshipStandings(save.db, seasonId)
	]);

	console.log(`${season.championshipName} ${season.year} standings`);
	if (currentSeason) console.log(`worldDate=${currentSeason.worldDate}`);

	console.log('\nDrivers');
	if (drivers.length === 0) {
		console.log('No driver standings have been recorded for this season yet.');
	} else {
		console.table(
			drivers.map((standing, index) => ({
				pos: index + 1,
				driver: standing.driverName,
				points: standing.points,
				wins: standing.wins,
				p2: standing.secondPlaces,
				p3: standing.thirdPlaces
			}))
		);
	}

	console.log('\nConstructors');
	if (teams.length === 0) {
		console.log('No constructor standings have been recorded for this season yet.');
	} else {
		console.table(
			teams.map((standing, index) => ({
				pos: index + 1,
				constructor: standing.teamName,
				points: standing.points,
				wins: standing.wins,
				p2: standing.secondPlaces,
				p3: standing.thirdPlaces
			}))
		);
	}
} finally {
	closeSaveDatabase(save);
}
