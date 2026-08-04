import { and, asc, eq, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface CurrentSeasonResolution {
	worldDate: string;
	season: {
		id: string;
		year: number;
		championshipCode: string;
		championshipName: string;
		rulesetId: string;
	};
	nextEvent: {
		id: string;
		roundNumber: number;
		startDate: string;
		name: string;
		circuit: { name: string; shortName: string };
	} | null;
}

export async function resolveCurrentSeason(db: Database): Promise<CurrentSeasonResolution | null> {
	const save = await db
		.select({ worldDate: schema.saveGame.worldDate })
		.from(schema.saveGame)
		.limit(1);
	const worldDate = save[0]?.worldDate;
	if (!worldDate) return null;

	const seasonYear = Number.parseInt(worldDate.slice(0, 4), 10);
	const seasons = await db
		.select({
			id: schema.championshipSeason.id,
			year: schema.championshipSeason.seasonYear,
			championshipCode: schema.championship.code,
			championshipName: schema.championship.displayName,
			rulesetId: schema.championshipSeason.rulesetId
		})
		.from(schema.championshipSeason)
		.innerJoin(
			schema.championship,
			eq(schema.championshipSeason.championshipId, schema.championship.id)
		)
		.where(eq(schema.championshipSeason.seasonYear, seasonYear))
		.orderBy(asc(schema.championship.ladderRank));
	const season = seasons[0];
	if (!season) return null;

	const events = await db
		.select({
			id: schema.championshipEvent.id,
			roundNumber: schema.championshipEvent.roundNumber,
			startDate: schema.championshipEvent.startDate,
			name: schema.championshipEvent.name,
			circuitName: schema.circuit.name,
			circuitShortName: schema.circuit.shortName
		})
		.from(schema.championshipEvent)
		.innerJoin(
			schema.circuitLayoutVersion,
			eq(schema.championshipEvent.circuitLayoutVersionId, schema.circuitLayoutVersion.id)
		)
		.innerJoin(schema.circuit, eq(schema.circuitLayoutVersion.circuitId, schema.circuit.id))
		.where(
			and(
				eq(schema.championshipEvent.championshipSeasonId, season.id),
				gte(schema.championshipEvent.startDate, worldDate)
			)
		)
		.orderBy(asc(schema.championshipEvent.startDate), asc(schema.championshipEvent.roundNumber));

	const nextEvent = events[0] ?? null;
	return {
		worldDate,
		season: {
			id: season.id,
			year: season.year,
			championshipCode: season.championshipCode,
			championshipName: season.championshipName,
			rulesetId: season.rulesetId
		},
		nextEvent: nextEvent
			? {
					id: nextEvent.id,
					roundNumber: nextEvent.roundNumber,
					startDate: nextEvent.startDate,
					name: nextEvent.name,
					circuit: { name: nextEvent.circuitName, shortName: nextEvent.circuitShortName }
				}
			: null
	};
}
