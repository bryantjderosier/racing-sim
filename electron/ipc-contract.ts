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
	calendarAdvanceDay: 'calendar:advance-day',
	resultsGet: 'results:get'
});

export type IpcErrorCode =
	| 'SAVE_NOT_FOUND'
	| 'SAVE_LOCKED'
	| 'MIGRATION_FAILED'
	| 'INVALID_COMMAND'
	| 'SESSION_NOT_LIVE'
	| 'CHECKPOINT_FAILED'
	| 'FINALIZATION_FAILED'
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

export interface CalendarAdvanceDto {
	transitionId: string;
	transitionKind: 'day';
	status: 'advanced' | 'blocked' | 'idempotent';
	fromWorldDate: string;
	toWorldDate: string;
	savedWorldDate: string;
	blockCode: 'weekend_active' | 'weekend_start_required' | 'season_transition_required' | null;
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
}

export interface ResultsGetRequest {
	weekendSessionId: string;
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
