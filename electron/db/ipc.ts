import { app, BrowserWindow, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Xoshiro128ss } from '../../src/lib/sim/core/rng.js';
import {
	IPC_CHANNELS,
	type IpcErrorCode,
	type CareerIdentityDto,
	type SaveBackupResult,
	type SaveCreateRequest,
	type SaveIdRequest,
	type SaveSummary,
	type ResultsGetRequest,
	type SessionStrategyCommand,
	type SessionFinalizationDto,
	type SessionStateDto,
	type SessionUpdate
} from '../ipc-contract.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	SAVE_SCHEMA_VERSION,
	openSaveDatabase,
	type SaveDatabase
} from './save-service.js';
import { SaveCatalog, type SaveCatalogEntry } from './save-catalog.js';
import { getCareerIdentity, getCurrentWeekend, getSessionResults } from './read-models.js';
import { SessionOrchestrator, SessionLifecycleError } from './session-orchestrator.js';
import { SessionFactory } from './session-factory.js';

let registered = false;
let activeSave: { entry: SaveCatalogEntry; database: SaveDatabase } | null = null;
let activeSession: SessionOrchestrator | null = null;
let configuredSessionFactory: SessionFactory | null = null;

function catalog() {
	return new SaveCatalog(join(app.getPath('userData'), 'save-catalog.json'));
}

function saveDirectory() {
	return join(app.getPath('userData'), 'saves');
}

function migrationsFolder() {
	return join(app.getAppPath(), 'drizzle');
}

function summary(entry: SaveCatalogEntry): SaveSummary {
	return {
		saveId: entry.saveId,
		displayName: entry.displayName,
		schemaVersion: entry.schemaVersion,
		gameVersion: entry.gameVersion,
		contentDataVersion: entry.contentDataVersion,
		createdAt: entry.createdAt,
		lastOpenedAt: entry.lastOpenedAt
	};
}

function errorCode(error: unknown): IpcErrorCode {
	const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
	if (
		code === 'SAVE_NOT_FOUND' ||
		code === 'SAVE_LOCKED' ||
		code === 'MIGRATION_FAILED' ||
		code === 'INVALID_COMMAND' ||
		code === 'SESSION_NOT_LIVE' ||
		code === 'CHECKPOINT_FAILED' ||
		code === 'FINALIZATION_FAILED' ||
		code === 'CONFLICT'
	) {
		return code;
	}
	if (code === 'SAVE_ALREADY_EXISTS' || code === 'CONTENT_VERSION_MISMATCH') return 'CONFLICT';
	return 'MIGRATION_FAILED';
}

function ipcError(error: unknown) {
	const wrapped = new Error(error instanceof Error ? error.message : String(error));
	Object.defineProperty(wrapped, 'code', {
		value: errorCode(error),
		enumerable: true
	});
	return wrapped;
}

async function invoke<T>(handler: () => Promise<T> | T): Promise<T> {
	try {
		return await handler();
	} catch (error) {
		throw ipcError(error);
	}
}

function requireRequestValue(value: unknown, label: string): asserts value is string {
	if (typeof value !== 'string' || !value.trim())
		throw Object.assign(new Error(`${label} is required.`), { code: 'INVALID_COMMAND' });
}

function requireActiveSession() {
	if (!activeSession) throw new SessionLifecycleError('No active session is attached to the save.');
	return activeSession;
}

function requireActiveDatabase() {
	if (!activeSave) throw Object.assign(new Error('No save is open.'), { code: 'SAVE_NOT_FOUND' });
	return activeSave.database.db;
}

function sessionState(): SessionStateDto {
	const session = requireActiveSession();
	return { status: session.status, checkpointSeq: session.checkpointSequence };
}

function broadcastSessionUpdate() {
	if (!activeSession) return;
	const update: SessionUpdate = { state: sessionState() };
	for (const window of BrowserWindow.getAllWindows()) {
		window.webContents.send(IPC_CHANNELS.sessionUpdate, update);
	}
}

async function closeActiveSave() {
	if (activeSession) {
		await activeSession.close();
		activeSession = null;
	}
	if (activeSave) {
		closeSaveDatabase(activeSave.database);
		activeSave = null;
	}
}

