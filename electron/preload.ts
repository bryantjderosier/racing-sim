import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke('app:ping')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
