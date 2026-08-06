import type { StrategyCommand } from '../src/lib/sim/core/types.js';

export const IPC_CHANNELS = Object.freeze({
	appPing: 'app:ping',
	appQuit: 'app:quit',
	saveList: 'save:list',
	saveCreate: 'save:create',
	saveOpen: 'save:open',
	saveClose: 'save:close',
	saveBackup: 'save:backup',
	saveDelete: 'save:delete',
	saveGetIdentity: 'save:get-identity',
	sessionGetState: 'session:get-state',
	sessionStart: 'session:start',
	sessionPause: 'session:pause',
	sessionResume: 'session:resume',
	sessionCheckpoint: 'session:checkpoint',
	sessionFinalize: 'session:finalize',
	sessionIssueStrategy: 'session:issue-strategy',
	sessionUpdate: 'session:update',
	weekendGetCurrent: 'weekend:get-current',
	financeGetSummary: 'finance:get-summary',
	calendarAdvanceDay: 'calendar:advance-day',
	developmentStart: 'development:start',
	developmentList: 'development:list',
	inboxList: 'inbox:list',
	inboxAction: 'inbox:action',
	inboxListActions: 'inbox:list-actions',
	aiWorldListActions: 'ai-world:list-actions',
	resultsGet: 'results:get',
	sponsorGetDashboard: 'sponsor:get-dashboard',
	sponsorAcceptOffer: 'sponsor:accept-offer'
});

export type IpcErrorCode =
	| 'SAVE_NOT_FOUND'
	| 'SAVE_LOCKED'
	| 'MIGRATION_FAILED'
	| 'INVALID_COMMAND'
	| 'SESSION_NOT_LIVE'
	| 'CHECKPOINT_FAILED'
	| 'FINALIZATION_FAILED'
	| 'INSUFFICIENT_FUNDS'
	| 'CONFLICT';

export interface SaveSummary {
	saveId: string;
	displayName: string;
	schemaVersion: number;
	gameVersion: string;
	contentDataVersion: string;
	createdAt: string;
	lastOpenedAt: string | null;
}

export interface SaveCreateRequest {
	displayName: string;
	worldDate: string;
	managerFirstName: string;
	managerLastName: string;
	managerNationalityId: string;
	managerBackstoryCode: string;
	managerAvatarPayload: string;
	playerTeamId: string;
	seed?: string;
}

export interface SaveIdRequest {
	saveId: string;
}

export interface SaveBackupResult {
	saveId: string;
	backupPath: string;
}

export interface CareerIdentityDto {
	saveId: string;
	displayName: string;
	worldDate: string;
	managerFirstName: string | null;
	managerLastName: string | null;
	managerNationalityId: string | null;
	managerBackstoryCode: string | null;
	managerAvatarPayload: string | null;
	managerAvatarSchemaVersion: string | null;
	team: {
		id: string;
		name: string;
		shortName: string;
		nationalityDisplayName: string | null;
	} | null;
}

export interface CurrentWeekendDto {
	weekendSessionId: string;
	status: string;
	eventName: string;
	roundNumber: number;
	startDate: string;
	championship: {
		code: string;
		displayName: string;
		shortCode: string;
	};
	circuit: {
		name: string;
		shortName: string;
	};
	session: {
		id: string;
		kind: string;
		sequence: number;
		scheduledStart: string;
		scheduledLaps: number | null;
		scheduledMinutes: number | null;
	};
	conditions: {
		tempC: number | null;
		rainNow: number | null;
		rainInMinutes: number | null;
		trackWetness: number | null;
	};
}

export interface CalendarAdvanceRequest {
	expectedWorldDate?: string;
}

export interface FinanceAccountDto {
	id: string;
	teamSeasonEntryId: string;
	currencyCode: string;
	openingBalanceMinor: number;
	currentBalanceMinor: number;
	budgetCapMinor: number;
	createdAt: string;
	updatedAt: string;
}

export interface FinanceTransactionDto {
	id: string;
	accountId: string;
	worldDate: string;
	postedAt: string;
	transactionType: string;
	category: string;
	amountMinor: number;
	currencyCode: string;
	sourceType: string;
	sourceId: string | null;
	idempotencyKey: string;
	description: string;
	balanceAfterMinor: number;
}

