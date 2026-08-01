import { app, BrowserWindow } from 'electron';
import serve from 'electron-serve';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerDbIpc } from './db/ipc.js';
import { runMigrations, shutdownDb } from './db/migrate.js';

const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5180';
const hasBuildUi = existsSync(join(process.cwd(), 'build', 'index.html'));
/** Unpackaged + no build/ → Vite. Env flags also force Vite (WSL often drops shell env). */
const isDev =
	Boolean(process.env.VITE_DEV_SERVER_URL) ||
	process.env.ELECTRON_DEV === '1' ||
	(!app.isPackaged && !hasBuildUi);
const loadURL = serve({ directory: 'build' });
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const isWsl = process.platform === 'linux' && Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);

if (isWsl) app.disableHardwareAcceleration();

async function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1600,
		height: 1000,
		fullscreen: false,
		autoHideMenuBar: true,
		backgroundColor: '#0E0E0E',
		show: false,
		webPreferences: {
			preload: join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.maximize();
		mainWindow.show();
		mainWindow.focus();
		if (isWsl) {
			mainWindow.webContents.invalidate();
			setTimeout(() => mainWindow.webContents.invalidate(), 1000);
		}
	});

	mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
		console.error(`[electron] failed to load (${code}) ${url}: ${desc}`);
	});

	if (isDev) {
		console.log(`[electron] loading Vite dev UI: ${DEV_URL}`);
		await mainWindow.loadURL(DEV_URL);
	} else {
		console.log('[electron] loading packaged build/ UI');
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
