import { createHash, randomUUID } from 'node:crypto';
import { asc, and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import { postFinanceTransaction } from './finance-service.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const DEVELOPMENT_STAGES = [
	'concept_design',
	'cfd',
	'wind_tunnel',
	'manufacturing'
] as const;
export type DevelopmentStage = (typeof DEVELOPMENT_STAGES)[number];
export type DevelopmentProjectKind = 'upgrade' | 'new_design';
export type DevelopmentProjectStatus = 'active' | 'completed' | 'cancelled';

export const DEVELOPMENT_DELTA_SCHEMA_VERSION = 'development-delta-v1';
export const DEVELOPMENT_RESULT_SCHEMA_VERSION = 'development-result-v1';
export const DEVELOPMENT_PROJECT_PHASE_SCHEMA_VERSION = 'development-project-v1';
export const DEVELOPMENT_FORMULA_VERSION = 'r-and-d-v1';

export interface DevelopmentStagePlan {
	stage: DevelopmentStage;
	durationDays: number;
	costMinor: number;
}

export interface StartDevelopmentProjectOptions {
	teamSeasonEntryId: string;
	partCategory: string;
	projectKind: DevelopmentProjectKind;
	baseDesignVersionId?: string | null;
	performanceDeltas: Record<string, number>;
	reliabilityDelta: number;
	stagePlans: readonly DevelopmentStagePlan[];
	now?: string;
}

export interface DevelopmentStageDto {
	id: string;
	stage: DevelopmentStage;
	sequence: number;
	status: 'active' | 'pending' | 'completed';
	durationDays: number;
	costMinor: number;
	remainingDays: number;
	startedWorldDate: string | null;
	completedWorldDate: string | null;
	startedAt: string | null;
	completedAt: string | null;
}

export interface DevelopmentProjectResultDto {
	designVersionId: string;
	partInstanceId: string | null;
	chassisInstanceId: string | null;
	manufacturedAt: string;
}

export interface DevelopmentProjectDto {
	id: string;
	teamId: string;
	teamSeasonEntryId: string;
	partCategory: string;
	projectKind: DevelopmentProjectKind;
	status: DevelopmentProjectStatus;
	currentStage: DevelopmentStage | 'completed';
	baseDesignVersionId: string | null;
	totalCostMinor: number;
	spentCostMinor: number;
	startWorldDate: string;
	completedWorldDate: string | null;
	startedAt: string;
	updatedAt: string;
	completedAt: string | null;
	stages: DevelopmentStageDto[];
	result: DevelopmentProjectResultDto | null;
}

export interface DailyResearchDevelopmentResult {
	phase: 'research_development';
	worldDate: string;
	projectsAdvanced: number;
	stagesCompleted: number;
	projectsCompleted: number;
	manufacturedAssets: number;
	costAppliedMinor: number;
	completedProjectIds: string[];
}

export class DevelopmentError extends Error {
	readonly code: 'INVALID_COMMAND' | 'CONFLICT' | 'MIGRATION_FAILED';

	constructor(
		message: string,
		code: 'INVALID_COMMAND' | 'CONFLICT' | 'MIGRATION_FAILED' = 'INVALID_COMMAND'
	) {
		super(message);
		this.name = 'DevelopmentError';
		this.code = code;
	}
}

function assertSafeInteger(value: number, label: string, minimum: number) {
	if (!Number.isSafeInteger(value) || value < minimum) {
		throw new DevelopmentError(`${label} must be a safe integer >= ${minimum}.`);
	}
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)])
		);
	}
	return value;
}

function parseObject(payload: string, label: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new DevelopmentError(
			`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}.`,
			'MIGRATION_FAILED'
		);
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new DevelopmentError(`${label} must be a JSON object.`, 'MIGRATION_FAILED');
	}
	return parsed as Record<string, unknown>;
}

function parseDeltas(payload: string): Record<string, number> {
	const parsed = parseObject(payload, 'Development delta payload');
	const deltas = parsed.deltas;
	if (!deltas || typeof deltas !== 'object' || Array.isArray(deltas)) {
		throw new DevelopmentError(
			'Development delta payload has an invalid shape.',
			'MIGRATION_FAILED'
		);
	}
	const result: Record<string, number> = {};
	for (const [key, value] of Object.entries(deltas)) {
		if (!key || typeof value !== 'number' || !Number.isFinite(value)) {
			throw new DevelopmentError(
				'Development delta payload contains an invalid value.',
				'MIGRATION_FAILED'
			);
		}
		result[key] = value;
	}
	return result;
}

