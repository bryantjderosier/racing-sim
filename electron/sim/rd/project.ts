import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	blueprintFlaws,
	blueprints,
	facilities,
	rdProjects,
	staff,
	teams,
	worldClock
} from '../../db/schema.js';
import { rdTestingCashCost, spendCash } from '../finance/index.js';
import { HOURS_TO_COMPLETE, DESIGNER_ROLE_BY_SLOT } from './constants.js';
import { bandFromConfidence, rollFlaws } from './fog.js';
import { computeBlueprintQuality, effectiveTestingHours } from './quality.js';
import type { DevelopableSlot, RdFocus } from './types.js';

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

async function nextId(db: AppDb, table: 'rd_projects' | 'blueprints' | 'blueprint_flaws'): Promise<number> {
	const q =
		table === 'rd_projects'
			? db.select({ m: sql<number>`coalesce(max(${rdProjects.id}), 0)` }).from(rdProjects)
			: table === 'blueprints'
				? db.select({ m: sql<number>`coalesce(max(${blueprints.id}), 0)` }).from(blueprints)
				: db
						.select({ m: sql<number>`coalesce(max(${blueprintFlaws.id}), 0)` })
						.from(blueprintFlaws);
	const [row] = await q;
	return Number(row?.m ?? 0) + 1;
}

export type StartProjectInput = {
	teamId: number;
	slot: DevelopableSlot;
	focus?: RdFocus;
	leadDesignerId?: number;
	nameHint?: string;
};

export type StartProjectResult = {
	projectId: number;
	slot: DevelopableSlot;
	status: 'fabricating';
};

export async function startRdProject(
	db: AppDb,
	input: StartProjectInput
): Promise<StartProjectResult> {
	if ((input.slot as string) === 'gearbox') {
		throw new Error('Gearbox is lease/spec-only; not developable in v1');
	}

	const active = await db
		.select()
		.from(rdProjects)
		.where(
			and(
				eq(rdProjects.teamId, input.teamId),
				eq(rdProjects.slot, input.slot),
				eq(rdProjects.status, 'fabricating')
			)
		);
	if (active.length > 0) {
		throw new Error(`Team ${input.teamId} already has an active ${input.slot} project`);
	}

	let leadId = input.leadDesignerId ?? null;
	if (leadId == null) {
		const role = DESIGNER_ROLE_BY_SLOT[input.slot];
		const [lead] = await db
			.select()
			.from(staff)
			.where(and(eq(staff.teamId, input.teamId), eq(staff.role, role)))
			.limit(1);
		leadId = lead?.id ?? null;
	}

	const id = await nextId(db, 'rd_projects');
	await db.insert(rdProjects).values({
		id,
		teamId: input.teamId,
		slot: input.slot,
		focus: input.focus ?? 'current_car',
		progress: 0,
		allocatedWtHours: 0,
		allocatedCfdHours: 0,
		leadDesignerId: leadId,
		resultingBlueprintId: null,
		status: 'fabricating'
	});

	return { projectId: id, slot: input.slot, status: 'fabricating' };
}

export type AllocateHoursInput = {
	projectId: number;
	wtHours?: number;
	cfdHours?: number;
	rng?: () => number;
	/** If true, complete when progress hits 100. Default true. */
	autoComplete?: boolean;
};

export type AllocateHoursResult = {
	projectId: number;
	progress: number;
	allocatedWtHours: number;
	allocatedCfdHours: number;
	completed: boolean;
	blueprintId?: number;
};

async function loadDesignerAttrs(db: AppDb, designerId: number | null) {
	if (designerId == null) return {} as Record<string, number>;
	const rows = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, designerId), eq(attributes.entityType, 'staff')));
	const out: Record<string, number> = {};
	for (const r of rows) out[r.attrName] = r.currentValue;
	return out;
}

/**
 * Spend team WT/CFD remaining into a project; advances progress.
 * Completes → blueprint with hidden PP + fog band + flaws when progress ≥ 100.
 */
