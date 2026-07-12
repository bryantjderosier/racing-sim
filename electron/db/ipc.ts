import { ipcMain } from 'electron';
import { desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { teams, type Team } from './schema.js';

const DIV1_COST_CAP = 140_000_000;
const STARTER_CASH = 50_000_000;

export function registerDbIpc() {
	ipcMain.handle('app:ping', () => 'pong');

	ipcMain.handle('db:getTeams', async (): Promise<Team[]> => {
		const db = await getDb();
		return db.select().from(teams).orderBy(desc(teams.id));
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
				liquidCash: STARTER_CASH,
				costCapLimit: DIV1_COST_CAP,
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
}
