import { contextBridge, ipcRenderer } from 'electron';
import type { Team } from './db/schema.js';
import type { NewGameOptions } from './world/generate.js';
import type { TeamSeed } from './world/data.js';
import type { AdvanceResult } from './game/advance.js';

export type GameClock = {
	seasonYear: number;
	week: number;
	day: number;
	phase: string;
	playerDisplayName: string;
	playerTeamId: number | null;
	playerStatus: string;
};

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
	getTeams: (): Promise<Team[]> => ipcRenderer.invoke('db:getTeams'),
	listSeedTeams: (): Promise<TeamSeed[]> => ipcRenderer.invoke('game:listSeedTeams'),
	newGame: (options: NewGameOptions): Promise<{ ok: true }> => ipcRenderer.invoke('game:newGame', options),
	getClock: (): Promise<GameClock> => ipcRenderer.invoke('game:getClock'),
	advance: (options?: { maxDays?: number; singleDay?: boolean }): Promise<AdvanceResult> =>
		ipcRenderer.invoke('game:advance', options)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