export async function allocateTestingHours(
	db: AppDb,
	input: AllocateHoursInput
): Promise<AllocateHoursResult> {
	const wtReq = Math.max(0, input.wtHours ?? 0);
	const cfdReq = Math.max(0, input.cfdHours ?? 0);
	if (wtReq === 0 && cfdReq === 0) {
		throw new Error('Must allocate WT and/or CFD hours');
	}

	const [project] = await db
		.select()
		.from(rdProjects)
		.where(eq(rdProjects.id, input.projectId))
		.limit(1);
	if (!project) throw new Error(`Project ${input.projectId} not found`);
	if (project.status !== 'fabricating') {
		throw new Error(`Project ${input.projectId} is not active (status=${project.status})`);
	}

	const [team] = await db.select().from(teams).where(eq(teams.id, project.teamId)).limit(1);
	if (!team) throw new Error(`Team ${project.teamId} not found`);

	const wtSpend = Math.min(wtReq, team.wtHoursRemaining);
	const cfdSpend = Math.min(cfdReq, team.cfdHoursRemaining);
	if (wtSpend < wtReq || cfdSpend < cfdReq) {
		throw new Error(
			`Insufficient hours (have WT ${team.wtHoursRemaining}/CFD ${team.cfdHoursRemaining}, need ${wtReq}/${cfdReq})`
		);
	}

	const testingCost = rdTestingCashCost(wtSpend, cfdSpend);
	if (testingCost > 0) {
		await spendCash(db, {
			teamId: team.id,
			amount: testingCost,
			transactionType: 'rd_testing',
			isCostCapApplicable: true
		});
	}

	await db
		.update(teams)
		.set({
			wtHoursRemaining: team.wtHoursRemaining - wtSpend,
			cfdHoursRemaining: team.cfdHoursRemaining - cfdSpend
		})
		.where(eq(teams.id, team.id));

	const facs = await db.select().from(facilities).where(eq(facilities.teamId, team.id));
	const designerAttrs = await loadDesignerAttrs(db, project.leadDesignerId);
	const slot = project.slot as DevelopableSlot;

	const newWt = project.allocatedWtHours + wtSpend;
	const newCfd = project.allocatedCfdHours + cfdSpend;
	const eff = effectiveTestingHours({
		slot,
		allocatedWtHours: newWt,
		allocatedCfdHours: newCfd,
		designerAttrs,
		facilities: facs,
		rng: () => 0.5
	});
	const needed = HOURS_TO_COMPLETE[slot];
	const progress = Math.min(100, (eff / needed) * 100);

	await db
		.update(rdProjects)
		.set({
			allocatedWtHours: newWt,
			allocatedCfdHours: newCfd,
			progress
		})
		.where(eq(rdProjects.id, project.id));

	const autoComplete = input.autoComplete !== false;
	if (progress >= 100 && autoComplete) {
		const done = await completeRdProject(db, {
			projectId: project.id,
			rng: input.rng
		});
		return {
			projectId: project.id,
			progress: 100,
			allocatedWtHours: newWt,
			allocatedCfdHours: newCfd,
			completed: true,
			blueprintId: done.blueprintId
		};
	}

	return {
		projectId: project.id,
		progress,
		allocatedWtHours: newWt,
		allocatedCfdHours: newCfd,
		completed: false
	};
}

export type CompleteProjectResult = {
	blueprintId: number;
	performancePoints: number;
	knownMin: number;
	knownMax: number;
	scoutConfidence: number;
	flawCount: number;
};

export async function completeRdProject(
	db: AppDb,
	options: { projectId: number; name?: string; rng?: () => number }
): Promise<CompleteProjectResult> {
	const [project] = await db
		.select()
		.from(rdProjects)
		.where(eq(rdProjects.id, options.projectId))
		.limit(1);
	if (!project) throw new Error(`Project ${options.projectId} not found`);
	if (project.status === 'completed') {
		throw new Error(`Project ${options.projectId} already completed`);
	}

	const rng = options.rng ?? mulberry32(project.id * 997 + Math.floor(Date.now() % 1e6));
	const facs = await db.select().from(facilities).where(eq(facilities.teamId, project.teamId));
	const designerAttrs = await loadDesignerAttrs(db, project.leadDesignerId);
	const slot = project.slot as DevelopableSlot;

	const quality = computeBlueprintQuality({
		slot,
		allocatedWtHours: project.allocatedWtHours,
		allocatedCfdHours: project.allocatedCfdHours,
		designerAttrs,
		facilities: facs,
		rng
	});

	const band = bandFromConfidence(quality.performancePoints, quality.initialConfidence, slot);
	const flaws = rollFlaws(rng);

	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	const seasonYear = clock?.seasonYear ?? 2026;

	const blueprintId = await nextId(db, 'blueprints');
	const name =
		options.name ??
		`${slot.replaceAll('_', ' ')} concept #${blueprintId}`.replace(/\b\w/g, (c) =>
			c.toUpperCase()
		);

	await db.insert(blueprints).values({
		id: blueprintId,
		teamId: project.teamId,
		slot,
		name,
		performancePoints: quality.performancePoints,
		performanceKnownMin: band.knownMin,
		performanceKnownMax: band.knownMax,
		scoutConfidence: band.scoutConfidence,
		baseReliability: quality.baseReliability,
		pitchSensitivity: quality.pitchSensitivity,
		dragCoefficient: quality.dragCoefficient,
		weightKg: quality.weightKg,
		seasonYear,
		isInvalidated: false
	});

	let flawId = await nextId(db, 'blueprint_flaws');
	for (const f of flaws) {
		await db.insert(blueprintFlaws).values({
			id: flawId++,
			blueprintId,
			flawType: f.flawType,
			severity: f.severity,
			isRevealed: false
		});
	}

	await db
		.update(rdProjects)
		.set({
			progress: 100,
			status: 'completed',
			resultingBlueprintId: blueprintId
		})
		.where(eq(rdProjects.id, project.id));

	return {
		blueprintId,
		performancePoints: quality.performancePoints,
		knownMin: band.knownMin,
		knownMax: band.knownMax,
		scoutConfidence: band.scoutConfidence,
		flawCount: flaws.length
	};
}
