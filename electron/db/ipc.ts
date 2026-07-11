import { ipcMain } from 'electron';
import { desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { teams, type Team } from './schema.js';

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
		const [{ nextId }] = await db.select({ nextId: sql<number>`coalesce(max(${teams.id}), 0) + 1` }).from(teams);

		const [team] = await db
			.insert(teams)
			.values({
				id: nextId,
				name: trimmed,
				shortName,
				nationality: 'GBR',
				primaryColor: '#FFFFFF',
				secondaryColor: '#000000',
				status: 'PLAYER_MANAGED',
				tierId: 1,
				windTunnelHours: 40,
				cfdCapacityFlops: 0n,
				hqLevel: 1
			})
			.returning();

		return team;
	});
}