function parseReliabilityDelta(payload: string): number {
	const parsed = parseObject(payload, 'Reliability delta payload');
	if (typeof parsed.delta !== 'number' || !Number.isFinite(parsed.delta)) {
		throw new DevelopmentError(
			'Reliability delta payload has an invalid shape.',
			'MIGRATION_FAILED'
		);
	}
	return parsed.delta;
}

function cloneObject(value: Record<string, unknown>): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function applyPerformanceDeltas(
	basePayload: Record<string, unknown>,
	deltas: Record<string, number>
): Record<string, unknown> {
	const output = cloneObject(basePayload);
	for (const [path, delta] of Object.entries(deltas)) {
		const segments = path.split('.').filter(Boolean);
		if (segments.length === 0)
			throw new DevelopmentError('Performance delta paths cannot be empty.');
		let cursor = output;
		for (const segment of segments.slice(0, -1)) {
			const child = cursor[segment];
			if (!child || typeof child !== 'object' || Array.isArray(child)) cursor[segment] = {};
			cursor = cursor[segment] as Record<string, unknown>;
		}
		const leaf = segments[segments.length - 1];
		const current = typeof cursor[leaf] === 'number' ? cursor[leaf] : 0;
		cursor[leaf] = current + delta;
	}
	return output;
}

function applyReliabilityDelta(
	basePayload: Record<string, unknown>,
	delta: number
): Record<string, unknown> {
	const output = cloneObject(basePayload);
	const key =
		typeof output.overall === 'number'
			? 'overall'
			: typeof output.score === 'number'
				? 'score'
				: 'overall';
	const current = typeof output[key] === 'number' ? output[key] : 50;
	output[key] = Math.max(0, Math.min(100, current + delta));
	return output;
}

function validatePerformancePayload(value: unknown, path = 'performancePayload') {
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || value < 0) {
			throw new DevelopmentError(`${path} contains an invalid negative or non-finite value.`);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((entry, index) => validatePerformancePayload(entry, `${path}[${index}]`));
		return;
	}
	if (value && typeof value === 'object') {
		for (const [key, entry] of Object.entries(value)) {
			validatePerformancePayload(entry, `${path}.${key}`);
		}
	}
}

function normalizeStagePlans(plans: readonly DevelopmentStagePlan[]): DevelopmentStagePlan[] {
	if (plans.length !== DEVELOPMENT_STAGES.length) {
		throw new DevelopmentError('A development project must define all four stages.');
	}
	return DEVELOPMENT_STAGES.map((stage, index) => {
		const plan = plans[index];
		if (!plan || plan.stage !== stage) {
			throw new DevelopmentError(`Development stages must follow the fixed ${stage} order.`);
		}
		assertSafeInteger(plan.durationDays, `${stage} durationDays`, 1);
		assertSafeInteger(plan.costMinor, `${stage} costMinor`, 0);
		return { ...plan };
	});
}

function validatePerformanceDeltas(deltas: Record<string, number>) {
	for (const [key, value] of Object.entries(deltas)) {
		if (!key.trim() || typeof value !== 'number' || !Number.isFinite(value)) {
			throw new DevelopmentError('Performance deltas must contain finite numeric values.');
		}
	}
}

