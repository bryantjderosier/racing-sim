import { contextBridge, ipcRenderer } from 'electron';
import {
	IPC_CHANNELS,
	type AIWorldActionDto,
	type AIWorldActionListRequest,
	type CalendarAdvanceDto,
	type CalendarAdvanceRequest,
	type CareerIdentityDto,
	type CurrentWeekendDto,
	type DevelopmentProjectDto,
	type DevelopmentStartRequest,
	type FinanceSummaryDto,
	type InboxListRequest,
	type InboxMessageDto,
	type InboxActionDto,
	type InboxActionRequest,
	type InboxActionResult,
	type ResultsGetRequest,
	type SaveBackupResult,
	type SaveCreateRequest,
	type SaveIdRequest,
	type SaveSummary,
	type SponsorAcceptOfferRequest,
	type SponsorAcceptOfferResult,
	type SponsorDashboardDto,
	type SessionFinalizationDto,
	type SessionResultDto,
	type SessionStrategyCommand,
	type SessionStateDto,
	type SessionUpdate
} from './ipc-contract.js';

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.appPing),
	quit: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.appQuit),
	save: {
		list: (): Promise<SaveSummary[]> => ipcRenderer.invoke(IPC_CHANNELS.saveList),
		create: (request: SaveCreateRequest): Promise<SaveSummary> =>
			ipcRenderer.invoke(IPC_CHANNELS.saveCreate, request),
		open: (request: SaveIdRequest): Promise<SaveSummary> =>
			ipcRenderer.invoke(IPC_CHANNELS.saveOpen, request),
		close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.saveClose),
		backup: (request: SaveIdRequest): Promise<SaveBackupResult> =>
			ipcRenderer.invoke(IPC_CHANNELS.saveBackup, request),
		delete: (request: SaveIdRequest): Promise<void> =>
			ipcRenderer.invoke(IPC_CHANNELS.saveDelete, request),
		getIdentity: (): Promise<CareerIdentityDto> => ipcRenderer.invoke(IPC_CHANNELS.saveGetIdentity)
	},
	weekend: {
		getCurrent: (): Promise<CurrentWeekendDto | null> =>
			ipcRenderer.invoke(IPC_CHANNELS.weekendGetCurrent)
	},
	finance: {
		getSummary: (): Promise<FinanceSummaryDto> => ipcRenderer.invoke(IPC_CHANNELS.financeGetSummary)
	},
	calendar: {
		advanceDay: (request: CalendarAdvanceRequest = {}): Promise<CalendarAdvanceDto> =>
			ipcRenderer.invoke(IPC_CHANNELS.calendarAdvanceDay, request)
	},
	development: {
		start: (request: DevelopmentStartRequest): Promise<DevelopmentProjectDto> =>
			ipcRenderer.invoke(IPC_CHANNELS.developmentStart, request),
		list: (): Promise<DevelopmentProjectDto[]> => ipcRenderer.invoke(IPC_CHANNELS.developmentList)
	},
	inbox: {
		list: (request: InboxListRequest = {}): Promise<InboxMessageDto[]> =>
			ipcRenderer.invoke(IPC_CHANNELS.inboxList, request),
		action: (request: InboxActionRequest): Promise<InboxActionResult> =>
			ipcRenderer.invoke(IPC_CHANNELS.inboxAction, request),
		listActions: (messageId?: string): Promise<InboxActionDto[]> =>
			ipcRenderer.invoke(IPC_CHANNELS.inboxListActions, { messageId })
	},
	aiWorld: {
		listActions: (request: AIWorldActionListRequest = {}): Promise<AIWorldActionDto[]> =>
			ipcRenderer.invoke(IPC_CHANNELS.aiWorldListActions, request)
	},
	results: {
		get: (request: ResultsGetRequest): Promise<SessionResultDto[]> =>
			ipcRenderer.invoke(IPC_CHANNELS.resultsGet, request)
	},
	sponsors: {
		getDashboard: (): Promise<SponsorDashboardDto> =>
			ipcRenderer.invoke(IPC_CHANNELS.sponsorGetDashboard),
		acceptOffer: (request: SponsorAcceptOfferRequest): Promise<SponsorAcceptOfferResult> =>
			ipcRenderer.invoke(IPC_CHANNELS.sponsorAcceptOffer, request)
	},
	session: {
		getState: (): Promise<SessionStateDto> => ipcRenderer.invoke(IPC_CHANNELS.sessionGetState),
		start: (): Promise<SessionStateDto> => ipcRenderer.invoke(IPC_CHANNELS.sessionStart),
		pause: (): Promise<SessionStateDto> => ipcRenderer.invoke(IPC_CHANNELS.sessionPause),
		resume: (): Promise<SessionStateDto> => ipcRenderer.invoke(IPC_CHANNELS.sessionResume),
		issueStrategy: (command: SessionStrategyCommand): Promise<SessionStateDto> =>
			ipcRenderer.invoke(IPC_CHANNELS.sessionIssueStrategy, command),
		checkpoint: (): Promise<SessionStateDto> => ipcRenderer.invoke(IPC_CHANNELS.sessionCheckpoint),
		finalize: (): Promise<SessionFinalizationDto> =>
			ipcRenderer.invoke(IPC_CHANNELS.sessionFinalize),
		subscribe: (listener: (update: SessionUpdate) => void): (() => void) => {
			const handler = (_event: Electron.IpcRendererEvent, update: SessionUpdate) =>
				listener(update);
			ipcRenderer.on(IPC_CHANNELS.sessionUpdate, handler);
			return () => ipcRenderer.removeListener(IPC_CHANNELS.sessionUpdate, handler);
		}
	}
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