export interface FinanceSummaryDto {
	account: FinanceAccountDto;
	transactions: FinanceTransactionDto[];
}

export interface InboxListRequest {
	status?: 'unread' | 'read' | 'deferred' | 'resolved' | 'archived';
	worldDate?: string;
	unresolvedOnly?: boolean;
}

export interface InboxActionRequest {
	messageId: string;
	actionType: 'read' | 'defer' | 'resolve' | 'archive';
	deferredUntilWorldDate?: string;
	note?: string;
	idempotencyKey?: string;
}

export interface CalendarAdvanceDto {
	transitionId: string;
	transitionKind: 'day';
	status: 'advanced' | 'blocked' | 'idempotent';
	fromWorldDate: string;
	toWorldDate: string;
	savedWorldDate: string;
	blockCode:
		| 'weekend_active'
		| 'weekend_start_required'
		| 'offscreen_race_failed'
		| 'season_transition_required'
		| 'inbox_decision_required'
		| null;
	blockReason: string | null;
	requiresWeekendStart: boolean;
	weekendSessionId: string | null;
	championshipEventId: string | null;
	championshipEventName: string | null;
	dailyMaintenance: {
		phase: 'maintenance';
		worldDate: string;
		driversRecovered: number;
		fatigueRecoveredPoints: number;
		injuriesResolved: number;
		contractsStarting: number;
		contractsEnding: number;
		seatsStarting: number;
		seatsEnding: number;
	} | null;
	dailyResearchDevelopment: {
		phase: 'research_development';
		worldDate: string;
		projectsAdvanced: number;
		stagesCompleted: number;
		projectsCompleted: number;
		manufacturedAssets: number;
		costAppliedMinor: number;
		completedProjectIds: string[];
	} | null;
	dailyFinance: {
		phase: 'finance';
		worldDate: string;
		transactionsPosted: number;
		incomeMinor: number;
		expenseMinor: number;
		completedSourceIds: string[];
	} | null;
	dailyAIWorld: {
		phase: 'ai_world';
		worldDate: string;
		teamsEvaluated: number;
		decisionsCreated: number;
		decisionTypes: Record<
			'protect_cash' | 'continue_development' | 'review_suppliers' | 'plan_development',
			number
		>;
	} | null;
	dailyInbox: {
		phase: 'inbox';
		worldDate: string;
		messagesCreated: number;
		severityCounts: Record<'informational' | 'actionable' | 'urgent' | 'blocking', number>;
	} | null;
	offscreenWeekendsResolved: number;
}

