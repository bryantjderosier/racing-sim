import { and, eq, inArray } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	blueprintFlaws,
	blueprints,
	manufacturingQueue,
	rdProjects,
	staff,
	teams
} from '../../db/schema.js';
import type { CareerSummary } from '../career/store.js';
import {
	allocateTestingHours,
	DESIGNER_ROLE_BY_SLOT,
	HOURS_TO_COMPLETE,
	queueManufacture,
	startRdProject,
	type AllocateHoursResult,
	type DevelopableSlot,
	type QueueManufactureResult,
	type RdFocus,
	type StartProjectResult
} from '../rd/index.js';
import { ensureClock } from '../world/tick.js';
import { getCalendarView, getSeasonCaps } from './desk.js';
import { getNextRoundView } from './season.js';
import type {
	AllocateRdHoursArgs,
	QueueManufactureArgs,
	RdBlueprintView,
	RdDesignerView,
	RdHubSnapshot,
	RdProjectView,
	RdQueueView,
	StartRdProjectArgs
} from './types.js';

const DEVELOPABLE_SLOTS: DevelopableSlot[] = [
	'front_wing',
	'rear_wing',
	'underfloor',
	'sidepods',
	'suspension',
	'power_unit'
];

const DESIGNER_ROLES = new Set(['aero', 'mechanical', 'powertrain']);

function asDevelopableSlot(raw: string): DevelopableSlot {
	if (!(raw in HOURS_TO_COMPLETE)) {
		throw new Error(`Unknown developable slot: ${raw}`);
	}
	return raw as DevelopableSlot;
}

export async function getRdSnapshot(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>
): Promise<RdHubSnapshot> {
	const playerTeamId = career.playerTeamId;
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const caps = await getSeasonCaps(db, clock.seasonYear, team.division);
	const nextRound = await getNextRoundView(db, clock.seasonYear);
	const calendar = await getCalendarView(db, clock.seasonYear);

	const gateOpen =
		!caps.rdPivotLocked &&
		(nextRound != null
			? nextRound.raceIndex >= caps.rdPivotRaceIndex
			: calendar.some((c) => c.isCompleted && c.raceIndex >= caps.rdPivotRaceIndex));

	const projectRows = await db
		.select()
		.from(rdProjects)
		.where(eq(rdProjects.teamId, playerTeamId));

	const leadIds = [
		...new Set(
			projectRows
				.map((p) => p.leadDesignerId)
				.filter((id): id is number => id != null)
		)
	];
	const leadNameMap = new Map<number, string>();
	if (leadIds.length > 0) {
		const leads = await db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, leadIds));
		for (const s of leads) leadNameMap.set(s.id, s.name);
	}

	const projects: RdProjectView[] = projectRows
		.filter((p) => p.status === 'fabricating' || p.status === 'completed')
		.map((p) => {
			const slot = p.slot as DevelopableSlot;
			return {
				id: p.id,
				slot: p.slot,
				focus: p.focus,
				progress: p.progress,
				allocatedWtHours: p.allocatedWtHours,
				allocatedCfdHours: p.allocatedCfdHours,
				leadDesignerId: p.leadDesignerId,
				leadDesignerName: p.leadDesignerId != null ? (leadNameMap.get(p.leadDesignerId) ?? null) : null,
				resultingBlueprintId: p.resultingBlueprintId,
				status: p.status,
				hoursToComplete: HOURS_TO_COMPLETE[slot] ?? 100
			};
		});

	const activeSlots = new Set(
		projectRows.filter((p) => p.status === 'fabricating').map((p) => p.slot)
	);
	const openSlots = DEVELOPABLE_SLOTS.filter((s) => !activeSlots.has(s));

	const bpRows = await db.select().from(blueprints).where(eq(blueprints.teamId, playerTeamId));
	const bpIds = bpRows.map((b) => b.id);

	const flawRows =
		bpIds.length > 0
			? await db
					.select()
					.from(blueprintFlaws)
					.where(and(inArray(blueprintFlaws.blueprintId, bpIds), eq(blueprintFlaws.isRevealed, true)))
			: [];
	const flawsByBp = new Map<number, { flawType: string; severity: number }[]>();
	for (const f of flawRows) {
		const list = flawsByBp.get(f.blueprintId) ?? [];
		list.push({ flawType: f.flawType, severity: f.severity });
		flawsByBp.set(f.blueprintId, list);
	}

	const queueRows = await db
		.select()
		.from(manufacturingQueue)
		.where(eq(manufacturingQueue.teamId, playerTeamId));

	const queuedBlueprintIds = new Set(
		queueRows.filter((q) => q.status === 'fabricating').map((q) => q.blueprintId)
	);

	const bpNameById = new Map(bpRows.map((b) => [b.id, b]));

	const blueprintsView: RdBlueprintView[] = bpRows.map((b) => ({
		id: b.id,
		name: b.name,
		slot: b.slot,
		seasonYear: b.seasonYear,
		knownMin: b.performanceKnownMin,
		knownMax: b.performanceKnownMax,
		scoutConfidence: b.scoutConfidence,
		baseReliability: b.baseReliability,
		isInvalidated: b.isInvalidated,
		revealedFlaws: flawsByBp.get(b.id) ?? [],
		queued: queuedBlueprintIds.has(b.id)
	}));

	const queue: RdQueueView[] = queueRows.map((q) => {
		const bp = bpNameById.get(q.blueprintId);
		return {
			id: q.id,
			blueprintId: q.blueprintId,
			blueprintName: bp?.name ?? `Blueprint ${q.blueprintId}`,
			slot: bp?.slot ?? '—',
			isLightweight: q.isLightweight,
			completionDate: q.completionDate,
			status: q.status
		};
	});

	const staffRows = await db.select().from(staff).where(eq(staff.teamId, playerTeamId));
	const designers: RdDesignerView[] = staffRows
		.filter((s) => DESIGNER_ROLES.has(s.role))
		.map((s) => ({ id: s.id, name: s.name, role: s.role }));

	return {
		career: {
			id: career.id,
			displayName: career.displayName,
			playerTeamId
		},
		clock: {
			seasonYear: clock.seasonYear,
			week: clock.week,
			day: clock.day,
			tickIndex: clock.tickIndex
		},
		team: {
			id: team.id,
			name: team.name,
			cash: team.liquidCash,
			wtHours: team.wtHoursRemaining,
			cfdHours: team.cfdHoursRemaining,
			wtHoursCap: caps.wtHoursWeeklyCap * (team.wtHoursCapMult ?? 1),
			cfdHoursCap: caps.cfdHoursWeeklyCap,
			reputation: team.reputation,
			division: team.division,
			rdPivotCurrent: team.rdPivotCurrent
		},
		pivot: {
			raceIndex: caps.rdPivotRaceIndex,
			locked: caps.rdPivotLocked,
			currentFraction: team.rdPivotCurrent,
			gateOpen
		},
		projects,
		blueprints: blueprintsView,
		queue,
		designers,
		openSlots
	};
}

