import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import {
	DevelopmentError,
	startDevelopmentProjectInTransaction,
	type DevelopmentStagePlan
} from './development-service.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const AI_WORLD_SCHEMA_VERSION = 'ai-world-v2';

export const AI_DECISION_TYPES = [
	'protect_cash',
	'continue_development',
	'review_suppliers',
	'plan_development'
] as const;
export type AIWorldDecisionType = (typeof AI_DECISION_TYPES)[number];

export const AI_ACTION_STATUSES = ['applied', 'deferred', 'skipped'] as const;
export type AIWorldActionStatus = (typeof AI_ACTION_STATUSES)[number];

export interface AITeamProfileDto {
	id: string;
	teamSeasonEntryId: string;
	archetype: string;
	developmentPriority: string;
	driverStrategy: string;
	supplierStrategy: string;
	riskTolerance: number;
	spendingDiscipline: number;
	talentFocus: number;
	createdAt: string;
	updatedAt: string;
}

export interface AIWorldDecisionDto {
	id: string;
	teamSeasonEntryId: string;
	worldDate: string;
	decisionType: AIWorldDecisionType;
	priority: number;
	reasonCode: string;
	summary: string;
	createdAt: string;
}

export interface AIWorldActionDto {
	id: string;
	decisionId: string;
	teamSeasonEntryId: string;
	worldDate: string;
	actionType: AIWorldDecisionType;
	status: AIWorldActionStatus;
	reasonCode: string;
	summary: string;
	developmentProjectId: string | null;
	createdAt: string;
}

export interface DailyAIWorldResult {
	phase: 'ai_world';
	worldDate: string;
	teamsEvaluated: number;
	decisionsCreated: number;
	decisionTypes: Record<AIWorldDecisionType, number>;
	actionsCreated: number;
	actionsApplied: number;
	actionsDeferred: number;
	actionsSkipped: number;
	actionTypes: Record<AIWorldDecisionType, number>;
}

export class AIWorldError extends Error {
	readonly code: 'INVALID_COMMAND' | 'MIGRATION_FAILED' | 'CONFLICT';

	constructor(message: string, code: AIWorldError['code'] = 'INVALID_COMMAND') {
		super(message);
		this.name = 'AIWorldError';
		this.code = code;
	}
}

interface AIProfileSeed {
	archetype: string;
	developmentPriority: string;
	driverStrategy: string;
	supplierStrategy: string;
	riskTolerance: number;
	spendingDiscipline: number;
	talentFocus: number;
}

const AI_PROFILE_SEEDS: readonly AIProfileSeed[] = [
	{
		archetype: 'technical',
		developmentPriority: 'aero',
		driverStrategy: 'talent',
		supplierStrategy: 'independence',
		riskTolerance: 68,
		spendingDiscipline: 52,
		talentFocus: 78
	},
	{
		archetype: 'talent_first',
		developmentPriority: 'reliability',
		driverStrategy: 'talent',
		supplierStrategy: 'value',
		riskTolerance: 44,
		spendingDiscipline: 70,
		talentFocus: 92
	},
	{
		archetype: 'commercial',
		developmentPriority: 'powertrain',
		driverStrategy: 'stability',
		supplierStrategy: 'parity',
		riskTolerance: 40,
		spendingDiscipline: 82,
		talentFocus: 46
	},
	{
		archetype: 'aggressive',
		developmentPriority: 'chassis',
		driverStrategy: 'experience',
		supplierStrategy: 'parity',
		riskTolerance: 86,
		spendingDiscipline: 38,
		talentFocus: 54
	},
	{
		archetype: 'balanced',
		developmentPriority: 'reliability',
		driverStrategy: 'balanced',
		supplierStrategy: 'value',
		riskTolerance: 55,
		spendingDiscipline: 64,
		talentFocus: 64
	}
];

function profileId(teamSeasonEntryId: string): string {
	return `${teamSeasonEntryId}:ai-profile`;
}

function stableHash(value: string): number {
	let hash = 2_166_136_261;
	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}
	return hash >>> 0;
}

function profileSeed(teamCode: string): AIProfileSeed {
	return AI_PROFILE_SEEDS[stableHash(teamCode) % AI_PROFILE_SEEDS.length];
}

function decisionId(saveId: string, worldDate: string, teamSeasonEntryId: string): string {
	return `${saveId}:daily:${worldDate}:ai_world:${teamSeasonEntryId}`;
}

