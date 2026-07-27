import { ipcMain } from 'electron';

export function registerDbIpc() {
	ipcMain.handle('app:ping', () => 'pong');
}
