import { and, asc, desc, eq, lte, ne, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const INBOX_SCHEMA_VERSION = 'inbox-v1';

export const INBOX_CATEGORIES = ['world', 'development', 'finance'] as const;
export type InboxCategory = (typeof INBOX_CATEGORIES)[number];

export const INBOX_SEVERITIES = ['informational', 'actionable', 'urgent', 'blocking'] as const;
export type InboxSeverity = (typeof INBOX_SEVERITIES)[number];

export const INBOX_STATUSES = ['unread', 'read', 'deferred', 'resolved', 'archived'] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

export const INBOX_ACTIONS = ['read', 'defer', 'resolve', 'archive'] as const;
export type InboxActionType = (typeof INBOX_ACTIONS)[number];

export interface InboxMessageDto {
	id: string;
	worldDate: string;
	category: InboxCategory;
	severity: InboxSeverity;
	status: InboxStatus;
	priority: number;
	title: string;
	body: string;
	sourceType: string;
	sourceId: string | null;
	requiresDecision: boolean;
	isBlocking: boolean;
	deadlineWorldDate: string | null;
	deferredUntilWorldDate: string | null;
	createdAt: string;
	readAt: string | null;
	resolvedAt: string | null;
}

export interface InboxActionDto {
	id: string;
	inboxMessageId: string;
	actionType: InboxActionType;
	previousStatus: InboxStatus;
	nextStatus: InboxStatus;
	deferredUntilWorldDate: string | null;
	actionWorldDate: string;
	note: string | null;
	idempotencyKey: string;
	createdAt: string;
}

export interface InboxActionResult {
	message: InboxMessageDto;
	action: InboxActionDto | null;
	idempotent: boolean;
}

export interface DailyInboxResult {
	phase: 'inbox';
	worldDate: string;
	messagesCreated: number;
	severityCounts: Record<InboxSeverity, number>;
}

export class InboxError extends Error {
	readonly code: 'INVALID_COMMAND' | 'MIGRATION_FAILED';

	constructor(message: string, code: InboxError['code'] = 'INVALID_COMMAND') {
		super(message);
		this.name = 'InboxError';
		this.code = code;
	}
}

interface PlayerInboxContext {
	teamSeasonEntryId: string;
	teamName: string;
}

interface InboxDraft {
	category: InboxCategory;
	severity: InboxSeverity;
	priority: number;
	title: string;
	body: string;
	sourceType: string;
	sourceId: string | null;
	requiresDecision: boolean;
	isBlocking: boolean;
	deadlineWorldDate: string | null;
}

function messageId(
	saveId: string,
	worldDate: string,
	sourceType: string,
	sourceKey: string
): string {
	return `${saveId}:daily:${worldDate}:inbox:${sourceType}:${sourceKey}`;
}

function toMessageDto(row: typeof schema.inboxMessage.$inferSelect): InboxMessageDto {
	if (!INBOX_CATEGORIES.includes(row.category as InboxCategory)) {
		throw new InboxError(`Unknown inbox category: ${row.category}.`, 'MIGRATION_FAILED');
	}
	if (!INBOX_SEVERITIES.includes(row.severity as InboxSeverity)) {
		throw new InboxError(`Unknown inbox severity: ${row.severity}.`, 'MIGRATION_FAILED');
	}
	if (!INBOX_STATUSES.includes(row.status as InboxStatus)) {
		throw new InboxError(`Unknown inbox status: ${row.status}.`, 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		worldDate: row.worldDate,
		category: row.category as InboxCategory,
		severity: row.severity as InboxSeverity,
		status: row.status as InboxStatus,
		priority: row.priority,
		title: row.title,
		body: row.body,
		sourceType: row.sourceType,
		sourceId: row.sourceId,
		requiresDecision: row.requiresDecision,
		isBlocking: row.isBlocking,
		deadlineWorldDate: row.deadlineWorldDate,
		deferredUntilWorldDate: row.deferredUntilWorldDate,
		createdAt: row.createdAt,
		readAt: row.readAt,
		resolvedAt: row.resolvedAt
	};
}

function parseDailyResult(payload: string): DailyInboxResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new InboxError(
			`Daily inbox result is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
			'MIGRATION_FAILED'
		);
	}
	if (!parsed || typeof parsed !== 'object' || (parsed as { phase?: unknown }).phase !== 'inbox') {
		throw new InboxError('Daily inbox result has an invalid shape.', 'MIGRATION_FAILED');
	}
	return parsed as DailyInboxResult;
}

async function getPlayerInboxContext(tx: Transaction): Promise<PlayerInboxContext | null> {
	const rows = await tx
		.select({
			teamSeasonEntryId: schema.teamSeasonEntry.id,
			teamName: schema.team.name,
			seasonYear: schema.championshipSeason.seasonYear
		})
		.from(schema.saveGame)
		.innerJoin(schema.team, eq(schema.saveGame.playerTeamId, schema.team.id))
		.innerJoin(schema.teamSeasonEntry, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.innerJoin(
			schema.championshipSeason,
			eq(schema.teamSeasonEntry.championshipSeasonId, schema.championshipSeason.id)
		)
		.orderBy(desc(schema.championshipSeason.seasonYear), asc(schema.teamSeasonEntry.id))
		.limit(1);
	const row = rows[0];
	return row ? { teamSeasonEntryId: row.teamSeasonEntryId, teamName: row.teamName } : null;
}

function decisionDraft(
	teamName: string,
	decision: {
		id: string;
		decisionType: string;
		priority: number;
		summary: string;
	}
): InboxDraft {
	const presentations: Record<string, { severity: InboxSeverity; title: string }> = {
		protect_cash: {
			severity: 'urgent',
			title: 'Cash reserve warning'
		},
		continue_development: {
			severity: 'informational',
			title: 'Development continues'
		},
		review_suppliers: {
			severity: 'actionable',
			title: 'Supplier coverage review'
		},
		plan_development: {
			severity: 'informational',
			title: 'Development planning update'
		}
	};
	const details = presentations[decision.decisionType] ?? {
		severity: 'informational' as const,
		title: 'World update'
	};
	return {
		category: 'world',
		severity: details.severity,
		priority: decision.priority,
		title: `${teamName}: ${details.title}`,
		body: decision.summary,
		sourceType: 'ai_world',
		sourceId: decision.id,
		requiresDecision: false,
		isBlocking: false,
		deadlineWorldDate: null
	};
}

async function insertDraft(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string; draft: InboxDraft }
): Promise<boolean> {
	const sourceKey = options.draft.sourceId ?? options.draft.sourceType;
	const dedupeKey = `${options.saveId}:daily:${options.worldDate}:inbox:${options.draft.sourceType}:${sourceKey}`;
	const existing = await tx
		.select({ id: schema.inboxMessage.id })
		.from(schema.inboxMessage)
		.where(eq(schema.inboxMessage.dedupeKey, dedupeKey))
		.limit(1);
	if (existing[0]) return false;
	await tx.insert(schema.inboxMessage).values({
		id: messageId(options.saveId, options.worldDate, options.draft.sourceType, sourceKey),
		worldDate: options.worldDate,
		category: options.draft.category,
		severity: options.draft.severity,
		status: 'unread',
		priority: options.draft.priority,
		title: options.draft.title,
		body: options.draft.body,
		sourceType: options.draft.sourceType,
		sourceId: options.draft.sourceId,
		dedupeKey,
		requiresDecision: options.draft.requiresDecision,
		isBlocking: options.draft.isBlocking,
		deadlineWorldDate: options.draft.deadlineWorldDate,
		deferredUntilWorldDate: null,
		createdAt: options.now,
		readAt: null,
		resolvedAt: null
	});
	return true;
}

export async function listInboxMessages(
	db: Database,
	options: { status?: InboxStatus; worldDate?: string; unresolvedOnly?: boolean } = {}
): Promise<InboxMessageDto[]> {
	if (options.status && !INBOX_STATUSES.includes(options.status)) {
		throw new InboxError(`Unknown inbox status: ${options.status}.`);
	}
	const conditions = [];
	if (options.status) conditions.push(eq(schema.inboxMessage.status, options.status));
	if (options.worldDate) conditions.push(eq(schema.inboxMessage.worldDate, options.worldDate));
	if (options.unresolvedOnly) {
		conditions.push(
			or(
				eq(schema.inboxMessage.status, 'unread'),
				eq(schema.inboxMessage.status, 'read'),
				eq(schema.inboxMessage.status, 'deferred')
			)
		);
	}
	const rows = await db
		.select()
		.from(schema.inboxMessage)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(
			desc(schema.inboxMessage.priority),
			desc(schema.inboxMessage.worldDate),
			asc(schema.inboxMessage.createdAt)
		);
	return rows.map(toMessageDto);
}

export async function getBlockingInboxMessages(
	tx: Transaction,
	options: { throughWorldDate?: string } = {}
): Promise<InboxMessageDto[]> {
	const conditions = [
		eq(schema.inboxMessage.isBlocking, true),
		eq(schema.inboxMessage.requiresDecision, true),
		or(eq(schema.inboxMessage.status, 'unread'), eq(schema.inboxMessage.status, 'read'))
	];
	if (options.throughWorldDate) {
		conditions.push(lte(schema.inboxMessage.worldDate, options.throughWorldDate));
	}
	const rows = await tx
		.select()
		.from(schema.inboxMessage)
		.where(and(...conditions))
		.orderBy(desc(schema.inboxMessage.priority), asc(schema.inboxMessage.createdAt));
	return rows.map(toMessageDto);
}

function toActionDto(row: typeof schema.inboxMessageAction.$inferSelect): InboxActionDto {
	if (!INBOX_ACTIONS.includes(row.actionType as InboxActionType)) {
		throw new InboxError(`Unknown inbox action: ${row.actionType}.`, 'MIGRATION_FAILED');
	}
	if (!INBOX_STATUSES.includes(row.previousStatus as InboxStatus)) {
		throw new InboxError(
			`Unknown previous inbox status: ${row.previousStatus}.`,
			'MIGRATION_FAILED'
		);
	}
	if (!INBOX_STATUSES.includes(row.nextStatus as InboxStatus)) {
		throw new InboxError(`Unknown next inbox status: ${row.nextStatus}.`, 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		inboxMessageId: row.inboxMessageId,
		actionType: row.actionType as InboxActionType,
		previousStatus: row.previousStatus as InboxStatus,
		nextStatus: row.nextStatus as InboxStatus,
		deferredUntilWorldDate: row.deferredUntilWorldDate,
		actionWorldDate: row.actionWorldDate,
		note: row.note,
		idempotencyKey: row.idempotencyKey,
		createdAt: row.createdAt
	};
}

export async function listInboxActions(
	db: Database,
	options: { inboxMessageId?: string } = {}
): Promise<InboxActionDto[]> {
	const rows = await db
		.select()
		.from(schema.inboxMessageAction)
		.where(
			options.inboxMessageId
				? eq(schema.inboxMessageAction.inboxMessageId, options.inboxMessageId)
				: undefined
		)
		.orderBy(desc(schema.inboxMessageAction.createdAt), desc(schema.inboxMessageAction.id));
	return rows.map(toActionDto);
}

export interface ApplyInboxActionOptions {
	messageId: string;
	actionType: InboxActionType;
	deferredUntilWorldDate?: string;
	note?: string;
	idempotencyKey?: string;
	now?: string;
}

function validWorldDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

async function readInboxMessage(
	tx: Transaction,
	messageIdValue: string
): Promise<typeof schema.inboxMessage.$inferSelect> {
	const rows = await tx
		.select()
		.from(schema.inboxMessage)
		.where(eq(schema.inboxMessage.id, messageIdValue))
		.limit(1);
	const message = rows[0];
	if (!message) throw new InboxError(`Inbox message was not found: ${messageIdValue}.`);
	return message;
}

export async function applyInboxAction(
	db: Database,
	options: ApplyInboxActionOptions
): Promise<InboxActionResult> {
	if (!options.messageId.trim()) throw new InboxError('Inbox message ID is required.');
	if (!INBOX_ACTIONS.includes(options.actionType)) {
		throw new InboxError(`Unknown inbox action: ${options.actionType}.`);
	}
	const now = options.now ?? new Date().toISOString();
	return db.transaction(async (tx) => {
		const saves = await tx
			.select({ worldDate: schema.saveGame.worldDate })
			.from(schema.saveGame)
			.limit(1);
		const save = saves[0];
		if (!save) throw new InboxError('Save metadata is missing.');
		const idempotencyKey =
			options.idempotencyKey?.trim() ||
			`${options.messageId}:action:${options.actionType}:${options.deferredUntilWorldDate ?? ''}`;
		const existingActions = await tx
			.select()
			.from(schema.inboxMessageAction)
			.where(eq(schema.inboxMessageAction.idempotencyKey, idempotencyKey))
			.limit(1);
		const message = await readInboxMessage(tx, options.messageId);
		if (existingActions[0]) {
			return {
				message: toMessageDto(message),
				action: toActionDto(existingActions[0]),
				idempotent: true
			};
		}

		const desiredStatus: InboxStatus =
			options.actionType === 'read'
				? 'read'
				: options.actionType === 'defer'
					? 'deferred'
					: options.actionType === 'resolve'
						? 'resolved'
						: 'archived';
		const sameState =
			message.status === desiredStatus &&
			(options.actionType !== 'defer' ||
				message.deferredUntilWorldDate === options.deferredUntilWorldDate);
		if (sameState) {
			return { message: toMessageDto(message), action: null, idempotent: true };
		}
		if (message.status === 'resolved' || message.status === 'archived') {
			throw new InboxError(`Inbox message is already ${message.status}.`);
		}
		if (
			message.isBlocking &&
			(options.actionType === 'defer' || options.actionType === 'archive')
		) {
			throw new InboxError('Blocking inbox decisions must be resolved, not deferred or archived.');
		}
		if (options.actionType === 'defer') {
			const deferredUntilWorldDate = options.deferredUntilWorldDate;
			if (!deferredUntilWorldDate || !validWorldDate(deferredUntilWorldDate)) {
				throw new InboxError('A valid defer-until world date is required.');
			}
			if (deferredUntilWorldDate <= save.worldDate) {
				throw new InboxError('Inbox messages can only be deferred into the future.');
			}
		}

		const deferredUntilWorldDate =
			options.actionType === 'defer' ? (options.deferredUntilWorldDate ?? null) : null;
		const nextReadAt = now;
		const nextResolvedAt = options.actionType === 'resolve' ? now : message.resolvedAt;
		await tx
			.update(schema.inboxMessage)
			.set({
				status: desiredStatus,
				deferredUntilWorldDate,
				readAt: message.readAt ?? nextReadAt,
				resolvedAt: nextResolvedAt
			})
			.where(eq(schema.inboxMessage.id, message.id));

		const action: typeof schema.inboxMessageAction.$inferSelect = {
			id: `${message.id}:action:${idempotencyKey}`,
			inboxMessageId: message.id,
			actionType: options.actionType,
			previousStatus: message.status,
			nextStatus: desiredStatus,
			deferredUntilWorldDate,
			actionWorldDate: save.worldDate,
			note: options.note?.trim() || null,
			idempotencyKey,
			createdAt: now
		};
		await tx.insert(schema.inboxMessageAction).values(action);
		const updated = await readInboxMessage(tx, message.id);
		return { message: toMessageDto(updated), action: toActionDto(action), idempotent: false };
	});
}

export async function runDailyInbox(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string }
): Promise<DailyInboxResult> {
	const executionId = `${options.saveId}:daily:${options.worldDate}:inbox`;
	const existing = await tx
		.select()
		.from(schema.dailyPhaseExecution)
		.where(eq(schema.dailyPhaseExecution.id, executionId))
		.limit(1);
	if (existing[0]?.status === 'completed') {
		if (existing[0].resultSchemaVersion !== INBOX_SCHEMA_VERSION) {
			throw new InboxError('Unsupported daily inbox result version.', 'MIGRATION_FAILED');
		}
		return parseDailyResult(existing[0].resultPayload);
	}

	const severityCounts = Object.fromEntries(
		INBOX_SEVERITIES.map((severity) => [severity, 0])
	) as Record<InboxSeverity, number>;
	let messagesCreated = 0;
	const player = await getPlayerInboxContext(tx);
	if (player) {
		const decisions = await tx
			.select({
				id: schema.aiWorldDecision.id,
				decisionType: schema.aiWorldDecision.decisionType,
				priority: schema.aiWorldDecision.priority,
				summary: schema.aiWorldDecision.summary
			})
			.from(schema.aiWorldDecision)
			.where(
				and(
					eq(schema.aiWorldDecision.teamSeasonEntryId, player.teamSeasonEntryId),
					eq(schema.aiWorldDecision.worldDate, options.worldDate)
				)
			)
			.limit(1);
		if (decisions[0]) {
			const draft = decisionDraft(player.teamName, decisions[0]);
			if (await insertDraft(tx, { ...options, draft })) {
				messagesCreated += 1;
				severityCounts[draft.severity] += 1;
			}
		}

		const rivalDevelopmentActions = await tx
			.select({
				id: schema.aiWorldAction.id,
				teamSeasonEntryId: schema.aiWorldAction.teamSeasonEntryId,
				teamName: schema.team.name,
				summary: schema.aiWorldAction.summary
			})
			.from(schema.aiWorldAction)
			.innerJoin(
				schema.teamSeasonEntry,
				eq(schema.aiWorldAction.teamSeasonEntryId, schema.teamSeasonEntry.id)
			)
			.innerJoin(schema.team, eq(schema.teamSeasonEntry.teamId, schema.team.id))
			.where(
				and(
					eq(schema.aiWorldAction.worldDate, options.worldDate),
					eq(schema.aiWorldAction.actionType, 'plan_development'),
					eq(schema.aiWorldAction.status, 'applied'),
					ne(schema.aiWorldAction.teamSeasonEntryId, player.teamSeasonEntryId)
				)
			)
			.orderBy(asc(schema.aiWorldAction.teamSeasonEntryId));
		for (const action of rivalDevelopmentActions) {
			const draft: InboxDraft = {
				category: 'world',
				severity: 'informational',
				priority: 50,
				title: `${action.teamName}: rival development activity`,
				body: action.summary,
				sourceType: 'ai_action',
				sourceId: action.id,
				requiresDecision: false,
				isBlocking: false,
				deadlineWorldDate: null
			};
			if (await insertDraft(tx, { ...options, draft })) {
				messagesCreated += 1;
				severityCounts[draft.severity] += 1;
			}
		}

		const completedProjects = await tx
			.select({
				id: schema.developmentProject.id,
				partCategory: schema.developmentProject.partCategory,
				projectKind: schema.developmentProject.projectKind
			})
			.from(schema.developmentProject)
			.where(
				and(
					eq(schema.developmentProject.teamSeasonEntryId, player.teamSeasonEntryId),
					eq(schema.developmentProject.status, 'completed'),
					eq(schema.developmentProject.completedWorldDate, options.worldDate)
				)
			);
		for (const project of completedProjects) {
			const draft: InboxDraft = {
				category: 'development',
				severity: 'actionable',
				priority: 70,
				title: `${player.teamName}: ${project.partCategory} development completed`,
				body: `The ${project.projectKind.replace('_', ' ')} ${project.partCategory} project completed manufacturing and is ready for management review.`,
				sourceType: 'development',
				sourceId: project.id,
				requiresDecision: false,
				isBlocking: false,
				deadlineWorldDate: null
			};
			if (await insertDraft(tx, { ...options, draft })) {
				messagesCreated += 1;
				severityCounts[draft.severity] += 1;
			}
		}

		const accounts = await tx
			.select({
				id: schema.financeAccount.id,
				currentBalanceMinor: schema.financeAccount.currentBalanceMinor,
				budgetCapMinor: schema.financeAccount.budgetCapMinor
			})
			.from(schema.financeAccount)
			.where(eq(schema.financeAccount.teamSeasonEntryId, player.teamSeasonEntryId))
			.limit(1);
		const account = accounts[0];
		if (account && account.budgetCapMinor > 0) {
			const reserveRatio = account.currentBalanceMinor / account.budgetCapMinor;
			if (reserveRatio <= 0.25) {
				const severity: InboxSeverity = reserveRatio <= 0.1 ? 'urgent' : 'actionable';
				const draft: InboxDraft = {
					category: 'finance',
					severity,
					priority: severity === 'urgent' ? 85 : 70,
					title: `${player.teamName}: cash reserve is tightening`,
					body: `Available cash is ${account.currentBalanceMinor.toLocaleString()} against a ${account.budgetCapMinor.toLocaleString()} budget cap.`,
					sourceType: 'finance',
					sourceId: account.id,
					requiresDecision: false,
					isBlocking: false,
					deadlineWorldDate: null
				};
				if (await insertDraft(tx, { ...options, draft })) {
					messagesCreated += 1;
					severityCounts[draft.severity] += 1;
				}
			}
		}
	}

	const result: DailyInboxResult = {
		phase: 'inbox',
		worldDate: options.worldDate,
		messagesCreated,
		severityCounts
	};
	const stored = {
		status: 'completed',
		resultPayload: JSON.stringify(result),
		resultSchemaVersion: INBOX_SCHEMA_VERSION,
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
			phase: 'inbox',
			...stored,
			createdAt: options.now
		});
	}
	return result;
}
