import { contextBridge, ipcRenderer } from 'electron';
import {
	IPC_CHANNELS,
	type CareerIdentityDto,
	type CurrentWeekendDto,
	type ResultsGetRequest,
	type SaveBackupResult,
	type SaveCreateRequest,
	type SaveIdRequest,
	type SaveSummary,
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
	results: {
		get: (request: ResultsGetRequest): Promise<SessionResultDto[]> =>
			ipcRenderer.invoke(IPC_CHANNELS.resultsGet, request)
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
