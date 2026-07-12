import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { migrate } from '@duckdbfan/drizzle-duckdb';
import {
	closeDb,
	getActiveDbPath,
	getDb,
	setActiveDbPath,
	type AppDb
} from '../../db/connection.js';
import { teams, worldClock } from '../../db/schema.js';
import { seedFullGrid } from '../seed/grid-fixture.js';
import { ensureClock } from '../world/tick.js';

export type CareerMeta = {
	id: string;
	displayName: string;
	createdAt: string;
	lastOpenedAt: string;
	playerTeamId: number;
};

export type CareerSummary = {
	id: string;
	displayName: string;
	createdAt: string;
	lastOpenedAt: string;
	playerTeamId: number;
	playerTeamName: string | null;
	seasonYear: number | null;
	week: number | null;
	day: number | null;
	/** True when this career is the active open DB. */
	active: boolean;
};

export type CreateCareerOptions = {
	displayName: string;
	/** Defaults to first seeded team (id 1). */
	playerTeamId?: number;
};

export type CareerStore = {
	rootDir: string;
	listCareers: () => Promise<CareerSummary[]>;
	createCareer: (opts: CreateCareerOptions) => Promise<CareerSummary>;
	openCareer: (id: string) => Promise<CareerSummary>;
	closeCareer: () => Promise<void>;
	deleteCareer: (id: string) => Promise<void>;
	setPlayerTeam: (teamId: number) => Promise<CareerSummary>;
	getCareerSummary: () => Promise<CareerSummary | null>;
	getActiveCareerId: () => string | null;
};

function careerDir(rootDir: string, id: string): string {
	return join(rootDir, id);
}

function dbPathFor(rootDir: string, id: string): string {
	return join(careerDir(rootDir, id), 'career.duckdb');
}

function metaPathFor(rootDir: string, id: string): string {
	return join(careerDir(rootDir, id), 'meta.json');
}

async function readMeta(rootDir: string, id: string): Promise<CareerMeta | null> {
	try {
		const raw = await readFile(metaPathFor(rootDir, id), 'utf8');
		return JSON.parse(raw) as CareerMeta;
	} catch {
		return null;
	}
}

async function writeMeta(rootDir: string, meta: CareerMeta): Promise<void> {
	await writeFile(metaPathFor(rootDir, meta.id), JSON.stringify(meta, null, 2), 'utf8');
}

async function migrateActive(migrationsFolder: string): Promise<void> {
	const db = await getDb();
	await migrate(db, { migrationsFolder });
}

async function loadPlayerTeam(db: AppDb, playerTeamId: number) {
	const [row] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	return row ?? null;
}

async function applyPlayerTeam(db: AppDb, playerTeamId: number): Promise<void> {
	const [target] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!target) throw new Error(`Team ${playerTeamId} not found`);

	await db
		.update(teams)
		.set({ status: 'UNMANAGED_AI' })
		.where(eq(teams.status, 'PLAYER_MANAGED'));
	await db.update(teams).set({ status: 'PLAYER_MANAGED' }).where(eq(teams.id, playerTeamId));
}

async function buildSummary(
	rootDir: string,
	meta: CareerMeta,
	activeId: string | null,
	db: AppDb | null
): Promise<CareerSummary> {
	let seasonYear: number | null = null;
	let week: number | null = null;
	let day: number | null = null;
	let playerTeamName: string | null = null;

	if (db && activeId === meta.id) {
		const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
		if (clock) {
			seasonYear = clock.seasonYear;
			week = clock.week;
			day = clock.day;
		}
		const team = await loadPlayerTeam(db, meta.playerTeamId);
		playerTeamName = team?.name ?? null;
	}

	return {
		id: meta.id,
		displayName: meta.displayName,
		createdAt: meta.createdAt,
		lastOpenedAt: meta.lastOpenedAt,
		playerTeamId: meta.playerTeamId,
		playerTeamName,
		seasonYear,
		week,
		day,
		active: activeId === meta.id
	};
}

/**
 * Multi-career save store. One DuckDB file per career under rootDir/<id>/.
 * Uses the shared connection singleton (Electron + Node harness).
 */
