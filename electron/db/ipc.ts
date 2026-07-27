import { app, ipcMain } from 'electron';

export function registerDbIpc() {
	ipcMain.handle('app:ping', () => 'pong');
	ipcMain.handle('app:quit', () => {
		app.quit();
	});
}

