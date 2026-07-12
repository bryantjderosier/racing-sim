import { ipcMain } from 'electron';
import { desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { getCareerStore, setCareerStoreForTests } from './career-context.js';
import { teams, type Team } from './schema.js';
import type { CareerSummary, CreateCareerOptions } from '../sim/career/store.js';
import {
	bootstrapCareer,
	listNewCareerTeamOptions,
	type BootstrapCareerOptions,
	type BootstrapCareerResult
} from '../sim/career/bootstrap.js';
import type { NewCareerTeamOption } from '../sim/seed/grid-fixture.js';
import { clearWeekend } from '../sim/game/index.js';
import { registerGameIpc } from './game-ipc.js';

export { getCareerStore, setCareerStoreForTests };

export function registerDbIpc() {
	ipcMain.handle('app:ping', () => 'pong');

	ipcMain.handle('career:listTeamOptions', async (): Promise<NewCareerTeamOption[]> => {
		return listNewCareerTeamOptions();
	});

	ipcMain.handle(
		'career:bootstrap',
		async (_event, opts: BootstrapCareerOptions): Promise<BootstrapCareerResult> => {
			return bootstrapCareer(getCareerStore(), opts);
		}
	);

	ipcMain.handle('career:list', async (): Promise<CareerSummary[]> => {
		return getCareerStore().listCareers();
	});

	ipcMain.handle(
		'career:create',
		async (_event, opts: CreateCareerOptions): Promise<CareerSummary> => {
			return getCareerStore().createCareer(opts);
		}
	);

	ipcMain.handle('career:open', async (_event, id: string): Promise<CareerSummary> => {
		return getCareerStore().openCareer(id);
	});

	ipcMain.handle('career:close', async (): Promise<void> => {
		clearWeekend();
		return getCareerStore().closeCareer();
	});

	ipcMain.handle('career:delete', async (_event, id: string): Promise<void> => {
		return getCareerStore().deleteCareer(id);
	});

	ipcMain.handle(
		'career:setPlayerTeam',
		async (_event, teamId: number): Promise<CareerSummary> => {
			return getCareerStore().setPlayerTeam(teamId);
		}
	);

	ipcMain.handle('career:getSummary', async (): Promise<CareerSummary | null> => {
		return getCareerStore().getCareerSummary();
	});

	ipcMain.handle('db:getTeams', async (): Promise<Team[]> => {
		try {
			const db = await getDb();
			return db.select().from(teams).orderBy(desc(teams.id));
		} catch {
			return [];
		}
	});

	ipcMain.handle('db:createTeam', async (_event, name: string): Promise<Team> => {
		const db = await getDb();
		const trimmed = name.trim();
		const shortName = trimmed.slice(0, 3).toUpperCase().padEnd(3, 'X');
		const [{ nextId }] = await db
			.select({ nextId: sql<number>`coalesce(max(${teams.id}), 0) + 1` })
			.from(teams);

		const [team] = await db
			.insert(teams)
			.values({
				id: nextId,
				name: trimmed,
				shortName,
				nationalityCode: 'GBR',
				primaryColor: '#FFFFFF',
				secondaryColor: '#000000',
				status: 'PLAYER_MANAGED',
				liquidCash: 50_000_000,
				costCapLimit: 140_000_000,
				costCapSpent: 0,
				division: 1,
				reputation: 50,
				rdPivotCurrent: 1,
				wtHoursRemaining: 0,
				cfdHoursRemaining: 0
			})
			.returning();

		return team;
	});

	registerGameIpc();
}
