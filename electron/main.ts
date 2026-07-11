import { app, BrowserWindow } from 'electron';
import serve from 'electron-serve';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerDbIpc } from './db/ipc.js';
import { runMigrations, shutdownDb } from './db/migrate.js';

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === '1';
const loadURL = serve({ directory: 'build' });
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5180';

async function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			preload: join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});

	if (isDev) {
		await mainWindow.loadURL(DEV_URL);
		mainWindow.webContents.openDevTools({ mode: 'detach' });
	} else {
		await loadURL(mainWindow);
	}
}

app.whenReady().then(async () => {
	await runMigrations();
	registerDbIpc();
	await createWindow();

	app.on('activate', async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('before-quit', async () => {
	await shutdownDb();
});