function toProfileDto(row: typeof schema.aiTeamProfile.$inferSelect): AITeamProfileDto {
	return {
		id: row.id,
		teamSeasonEntryId: row.teamSeasonEntryId,
		archetype: row.archetype,
		developmentPriority: row.developmentPriority,
		driverStrategy: row.driverStrategy,
		supplierStrategy: row.supplierStrategy,
		riskTolerance: row.riskTolerance,
		spendingDiscipline: row.spendingDiscipline,
		talentFocus: row.talentFocus,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function toDecisionDto(row: typeof schema.aiWorldDecision.$inferSelect): AIWorldDecisionDto {
	if (!AI_DECISION_TYPES.includes(row.decisionType as AIWorldDecisionType)) {
		throw new AIWorldError(`Unknown AI decision type: ${row.decisionType}.`, 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		teamSeasonEntryId: row.teamSeasonEntryId,
		worldDate: row.worldDate,
		decisionType: row.decisionType as AIWorldDecisionType,
		priority: row.priority,
		reasonCode: row.reasonCode,
		summary: row.summary,
		createdAt: row.createdAt
	};
}

function toActionDto(row: typeof schema.aiWorldAction.$inferSelect): AIWorldActionDto {
	if (!AI_DECISION_TYPES.includes(row.actionType as AIWorldDecisionType)) {
		throw new AIWorldError(`Unknown AI action type: ${row.actionType}.`, 'MIGRATION_FAILED');
	}
	if (!AI_ACTION_STATUSES.includes(row.status as AIWorldActionStatus)) {
		throw new AIWorldError(`Unknown AI action status: ${row.status}.`, 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		decisionId: row.decisionId,
		teamSeasonEntryId: row.teamSeasonEntryId,
		worldDate: row.worldDate,
		actionType: row.actionType as AIWorldDecisionType,
		status: row.status as AIWorldActionStatus,
		reasonCode: row.reasonCode,
		summary: row.summary,
		developmentProjectId: row.developmentProjectId,
		createdAt: row.createdAt
	};
}

export async function ensureAITeamProfiles(
	tx: Transaction,
	options: { now: string }
): Promise<number> {
	const teams = await tx
		.select({
			teamSeasonEntryId: schema.teamSeasonEntry.id,
			teamCode: schema.team.code
		})
		.from(schema.teamSeasonEntry)
		.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.orderBy(asc(schema.teamSeasonEntry.id));
	let created = 0;
	for (const team of teams) {
		const existing = await tx
			.select({ id: schema.aiTeamProfile.id })
			.from(schema.aiTeamProfile)
			.where(eq(schema.aiTeamProfile.teamSeasonEntryId, team.teamSeasonEntryId))
			.limit(1);
		if (existing[0]) continue;
		const seed = profileSeed(team.teamCode);
		await tx.insert(schema.aiTeamProfile).values({
			id: profileId(team.teamSeasonEntryId),
			teamSeasonEntryId: team.teamSeasonEntryId,
			...seed,
			createdAt: options.now,
			updatedAt: options.now
		});
		created += 1;
	}
	return created;
}

export async function listAITeamProfiles(db: Database): Promise<AITeamProfileDto[]> {
	const rows = await db
		.select()
		.from(schema.aiTeamProfile)
		.orderBy(asc(schema.aiTeamProfile.teamSeasonEntryId));
	return rows.map(toProfileDto);
}

export async function listAIWorldDecisions(
	db: Database,
	options: { worldDate?: string } = {}
): Promise<AIWorldDecisionDto[]> {
	const rows = await db
		.select()
		.from(schema.aiWorldDecision)
		.where(options.worldDate ? eq(schema.aiWorldDecision.worldDate, options.worldDate) : undefined)
		.orderBy(asc(schema.aiWorldDecision.worldDate), asc(schema.aiWorldDecision.teamSeasonEntryId));
	return rows.map(toDecisionDto);
}

export async function listAIWorldActions(
	db: Database,
	options: { worldDate?: string } = {}
): Promise<AIWorldActionDto[]> {
	const rows = await db
		.select()
		.from(schema.aiWorldAction)
		.where(options.worldDate ? eq(schema.aiWorldAction.worldDate, options.worldDate) : undefined)
		.orderBy(asc(schema.aiWorldAction.worldDate), asc(schema.aiWorldAction.teamSeasonEntryId));
	return rows.map(toActionDto);
}

function parseDailyResult(payload: string): DailyAIWorldResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new AIWorldError(
			`Daily AI world result is invalid JSON: ${error instanceof Error ? error.message : String(error)}.`,
			'MIGRATION_FAILED'
		);
	}
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		(parsed as { phase?: unknown }).phase !== 'ai_world'
	) {
		throw new AIWorldError('Daily AI world result has an invalid shape.', 'MIGRATION_FAILED');
	}
	return parsed as DailyAIWorldResult;
}

function chooseDecision(options: {
	profile: typeof schema.aiTeamProfile.$inferSelect;
	teamName: string;
	currentBalanceMinor: number;
	budgetCapMinor: number;
	activeProjectCategories: string[];
	activeSupplierContracts: number;
}): { decisionType: AIWorldDecisionType; priority: number; reasonCode: string; summary: string } {
	const reserveRatio = options.profile.spendingDiscipline >= 70 ? 0.25 : 0.15;
	const reserveThreshold = Math.floor(options.budgetCapMinor * reserveRatio);
	if (options.currentBalanceMinor <= reserveThreshold) {
		return {
			decisionType: 'protect_cash',
			priority: 90,
			reasonCode: 'cash_reserve',
			summary: `${options.teamName} is protecting its cash reserve before committing new work.`
		};
	}
	if (options.activeProjectCategories.length > 0) {
		return {
			decisionType: 'continue_development',
			priority: 65,
			reasonCode: 'active_development',
			summary: `${options.teamName} is continuing ${options.activeProjectCategories.join(', ')} development.`
		};
	}
	if (
		options.activeSupplierContracts === 0 &&
		options.profile.supplierStrategy !== 'independence'
	) {
		return {
			decisionType: 'review_suppliers',
			priority: 55,
			reasonCode: 'supplier_coverage',
			summary: `${options.teamName} is reviewing supplier coverage before the next technical commitment.`
		};
	}
	return {
		decisionType: 'plan_development',
		priority: 45,
		reasonCode: 'development_priority',
		summary: `${options.teamName} is preparing a ${options.profile.developmentPriority} development plan.`
	};
}

const AI_DEVELOPMENT_STAGE_PLANS: readonly DevelopmentStagePlan[] = [
	{ stage: 'concept_design', durationDays: 3, costMinor: 75_000 },
	{ stage: 'cfd', durationDays: 4, costMinor: 125_000 },
	{ stage: 'wind_tunnel', durationDays: 5, costMinor: 175_000 },
	{ stage: 'manufacturing', durationDays: 3, costMinor: 225_000 }
];

const AI_DEVELOPMENT_DELTAS: Readonly<Record<string, Record<string, number>>> = {
	aero: { 'aero.frontWing': 2, 'aero.rearWing': 1 },
	chassis: { 'chassis.suspension': 2, 'chassis.weight': 1 },
	powertrain: { 'powertrain.acceleration': 2, 'powertrain.efficiency': 1 },
	reliability: { 'reliability.durability': 3 }
};

function developmentCost(): number {
	return AI_DEVELOPMENT_STAGE_PLANS.reduce((total, stage) => total + stage.costMinor, 0);
}

function reserveThreshold(
	profile: typeof schema.aiTeamProfile.$inferSelect,
	budgetCapMinor: number
) {
	const reserveRatio = profile.spendingDiscipline >= 70 ? 0.25 : 0.15;
	return Math.floor(budgetCapMinor * reserveRatio);
}

async function startAIDevelopmentProject(
	tx: Transaction,
	options: {
		teamSeasonEntryId: string;
		teamId: string;
		partCategory: string;
		now: string;
	}
): Promise<string> {
	const baseDesigns = await tx
		.select({ id: schema.partDesignVersion.id })
		.from(schema.partDesignVersion)
		.where(
			and(
				eq(schema.partDesignVersion.teamId, options.teamId),
				eq(schema.partDesignVersion.partCategory, options.partCategory)
			)
		)
		.orderBy(desc(schema.partDesignVersion.version))
		.limit(1);
	const baseDesignVersionId = baseDesigns[0]?.id ?? null;
	const project = await startDevelopmentProjectInTransaction(tx, {
		teamSeasonEntryId: options.teamSeasonEntryId,
		partCategory: options.partCategory,
		projectKind: baseDesignVersionId ? 'upgrade' : 'new_design',
		baseDesignVersionId,
		performanceDeltas: AI_DEVELOPMENT_DELTAS[options.partCategory] ?? {
			[`${options.partCategory}.overall`]: 2
		},
		reliabilityDelta: options.partCategory === 'reliability' ? 3 : 0,
		stagePlans: AI_DEVELOPMENT_STAGE_PLANS,
		now: options.now
	});
	return project.id;
}

interface AIActionResolution {
	status: AIWorldActionStatus;
	reasonCode: string;
	summary: string;
	developmentProjectId: string | null;
}

async function resolveAIAction(
	tx: Transaction,
	options: {
		decision: AIWorldDecisionDto;
		team: {
			teamId: string;
			teamName: string;
			teamSeasonEntryId: string;
			profile: typeof schema.aiTeamProfile.$inferSelect;
			currentBalanceMinor: number;
			budgetCapMinor: number;
		};
		activeProjectId: string | null;
		now: string;
	}
): Promise<AIActionResolution> {
	const { decision, team } = options;
	if (decision.decisionType === 'protect_cash') {
		return {
			status: 'applied',
			reasonCode: 'cash_reserve',
			summary: `${team.teamName} is holding new spending to protect its cash reserve.`,
			developmentProjectId: null
		};
	}
	if (decision.decisionType === 'continue_development') {
		return {
			status: 'applied',
			reasonCode: 'active_development',
			summary: `${team.teamName} is continuing its active development program.`,
			developmentProjectId: options.activeProjectId
		};
	}
	if (decision.decisionType === 'review_suppliers') {
		return {
			status: 'deferred',
			reasonCode: 'supplier_market_deferred',
			summary: `${team.teamName} recorded a supplier review intent; supplier negotiations are deferred until the market system is available.`,
			developmentProjectId: null
		};
	}
	const cost = developmentCost();
	const reserve = reserveThreshold(team.profile, team.budgetCapMinor);
	if (team.currentBalanceMinor - cost < reserve) {
		return {
			status: 'deferred',
			reasonCode: 'cash_reserve',
			summary: `${team.teamName} deferred new ${team.profile.developmentPriority} development to preserve its cash reserve.`,
			developmentProjectId: null
		};
	}
	try {
		const developmentProjectId = await startAIDevelopmentProject(tx, {
			teamSeasonEntryId: team.teamSeasonEntryId,
			teamId: team.teamId,
			partCategory: team.profile.developmentPriority,
			now: options.now
		});
		return {
			status: 'applied',
			reasonCode: 'development_started',
			summary: `${team.teamName} started a ${team.profile.developmentPriority} development project.`,
			developmentProjectId
		};
	} catch (error) {
		if (!(error instanceof DevelopmentError)) throw error;
		return {
			status: 'deferred',
			reasonCode: 'development_unavailable',
			summary: `${team.teamName} deferred its ${team.profile.developmentPriority} development plan because the project could not be started.`,
			developmentProjectId: null
		};
	}
}

export async function runDailyAIWorld(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string }
): Promise<DailyAIWorldResult> {
	const executionId = `${options.saveId}:daily:${options.worldDate}:ai_world`;
	const existing = await tx
		.select()
		.from(schema.dailyPhaseExecution)
		.where(eq(schema.dailyPhaseExecution.id, executionId))
		.limit(1);
	if (existing[0]?.status === 'completed') {
		if (existing[0].resultSchemaVersion !== AI_WORLD_SCHEMA_VERSION) {
			throw new AIWorldError('Unsupported daily AI world result version.', 'MIGRATION_FAILED');
		}
		return parseDailyResult(existing[0].resultPayload);
	}
	const saves = await tx
		.select({ playerTeamId: schema.saveGame.playerTeamId })
		.from(schema.saveGame)
		.limit(1);
	const playerTeamId = saves[0]?.playerTeamId ?? null;

	const teams = await tx
		.select({
			teamSeasonEntryId: schema.teamSeasonEntry.id,
			teamId: schema.team.id,
			teamName: schema.team.name,
			profile: schema.aiTeamProfile,
			currentBalanceMinor: schema.financeAccount.currentBalanceMinor,
			budgetCapMinor: schema.financeAccount.budgetCapMinor
		})
		.from(schema.teamSeasonEntry)
		.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.innerJoin(
			schema.aiTeamProfile,
			eq(schema.aiTeamProfile.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.leftJoin(
			schema.financeAccount,
			eq(schema.financeAccount.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.orderBy(asc(schema.teamSeasonEntry.id));
	const activeProjects = await tx
		.select({
			id: schema.developmentProject.id,
			teamSeasonEntryId: schema.developmentProject.teamSeasonEntryId,
			partCategory: schema.developmentProject.partCategory
		})
		.from(schema.developmentProject)
		.where(eq(schema.developmentProject.status, 'active'));
	const activeProjectCategories = new Map<string, string[]>();
	const activeProjectIds = new Map<string, string>();
	for (const project of activeProjects) {
		const categories = activeProjectCategories.get(project.teamSeasonEntryId) ?? [];
		categories.push(project.partCategory);
		activeProjectCategories.set(project.teamSeasonEntryId, categories);
		if (!activeProjectIds.has(project.teamSeasonEntryId)) {
			activeProjectIds.set(project.teamSeasonEntryId, project.id);
		}
	}
	const activeSupplierContracts = await tx
		.select({ teamSeasonEntryId: schema.supplyContract.teamSeasonEntryId })
		.from(schema.supplyContract)
		.where(
			and(
				lte(schema.supplyContract.startDate, options.worldDate),
				gte(schema.supplyContract.endDate, options.worldDate)
			)
		);
	const supplierCounts = new Map<string, number>();
	for (const contract of activeSupplierContracts) {
		supplierCounts.set(
			contract.teamSeasonEntryId,
			(supplierCounts.get(contract.teamSeasonEntryId) ?? 0) + 1
		);
	}

	const decisionTypes = Object.fromEntries(
		AI_DECISION_TYPES.map((decisionType) => [decisionType, 0])
	) as Record<AIWorldDecisionType, number>;
	const actionTypes = Object.fromEntries(
		AI_DECISION_TYPES.map((decisionType) => [decisionType, 0])
	) as Record<AIWorldDecisionType, number>;
	let decisionsCreated = 0;
	let actionsCreated = 0;
	let actionsApplied = 0;
	let actionsDeferred = 0;
	let actionsSkipped = 0;
	for (const team of teams) {
		const decision = chooseDecision({
			profile: team.profile,
			teamName: team.teamName,
			currentBalanceMinor: team.currentBalanceMinor ?? 0,
			budgetCapMinor: team.budgetCapMinor ?? 0,
			activeProjectCategories: activeProjectCategories.get(team.teamSeasonEntryId) ?? [],
			activeSupplierContracts: supplierCounts.get(team.teamSeasonEntryId) ?? 0
		});
		const decisionRow = {
			id: decisionId(options.saveId, options.worldDate, team.teamSeasonEntryId),
			teamSeasonEntryId: team.teamSeasonEntryId,
			worldDate: options.worldDate,
			...decision,
			createdAt: options.now
		};
		await tx.insert(schema.aiWorldDecision).values(decisionRow);
		decisionTypes[decision.decisionType] += 1;
		decisionsCreated += 1;
		if (team.teamId === playerTeamId) continue;

		const decisionDto: AIWorldDecisionDto = {
			...decisionRow,
			decisionType: decisionRow.decisionType
		};
		const resolution = await resolveAIAction(tx, {
			decision: decisionDto,
			team: {
				teamId: team.teamId,
				teamName: team.teamName,
				teamSeasonEntryId: team.teamSeasonEntryId,
				profile: team.profile,
				currentBalanceMinor: team.currentBalanceMinor ?? 0,
				budgetCapMinor: team.budgetCapMinor ?? 0
			},
			activeProjectId: activeProjectIds.get(team.teamSeasonEntryId) ?? null,
			now: options.now
		});
		await tx.insert(schema.aiWorldAction).values({
			id: `${decisionRow.id}:action`,
			decisionId: decisionRow.id,
			teamSeasonEntryId: team.teamSeasonEntryId,
			worldDate: options.worldDate,
			actionType: decision.decisionType,
			status: resolution.status,
			reasonCode: resolution.reasonCode,
			summary: resolution.summary,
			developmentProjectId: resolution.developmentProjectId,
			createdAt: options.now
		});
		actionsCreated += 1;
		actionTypes[decision.decisionType] += 1;
		if (resolution.status === 'applied') actionsApplied += 1;
		else if (resolution.status === 'deferred') actionsDeferred += 1;
		else actionsSkipped += 1;
	}

	const result: DailyAIWorldResult = {
		phase: 'ai_world',
		worldDate: options.worldDate,
		teamsEvaluated: teams.length,
		decisionsCreated,
		decisionTypes,
		actionsCreated,
		actionsApplied,
		actionsDeferred,
		actionsSkipped,
		actionTypes
	};
	const stored = {
		status: 'completed',
		resultPayload: JSON.stringify(result),
		resultSchemaVersion: AI_WORLD_SCHEMA_VERSION,
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
			phase: 'ai_world',
			...stored,
			createdAt: options.now
		});
	}
	return result;
}