export function createCareerStore(options: {
	rootDir: string;
	migrationsFolder: string;
}): CareerStore {
	const { rootDir, migrationsFolder } = options;
	let activeCareerId: string | null = null;

	async function ensureRoot(): Promise<void> {
		await mkdir(rootDir, { recursive: true });
	}

	async function switchTo(id: string): Promise<AppDb> {
		const path = dbPathFor(rootDir, id);
		await closeDb();
		setActiveDbPath(path);
		activeCareerId = id;
		await migrateActive(migrationsFolder);
		return getDb();
	}

	async function listCareers(): Promise<CareerSummary[]> {
		await ensureRoot();
		let entries: string[] = [];
		try {
			entries = await readdir(rootDir);
		} catch {
			return [];
		}

		const summaries: CareerSummary[] = [];
		const db = activeCareerId && getActiveDbPath() ? await getDb().catch(() => null) : null;

		for (const id of entries) {
			const meta = await readMeta(rootDir, id);
			if (!meta) continue;
			summaries.push(await buildSummary(rootDir, meta, activeCareerId, db));
		}

		summaries.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
		return summaries;
	}

	async function createCareer(opts: CreateCareerOptions): Promise<CareerSummary> {
		const displayName = opts.displayName.trim();
		if (!displayName) throw new Error('Career name is required');

		await ensureRoot();
		const id = randomUUID();
		const dir = careerDir(rootDir, id);
		await mkdir(dir, { recursive: true });

		const db = await switchTo(id);
		await seedFullGrid(db);
		await ensureClock(db);

		const playerTeamId = opts.playerTeamId ?? 1;
		await applyPlayerTeam(db, playerTeamId);

		const now = new Date().toISOString();
		const meta: CareerMeta = {
			id,
			displayName,
			createdAt: now,
			lastOpenedAt: now,
			playerTeamId
		};
		await writeMeta(rootDir, meta);
		return buildSummary(rootDir, meta, id, db);
	}

	async function openCareer(id: string): Promise<CareerSummary> {
		const meta = await readMeta(rootDir, id);
		if (!meta) throw new Error(`Career ${id} not found`);

		const db = await switchTo(id);
		await ensureClock(db);

		meta.lastOpenedAt = new Date().toISOString();
		await writeMeta(rootDir, meta);

		// Ensure meta player team is marked managed
		await applyPlayerTeam(db, meta.playerTeamId);

		return buildSummary(rootDir, meta, id, db);
	}

	async function closeCareer(): Promise<void> {
		await closeDb();
		setActiveDbPath(null);
		activeCareerId = null;
	}

	async function deleteCareer(id: string): Promise<void> {
		if (activeCareerId === id) {
			throw new Error('Cannot delete the active career. Close it first.');
		}
		const meta = await readMeta(rootDir, id);
		if (!meta) throw new Error(`Career ${id} not found`);
		await rm(careerDir(rootDir, id), { recursive: true, force: true });
	}

	async function setPlayerTeam(teamId: number): Promise<CareerSummary> {
		if (!activeCareerId) throw new Error('No career open');
		const meta = await readMeta(rootDir, activeCareerId);
		if (!meta) throw new Error('Active career meta missing');

		const db = await getDb();
		await applyPlayerTeam(db, teamId);
		meta.playerTeamId = teamId;
		meta.lastOpenedAt = new Date().toISOString();
		await writeMeta(rootDir, meta);
		return buildSummary(rootDir, meta, activeCareerId, db);
	}

	async function getCareerSummary(): Promise<CareerSummary | null> {
		if (!activeCareerId) return null;
		const meta = await readMeta(rootDir, activeCareerId);
		if (!meta) return null;
		const db = await getDb();
		return buildSummary(rootDir, meta, activeCareerId, db);
	}

	return {
		rootDir,
		listCareers,
		createCareer,
		openCareer,
		closeCareer,
		deleteCareer,
		setPlayerTeam,
		getCareerSummary,
		getActiveCareerId: () => activeCareerId
	};
}
