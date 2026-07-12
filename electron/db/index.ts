import { join } from 'node:path';
import { app } from 'electron';
import {
	closeDb,
	getActiveDbPath,
	getDb,
	resetActiveDbFiles,
	setActiveDbPath,
	type AppDb
} from './connection.js';

export {
	closeDb,
	getActiveDbPath,
	getDb,
	setActiveDbPath,
	type AppDb
};

/** Root folder for multi-career saves. */
export function careersRoot(): string {
	return join(app.getPath('userData'), 'careers');
}

/** @deprecated Prefer getActiveDbPath — kept for call sites expecting a path helper. */
export function getDbPath(): string {
	const active = getActiveDbPath();
	if (!active) {
		throw new Error('No active career database path.');
	}
	return active;
}

export async function resetDb(): Promise<void> {
	await resetActiveDbFiles();
}
