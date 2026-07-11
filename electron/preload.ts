import { contextBridge, ipcRenderer } from 'electron';
import type { Team } from './db/schema.js';

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
	getTeams: (): Promise<Team[]> => ipcRenderer.invoke('db:getTeams'),
	createTeam: (name: string): Promise<Team> => ipcRenderer.invoke('db:createTeam', name)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
