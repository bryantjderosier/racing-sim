import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { drivers, scoutingReports, worldClock } from '../../db/schema.js';
import { getScoutNetworkStats } from '../scouting/stats.js';
import { DETECTION_BASE_CHANCE, type PotentialTier } from './constants.js';

async function nextReportId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${scoutingReports.id}), 0)` })
		.from(scoutingReports);
	return Number(row?.m ?? 0) + 1;
}

export type ScoutDiscovery = {
	driverId: number;
	name: string;
	potentialTier: PotentialTier | null;
	confidenceLevel: number;
	/** Fogged tier label until confidence high. */
	tierEstimate: string;
};

function fogTier(trueTier: PotentialTier | null, confidence: number): string {
	if (!trueTier) return 'unknown';
	if (confidence >= 75) return trueTier;
	if (confidence >= 45) {
		if (trueTier === 'elite' || trueTier === 'gold') return 'gold–elite?';
		return 'bronze–silver?';
	}
	return 'unconfirmed';
}

/**
 * Detection pass: chance to open/raise a scouting report on karting prospects.
 */
export async function scoutKartingPool(
	db: AppDb,
	teamId: number,
	options: { maxTargets?: number; rng?: () => number } = {}
): Promise<ScoutDiscovery[]> {
	const rng = options.rng ?? Math.random;
	const maxTargets = options.maxTargets ?? 5;
	const stats = await getScoutNetworkStats(db, teamId);
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const tick = clock?.tickIndex ?? 0;

	const pool = await db.select().from(drivers).where(eq(drivers.isKarting, true));
	const discovered: ScoutDiscovery[] = [];

	const chance =
		DETECTION_BASE_CHANCE *
		(0.5 + stats.detection / 100) *
		(1 + stats.hqTier * 0.15);

	const shuffled = [...pool].sort(() => rng() - 0.5);

	for (const d of shuffled) {
		if (discovered.length >= maxTargets) break;
		if (rng() > chance) continue;

		const confGain = Math.round(8 + stats.accuracy * 0.25 + stats.appraisal * 0.2);
		const [existing] = await db
			.select()
			.from(scoutingReports)
			.where(
				and(
					eq(scoutingReports.teamId, teamId),
					eq(scoutingReports.entityId, d.id),
					eq(scoutingReports.entityType, 'driver')
				)
			)
			.limit(1);

		let confidence: number;
		if (existing) {
			confidence = Math.min(100, existing.confidenceLevel + confGain);
			await db
				.update(scoutingReports)
				.set({ confidenceLevel: confidence, lastScoutDate: tick })
				.where(eq(scoutingReports.id, existing.id));
		} else {
			confidence = Math.min(100, Math.round(20 + confGain + rng() * 10));
			await db.insert(scoutingReports).values({
				id: await nextReportId(db),
				teamId,
				entityId: d.id,
				entityType: 'driver',
				confidenceLevel: confidence,
				lastScoutDate: tick,
				isAssigned: false
			});
		}

		const tier = (d.potentialTier as PotentialTier | null) ?? null;
		discovered.push({
			driverId: d.id,
			name: d.name,
			potentialTier: confidence >= 75 ? tier : null,
			confidenceLevel: confidence,
			tierEstimate: fogTier(tier, confidence)
		});
	}

	return discovered;
}
