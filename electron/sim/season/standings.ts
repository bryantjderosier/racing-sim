import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { championshipStandings, drivers, teams } from '../../db/schema.js';

async function nextStandingId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${championshipStandings.id}), 0)` })
		.from(championshipStandings);
	return Number(row?.m ?? 0) + 1;
}

export async function initStandings(
	db: AppDb,
	seasonYear: number,
	division: number
): Promise<{ drivers: number; constructors: number }> {
	await db
		.delete(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, seasonYear),
				eq(championshipStandings.division, division)
			)
		);

	const teamRows = await db.select().from(teams).where(eq(teams.division, division));
	const driverRows = await db
		.select()
		.from(drivers)
		.innerJoin(teams, eq(drivers.teamId, teams.id))
		.where(eq(teams.division, division));

	let id = await nextStandingId(db);
	let dCount = 0;
	let cCount = 0;

	for (const t of teamRows) {
		await db.insert(championshipStandings).values({
			id: id++,
			seasonYear,
			division,
			entityId: t.id,
			entityType: 'team',
			teamId: t.id,
			points: 0,
			position: null
		});
		cCount++;
	}

	for (const row of driverRows) {
		const d = row.drivers;
		await db.insert(championshipStandings).values({
			id: id++,
			seasonYear,
			division,
			entityId: d.id,
			entityType: 'driver',
			teamId: d.teamId,
			points: 0,
			position: null
		});
		dCount++;
	}

	return { drivers: dCount, constructors: cCount };
}

export type PointsAward = {
	driverId: number;
	teamId: number;
	points: number;
};

export async function applyPointsAwards(
	db: AppDb,
	seasonYear: number,
	division: number,
	awards: PointsAward[]
): Promise<void> {
	for (const a of awards) {
		if (a.points <= 0) continue;

		const [driverRow] = await db
			.select()
			.from(championshipStandings)
			.where(
				and(
					eq(championshipStandings.seasonYear, seasonYear),
					eq(championshipStandings.division, division),
					eq(championshipStandings.entityType, 'driver'),
					eq(championshipStandings.entityId, a.driverId)
				)
			)
			.limit(1);
		if (driverRow) {
			await db
				.update(championshipStandings)
				.set({ points: driverRow.points + a.points })
				.where(eq(championshipStandings.id, driverRow.id));
		}

		const [teamRow] = await db
			.select()
			.from(championshipStandings)
			.where(
				and(
					eq(championshipStandings.seasonYear, seasonYear),
					eq(championshipStandings.division, division),
					eq(championshipStandings.entityType, 'team'),
					eq(championshipStandings.entityId, a.teamId)
				)
			)
			.limit(1);
		if (teamRow) {
			await db
				.update(championshipStandings)
				.set({ points: teamRow.points + a.points })
				.where(eq(championshipStandings.id, teamRow.id));
		}
	}

	await recomputePositions(db, seasonYear, division);
}

export async function recomputePositions(
	db: AppDb,
	seasonYear: number,
	division: number
): Promise<void> {
	for (const entityType of ['driver', 'team'] as const) {
		const rows = await db
			.select()
			.from(championshipStandings)
			.where(
				and(
					eq(championshipStandings.seasonYear, seasonYear),
					eq(championshipStandings.division, division),
					eq(championshipStandings.entityType, entityType)
				)
			);
		rows.sort((a, b) => b.points - a.points || a.entityId - b.entityId);
		for (let i = 0; i < rows.length; i++) {
			await db
				.update(championshipStandings)
				.set({ position: i + 1 })
				.where(eq(championshipStandings.id, rows[i].id));
		}
	}

	const constructors = await db
		.select()
		.from(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, seasonYear),
				eq(championshipStandings.division, division),
				eq(championshipStandings.entityType, 'team')
			)
		);
	for (const c of constructors) {
		if (c.position != null) {
			await db
				.update(teams)
				.set({ constructorsStanding: c.position })
				.where(eq(teams.id, c.entityId));
		}
	}
}

export async function getStandingsTable(
	db: AppDb,
	seasonYear: number,
	division: number,
	entityType: 'driver' | 'team'
) {
	const rows = await db
		.select()
		.from(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, seasonYear),
				eq(championshipStandings.division, division),
				eq(championshipStandings.entityType, entityType)
			)
		);
	return rows.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}