export interface InboxMessageDto {
	id: string;
	worldDate: string;
	category: 'world' | 'development' | 'finance';
	severity: 'informational' | 'actionable' | 'urgent' | 'blocking';
	status: 'unread' | 'read' | 'deferred' | 'resolved' | 'archived';
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
	actionType: 'read' | 'defer' | 'resolve' | 'archive';
	previousStatus: 'unread' | 'read' | 'deferred' | 'resolved' | 'archived';
	nextStatus: 'unread' | 'read' | 'deferred' | 'resolved' | 'archived';
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

export interface AIWorldActionListRequest {
	worldDate?: string;
}

export interface AIWorldActionDto {
	id: string;
	decisionId: string;
	teamSeasonEntryId: string;
	worldDate: string;
	actionType: 'protect_cash' | 'continue_development' | 'review_suppliers' | 'plan_development';
	status: 'applied' | 'deferred' | 'skipped';
	reasonCode: string;
	summary: string;
	developmentProjectId: string | null;
	createdAt: string;
}

export interface DevelopmentStagePlanDto {
	stage: 'concept_design' | 'cfd' | 'wind_tunnel' | 'manufacturing';
	durationDays: number;
	costMinor: number;
}

export interface DevelopmentStartRequest {
	teamSeasonEntryId: string;
	partCategory: string;
	projectKind: 'upgrade' | 'new_design';
	baseDesignVersionId?: string | null;
	performanceDeltas: Record<string, number>;
	reliabilityDelta: number;
	stagePlans: DevelopmentStagePlanDto[];
}

export interface DevelopmentProjectDto {
	id: string;
	teamId: string;
	teamSeasonEntryId: string;
	partCategory: string;
	projectKind: 'upgrade' | 'new_design';
	status: 'active' | 'completed' | 'cancelled';
	currentStage: 'concept_design' | 'cfd' | 'wind_tunnel' | 'manufacturing' | 'completed';
	baseDesignVersionId: string | null;
	totalCostMinor: number;
	spentCostMinor: number;
	startWorldDate: string;
	completedWorldDate: string | null;
	startedAt: string;
	updatedAt: string;
	completedAt: string | null;
	stages: Array<{
		id: string;
		stage: 'concept_design' | 'cfd' | 'wind_tunnel' | 'manufacturing';
		sequence: number;
		status: 'active' | 'pending' | 'completed';
		durationDays: number;
		costMinor: number;
		remainingDays: number;
		startedWorldDate: string | null;
		completedWorldDate: string | null;
		startedAt: string | null;
		completedAt: string | null;
	}>;
	result: {
		designVersionId: string;
		partInstanceId: string | null;
		chassisInstanceId: string | null;
		manufacturedAt: string;
	} | null;
}

export interface ResultsGetRequest {
	weekendSessionId: string;
}

export type SponsorCategory = 'title' | 'technical' | 'regional' | 'lifestyle';
export type SponsorSlotType = 'primary' | 'supporting';
export type SponsorOfferStatus = 'available' | 'accepted' | 'declined' | 'expired';
export type SponsorContractStatus = 'active' | 'expired';

export interface SponsorFitFactorDto {
	code: string;
	label: string;
	value: number;
	available: boolean;
}

export interface SponsorOfferDto {
	id: string;
	sponsor: {
		id: string;
		code: string;
		name: string;
		category: SponsorCategory;
		slotType: SponsorSlotType;
		priorityTags: string[];
	};
	status: SponsorOfferStatus;
	availableFrom: string;
	expiresAt: string;
	termSeasons: number;
	annualBasePaymentMinor: number;
	signingBonusMinor: number;
	performanceBonusMinor: number;
	target: Record<string, unknown>;
	obligation: Record<string, unknown>;
	fit: {
		score: number;
		factors: SponsorFitFactorDto[];
		deferredFactors: string[];
	};
}

export interface SponsorContractDto {
	id: string;
	offerId: string;
	sponsor: {
		id: string;
		code: string;
		name: string;
		category: SponsorCategory;
		slotType: SponsorSlotType;
	};
	status: SponsorContractStatus;
	startDate: string;
	endDate: string;
	renewalWindowStartDate: string;
	termSeasons: number;
	annualBasePaymentMinor: number;
	signingBonusMinor: number;
	performanceBonusMinor: number;
	target: Record<string, unknown>;
	obligation: Record<string, unknown>;
	fitScore: number;
	signedAt: string;
}

export interface SponsorSlotDto {
	category: SponsorCategory;
	primaryAvailable: boolean;
	supportingSlotsRemaining: number;
}

export interface SponsorDashboardDto {
	worldDate: string;
	teamSeasonEntryId: string;
	team: {
		id: string;
		name: string;
		shortName: string;
	};
	championship: {
		code: string;
		name: string;
		seasonYear: number;
	};
	currentSponsors: SponsorContractDto[];
	offers: SponsorOfferDto[];
	slots: SponsorSlotDto[];
}

export interface SponsorAcceptOfferRequest {
	offerId: string;
}

export interface SponsorAcceptOfferResult {
	contract: SponsorContractDto;
	dashboard: SponsorDashboardDto;
	idempotent: boolean;
}

export type SessionStrategyCommand = StrategyCommand;

export interface SessionResultDto {
	sessionResultId: string;
	sessionEntryId: string;
	driver: {
		id: string;
		name: string;
	};
	team: {
		id: string;
		name: string;
		shortName: string;
	};
	position: number | null;
	status: string;
	lapsCompleted: number;
	bestLapMs: number | null;
	totalTimeMs: number | null;
	gapToLeaderMs: number | null;
	lapsBehind: number;
	pitStops: number;
	lapsLed: number;
	positionsGained: number;
	points: number;
}

export interface SessionStateDto {
	status: 'idle' | 'live' | 'paused' | 'finished' | 'closed';
	checkpointSeq: number;
}

export interface SessionFinalizationDto {
	status: SessionStateDto['status'];
	finalStateHash: string;
}

export interface SessionUpdate {
	state: SessionStateDto;
}

export interface IpcErrorShape {
	code: IpcErrorCode;
	message: string;
}
