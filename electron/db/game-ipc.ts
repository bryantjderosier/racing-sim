import { ipcMain } from 'electron';
import { getDb } from './index.js';
import { getCareerStore } from './career-context.js';
import {
	advanceWeek,
	beginWeekend,
	clearWeekend,
	commitInteractiveWeekend,
	confirmPlayerRdPivot,
	createPractice,
	createRace,
	ensureSeason,
	getCalendarView,
	getHqSnapshot,
	getNextRoundView,
	getStandingsView,
	raceCommand,
	raceFinish,
	raceStepLap,
	raceTelemetry,
	runPracticeStintView,
	runWeekendQualifying,
	tickHqWeek,
	tweakPracticeSetup,
	upgradePlayerFacility,
	type AdvanceWeekArgs,
	type EnsureSeasonArgs,
	type GetStandingsArgs,
	type RaceCommand,
	type RaceCreateArgs,
	type RaceStepArgs,
	type SetRdPivotArgs,
	type SetupVector,
	type StintDirective,
	type UpgradeFacilityArgs,
	type WeekendBeginArgs,
	type WeekendCommitArgs,
	type WeekendRunQualifyingArgs
} from '../sim/game/index.js';
import { ensureClock } from '../sim/world/tick.js';
import { eq } from 'drizzle-orm';
import { teams } from './schema.js';

async function requireCareer() {
	const summary = await getCareerStore().getCareerSummary();
	if (!summary) throw new Error('No career open');
	const db = await getDb();
	return { db, career: summary };
}

export function registerGameIpc() {
	ipcMain.handle('game:getHqSnapshot', async () => {
		const { db, career } = await requireCareer();
		return getHqSnapshot(db, career);
	});

	ipcMain.handle('game:advanceWeek', async (_e, args: AdvanceWeekArgs = {}) => {
		const { db, career } = await requireCareer();
		return advanceWeek(db, career.playerTeamId, args);
	});

	ipcMain.handle('game:tickHqWeek', async (_e, args: AdvanceWeekArgs = {}) => {
		const { db, career } = await requireCareer();
		return tickHqWeek(db, career, args);
	});

	ipcMain.handle('game:getStandings', async (_e, args: GetStandingsArgs) => {
		const { db, career } = await requireCareer();
		const clock = await ensureClock(db);
		const [team] = await db
			.select()
			.from(teams)
			.where(eq(teams.id, career.playerTeamId))
			.limit(1);
		if (!team) throw new Error('Player team not found');
		return getStandingsView(db, {
			seasonYear: clock.seasonYear,
			division: team.division,
			entityType: args.entityType
		});
	});

	ipcMain.handle('game:ensureSeason', async (_e, args: EnsureSeasonArgs = {}) => {
		const { db, career } = await requireCareer();
		return ensureSeason(db, career.playerTeamId, args);
	});

	ipcMain.handle('game:getNextRound', async () => {
		const { db } = await requireCareer();
		return getNextRoundView(db);
	});

	ipcMain.handle('game:getCalendar', async () => {
		const { db } = await requireCareer();
		return getCalendarView(db);
	});

	ipcMain.handle('game:upgradeFacility', async (_e, args: UpgradeFacilityArgs) => {
		const { db, career } = await requireCareer();
		const result = await upgradePlayerFacility(db, career.playerTeamId, args);
		const hq = await getHqSnapshot(db, career);
		return { result, hq };
	});

	ipcMain.handle('game:setRdPivot', async (_e, args: SetRdPivotArgs) => {
		const { db, career } = await requireCareer();
		const result = await confirmPlayerRdPivot(db, career.playerTeamId, args);
		const hq = await getHqSnapshot(db, career);
		return { ...result, hq };
	});

	ipcMain.handle('weekend:begin', async (_e, args: WeekendBeginArgs = {}) => {
		const { db, career } = await requireCareer();
		return beginWeekend(db, career.playerTeamId, args);
	});

	ipcMain.handle('weekend:clear', async () => {
		clearWeekend();
	});

	ipcMain.handle('weekend:runQualifying', async (_e, args: WeekendRunQualifyingArgs = {}) => {
		return runWeekendQualifying(args);
	});

	ipcMain.handle('weekend:commit', async (_e, args: WeekendCommitArgs = {}) => {
		const { db } = await requireCareer();
		return commitInteractiveWeekend(db, args);
	});

	ipcMain.handle('practice:create', async () => {
		const { db, career } = await requireCareer();
		return createPractice(db, career.playerTeamId);
	});

	ipcMain.handle('practice:tweakSetup', async (_e, tweak: Partial<SetupVector>) => {
		return tweakPracticeSetup(tweak);
	});

	ipcMain.handle('practice:runStint', async (_e, directive: StintDirective) => {
		return runPracticeStintView(directive);
	});

	ipcMain.handle('race:create', async (_e, args: RaceCreateArgs = {}) => {
		return createRace(args);
	});

	ipcMain.handle('race:command', async (_e, cmd: RaceCommand) => {
		raceCommand(cmd);
	});

	ipcMain.handle('race:stepLap', async (_e, args: RaceStepArgs = {}) => {
		return raceStepLap(args.n ?? 1);
	});

	ipcMain.handle('race:telemetry', async () => {
		return raceTelemetry();
	});

	ipcMain.handle('race:finish', async () => {
		return raceFinish();
	});
}