async function projectDto(tx: Transaction, projectId: string): Promise<DevelopmentProjectDto> {
	const projects = await tx
		.select()
		.from(schema.developmentProject)
		.where(eq(schema.developmentProject.id, projectId))
		.limit(1);
	const project = projects[0];
	if (!project) throw new DevelopmentError(`Development project ${projectId} was not found.`);

	const entries = await tx
		.select({ teamId: schema.teamSeasonEntry.teamId })
		.from(schema.teamSeasonEntry)
		.where(eq(schema.teamSeasonEntry.id, project.teamSeasonEntryId))
		.limit(1);
	const entry = entries[0];
	if (!entry)
		throw new DevelopmentError('Development project team entry is missing.', 'MIGRATION_FAILED');

	const stages = await tx
		.select()
		.from(schema.developmentProjectStage)
		.where(eq(schema.developmentProjectStage.projectId, projectId))
		.orderBy(asc(schema.developmentProjectStage.sequence));
	const resultRows = await tx
		.select()
		.from(schema.developmentProjectResult)
		.where(eq(schema.developmentProjectResult.projectId, projectId))
		.limit(1);
	const result = resultRows[0];

	return {
		id: project.id,
		teamId: entry.teamId,
		teamSeasonEntryId: project.teamSeasonEntryId,
		partCategory: project.partCategory,
		projectKind: project.projectKind as DevelopmentProjectKind,
		status: project.status as DevelopmentProjectStatus,
		currentStage: project.currentStage as DevelopmentProjectDto['currentStage'],
		baseDesignVersionId: project.baseDesignVersionId,
		totalCostMinor: project.totalCostMinor,
		spentCostMinor: project.spentCostMinor,
		startWorldDate: project.startWorldDate,
		completedWorldDate: project.completedWorldDate,
		startedAt: project.startedAt,
		updatedAt: project.updatedAt,
		completedAt: project.completedAt,
		stages: stages.map((stage) => ({
			id: stage.id,
			stage: stage.stage as DevelopmentStage,
			sequence: stage.sequence,
			status: stage.status as DevelopmentStageDto['status'],
			durationDays: stage.durationDays,
			costMinor: stage.costMinor,
			remainingDays: stage.remainingDays,
			startedWorldDate: stage.startedWorldDate,
			completedWorldDate: stage.completedWorldDate,
			startedAt: stage.startedAt,
			completedAt: stage.completedAt
		})),
		result: result
			? {
					designVersionId: result.partDesignVersionId,
					partInstanceId: result.partInstanceId,
					chassisInstanceId: result.chassisInstanceId,
					manufacturedAt: result.manufacturedAt
				}
			: null
	};
}

export async function startDevelopmentProject(
	db: Database,
	options: StartDevelopmentProjectOptions
): Promise<DevelopmentProjectDto> {
	return db.transaction(async (tx) => startDevelopmentProjectInTransaction(tx, options));
}

export async function startDevelopmentProjectInTransaction(
	tx: Transaction,
	options: StartDevelopmentProjectOptions
): Promise<DevelopmentProjectDto> {
	const now = options.now ?? new Date().toISOString();
	const saves = await tx.select().from(schema.saveGame).limit(1);
	const save = saves[0];
	if (!save) throw new DevelopmentError('Save metadata is missing.', 'MIGRATION_FAILED');
	const partCategory = options.partCategory.trim();
	if (!partCategory) throw new DevelopmentError('partCategory is required.');
	if (options.projectKind !== 'upgrade' && options.projectKind !== 'new_design') {
		throw new DevelopmentError('projectKind must be upgrade or new_design.');
	}
	const stagePlans = normalizeStagePlans(options.stagePlans);
	validatePerformanceDeltas(options.performanceDeltas);
	assertSafeInteger(options.reliabilityDelta, 'reliabilityDelta', -100);
	if (options.reliabilityDelta > 100) {
		throw new DevelopmentError('reliabilityDelta must be <= 100.');
	}
	const entries = await tx
		.select({ id: schema.teamSeasonEntry.id, teamId: schema.teamSeasonEntry.teamId })
		.from(schema.teamSeasonEntry)
		.where(eq(schema.teamSeasonEntry.id, options.teamSeasonEntryId))
		.limit(1);
	const entry = entries[0];
	if (!entry) throw new DevelopmentError('teamSeasonEntryId is invalid.');

	if (!options.baseDesignVersionId && options.projectKind === 'upgrade') {
		throw new DevelopmentError('Upgrade projects require a base design version.');
	}
	if (options.baseDesignVersionId) {
		const baseRows = await tx
			.select()
			.from(schema.partDesignVersion)
			.where(eq(schema.partDesignVersion.id, options.baseDesignVersionId))
			.limit(1);
		const base = baseRows[0];
		if (!base || base.teamId !== entry.teamId || base.partCategory !== partCategory) {
			throw new DevelopmentError(
				'baseDesignVersionId does not belong to the selected team/category.'
			);
		}
	}
	const active = await tx
		.select({ id: schema.developmentProject.id })
		.from(schema.developmentProject)
		.where(
			and(
				eq(schema.developmentProject.teamSeasonEntryId, options.teamSeasonEntryId),
				eq(schema.developmentProject.partCategory, partCategory),
				eq(schema.developmentProject.status, 'active')
			)
		)
		.limit(1);
	if (active[0]?.id) {
		throw new DevelopmentError(
			'An active development project already exists for this category.',
			'CONFLICT'
		);
	}

	const projectId = randomUUID();
	const totalCostMinor = stagePlans.reduce((total, plan) => total + plan.costMinor, 0);
	await tx.insert(schema.developmentProject).values({
		id: projectId,
		teamSeasonEntryId: options.teamSeasonEntryId,
		partCategory,
		projectKind: options.projectKind,
		status: 'active',
		currentStage: DEVELOPMENT_STAGES[0],
		baseDesignVersionId: options.baseDesignVersionId ?? null,
		performanceDeltaPayload: JSON.stringify({ deltas: options.performanceDeltas }),
		performanceDeltaSchemaVersion: DEVELOPMENT_DELTA_SCHEMA_VERSION,
		reliabilityDeltaPayload: JSON.stringify({ delta: options.reliabilityDelta }),
		reliabilityDeltaSchemaVersion: DEVELOPMENT_DELTA_SCHEMA_VERSION,
		totalCostMinor,
		spentCostMinor: 0,
		startWorldDate: save.worldDate,
		completedWorldDate: null,
		startedAt: now,
		createdAt: now,
		updatedAt: now,
		completedAt: null
	});
	await tx.insert(schema.developmentProjectStage).values(
		stagePlans.map((plan, index) => ({
			id: `${projectId}:${plan.stage}`,
			projectId,
			stage: plan.stage,
			sequence: index,
			status: index === 0 ? 'active' : 'pending',
			durationDays: plan.durationDays,
			costMinor: plan.costMinor,
			remainingDays: plan.durationDays,
			startedWorldDate: index === 0 ? save.worldDate : null,
			completedWorldDate: null,
			startedAt: index === 0 ? now : null,
			completedAt: null
		}))
	);
	return projectDto(tx, projectId);
}

