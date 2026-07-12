import { app, BrowserWindow } from 'electron';
import serve from 'electron-serve';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerDbIpc } from './db/ipc.js';
import { shutdownDb } from './db/migrate.js';

const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5180';
/** Prefer Vite when a dev server URL is set — ELECTRON_DEV alone can fail under WSL/cross-env. */
const isDev =
	Boolean(process.env.VITE_DEV_SERVER_URL) ||
	(!app.isPackaged && process.env.ELECTRON_DEV === '1');
const loadURL = serve({ directory: 'build' });
const __dirname = fileURLToPath(new URL('.', import.meta.url));

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
		console.log(`[electron] loading Vite dev UI: ${DEV_URL}`);
		await mainWindow.loadURL(DEV_URL);
		mainWindow.webContents.openDevTools({ mode: 'detach' });
	} else {
		console.log('[electron] loading packaged build/ UI');
		await loadURL(mainWindow);
	}
}

app.whenReady().then(async () => {
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
