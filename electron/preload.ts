import { contextBridge, ipcRenderer } from 'electron';
import type { Team } from './db/schema.js';
import type { CareerSummary, CreateCareerOptions } from './sim/career/store.js';
import type {
	AdvanceWeekArgs,
	EnsureSeasonArgs,
	EnsureSeasonResult,
	GetStandingsArgs,
	HqHubSnapshot,
	MarketHubSnapshot,
	NextRoundView,
	RdHubSnapshot,
	ScoutingHubSnapshot,
	SponsorsHubSnapshot,
	PracticeCreateResult,
	PracticeStintView,
	RaceCommand,
	RaceCreateArgs,
	RaceCreateResult,
	RaceResult,
	RaceStepArgs,
	RaceStepResult,
	RaceTelemetry,
	SetupVector,
	StandingsRowView,
	StintDirective,
	WeekAdvanceResult,
	WeekendBeginArgs,
	WeekendBeginResult,
	WeekendCommitArgs,
	WeekendCommitResult,
	WeekendRunQualifyingArgs,
	QualifyingView,
	TickHqWeekResult
} from './sim/game/types.js';

const electronAPI = {
	ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
	getTeams: (): Promise<Team[]> => ipcRenderer.invoke('db:getTeams'),
	createTeam: (name: string): Promise<Team> => ipcRenderer.invoke('db:createTeam', name),
	listCareers: (): Promise<CareerSummary[]> => ipcRenderer.invoke('career:list'),
	listTeamOptions: (): Promise<
		import('./sim/seed/grid-fixture.js').NewCareerTeamOption[]
	> => ipcRenderer.invoke('career:listTeamOptions'),
	bootstrapCareer: (
		opts: import('./sim/career/bootstrap.js').BootstrapCareerOptions
	): Promise<import('./sim/career/bootstrap.js').BootstrapCareerResult> =>
		ipcRenderer.invoke('career:bootstrap', opts),
	createCareer: (opts: CreateCareerOptions): Promise<CareerSummary> =>
		ipcRenderer.invoke('career:create', opts),
	openCareer: (id: string): Promise<CareerSummary> => ipcRenderer.invoke('career:open', id),
	closeCareer: (): Promise<void> => ipcRenderer.invoke('career:close'),
	deleteCareer: (id: string): Promise<void> => ipcRenderer.invoke('career:delete', id),
	setPlayerTeam: (teamId: number): Promise<CareerSummary> =>
		ipcRenderer.invoke('career:setPlayerTeam', teamId),
	getCareerSummary: (): Promise<CareerSummary | null> => ipcRenderer.invoke('career:getSummary'),

	getHqSnapshot: (): Promise<HqHubSnapshot> => ipcRenderer.invoke('game:getHqSnapshot'),
	advanceWeek: (args?: AdvanceWeekArgs): Promise<WeekAdvanceResult> =>
		ipcRenderer.invoke('game:advanceWeek', args ?? {}),
	tickHqWeek: (args?: AdvanceWeekArgs): Promise<TickHqWeekResult> =>
		ipcRenderer.invoke('game:tickHqWeek', args ?? {}),
	getStandings: (args: GetStandingsArgs): Promise<StandingsRowView[]> =>
		ipcRenderer.invoke('game:getStandings', args),
	ensureSeason: (args?: EnsureSeasonArgs): Promise<EnsureSeasonResult> =>
		ipcRenderer.invoke('game:ensureSeason', args ?? {}),
	getNextRound: (): Promise<NextRoundView> => ipcRenderer.invoke('game:getNextRound'),
	getCalendar: (): Promise<import('./sim/game/types.js').CalendarRoundView[]> =>
		ipcRenderer.invoke('game:getCalendar'),
	upgradeFacility: (
		args: import('./sim/game/types.js').UpgradeFacilityArgs
	): Promise<{
		result: import('./sim/facilities/build.js').StartFacilityBuildResult;
		hq: HqHubSnapshot;
	}> => ipcRenderer.invoke('game:upgradeFacility', args),
	setRdPivot: (
		args: import('./sim/game/types.js').SetRdPivotArgs
	): Promise<{ currentFraction: number; locked: boolean; hq: HqHubSnapshot }> =>
		ipcRenderer.invoke('game:setRdPivot', args),
	getRdSnapshot: (): Promise<RdHubSnapshot> => ipcRenderer.invoke('game:getRdSnapshot'),
	startRdProject: (
		args: import('./sim/game/types.js').StartRdProjectArgs
	): Promise<{ result: unknown; rd: RdHubSnapshot }> =>
		ipcRenderer.invoke('game:startRdProject', args),
	allocateRdHours: (
		args: import('./sim/game/types.js').AllocateRdHoursArgs
	): Promise<{ result: unknown; rd: RdHubSnapshot }> =>
		ipcRenderer.invoke('game:allocateRdHours', args),
	queueManufacture: (
		args: import('./sim/game/types.js').QueueManufactureArgs
	): Promise<{ result: unknown; rd: RdHubSnapshot }> =>
		ipcRenderer.invoke('game:queueManufacture', args),
	getMarketSnapshot: (): Promise<MarketHubSnapshot> =>
		ipcRenderer.invoke('game:getMarketSnapshot'),
	previewDriverOffer: (
		args: import('./sim/game/types.js').PreviewDriverOfferArgs
	): Promise<import('./sim/game/types.js').MarketAcceptPreviewView> =>
		ipcRenderer.invoke('game:previewDriverOffer', args),
	previewStaffOffer: (
		args: import('./sim/game/types.js').PreviewStaffOfferArgs
	): Promise<import('./sim/game/types.js').MarketAcceptPreviewView> =>
		ipcRenderer.invoke('game:previewStaffOffer', args),
	signDriverOffer: (
		args: import('./sim/game/types.js').SignDriverOfferArgs
	): Promise<{ result: unknown; market: MarketHubSnapshot }> =>
		ipcRenderer.invoke('game:signDriverOffer', args),
	signStaffOffer: (
		args: import('./sim/game/types.js').SignStaffOfferArgs
	): Promise<{ result: unknown; market: MarketHubSnapshot }> =>
		ipcRenderer.invoke('game:signStaffOffer', args),
	buyoutDriver: (
		args: import('./sim/game/types.js').BuyoutDriverArgs
	): Promise<{ result: { fee: number }; market: MarketHubSnapshot }> =>
		ipcRenderer.invoke('game:buyoutDriver', args),
	buyoutStaff: (
		args: import('./sim/game/types.js').BuyoutStaffArgs
	): Promise<{ result: { fee: number }; market: MarketHubSnapshot }> =>
		ipcRenderer.invoke('game:buyoutStaff', args),
	getScoutingSnapshot: (): Promise<ScoutingHubSnapshot> =>
		ipcRenderer.invoke('game:getScoutingSnapshot'),
	assignScoutTarget: (
		args: import('./sim/game/types.js').ScoutAssignArgs
	): Promise<{ result: unknown; scouting: ScoutingHubSnapshot }> =>
		ipcRenderer.invoke('game:assignScoutTarget', args),
	unassignScoutTarget: (
		args: import('./sim/game/types.js').ScoutUnassignArgs
	): Promise<{ result: boolean; scouting: ScoutingHubSnapshot }> =>
		ipcRenderer.invoke('game:unassignScoutTarget', args),
	getFoggedProfile: (
		args: import('./sim/game/types.js').ScoutFoggedProfileArgs
	): Promise<import('./sim/game/types.js').ScoutFoggedProfileView> =>
		ipcRenderer.invoke('game:getFoggedProfile', args),
	getSponsorsSnapshot: (): Promise<SponsorsHubSnapshot> =>
		ipcRenderer.invoke('game:getSponsorsSnapshot'),
	signSponsorDeal: (
		args: import('./sim/game/types.js').SignSponsorDealArgs
	): Promise<{ result: unknown; sponsors: SponsorsHubSnapshot }> =>
		ipcRenderer.invoke('game:signSponsorDeal', args),

	weekendBegin: (args?: WeekendBeginArgs): Promise<WeekendBeginResult> =>
		ipcRenderer.invoke('weekend:begin', args ?? {}),
	weekendClear: (): Promise<void> => ipcRenderer.invoke('weekend:clear'),
	weekendRunQualifying: (args?: WeekendRunQualifyingArgs): Promise<QualifyingView> =>
		ipcRenderer.invoke('weekend:runQualifying', args ?? {}),
	weekendCommit: (args?: WeekendCommitArgs): Promise<WeekendCommitResult> =>
		ipcRenderer.invoke('weekend:commit', args ?? {}),
	practiceCreate: (): Promise<PracticeCreateResult> => ipcRenderer.invoke('practice:create'),
	practiceTweakSetup: (tweak: Partial<SetupVector>): Promise<PracticeCreateResult> =>
		ipcRenderer.invoke('practice:tweakSetup', tweak),
	practiceRunStint: (directive: StintDirective): Promise<PracticeStintView> =>
		ipcRenderer.invoke('practice:runStint', directive),
	raceCreate: (args?: RaceCreateArgs): Promise<RaceCreateResult> =>
		ipcRenderer.invoke('race:create', args ?? {}),
	raceCommand: (cmd: RaceCommand): Promise<void> => ipcRenderer.invoke('race:command', cmd),
	raceStepLap: (args?: RaceStepArgs): Promise<RaceStepResult> =>
		ipcRenderer.invoke('race:stepLap', args ?? {}),
	raceTelemetry: (): Promise<RaceTelemetry> => ipcRenderer.invoke('race:telemetry'),
	raceFinish: (): Promise<RaceResult> => ipcRenderer.invoke('race:finish')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
