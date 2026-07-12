import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { sponsorContracts } from '../../db/schema.js';
import { receiveCash } from '../finance/index.js';

export type RaceSponsorPayout = {
	contractId: number;
	sponsorId: number;
	payoutType: 'per_race' | 'bonus';
	amount: number;
};

export type RaceSponsorPayoutResult = {
	teamId: number;
	totalPaid: number;
	payouts: RaceSponsorPayout[];
	expiredContractIds: number[];
};

/**
 * After a race: pay per_race streams; pay bonus if best team car ≤ target; tick remaining_races.
 */
export async function payRaceSponsors(
	db: AppDb,
	args: {
		teamId: number;
		/** Best finishing position among team's cars (1 = win). */
		bestFinishPosition: number | null;
		finished: boolean;
	}
): Promise<RaceSponsorPayoutResult> {
	const rows = await db
		.select()
		.from(sponsorContracts)
		.where(
			and(eq(sponsorContracts.teamId, args.teamId), eq(sponsorContracts.isActive, true))
		);

	const payouts: RaceSponsorPayout[] = [];
	let totalPaid = 0;
	const expiredContractIds: number[] = [];

	const sponsorIds = [...new Set(rows.map((r) => r.sponsorId))];

	for (const row of rows) {
		if (row.payoutType === 'upfront') continue;

		if (row.payoutType === 'per_race' && args.finished) {
			totalPaid += row.amount;
			payouts.push({
				contractId: row.id,
				sponsorId: row.sponsorId,
				payoutType: 'per_race',
				amount: row.amount
			});
			await receiveCash(db, {
				teamId: args.teamId,
				amount: row.amount,
				transactionType: 'sponsor_payout'
			});
		}

		if (
			row.payoutType === 'bonus' &&
			args.finished &&
			args.bestFinishPosition != null &&
			row.bonusTargetPosition != null &&
			args.bestFinishPosition <= row.bonusTargetPosition
		) {
			totalPaid += row.amount;
			payouts.push({
				contractId: row.id,
				sponsorId: row.sponsorId,
				payoutType: 'bonus',
				amount: row.amount
			});
			await receiveCash(db, {
				teamId: args.teamId,
				amount: row.amount,
				transactionType: 'sponsor_bonus'
			});
		}
	}

	for (const sid of sponsorIds) {
		const dealRows = rows.filter((r) => r.sponsorId === sid);
		const sample = dealRows[0];
		if (sample?.remainingRaces == null) continue;
		const next = sample.remainingRaces - 1;
		for (const r of dealRows) {
			if (next <= 0) {
				await db
					.update(sponsorContracts)
					.set({ remainingRaces: 0, isActive: false })
					.where(eq(sponsorContracts.id, r.id));
				expiredContractIds.push(r.id);
			} else {
				await db
					.update(sponsorContracts)
					.set({ remainingRaces: next })
					.where(eq(sponsorContracts.id, r.id));
			}
		}
	}

	return { teamId: args.teamId, totalPaid, payouts, expiredContractIds };
}

/**
 * Pay race sponsors for every team that has a result map entry.
 */
export async function payAllRaceSponsors(
	db: AppDb,
	bestFinishByTeam: Record<number, number | null>
): Promise<RaceSponsorPayoutResult[]> {
	const out: RaceSponsorPayoutResult[] = [];
	for (const [teamIdStr, best] of Object.entries(bestFinishByTeam)) {
		const teamId = Number(teamIdStr);
		out.push(
			await payRaceSponsors(db, {
				teamId,
				bestFinishPosition: best,
				finished: best != null
			})
		);
	}
	return out;
}
