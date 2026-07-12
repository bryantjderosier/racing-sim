import type { AppDb } from '../../db/node.js';
import { pointsSchemeRows } from '../../db/schema.js';

export type PointsSchemeId =
	| 'classic'
	| 'top_8'
	| 'flat_field'
	| 'win_heavy'
	| 'double_points_finale'
	| 'sprint_weekend'
	| 'fastest_lap_pole_bonus'
	| 'all_finishers';

/** Position → points for race classification (1-indexed). */
export const POINTS_CATALOG: Record<PointsSchemeId, Record<number, number>> = {
	classic: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
	top_8: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4 },
	flat_field: { 1: 20, 2: 17, 3: 15, 4: 13, 5: 11, 6: 9, 7: 7, 8: 5, 9: 3, 10: 1 },
	win_heavy: { 1: 30, 2: 20, 3: 15, 4: 10, 5: 8, 6: 6, 7: 4, 8: 3, 9: 2, 10: 1 },
	double_points_finale: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
	sprint_weekend: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
	fastest_lap_pole_bonus: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
	all_finishers: {
		1: 25,
		2: 22,
		3: 20,
		4: 18,
		5: 16,
		6: 14,
		7: 12,
		8: 10,
		9: 8,
		10: 7,
		11: 6,
		12: 5,
		13: 4,
		14: 3,
		15: 2,
		16: 1,
		17: 1,
		18: 1,
		19: 1,
		20: 1
	}
};

export const SPRINT_POINTS: Record<number, number> = {
	1: 8,
	2: 7,
	3: 6,
	4: 5,
	5: 4,
	6: 3,
	7: 2,
	8: 1
};

export type AwardPointsInput = {
	schemeId: PointsSchemeId;
	/** 1-indexed finishing position among classified finishers. */
	finishingPosition: number;
	status: 'finished' | 'dnf' | 'dsq' | 'dns' | 'retired';
	isFinale?: boolean;
	earnedPole?: boolean;
	earnedFastestLap?: boolean;
};

export function pointsForResult(input: AwardPointsInput): number {
	if (input.status !== 'finished') return 0;
	const table = POINTS_CATALOG[input.schemeId] ?? POINTS_CATALOG.classic;
	let pts = table[input.finishingPosition] ?? 0;

	if (input.schemeId === 'double_points_finale' && input.isFinale) {
		pts *= 2;
	}
	if (input.schemeId === 'fastest_lap_pole_bonus') {
		if (input.earnedPole) pts += 1;
		if (input.earnedFastestLap) pts += 1;
	}
	return pts;
}

/** Upsert catalog rows into DB (idempotent seed). */
export async function seedPointsCatalog(db: AppDb): Promise<number> {
	const existing = await db.select().from(pointsSchemeRows).limit(1);
	if (existing.length > 0) return 0;

	const rows: { schemeId: PointsSchemeId; finishingPosition: number; points: number }[] = [];
	for (const [schemeId, table] of Object.entries(POINTS_CATALOG) as [
		PointsSchemeId,
		Record<number, number>
	][]) {
		for (const [pos, points] of Object.entries(table)) {
			rows.push({
				schemeId,
				finishingPosition: Number(pos),
				points
			});
		}
	}
	await db.insert(pointsSchemeRows).values(rows);
	return rows.length;
}