export async function listDevelopmentProjects(db: Database): Promise<DevelopmentProjectDto[]> {
	return db.transaction(async (tx) => {
		const projects = await tx
			.select({ id: schema.developmentProject.id })
			.from(schema.developmentProject);
		return Promise.all(projects.map((project) => projectDto(tx, project.id)));
	});
}

function parseDailyResult(payload: string): DailyResearchDevelopmentResult {
	const parsed = parseObject(payload, 'Research and development result');
	if (parsed.phase !== 'research_development') {
		throw new DevelopmentError(
			'Research and development result has an invalid phase.',
			'MIGRATION_FAILED'
		);
	}
	return parsed as unknown as DailyResearchDevelopmentResult;
}

async function completeProject(
	tx: Transaction,
	project: typeof schema.developmentProject.$inferSelect,
	entry: { teamId: string },
	worldDate: string,
	now: string
): Promise<{ costAppliedMinor: number; manufacturedAsset: boolean }> {
	const base = project.baseDesignVersionId
		? (
				await tx
					.select()
					.from(schema.partDesignVersion)
					.where(eq(schema.partDesignVersion.id, project.baseDesignVersionId))
					.limit(1)
			)[0]
		: null;
	if (project.baseDesignVersionId && !base) {
		throw new DevelopmentError(
			'Base design disappeared during project completion.',
			'MIGRATION_FAILED'
		);
	}
	const performanceDeltas = parseDeltas(project.performanceDeltaPayload);
	const reliabilityDelta = parseReliabilityDelta(project.reliabilityDeltaPayload);
	const performanceBase = base
		? parseObject(base.performancePayload, 'Base performance payload')
		: {};
	const reliabilityBase = base
		? parseObject(base.reliabilityPayload, 'Base reliability payload')
		: {};
	const performancePayload = applyPerformanceDeltas(performanceBase, performanceDeltas);
	const reliabilityPayload = applyReliabilityDelta(reliabilityBase, reliabilityDelta);
	validatePerformancePayload(performancePayload);
	const latest = await tx
		.select({ version: schema.partDesignVersion.version })
		.from(schema.partDesignVersion)
		.where(
			and(
				eq(schema.partDesignVersion.teamId, entry.teamId),
				eq(schema.partDesignVersion.partCategory, project.partCategory)
			)
		)
		.orderBy(desc(schema.partDesignVersion.version))
		.limit(1);
	const version = (latest[0]?.version ?? 0) + 1;
	const designVersionId = randomUUID();
	const designInput = {
		baseDesignVersionId: project.baseDesignVersionId,
		partCategory: project.partCategory,
		performanceDeltas,
		reliabilityDelta,
		version
	};
	await tx.insert(schema.partDesignVersion).values({
		id: designVersionId,
		teamId: entry.teamId,
		partCategory: project.partCategory,
		version,
		formulaVersion: DEVELOPMENT_FORMULA_VERSION,
		inputsHash: createHash('sha256')
			.update(JSON.stringify(canonicalize(designInput)))
			.digest('hex'),
		performancePayload: JSON.stringify(performancePayload),
		performanceSchemaVersion: DEVELOPMENT_RESULT_SCHEMA_VERSION,
		reliabilityPayload: JSON.stringify(reliabilityPayload),
		reliabilitySchemaVersion: DEVELOPMENT_RESULT_SCHEMA_VERSION,
		createdAt: now
	});

	const assetId = randomUUID();
	let partInstanceId: string | null = null;
	let chassisInstanceId: string | null = null;
	if (project.partCategory === 'chassis') {
		chassisInstanceId = assetId;
		await tx.insert(schema.chassisInstance).values({
			id: assetId,
			teamSeasonEntryId: project.teamSeasonEntryId,
			chassisDesignVersionId: designVersionId,
			serialNumber: `${project.id}:chassis`,
			status: 'available'
		});
	} else {
		partInstanceId = assetId;
		await tx.insert(schema.partInstance).values({
			id: assetId,
			teamSeasonEntryId: project.teamSeasonEntryId,
			partDesignVersionId: designVersionId,
			serialNumber: `${project.id}:part`,
			status: 'available'
		});
	}
	await tx.insert(schema.developmentProjectResult).values({
		id: `${project.id}:result`,
		projectId: project.id,
		partDesignVersionId: designVersionId,
		partInstanceId,
		chassisInstanceId,
		manufacturedAt: now
	});
	const completedCost = project.totalCostMinor - project.spentCostMinor;
	if (completedCost > 0) {
		await postFinanceTransaction(tx, {
			accountId: `${project.teamSeasonEntryId}:finance`,
			worldDate,
			postedAt: now,
			transactionType: 'expense',
			category: 'development',
			amountMinor: -completedCost,
			sourceType: 'development_completion',
			sourceId: project.id,
			idempotencyKey: `development:${project.id}:completion`,
			description: `Manufacturing completion: ${project.partCategory}`
		});
	}
	await tx
		.update(schema.developmentProject)
		.set({
			status: 'completed',
			currentStage: 'completed',
			spentCostMinor: project.totalCostMinor,
			completedWorldDate: worldDate,
			updatedAt: now,
			completedAt: now
		})
		.where(eq(schema.developmentProject.id, project.id));
	return { costAppliedMinor: completedCost, manufacturedAsset: true };
}

