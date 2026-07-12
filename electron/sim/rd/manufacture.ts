import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	blueprintFlaws,
	blueprints,
	manufacturingQueue,
	parts,
	worldClock
} from '../../db/schema.js';
import { spendCash } from '../finance/index.js';
import {
	FABRICATION_COST_BASE,
	FABRICATION_DAYS_BASE,
	LIGHTWEIGHT_CEILING_PENALTY,
	LIGHTWEIGHT_COST_MULT,
	LIGHTWEIGHT_RELIABILITY_PENALTY,
	LIGHTWEIGHT_WEIGHT_MULT
} from './constants.js';
import { applyMileageToFog, flawsRevealedByConfidence } from './fog.js';
import type { DevelopableSlot } from './types.js';

async function nextId(db: AppDb, table: 'parts' | 'manufacturing_queue'): Promise<number> {
	const q =
		table === 'parts'
			? db.select({ m: sql<number>`coalesce(max(${parts.id}), 0)` }).from(parts)
			: db
					.select({ m: sql<number>`coalesce(max(${manufacturingQueue.id}), 0)` })
					.from(manufacturingQueue);
	const [row] = await q;
	return Number(row?.m ?? 0) + 1;
}

export type QueueManufactureInput = {
	teamId: number;
	blueprintId: number;
	isLightweight?: boolean;
	/** Absolute calendar day index; defaults to clock tick + fabrication days. */
	completionDate?: number;
};

export type QueueManufactureResult = {
	queueId: number;
	completionDate: number;
	cost: number;
};

export async function queueManufacture(
	db: AppDb,
	input: QueueManufactureInput
): Promise<QueueManufactureResult> {
	const [bp] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, input.blueprintId))
		.limit(1);
	if (!bp) throw new Error(`Blueprint ${input.blueprintId} not found`);
	if (bp.isInvalidated) throw new Error(`Blueprint ${input.blueprintId} is invalidated`);
	if (bp.teamId !== input.teamId) throw new Error('Blueprint belongs to another team');

	const lightweight = input.isLightweight === true;
	const cost = FABRICATION_COST_BASE * (lightweight ? LIGHTWEIGHT_COST_MULT : 1);

	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const completionDate =
		input.completionDate ?? (clock?.tickIndex ?? 0) + FABRICATION_DAYS_BASE;

	await spendCash(db, {
		teamId: input.teamId,
		amount: cost,
		transactionType: 'part_fabrication',
		isCostCapApplicable: true
	});

	const queueId = await nextId(db, 'manufacturing_queue');
	await db.insert(manufacturingQueue).values({
		id: queueId,
		teamId: input.teamId,
		blueprintId: input.blueprintId,
		isLightweight: lightweight,
		completionDate,
		status: 'fabricating'
	});

	return { queueId, completionDate, cost };
}

export type CompleteManufactureResult = {
	partId: number;
	weightKg: number;
	currentReliability: number;
	maxConditionCeiling: number;
};

/** Finish a fabricating queue row into a physical part. */
export async function completeManufacture(
	db: AppDb,
	queueId: number
): Promise<CompleteManufactureResult> {
	const [job] = await db
		.select()
		.from(manufacturingQueue)
		.where(eq(manufacturingQueue.id, queueId))
		.limit(1);
	if (!job) throw new Error(`Queue ${queueId} not found`);
	if (job.status !== 'fabricating') throw new Error(`Queue ${queueId} not fabricating`);

	const [bp] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, job.blueprintId))
		.limit(1);
	if (!bp) throw new Error(`Blueprint ${job.blueprintId} missing`);

	const lightweight = job.isLightweight;
	const weightKg = (bp.weightKg ?? 20) * (lightweight ? LIGHTWEIGHT_WEIGHT_MULT : 1);
	const currentReliability = Math.max(
		50,
		bp.baseReliability - (lightweight ? LIGHTWEIGHT_RELIABILITY_PENALTY : 0)
	);
	const maxConditionCeiling = Math.max(
		60,
		100 - (lightweight ? LIGHTWEIGHT_CEILING_PENALTY : 0)
	);

	const partId = await nextId(db, 'parts');
	await db.insert(parts).values({
		id: partId,
		blueprintId: bp.id,
		teamId: job.teamId,
		slot: bp.slot,
		currentReliability,
		maxConditionCeiling,
		weightKg,
		isLightweight: lightweight,
		isScrapped: false,
		mountedOnCarId: null
	});

	await db
		.update(manufacturingQueue)
		.set({ status: 'completed' })
		.where(eq(manufacturingQueue.id, queueId));

	return { partId, weightKg, currentReliability, maxConditionCeiling };
}

export type DueManufactureResult = {
	queueId: number;
	teamId: number;
	partId: number;
};

/** Complete any fabricating jobs whose completionDate ≤ current tick. */
export async function completeDueManufactures(db: AppDb): Promise<DueManufactureResult[]> {
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const tick = clock?.tickIndex ?? 0;
	const jobs = await db
		.select()
		.from(manufacturingQueue)
		.where(eq(manufacturingQueue.status, 'fabricating'));
	const out: DueManufactureResult[] = [];
	for (const j of jobs) {
		if (j.completionDate > tick) continue;
		const done = await completeManufacture(db, j.id);
		out.push({ queueId: j.id, teamId: j.teamId, partId: done.partId });
	}
	return out;
}

export type MileageRevealResult = {
	blueprintId: number;
	scoutConfidence: number;
	knownMin: number;
	knownMax: number;
	flawsRevealed: string[];
};

/** Collapse fog on a blueprint from track mileage (practice/race laps). */
export async function applyBlueprintMileage(
	db: AppDb,
	blueprintId: number,
	laps: number,
	analysisBonus = 0
): Promise<MileageRevealResult> {
	const [bp] = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.id, blueprintId))
		.limit(1);
	if (!bp) throw new Error(`Blueprint ${blueprintId} not found`);

	const slot = bp.slot as DevelopableSlot;
	const current = {
		knownMin: bp.performanceKnownMin ?? bp.performancePoints - 10,
		knownMax: bp.performanceKnownMax ?? bp.performancePoints + 10,
		scoutConfidence: bp.scoutConfidence
	};
	const next = applyMileageToFog(bp.performancePoints, current, slot, laps, analysisBonus);

	await db
		.update(blueprints)
		.set({
			performanceKnownMin: next.knownMin,
			performanceKnownMax: next.knownMax,
			scoutConfidence: next.scoutConfidence
		})
		.where(eq(blueprints.id, blueprintId));

	const flaws = await db
		.select()
		.from(blueprintFlaws)
		.where(eq(blueprintFlaws.blueprintId, blueprintId));
	const newly = flawsRevealedByConfidence(next.scoutConfidence, flaws);
	for (const f of flaws) {
		if (newly.includes(f.flawType) && !f.isRevealed) {
			await db
				.update(blueprintFlaws)
				.set({ isRevealed: true })
				.where(eq(blueprintFlaws.id, f.id));
		}
	}

	return {
		blueprintId,
		scoutConfidence: next.scoutConfidence,
		knownMin: next.knownMin,
		knownMax: next.knownMax,
		flawsRevealed: newly
	};
}
