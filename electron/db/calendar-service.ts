import { and, asc, eq, gte, lte, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { runDailyMaintenance, type DailyMaintenanceResult } from './daily-phase-service.js';
import {
	runDailyResearchDevelopment,
	type DailyResearchDevelopmentResult
} from './development-service.js';
import { runDailyFinance, type DailyFinanceResult } from './finance-service.js';
import { runDailyAIWorld, type DailyAIWorldResult } from './ai-world-service.js';
import { getBlockingInboxMessages, runDailyInbox, type DailyInboxResult } from './inbox-service.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type CalendarAdvanceStatus = 'advanced' | 'blocked' | 'idempotent';
export type CalendarBlockCode =
	| 'weekend_active'
	| 'weekend_start_required'
	| 'offscreen_race_failed'
	| 'season_transition_required'
	| 'inbox_decision_required';

export interface CalendarAdvanceResult {
	transitionId: string;
	transitionKind: 'day';
	status: CalendarAdvanceStatus;
	fromWorldDate: string;
	toWorldDate: string;
	savedWorldDate: string;
	blockCode: CalendarBlockCode | null;
	blockReason: string | null;
	requiresWeekendStart: boolean;
	weekendSessionId: string | null;
	championshipEventId: string | null;
	championshipEventName: string | null;
	dailyMaintenance: DailyMaintenanceResult | null;
	dailyResearchDevelopment: DailyResearchDevelopmentResult | null;
	dailyFinance: DailyFinanceResult | null;
	dailyAIWorld: DailyAIWorldResult | null;
	dailyInbox: DailyInboxResult | null;
	offscreenWeekendsResolved: number;
}

export class CalendarError extends Error {
	readonly code: 'INVALID_COMMAND' | 'CONFLICT';

	constructor(message: string, code: 'INVALID_COMMAND' | 'CONFLICT' = 'INVALID_COMMAND') {
		super(message);
		this.name = 'CalendarError';
		this.code = code;
	}
}

export interface CalendarAdvanceOptions {
	expectedWorldDate?: string;
	now?: string;
}

interface WeekendRow {
	weekendSessionId: string;
	championshipEventId: string;
	championshipEventName: string;
	startDate: string;
	scheduledStart: string;
}

function parseDate(value: string): { year: number; month: number; day: number } {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new CalendarError(`Invalid world date: ${value}.`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const timestamp = Date.UTC(year, month - 1, day);
	const date = new Date(timestamp);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		throw new CalendarError(`Invalid world date: ${value}.`);
	}
	return { year, month, day };
}

function nextDate(value: string): string {
	const parsed = parseDate(value);
	const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
	return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
		.map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
		.join('-');
}

async function firstWeekend(
	tx: Transaction,
	condition: ReturnType<typeof and>
): Promise<WeekendRow | null> {
	const rows = await tx
		.select({
			weekendSessionId: schema.weekendSession.id,
			championshipEventId: schema.championshipEvent.id,
			championshipEventName: schema.championshipEvent.name,
			startDate: schema.championshipEvent.startDate,
			scheduledStart: schema.eventSessionDefinition.scheduledStart
		})
		.from(schema.weekendSession)
		.innerJoin(
			schema.eventSessionDefinition,
			eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
		)
		.innerJoin(
			schema.championshipEvent,
			eq(schema.eventSessionDefinition.championshipEventId, schema.championshipEvent.id)
		)
		.where(condition)
		.orderBy(asc(schema.championshipEvent.startDate), asc(schema.eventSessionDefinition.sequence))
		.limit(1);
	return rows[0] ?? null;
}

function resultBase(
	transitionId: string,
	status: CalendarAdvanceStatus,
	fromWorldDate: string,
	toWorldDate: string,
	savedWorldDate: string,
	blockCode: CalendarBlockCode | null,
	blockReason: string | null,
	weekend: WeekendRow | null,
	dailyMaintenance: DailyMaintenanceResult | null = null,
	dailyResearchDevelopment: DailyResearchDevelopmentResult | null = null,
	dailyFinance: DailyFinanceResult | null = null,
	dailyAIWorld: DailyAIWorldResult | null = null,
	dailyInbox: DailyInboxResult | null = null,
	offscreenWeekendsResolved = 0
): CalendarAdvanceResult {
	return {
		transitionId,
		transitionKind: 'day',
		status,
		fromWorldDate,
		toWorldDate,
		savedWorldDate,
		blockCode,
		blockReason,
		requiresWeekendStart:
			weekend !== null &&
			(status === 'advanced' || status === 'blocked') &&
			weekend.startDate <= toWorldDate,
		weekendSessionId: weekend?.weekendSessionId ?? null,
		championshipEventId: weekend?.championshipEventId ?? null,
		championshipEventName: weekend?.championshipEventName ?? null,
		dailyMaintenance,
		dailyResearchDevelopment,
		dailyFinance,
		dailyAIWorld,
		dailyInbox,
		offscreenWeekendsResolved
	};
}

async function eventHasPlayerTeam(
	tx: Transaction,
	championshipEventId: string,
	playerTeamId: string
): Promise<boolean> {
	const rows = await tx
		.select({ id: schema.eventEntry.id })
		.from(schema.eventEntry)
		.innerJoin(
			schema.teamSeasonEntry,
			eq(schema.eventEntry.teamSeasonEntryId, schema.teamSeasonEntry.id)
		)
		.where(
			and(
				eq(schema.eventEntry.championshipEventId, championshipEventId),
				eq(schema.teamSeasonEntry.teamId, playerTeamId)
			)
		)
		.limit(1);
	return rows.length > 0;
}

async function resolveOffscreenWeekends(
	tx: Transaction,
	options: { throughWorldDate: string; playerTeamId: string; now: string }
): Promise<{
	resolved: number;
	playerWeekend: WeekendRow | null;
	failure: { weekend: WeekendRow; reason: string } | null;
}> {
	let resolved = 0;
	while (true) {
		const weekend = await firstWeekend(
			tx,
			and(
				eq(schema.weekendSession.status, 'scheduled'),
				lte(schema.championshipEvent.startDate, options.throughWorldDate)
			)
		);
		if (!weekend) return { resolved, playerWeekend: null, failure: null };
		if (await eventHasPlayerTeam(tx, weekend.championshipEventId, options.playerTeamId)) {
			return { resolved, playerWeekend: weekend, failure: null };
		}
		try {
			const { runOffscreenChampionshipEventInTransaction } =
				await import('./offscreen-race-service.js');
			await runOffscreenChampionshipEventInTransaction(tx, weekend.championshipEventId, {
				now: options.now,
				advanceCalendar: false
			});
			resolved += 1;
		} catch (error) {
			return {
				resolved,
				playerWeekend: null,
				failure: {
					weekend,
					reason: error instanceof Error ? error.message : String(error)
				}
			};
		}
	}
}

async function writeTransition(
	tx: Transaction,
	values: {
		id: string;
		fromWorldDate: string;
		toWorldDate: string;
		status: 'blocked' | 'committed';
		blockCode: CalendarBlockCode | null;
		blockReason: string | null;
		now: string;
	}
): Promise<void> {
	const existing = await tx
		.select({ id: schema.calendarTransition.id })
		.from(schema.calendarTransition)
		.where(eq(schema.calendarTransition.id, values.id))
		.limit(1);
	const update = {
		status: values.status,
		blockCode: values.blockCode,
		blockReason: values.blockReason,
		updatedAt: values.now,
		completedAt: values.status === 'committed' ? values.now : null
	};
	if (existing[0]) {
		await tx
			.update(schema.calendarTransition)
			.set(update)
			.where(eq(schema.calendarTransition.id, values.id));
		return;
	}
	await tx.insert(schema.calendarTransition).values({
		id: values.id,
		transitionKind: 'day',
		fromWorldDate: values.fromWorldDate,
		toWorldDate: values.toWorldDate,
		...update,
		createdAt: values.now
	});
}

export async function commitCalendarTransition(
	tx: Transaction,
	options: {
		transitionKind: string;
		fromWorldDate: string;
		toWorldDate: string;
		now: string;
	}
): Promise<string> {
	const saves = await tx.select().from(schema.saveGame).limit(1);
	const save = saves[0];
	if (!save) throw new CalendarError('Save metadata is missing.');
	if (save.worldDate !== options.fromWorldDate) {
		throw new CalendarError(
			`Calendar expected ${options.fromWorldDate}, but the save is on ${save.worldDate}.`,
			'CONFLICT'
		);
	}
	const transitionId = `${save.id}:calendar:${options.transitionKind}:${options.fromWorldDate}:${options.toWorldDate}`;
	await writeTransition(tx, {
		id: transitionId,
		fromWorldDate: options.fromWorldDate,
		toWorldDate: options.toWorldDate,
		status: 'committed',
		blockCode: null,
		blockReason: null,
		now: options.now
	});
	await tx
		.update(schema.saveGame)
		.set({ worldDate: options.toWorldDate, updatedAt: options.now })
		.where(eq(schema.saveGame.id, save.id));
	return transitionId;
}

export async function advanceCalendarDay(
	db: Database,
	options: CalendarAdvanceOptions = {}
): Promise<CalendarAdvanceResult> {
	const now = options.now ?? new Date().toISOString();
	return db.transaction(async (tx) => {
		const saves = await tx.select().from(schema.saveGame).limit(1);
		const save = saves[0];
		if (!save) throw new CalendarError('Save metadata is missing.');

		const fromWorldDate = options.expectedWorldDate ?? save.worldDate;
		parseDate(fromWorldDate);
		if (options.expectedWorldDate && save.worldDate !== options.expectedWorldDate) {
			const requestedToDate = nextDate(options.expectedWorldDate);
			const replayId = `${save.id}:calendar:day:${options.expectedWorldDate}:${requestedToDate}`;
			const replay = await tx
				.select()
				.from(schema.calendarTransition)
				.where(eq(schema.calendarTransition.id, replayId))
				.limit(1);
			if (replay[0]?.status !== 'committed') {
				throw new CalendarError(
					`Calendar expected ${options.expectedWorldDate}, but the save is on ${save.worldDate}.`,
					'CONFLICT'
				);
			}
			return resultBase(
				replayId,
				'idempotent',
				replay[0].fromWorldDate,
				replay[0].toWorldDate,
				save.worldDate,
				null,
				null,
				null
			);
		}

		const toWorldDate = nextDate(fromWorldDate);
		const transitionId = `${save.id}:calendar:day:${fromWorldDate}:${toWorldDate}`;
		const existing = await tx
			.select()
			.from(schema.calendarTransition)
			.where(eq(schema.calendarTransition.id, transitionId))
			.limit(1);
		if (existing[0]?.status === 'committed') {
			return resultBase(
				transitionId,
				'idempotent',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				null,
				null,
				null
			);
		}

		const activeWeekend = await firstWeekend(
			tx,
			or(eq(schema.weekendSession.status, 'live'), eq(schema.weekendSession.status, 'paused'))
		);
		if (activeWeekend) {
			const blockReason = `Race weekend is active: ${activeWeekend.championshipEventName}.`;
			await writeTransition(tx, {
				id: transitionId,
				fromWorldDate,
				toWorldDate,
				status: 'blocked',
				blockCode: 'weekend_active',
				blockReason,
				now
			});
			return resultBase(
				transitionId,
				'blocked',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				'weekend_active',
				blockReason,
				activeWeekend
			);
		}

		const blockingInboxMessages = await getBlockingInboxMessages(tx, {
			throughWorldDate: fromWorldDate
		});
		if (blockingInboxMessages.length > 0) {
			const firstMessage = blockingInboxMessages[0];
			const blockReason =
				blockingInboxMessages.length === 1
					? `Inbox decision required: ${firstMessage.title}.`
					: `${blockingInboxMessages.length} inbox decisions require attention before advancing time.`;
			await writeTransition(tx, {
				id: transitionId,
				fromWorldDate,
				toWorldDate,
				status: 'blocked',
				blockCode: 'inbox_decision_required',
				blockReason,
				now
			});
			return resultBase(
				transitionId,
				'blocked',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				'inbox_decision_required',
				blockReason,
				null
			);
		}

		const offscreenResolution = await resolveOffscreenWeekends(tx, {
			throughWorldDate: fromWorldDate,
			playerTeamId: save.playerTeamId ?? '',
			now
		});
		if (offscreenResolution.failure) {
			const blockReason = `Off-screen race failed: ${offscreenResolution.failure.reason}`;
			await writeTransition(tx, {
				id: transitionId,
				fromWorldDate,
				toWorldDate,
				status: 'blocked',
				blockCode: 'offscreen_race_failed',
				blockReason,
				now
			});
			return resultBase(
				transitionId,
				'blocked',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				'offscreen_race_failed',
				blockReason,
				offscreenResolution.failure.weekend,
				null,
				null,
				null,
				null,
				null,
				offscreenResolution.resolved
			);
		}
		if (offscreenResolution.playerWeekend) {
			const blockReason = `Race weekend must be started before advancing beyond ${fromWorldDate}.`;
			await writeTransition(tx, {
				id: transitionId,
				fromWorldDate,
				toWorldDate,
				status: 'blocked',
				blockCode: 'weekend_start_required',
				blockReason,
				now
			});
			return resultBase(
				transitionId,
				'blocked',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				'weekend_start_required',
				blockReason,
				offscreenResolution.playerWeekend,
				null,
				null,
				null,
				null,
				null,
				offscreenResolution.resolved
			);
		}

		const futureWeekend = await firstWeekend(
			tx,
			and(
				eq(schema.weekendSession.status, 'scheduled'),
				gte(schema.championshipEvent.startDate, toWorldDate)
			)
		);
		if (!futureWeekend) {
			const blockReason =
				'The current season has no remaining scheduled event; season transition is required.';
			await writeTransition(tx, {
				id: transitionId,
				fromWorldDate,
				toWorldDate,
				status: 'blocked',
				blockCode: 'season_transition_required',
				blockReason,
				now
			});
			return resultBase(
				transitionId,
				'blocked',
				fromWorldDate,
				toWorldDate,
				save.worldDate,
				'season_transition_required',
				blockReason,
				null
			);
		}

		const dailyMaintenance = await runDailyMaintenance(tx, {
			saveId: save.id,
			worldDate: toWorldDate,
			now
		});
		const dailyResearchDevelopment = await runDailyResearchDevelopment(tx, {
			saveId: save.id,
			worldDate: toWorldDate,
			now
		});
		const dailyFinance = await runDailyFinance(tx, {
			saveId: save.id,
			worldDate: toWorldDate,
			now
		});
		const dailyAIWorld = await runDailyAIWorld(tx, {
			saveId: save.id,
			worldDate: toWorldDate,
			now
		});
		const dailyInbox = await runDailyInbox(tx, {
			saveId: save.id,
			worldDate: toWorldDate,
			now
		});
		await commitCalendarTransition(tx, {
			transitionKind: 'day',
			fromWorldDate,
			toWorldDate,
			now
		});

		const weekendAtTarget = await firstWeekend(
			tx,
			and(
				eq(schema.weekendSession.status, 'scheduled'),
				eq(schema.championshipEvent.startDate, toWorldDate)
			)
		);
		return resultBase(
			transitionId,
			'advanced',
			fromWorldDate,
			toWorldDate,
			toWorldDate,
			null,
			null,
			weekendAtTarget,
			dailyMaintenance,
			dailyResearchDevelopment,
			dailyFinance,
			dailyAIWorld,
			dailyInbox,
			offscreenResolution.resolved
		);
	});
}