export async function runDailyResearchDevelopment(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string }
): Promise<DailyResearchDevelopmentResult> {
	const executionId = `${options.saveId}:daily:${options.worldDate}:research_development`;
	const existing = await tx
		.select()
		.from(schema.dailyPhaseExecution)
		.where(eq(schema.dailyPhaseExecution.id, executionId))
		.limit(1);
	if (existing[0]?.status === 'completed') {
		if (existing[0].resultSchemaVersion !== DEVELOPMENT_PROJECT_PHASE_SCHEMA_VERSION) {
			throw new DevelopmentError(
				'Unsupported research and development result version.',
				'MIGRATION_FAILED'
			);
		}
		return parseDailyResult(existing[0].resultPayload);
	}

	const projects = await tx
		.select()
		.from(schema.developmentProject)
		.where(eq(schema.developmentProject.status, 'active'))
		.orderBy(asc(schema.developmentProject.createdAt));
	let projectsAdvanced = 0;
	let stagesCompleted = 0;
	let projectsCompleted = 0;
	let manufacturedAssets = 0;
	let costAppliedMinor = 0;
	const completedProjectIds: string[] = [];
	for (const project of projects) {
		const activeStages = await tx
			.select()
			.from(schema.developmentProjectStage)
			.where(
				and(
					eq(schema.developmentProjectStage.projectId, project.id),
					eq(schema.developmentProjectStage.status, 'active')
				)
			)
			.limit(1);
		const activeStage = activeStages[0];
		if (!activeStage) {
			throw new DevelopmentError(
				`Active project ${project.id} has no active stage.`,
				'MIGRATION_FAILED'
			);
		}
		projectsAdvanced += 1;
		const remainingDays = Math.max(0, activeStage.remainingDays - 1);
		if (remainingDays > 0) {
			await tx
				.update(schema.developmentProjectStage)
				.set({ remainingDays, completedAt: null })
				.where(eq(schema.developmentProjectStage.id, activeStage.id));
			await tx
				.update(schema.developmentProject)
				.set({ updatedAt: options.now })
				.where(eq(schema.developmentProject.id, project.id));
			continue;
		}

		stagesCompleted += 1;
		await tx
			.update(schema.developmentProjectStage)
			.set({
				status: 'completed',
				remainingDays: 0,
				completedWorldDate: options.worldDate,
				completedAt: options.now
			})
			.where(eq(schema.developmentProjectStage.id, activeStage.id));
		if (activeStage.stage === 'manufacturing') {
			const entries = await tx
				.select({ teamId: schema.teamSeasonEntry.teamId })
				.from(schema.teamSeasonEntry)
				.where(eq(schema.teamSeasonEntry.id, project.teamSeasonEntryId))
				.limit(1);
			const entry = entries[0];
			if (!entry) throw new DevelopmentError('Project team entry is missing.', 'MIGRATION_FAILED');
			const completed = await completeProject(tx, project, entry, options.worldDate, options.now);
			projectsCompleted += 1;
			manufacturedAssets += completed.manufacturedAsset ? 1 : 0;
			costAppliedMinor += completed.costAppliedMinor;
			completedProjectIds.push(project.id);
			continue;
		}

		const nextStages = await tx
			.select()
			.from(schema.developmentProjectStage)
			.where(
				and(
					eq(schema.developmentProjectStage.projectId, project.id),
					eq(schema.developmentProjectStage.sequence, activeStage.sequence + 1)
				)
			)
			.limit(1);
		const nextStage = nextStages[0];
		if (!nextStage) {
			throw new DevelopmentError(
				`Project ${project.id} is missing its next stage.`,
				'MIGRATION_FAILED'
			);
		}
		await tx
			.update(schema.developmentProjectStage)
			.set({
				status: 'active',
				startedWorldDate: options.worldDate,
				startedAt: options.now,
				remainingDays: nextStage.durationDays
			})
			.where(eq(schema.developmentProjectStage.id, nextStage.id));
		await tx
			.update(schema.developmentProject)
			.set({
				currentStage: nextStage.stage,
				spentCostMinor: project.spentCostMinor + activeStage.costMinor,
				updatedAt: options.now
			})
			.where(eq(schema.developmentProject.id, project.id));
		if (activeStage.costMinor > 0) {
			await postFinanceTransaction(tx, {
				accountId: `${project.teamSeasonEntryId}:finance`,
				worldDate: options.worldDate,
				postedAt: options.now,
				transactionType: 'expense',
				category: 'development',
				amountMinor: -activeStage.costMinor,
				sourceType: 'development_stage',
				sourceId: activeStage.id,
				idempotencyKey: `development:${project.id}:stage:${activeStage.id}`,
				description: `Stage completion: ${activeStage.stage}`
			});
		}
		costAppliedMinor += activeStage.costMinor;
	}

	const result: DailyResearchDevelopmentResult = {
		phase: 'research_development',
		worldDate: options.worldDate,
		projectsAdvanced,
		stagesCompleted,
		projectsCompleted,
		manufacturedAssets,
		costAppliedMinor,
		completedProjectIds
	};
	const stored = {
		status: 'completed',
		resultPayload: JSON.stringify(result),
		resultSchemaVersion: DEVELOPMENT_PROJECT_PHASE_SCHEMA_VERSION,
		completedAt: options.now
	};
	if (existing[0]) {
		await tx
			.update(schema.dailyPhaseExecution)
			.set(stored)
			.where(eq(schema.dailyPhaseExecution.id, executionId));
	} else {
		await tx.insert(schema.dailyPhaseExecution).values({
			id: executionId,
			worldDate: options.worldDate,
			phase: 'research_development',
			...stored,
			createdAt: options.now
		});
	}
	return result;
}
