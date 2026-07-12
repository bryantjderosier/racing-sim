import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, facilities, staff } from '../../db/schema.js';
import { facilityEfficiencyMult } from '../world/facilities.js';

export type ScoutNetworkStats = {
	scoutStaffId: number | null;
	detection: number;
	accuracy: number;
	appraisal: number;
	coverage: number;
	leverage: number;
	hqTier: number;
	hqConditionPct: number;
	hqEfficiencyMult: number;
};

export async function getScoutNetworkStats(
	db: AppDb,
	teamId: number
): Promise<ScoutNetworkStats> {
	const [scout] = await db
		.select()
		.from(staff)
		.where(and(eq(staff.teamId, teamId), eq(staff.role, 'scout')))
		.limit(1);

	const attrs = scout
		? await db
				.select()
				.from(attributes)
				.where(
					and(eq(attributes.entityId, scout.id), eq(attributes.entityType, 'staff'))
				)
		: [];
	const map: Record<string, number> = {};
	for (const a of attrs) map[a.attrName] = a.currentValue;

	const [hq] = await db
		.select()
		.from(facilities)
		.where(
			and(eq(facilities.teamId, teamId), eq(facilities.facilityType, 'scouting_hq'))
		)
		.limit(1);

	const hqTier = hq?.tier ?? 0;
	const hqConditionPct = hq?.conditionPct ?? 100;

	return {
		scoutStaffId: scout?.id ?? null,
		detection: map.detection ?? 40,
		accuracy: map.accuracy ?? 40,
		appraisal: map.appraisal ?? 40,
		coverage: map.coverage ?? 40,
		leverage: map.leverage ?? 40,
		hqTier,
		hqConditionPct,
		hqEfficiencyMult: facilityEfficiencyMult(hqTier, hqConditionPct)
	};
}