export async function startPlayerRdProject(
	db: AppDb,
	playerTeamId: number,
	args: StartRdProjectArgs
): Promise<StartProjectResult> {
	const slot = asDevelopableSlot(args.slot);
	if (args.leadDesignerId != null) {
		const [lead] = await db
			.select()
			.from(staff)
			.where(and(eq(staff.id, args.leadDesignerId), eq(staff.teamId, playerTeamId)))
			.limit(1);
		if (!lead) throw new Error('Lead designer not on player team');
		const expected = DESIGNER_ROLE_BY_SLOT[slot];
		if (lead.role !== expected) {
			throw new Error(`Lead designer role ${lead.role} does not match slot ${slot} (${expected})`);
		}
	}
	return startRdProject(db, {
		teamId: playerTeamId,
		slot,
		focus: (args.focus ?? 'current_car') as RdFocus,
		leadDesignerId: args.leadDesignerId
	});
}

export async function allocatePlayerRdHours(
	db: AppDb,
	playerTeamId: number,
	args: AllocateRdHoursArgs
): Promise<AllocateHoursResult> {
	const [project] = await db
		.select()
		.from(rdProjects)
		.where(eq(rdProjects.id, args.projectId))
		.limit(1);
	if (!project) throw new Error(`Project ${args.projectId} not found`);
	if (project.teamId !== playerTeamId) throw new Error('Project belongs to another team');

	return allocateTestingHours(db, {
		projectId: args.projectId,
		wtHours: args.wtHours,
		cfdHours: args.cfdHours,
		autoComplete: true
	});
}

export async function queuePlayerManufacture(
	db: AppDb,
	playerTeamId: number,
	args: QueueManufactureArgs
): Promise<QueueManufactureResult> {
	return queueManufacture(db, {
		teamId: playerTeamId,
		blueprintId: args.blueprintId,
		isLightweight: args.isLightweight
	});
}
