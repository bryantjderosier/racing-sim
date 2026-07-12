import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	drivers,
	scoutingReports,
	staff,
	worldClock
} from '../../db/schema.js';
import {
	attrBandFromConfidence,
	metaBandFromConfidence,
	parallelScoutSlots,
	weeklyConfidenceGain,
	type AttrFogBand,
	type MetaFogBand
} from './fog.js';
import { getScoutNetworkStats } from './stats.js';

async function nextReportId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${scoutingReports.id}), 0)` })
		.from(scoutingReports);
	return Number(row?.m ?? 0) + 1;
}

async function clockTick(db: AppDb): Promise<number> {
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	return clock?.tickIndex ?? 0;
}

export type FoggedPersonnelProfile = {
	entityId: number;
	entityType: 'driver' | 'staff';
	name: string;
	teamId: number | null;
	isOwnTeam: boolean;
	confidenceLevel: number;
	fullyRevealed: boolean;
	attrs: AttrFogBand[];
	meta: MetaFogBand[];
};

async function loadEntity(
	db: AppDb,
	entityType: 'driver' | 'staff',
	entityId: number
) {
	if (entityType === 'driver') {
		const [d] = await db.select().from(drivers).where(eq(drivers.id, entityId)).limit(1);
		return d
			? {
					name: d.name,
					teamId: d.teamId,
					injuryProneness: d.injuryProneness,
					longevity: d.longevity
				}
			: null;
	}
	const [s] = await db.select().from(staff).where(eq(staff.id, entityId)).limit(1);
	return s
		? {
				name: s.name,
				teamId: s.teamId,
				injuryProneness: null as number | null,
				longevity: null as number | null
			}
		: null;
}

/**
 * View personnel through the scouting veil for a viewing team.
 * Own roster is always fully revealed.
 */
export async function getFoggedProfile(
	db: AppDb,
	args: {
		viewingTeamId: number;
		entityId: number;
		entityType: 'driver' | 'staff';
	}
): Promise<FoggedPersonnelProfile> {
	const entity = await loadEntity(db, args.entityType, args.entityId);
	if (!entity) throw new Error(`${args.entityType} ${args.entityId} not found`);

	const isOwnTeam = entity.teamId === args.viewingTeamId;
	const stats = await getScoutNetworkStats(db, args.viewingTeamId);

	const [report] = await db
		.select()
		.from(scoutingReports)
		.where(
			and(
				eq(scoutingReports.teamId, args.viewingTeamId),
				eq(scoutingReports.entityId, args.entityId),
				eq(scoutingReports.entityType, args.entityType)
			)
		)
		.limit(1);

	const confidence = isOwnTeam ? 100 : (report?.confidenceLevel ?? 0);

	const attrRows = await db
		.select()
		.from(attributes)
		.where(
			and(
				eq(attributes.entityId, args.entityId),
				eq(attributes.entityType, args.entityType)
			)
		);

	const attrs = attrRows.map((a) =>
		attrBandFromConfidence(
			a.attrName,
			a.currentValue,
			a.ceiling,
			confidence,
			stats.accuracy
		)
	);

	const meta: MetaFogBand[] = [];
	if (args.entityType === 'driver' && entity.injuryProneness != null) {
		meta.push(
			metaBandFromConfidence(
				'injuryProneness',
				entity.injuryProneness,
				confidence,
				stats.appraisal,
				true
			)
		);
	}
	if (args.entityType === 'driver' && entity.longevity != null) {
		meta.push(
			metaBandFromConfidence(
				'longevity',
				entity.longevity,
				confidence,
				stats.appraisal,
				false
			)
		);
	}

	return {
		entityId: args.entityId,
		entityType: args.entityType,
		name: entity.name,
		teamId: entity.teamId,
		isOwnTeam,
		confidenceLevel: confidence,
		fullyRevealed: confidence >= 100,
		attrs,
		meta
	};
}

export type AssignScoutResult = {
	assigned: boolean;
	reason?: string;
	reportId: number;
	confidenceLevel: number;
	slotsUsed: number;
	slotsMax: number;
};

export async function assignScoutTarget(
	db: AppDb,
	args: {
		teamId: number;
		entityId: number;
		entityType: 'driver' | 'staff';
	}
): Promise<AssignScoutResult> {
	const entity = await loadEntity(db, args.entityType, args.entityId);
	if (!entity) throw new Error(`${args.entityType} ${args.entityId} not found`);
	if (entity.teamId === args.teamId) {
		return {
			assigned: false,
			reason: 'own_team',
			reportId: 0,
			confidenceLevel: 100,
			slotsUsed: 0,
			slotsMax: 0
		};
	}

	const stats = await getScoutNetworkStats(db, args.teamId);
	const slotsMax = parallelScoutSlots(stats.coverage, stats.hqTier);
	const assignedRows = await db
		.select()
		.from(scoutingReports)
		.where(
			and(eq(scoutingReports.teamId, args.teamId), eq(scoutingReports.isAssigned, true))
		);
	const slotsUsed = assignedRows.length;

	const [existing] = await db
		.select()
		.from(scoutingReports)
		.where(
			and(
				eq(scoutingReports.teamId, args.teamId),
				eq(scoutingReports.entityId, args.entityId),
				eq(scoutingReports.entityType, args.entityType)
			)
		)
		.limit(1);

	if (existing?.confidenceLevel >= 100) {
		return {
			assigned: false,
			reason: 'already_revealed',
			reportId: existing.id,
			confidenceLevel: 100,
			slotsUsed,
			slotsMax
		};
	}

	if (existing?.isAssigned) {
		return {
			assigned: true,
			reportId: existing.id,
			confidenceLevel: existing.confidenceLevel,
			slotsUsed,
			slotsMax
		};
	}

	if (slotsUsed >= slotsMax) {
		return {
			assigned: false,
			reason: 'slots_full',
			reportId: existing?.id ?? 0,
			confidenceLevel: existing?.confidenceLevel ?? 0,
			slotsUsed,
			slotsMax
		};
	}

	const tick = await clockTick(db);
	if (existing) {
		await db
			.update(scoutingReports)
			.set({ isAssigned: true, lastScoutDate: tick })
			.where(eq(scoutingReports.id, existing.id));
		return {
			assigned: true,
			reportId: existing.id,
			confidenceLevel: existing.confidenceLevel,
			slotsUsed: slotsUsed + 1,
			slotsMax
		};
	}

	const id = await nextReportId(db);
	await db.insert(scoutingReports).values({
		id,
		teamId: args.teamId,
		entityId: args.entityId,
		entityType: args.entityType,
		confidenceLevel: 0,
		lastScoutDate: tick,
		isAssigned: true
	});
	return {
		assigned: true,
		reportId: id,
		confidenceLevel: 0,
		slotsUsed: slotsUsed + 1,
		slotsMax
	};
}

export async function unassignScoutTarget(
	db: AppDb,
	args: { teamId: number; entityId: number; entityType: 'driver' | 'staff' }
): Promise<boolean> {
	const [existing] = await db
		.select()
		.from(scoutingReports)
		.where(
			and(
				eq(scoutingReports.teamId, args.teamId),
				eq(scoutingReports.entityId, args.entityId),
				eq(scoutingReports.entityType, args.entityType)
			)
		)
		.limit(1);
	if (!existing?.isAssigned) return false;
	await db
		.update(scoutingReports)
		.set({ isAssigned: false })
		.where(eq(scoutingReports.id, existing.id));
	return true;
}

export type ScoutTickProgress = {
	entityId: number;
	entityType: string;
	confidenceBefore: number;
	confidenceAfter: number;
	fullyRevealed: boolean;
};

export type ScoutTickResult = {
	teamId: number;
	gainPerTarget: number;
	progress: ScoutTickProgress[];
};

/**
 * Weekly progress on all assigned scouting targets for one team.
 */
export async function tickTeamScouting(
	db: AppDb,
	teamId: number
): Promise<ScoutTickResult> {
	const stats = await getScoutNetworkStats(db, teamId);
	const gain = weeklyConfidenceGain({
		detection: stats.detection,
		accuracy: stats.accuracy,
		hqEfficiencyMult: stats.hqEfficiencyMult
	});
	const tick = await clockTick(db);

	const assigned = await db
		.select()
		.from(scoutingReports)
		.where(
			and(eq(scoutingReports.teamId, teamId), eq(scoutingReports.isAssigned, true))
		);

	const progress: ScoutTickProgress[] = [];
	for (const r of assigned) {
		const before = r.confidenceLevel;
		const after = Math.min(100, before + gain);
		const done = after >= 100;
		await db
			.update(scoutingReports)
			.set({
				confidenceLevel: after,
				lastScoutDate: tick,
				isAssigned: !done
			})
			.where(eq(scoutingReports.id, r.id));

		if (done && r.entityType === 'staff') {
			await db
				.update(staff)
				.set({ isScouted: true })
				.where(eq(staff.id, r.entityId));
		}

		progress.push({
			entityId: r.entityId,
			entityType: r.entityType,
			confidenceBefore: before,
			confidenceAfter: after,
			fullyRevealed: done
		});
	}

	return { teamId, gainPerTarget: gain, progress };
}

export async function tickAllTeamsScouting(db: AppDb): Promise<ScoutTickResult[]> {
	const teamIds = [
		...new Set(
			(
				await db
					.select({ teamId: scoutingReports.teamId })
					.from(scoutingReports)
					.where(eq(scoutingReports.isAssigned, true))
			).map((r) => r.teamId)
		)
	];
	const out: ScoutTickResult[] = [];
	for (const id of teamIds) {
		out.push(await tickTeamScouting(db, id));
	}
	return out;
}
