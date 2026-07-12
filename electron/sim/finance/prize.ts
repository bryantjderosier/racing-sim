import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { championshipStandings, teams } from '../../db/schema.js';
import { CONSTRUCTORS_PRIZE_BY_DIVISION } from './constants.js';
import { receiveCash } from './ledger.js';

export type PrizePayout = {
	teamId: number;
	division: number;
	position: number;
	amount: number;
};

/**
 * Pay constructors prize money from prior-season standings (outside cost cap).
 * Uses stored `position` when set; otherwise ranks by points.
 */
export async function payChampionshipPrizeMoney(
	db: AppDb,
	fromSeasonYear: number
): Promise<PrizePayout[]> {
	const teamRows = await db.select().from(teams);
	const byDiv = new Map<number, typeof teamRows>();
	for (const t of teamRows) {
		const list = byDiv.get(t.division) ?? [];
		list.push(t);
		byDiv.set(t.division, list);
	}

	const payouts: PrizePayout[] = [];

	for (const [division, divTeams] of byDiv) {
		const pool = CONSTRUCTORS_PRIZE_BY_DIVISION[division] ?? CONSTRUCTORS_PRIZE_BY_DIVISION[3]!;
		const standingRows = await db
			.select()
			.from(championshipStandings)
			.where(
				and(
					eq(championshipStandings.seasonYear, fromSeasonYear),
					eq(championshipStandings.division, division),
					eq(championshipStandings.entityType, 'team')
				)
			);

		const ranked = [...standingRows].sort((a, b) => {
			if (a.position != null && b.position != null) return a.position - b.position;
			return b.points - a.points || a.entityId - b.entityId;
		});

		// Ensure every team in division appears
		const seen = new Set(ranked.map((r) => r.entityId));
		for (const t of divTeams) {
			if (!seen.has(t.id)) {
				ranked.push({
					id: -1,
					seasonYear: fromSeasonYear,
					division,
					entityId: t.id,
					entityType: 'team',
					teamId: t.id,
					points: 0,
					position: null
				});
			}
		}

		ranked.sort((a, b) => {
			if (a.position != null && b.position != null) return a.position - b.position;
			return b.points - a.points || a.entityId - b.entityId;
		});

		ranked.forEach((row, i) => {
			const amount = pool[i] ?? pool[pool.length - 1] ?? 0;
			if (amount <= 0) return;
			payouts.push({
				teamId: row.entityId,
				division,
				position: i + 1,
				amount
			});
		});
	}

	for (const p of payouts) {
		await receiveCash(db, {
			teamId: p.teamId,
			amount: p.amount,
			transactionType: 'prize_money'
		});
	}

	return payouts;
}
