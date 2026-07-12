import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { blueprints } from '../../db/schema.js';
import { REGRESSION_MAJOR, REGRESSION_MINOR, SLOT_PP_FLOOR } from './constants.js';
import type { DevelopableSlot, RegulationImpact } from './types.js';

export type WinterRegressionInput = {
	impact: RegulationImpact;
	affectedSlots?: DevelopableSlot[];
	/** Mid-season next-year pivot credit 0–1 offsets the hit. */
	pivotCredit?: number;
	/** Tier-5 HQ localized reduction (0–0.35 of the regression slice). */
	hqRegressionRelief?: number;
	/** Limit to one team's blueprints (per-team pivot). */
	teamId?: number;
};

export type WinterRegressionResult = {
	blueprintsTouched: number;
	invalidated: number;
	avgPpAfter: number;
};

/**
 * Apply regulation-scaled regression to surviving blueprints.
 * No clean year-over-year PP carryover.
 */
export async function applyWinterRegression(
	db: AppDb,
	input: WinterRegressionInput
): Promise<WinterRegressionResult> {
	const pivot = Math.max(0, Math.min(1, input.pivotCredit ?? 0));
	const hqRelief = Math.max(0, Math.min(0.35, input.hqRegressionRelief ?? 0));

	let rows = await db.select().from(blueprints).where(eq(blueprints.isInvalidated, false));
	if (input.teamId != null) {
		rows = rows.filter((r) => r.teamId === input.teamId);
	}

	if (input.impact === 'category_ban') {
		const slots = input.affectedSlots ?? [];
		if (slots.length === 0) throw new Error('category_ban requires affectedSlots');
		rows = rows.filter((r) => slots.includes(r.slot as DevelopableSlot));
		for (const r of rows) {
			await db
				.update(blueprints)
				.set({
					isInvalidated: true,
					performancePoints: SLOT_PP_FLOOR[r.slot as DevelopableSlot] ?? 20
				})
				.where(eq(blueprints.id, r.id));
		}
		return {
			blueprintsTouched: rows.length,
			invalidated: rows.length,
			avgPpAfter:
				rows.length === 0
					? 0
					: rows.reduce(
							(s, r) => s + (SLOT_PP_FLOOR[r.slot as DevelopableSlot] ?? 20),
							0
						) / rows.length
		};
	}

	const baseCut = input.impact === 'major_overhaul' ? REGRESSION_MAJOR : REGRESSION_MINOR;
	const cut = baseCut * (1 - pivot) * (1 - hqRelief);

	if (input.affectedSlots?.length) {
		const set = new Set(input.affectedSlots);
		rows = rows.filter((r) => set.has(r.slot as DevelopableSlot));
	}

	let sum = 0;
	for (const r of rows) {
		const next = Math.max(1, Math.round(r.performancePoints * (1 - cut)));
		sum += next;
		await db
			.update(blueprints)
			.set({
				performancePoints: next,
				performanceKnownMin:
					r.performanceKnownMin != null
						? Math.round(r.performanceKnownMin * (1 - cut))
						: null,
				performanceKnownMax:
					r.performanceKnownMax != null
						? Math.round(r.performanceKnownMax * (1 - cut))
						: null,
				scoutConfidence: Math.max(0, Math.round(r.scoutConfidence * 0.7))
			})
			.where(eq(blueprints.id, r.id));
	}

	return {
		blueprintsTouched: rows.length,
		invalidated: 0,
		avgPpAfter: rows.length === 0 ? 0 : sum / rows.length
	};
}
