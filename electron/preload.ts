import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
	quit: (): Promise<void> => ipcRenderer.invoke('app:quit')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
