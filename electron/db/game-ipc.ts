import { ipcMain } from 'electron';
import { getDb } from './index.js';
import { getCareerStore } from './career-context.js';
import {
	advanceWeek,
	allocatePlayerRdHours,
	assignPlayerScoutTarget,
	beginWeekend,
	buyoutPlayerDriver,
	buyoutPlayerStaff,
	clearWeekend,
	commitInteractiveWeekend,
	confirmPlayerRdPivot,
	createPractice,
	createRace,
	ensureSeason,
	getCalendarView,
	getHqSnapshot,
	getMarketSnapshot,
	getNextRoundView,
	getPlayerFoggedProfile,
	getRdSnapshot,
	getScoutingSnapshot,
	getSponsorsSnapshot,
	getStandingsView,
	previewPlayerDriverOffer,
	previewPlayerStaffOffer,
	queuePlayerManufacture,
	raceCommand,
	raceFinish,
	raceStepLap,
	raceTelemetry,
	runPracticeStintView,
	runWeekendQualifying,
	signPlayerDriverOffer,
	signPlayerSponsorDeal,
	signPlayerStaffOffer,
	startPlayerRdProject,
	tickHqWeek,
	tweakPracticeSetup,
	unassignPlayerScoutTarget,
	upgradePlayerFacility,
	type AdvanceWeekArgs,
	type AllocateRdHoursArgs,
	type BuyoutDriverArgs,
	type BuyoutStaffArgs,
	type EnsureSeasonArgs,
	type GetStandingsArgs,
	type PreviewDriverOfferArgs,
	type PreviewStaffOfferArgs,
	type QueueManufactureArgs,
	type RaceCommand,
	type RaceCreateArgs,
	type RaceStepArgs,
	type ScoutAssignArgs,
	type ScoutFoggedProfileArgs,
	type ScoutUnassignArgs,
	type SetRdPivotArgs,
	type SetupVector,
	type SignDriverOfferArgs,
	type SignSponsorDealArgs,
	type SignStaffOfferArgs,
	type StartRdProjectArgs,
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

	ipcMain.handle('game:getRdSnapshot', async () => {
		const { db, career } = await requireCareer();
		return getRdSnapshot(db, career);
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

	ipcMain.handle('game:startRdProject', async (_e, args: StartRdProjectArgs) => {
		const { db, career } = await requireCareer();
		const result = await startPlayerRdProject(db, career.playerTeamId, args);
		const rd = await getRdSnapshot(db, career);
		return { result, rd };
	});

	ipcMain.handle('game:allocateRdHours', async (_e, args: AllocateRdHoursArgs) => {
		const { db, career } = await requireCareer();
		const result = await allocatePlayerRdHours(db, career.playerTeamId, args);
		const rd = await getRdSnapshot(db, career);
		return { result, rd };
	});

	ipcMain.handle('game:queueManufacture', async (_e, args: QueueManufactureArgs) => {
		const { db, career } = await requireCareer();
		const result = await queuePlayerManufacture(db, career.playerTeamId, args);
		const rd = await getRdSnapshot(db, career);
		return { result, rd };
	});

	ipcMain.handle('game:getMarketSnapshot', async () => {
		const { db, career } = await requireCareer();
		return getMarketSnapshot(db, career);
	});

	ipcMain.handle('game:previewDriverOffer', async (_e, args: PreviewDriverOfferArgs) => {
		const { db, career } = await requireCareer();
		return previewPlayerDriverOffer(db, career.playerTeamId, args);
	});

	ipcMain.handle('game:previewStaffOffer', async (_e, args: PreviewStaffOfferArgs) => {
		const { db, career } = await requireCareer();
		return previewPlayerStaffOffer(db, career.playerTeamId, args);
	});

	ipcMain.handle('game:signDriverOffer', async (_e, args: SignDriverOfferArgs) => {
		const { db, career } = await requireCareer();
		const result = await signPlayerDriverOffer(db, career.playerTeamId, args);
		const market = await getMarketSnapshot(db, career);
		return { result, market };
	});

	ipcMain.handle('game:signStaffOffer', async (_e, args: SignStaffOfferArgs) => {
		const { db, career } = await requireCareer();
		const result = await signPlayerStaffOffer(db, career.playerTeamId, args);
		const market = await getMarketSnapshot(db, career);
		return { result, market };
	});

	ipcMain.handle('game:buyoutDriver', async (_e, args: BuyoutDriverArgs) => {
		const { db, career } = await requireCareer();
		const result = await buyoutPlayerDriver(db, career.playerTeamId, args);
		const market = await getMarketSnapshot(db, career);
		return { result, market };
	});

	ipcMain.handle('game:buyoutStaff', async (_e, args: BuyoutStaffArgs) => {
		const { db, career } = await requireCareer();
		const result = await buyoutPlayerStaff(db, career.playerTeamId, args);
		const market = await getMarketSnapshot(db, career);
		return { result, market };
	});

	ipcMain.handle('game:getScoutingSnapshot', async () => {
		const { db, career } = await requireCareer();
		return getScoutingSnapshot(db, career);
	});

	ipcMain.handle('game:assignScoutTarget', async (_e, args: ScoutAssignArgs) => {
		const { db, career } = await requireCareer();
		const result = await assignPlayerScoutTarget(db, career.playerTeamId, args);
		const scouting = await getScoutingSnapshot(db, career);
		return { result, scouting };
	});

	ipcMain.handle('game:unassignScoutTarget', async (_e, args: ScoutUnassignArgs) => {
		const { db, career } = await requireCareer();
		const result = await unassignPlayerScoutTarget(db, career.playerTeamId, args);
		const scouting = await getScoutingSnapshot(db, career);
		return { result, scouting };
	});

	ipcMain.handle('game:getFoggedProfile', async (_e, args: ScoutFoggedProfileArgs) => {
		const { db, career } = await requireCareer();
		return getPlayerFoggedProfile(db, career.playerTeamId, args);
	});

	ipcMain.handle('game:getSponsorsSnapshot', async () => {
		const { db, career } = await requireCareer();
		return getSponsorsSnapshot(db, career);
	});

	ipcMain.handle('game:signSponsorDeal', async (_e, args: SignSponsorDealArgs) => {
		const { db, career } = await requireCareer();
		const result = await signPlayerSponsorDeal(db, career.playerTeamId, args);
		const sponsors = await getSponsorsSnapshot(db, career);
		return { result, sponsors };
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
