import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { sponsorContracts } from '../../db/schema.js';

/**
 * Age multi-year sponsor deals at season boundary; expire when years hit 0.
 */
export async function ageSponsorContractsOneYear(db: AppDb): Promise<{
	aged: number;
	expired: number;
}> {
	const rows = await db
		.select()
		.from(sponsorContracts)
		.where(eq(sponsorContracts.isActive, true));

	let aged = 0;
	let expired = 0;
	const seen = new Set<string>();

	for (const r of rows) {
		if (r.yearsRemaining == null) continue;
		const key = `${r.teamId}:${r.sponsorId}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const dealRows = rows.filter(
			(x) => x.teamId === r.teamId && x.sponsorId === r.sponsorId && x.isActive
		);
		const next = Math.max(0, (r.yearsRemaining ?? 1) - 1);
		aged++;
		for (const d of dealRows) {
			if (next <= 0) {
				await db
					.update(sponsorContracts)
					.set({ yearsRemaining: 0, isActive: false })
					.where(eq(sponsorContracts.id, d.id));
				expired++;
			} else {
				await db
					.update(sponsorContracts)
					.set({ yearsRemaining: next })
					.where(eq(sponsorContracts.id, d.id));
			}
		}
	}

	return { aged, expired };
}

export async function listActiveSponsorDeals(db: AppDb, teamId: number) {
	return db
		.select()
		.from(sponsorContracts)
		.where(
			and(eq(sponsorContracts.teamId, teamId), eq(sponsorContracts.isActive, true))
		);
}