export function attachSessionOrchestrator(session: SessionOrchestrator) {
	if (activeSession) throw new Error('A session is already attached.');
	activeSession = session;
}

export function detachSessionOrchestrator() {
	activeSession = null;
}

export function registerDbIpc(options: { sessionFactory?: SessionFactory } = {}) {
	if (registered) return;
	registered = true;
	configuredSessionFactory = options.sessionFactory ?? null;

	ipcMain.handle(IPC_CHANNELS.appPing, () => 'pong');
	ipcMain.handle(IPC_CHANNELS.appQuit, () => {
		app.quit();
	});

	ipcMain.handle(IPC_CHANNELS.saveList, () =>
		invoke(async () => (await catalog().list()).map(summary))
	);
	ipcMain.handle(IPC_CHANNELS.saveCreate, (_event, request: SaveCreateRequest) =>
		invoke(async () => {
			requireRequestValue(request?.displayName, 'displayName');
			requireRequestValue(request?.worldDate, 'worldDate');
			requireRequestValue(request?.managerFirstName, 'managerFirstName');
			requireRequestValue(request?.managerLastName, 'managerLastName');
			requireRequestValue(request?.managerNationalityId, 'managerNationalityId');
			requireRequestValue(request?.managerBackstoryCode, 'managerBackstoryCode');
			requireRequestValue(request?.managerAvatarPayload, 'managerAvatarPayload');
			requireRequestValue(request?.playerTeamId, 'playerTeamId');
			const targetPath = join(saveDirectory(), `${randomUUID()}.sqlite`);
			const seed =
				typeof request.seed === 'string' && request.seed.trim() ? request.seed.trim() : targetPath;
			const rngState = Buffer.from(JSON.stringify(new Xoshiro128ss(seed).serialize()), 'utf8');
			const created = await createSaveDatabase({
				targetPath,
				displayName: request.displayName.trim(),
				gameVersion: app.getVersion(),
				worldDate: request.worldDate.trim(),
				managerFirstName: request.managerFirstName.trim(),
				managerLastName: request.managerLastName.trim(),
				managerNationalityId: request.managerNationalityId.trim(),
				managerBackstoryCode: request.managerBackstoryCode.trim(),
				managerAvatarPayload: request.managerAvatarPayload.trim(),
				playerTeamId: request.playerTeamId.trim(),
				rngAlgorithm: 'xoshiro128ss',
				rngState,
				migrationsFolder: migrationsFolder()
			});
			const entry: SaveCatalogEntry = {
				saveId: created.saveId,
				path: created.path,
				displayName: request.displayName.trim(),
				schemaVersion: SAVE_SCHEMA_VERSION,
				gameVersion: app.getVersion(),
				contentDataVersion: created.contentDataVersion,
				createdAt: new Date().toISOString(),
				lastOpenedAt: null
			};
			try {
				await catalog().upsert(entry);
			} catch (error) {
				await rm(created.path, { force: true });
				throw error;
			}
			return summary(entry);
		})
	);
	ipcMain.handle(IPC_CHANNELS.saveOpen, (_event, request: SaveIdRequest) =>
		invoke(async () => {
			requireRequestValue(request?.saveId, 'saveId');
			if (activeSave && activeSave.entry.saveId !== request.saveId) {
				throw Object.assign(new Error('Another save is already open.'), { code: 'SAVE_LOCKED' });
			}
			const entry = await catalog().find(request.saveId);
			if (!entry) throw Object.assign(new Error('Save was not found.'), { code: 'SAVE_NOT_FOUND' });
			if (activeSave) return summary(activeSave.entry);
			const database = await openSaveDatabase({
				targetPath: entry.path,
				migrationsFolder: migrationsFolder()
			});
			const updated = { ...entry, lastOpenedAt: new Date().toISOString() };
			let session: SessionOrchestrator | null = null;
			try {
				session = configuredSessionFactory
					? await configuredSessionFactory.createOrResume(database.db)
					: null;
				await catalog().upsert(updated);
			} catch (error) {
				if (session) await session.close();
				closeSaveDatabase(database);
				throw error;
			}
			activeSave = { entry: updated, database };
			activeSession = session;
			return summary(updated);
		})
	);
	ipcMain.handle(IPC_CHANNELS.saveClose, () => invoke(async () => closeActiveSave()));
	ipcMain.handle(IPC_CHANNELS.saveBackup, (_event, request: SaveIdRequest) =>
		invoke(async (): Promise<SaveBackupResult> => {
			requireRequestValue(request?.saveId, 'saveId');
			const entry = await catalog().find(request.saveId);
			if (!entry) throw Object.assign(new Error('Save was not found.'), { code: 'SAVE_NOT_FOUND' });
			if (activeSave?.entry.saveId === entry.saveId) await closeActiveSave();
			const backupPath = `${entry.path}.backup-${Date.now()}.sqlite`;
			await mkdir(saveDirectory(), { recursive: true });
			await copyFile(entry.path, backupPath);
			return { saveId: entry.saveId, backupPath };
		})
	);
	ipcMain.handle(IPC_CHANNELS.saveDelete, (_event, request: SaveIdRequest) =>
		invoke(async () => {
			requireRequestValue(request?.saveId, 'saveId');
			const entry = await catalog().find(request.saveId);
			if (!entry) throw Object.assign(new Error('Save was not found.'), { code: 'SAVE_NOT_FOUND' });
			if (activeSave?.entry.saveId === entry.saveId) await closeActiveSave();
			for (const path of [entry.path, `${entry.path}-wal`, `${entry.path}-shm`]) {
				await rm(path, { force: true });
			}
			await catalog().remove(entry.saveId);
		})
	);
	ipcMain.handle(IPC_CHANNELS.saveGetIdentity, () =>
		invoke(async (): Promise<CareerIdentityDto> => {
			const identity = await getCareerIdentity(requireActiveDatabase());
			if (!identity) {
				throw Object.assign(new Error('Save identity was not found.'), { code: 'SAVE_NOT_FOUND' });
			}
			return identity;
		})
	);
	ipcMain.handle(IPC_CHANNELS.weekendGetCurrent, () =>
		invoke(async () => getCurrentWeekend(requireActiveDatabase()))
	);
	ipcMain.handle(IPC_CHANNELS.resultsGet, (_event, request: ResultsGetRequest) =>
		invoke(async () => {
			requireRequestValue(request?.weekendSessionId, 'weekendSessionId');
			return getSessionResults(requireActiveDatabase(), request.weekendSessionId);
		})
	);

	ipcMain.handle(IPC_CHANNELS.sessionGetState, () => invoke(() => sessionState()));
	ipcMain.handle(IPC_CHANNELS.sessionStart, () =>
		invoke(async () => {
			const session = requireActiveSession();
			await session.start();
			broadcastSessionUpdate();
			return sessionState();
		})
	);
	ipcMain.handle(IPC_CHANNELS.sessionPause, () =>
		invoke(async () => {
			const session = requireActiveSession();
			await session.pause();
			broadcastSessionUpdate();
			return sessionState();
		})
	);
	ipcMain.handle(IPC_CHANNELS.sessionResume, () =>
		invoke(async () => {
			const session = requireActiveSession();
			await session.resume();
			broadcastSessionUpdate();
			return sessionState();
		})
	);
	ipcMain.handle(IPC_CHANNELS.sessionCheckpoint, () =>
		invoke(async () => {
			const session = requireActiveSession();
			await session.manualCheckpoint();
			broadcastSessionUpdate();
			return sessionState();
		})
	);
	ipcMain.handle(IPC_CHANNELS.sessionFinalize, () =>
		invoke(async (): Promise<SessionFinalizationDto> => {
			const session = requireActiveSession();
			const result = await session.finalize();
			broadcastSessionUpdate();
			return { status: session.status, finalStateHash: result.finalStateHash };
		})
	);
	ipcMain.handle(IPC_CHANNELS.sessionIssueStrategy, (_event, command: SessionStrategyCommand) =>
		invoke(async () => {
			const accepted = await requireActiveSession().issueStrategy(command);
			if (!accepted) {
				throw Object.assign(new Error('Strategy command was rejected.'), {
					code: 'INVALID_COMMAND'
				});
			}
			broadcastSessionUpdate();
			return sessionState();
		})
	);
}
