import type {
	AdvanceWeekArgs,
	BootstrapCareerOptions,
	BootstrapCareerResult,
	CareerSummary,
	CreateCareerOptions,
	EnsureSeasonArgs,
	EnsureSeasonResult,
	GetStandingsArgs,
	HqHubSnapshot,
	MarketHubSnapshot,
	NewCareerTeamOption,
	RdHubSnapshot,
	ScoutingHubSnapshot,
	SponsorsHubSnapshot,
	NextRoundView,
	PracticeCreateResult,
	PracticeStintView,
	RaceCommand,
	RaceCreateArgs,
	RaceCreateResult,
	RaceStepArgs,
	RaceStepResult,
	RaceTelemetry,
	StandingsRowView,
	StintDirective,
	Team,
	TickHqWeekResult,
	WeekAdvanceResult,
	WeekendBeginArgs,
	WeekendBeginResult,
	WeekendCommitArgs,
	WeekendCommitResult,
	WeekendRunQualifyingArgs,
	QualifyingView
} from '$lib/types';

export function isElectron(): boolean {
	return typeof window !== 'undefined' && 'electronAPI' in window;
}

export async function ping(): Promise<string | null> {
	if (!isElectron()) return null;
	return window.electronAPI.ping();
}

export async function getTeams(): Promise<Team[]> {
	if (!isElectron()) return [];
	return window.electronAPI.getTeams();
}

export async function createTeam(name: string): Promise<Team | null> {
	if (!isElectron()) return null;
	return window.electronAPI.createTeam(name);
}

export async function listCareers(): Promise<CareerSummary[]> {
	if (!isElectron()) return [];
	return window.electronAPI.listCareers();
}

export async function listTeamOptions(): Promise<NewCareerTeamOption[]> {
	if (!isElectron()) return [];
	return window.electronAPI.listTeamOptions();
}

export async function bootstrapCareer(
	opts: BootstrapCareerOptions
): Promise<BootstrapCareerResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.bootstrapCareer(opts);
}

export async function createCareer(opts: CreateCareerOptions): Promise<CareerSummary | null> {
	if (!isElectron()) return null;
	return window.electronAPI.createCareer(opts);
}

export async function openCareer(id: string): Promise<CareerSummary | null> {
	if (!isElectron()) return null;
	return window.electronAPI.openCareer(id);
}

export async function closeCareer(): Promise<void> {
	if (!isElectron()) return;
	return window.electronAPI.closeCareer();
}

export async function deleteCareer(id: string): Promise<void> {
	if (!isElectron()) return;
	return window.electronAPI.deleteCareer(id);
}

export async function setPlayerTeam(teamId: number): Promise<CareerSummary | null> {
	if (!isElectron()) return null;
	return window.electronAPI.setPlayerTeam(teamId);
}

export async function getCareerSummary(): Promise<CareerSummary | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getCareerSummary();
}

export async function getHqSnapshot(): Promise<HqHubSnapshot | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getHqSnapshot();
}

export async function advanceWeek(args?: AdvanceWeekArgs): Promise<WeekAdvanceResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.advanceWeek(args);
}

export async function tickHqWeek(args?: AdvanceWeekArgs): Promise<TickHqWeekResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.tickHqWeek(args);
}

export async function getStandings(args: GetStandingsArgs): Promise<StandingsRowView[]> {
	if (!isElectron()) return [];
	return window.electronAPI.getStandings(args);
}

export async function ensureSeason(args?: EnsureSeasonArgs): Promise<EnsureSeasonResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.ensureSeason(args);
}

export async function getNextRound(): Promise<NextRoundView> {
	if (!isElectron()) return null;
	return window.electronAPI.getNextRound();
}

export async function getCalendar(): Promise<import('$lib/types').CalendarRoundView[]> {
	if (!isElectron()) return [];
	return window.electronAPI.getCalendar();
}

export async function upgradeFacility(
	args: import('$lib/types').UpgradeFacilityArgs
): Promise<{ result: unknown; hq: HqHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.upgradeFacility(args);
}

export async function setRdPivot(
	args: import('$lib/types').SetRdPivotArgs
): Promise<{ currentFraction: number; locked: boolean; hq: HqHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.setRdPivot(args);
}

export async function getRdSnapshot(): Promise<RdHubSnapshot | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getRdSnapshot();
}

export async function startRdProject(
	args: import('$lib/types').StartRdProjectArgs
): Promise<{ result: unknown; rd: RdHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.startRdProject(args);
}

export async function allocateRdHours(
	args: import('$lib/types').AllocateRdHoursArgs
): Promise<{ result: unknown; rd: RdHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.allocateRdHours(args);
}

export async function queueManufacture(
	args: import('$lib/types').QueueManufactureArgs
): Promise<{ result: unknown; rd: RdHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.queueManufacture(args);
}

export async function getMarketSnapshot(): Promise<MarketHubSnapshot | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getMarketSnapshot();
}

export async function previewDriverOffer(
	args: import('$lib/types').PreviewDriverOfferArgs
): Promise<import('$lib/types').MarketAcceptPreviewView | null> {
	if (!isElectron()) return null;
	return window.electronAPI.previewDriverOffer(args);
}

export async function previewStaffOffer(
	args: import('$lib/types').PreviewStaffOfferArgs
): Promise<import('$lib/types').MarketAcceptPreviewView | null> {
	if (!isElectron()) return null;
	return window.electronAPI.previewStaffOffer(args);
}

export async function signDriverOffer(
	args: import('$lib/types').SignDriverOfferArgs
): Promise<{ result: unknown; market: MarketHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.signDriverOffer(args);
}

export async function signStaffOffer(
	args: import('$lib/types').SignStaffOfferArgs
): Promise<{ result: unknown; market: MarketHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.signStaffOffer(args);
}

export async function buyoutDriver(
	args: import('$lib/types').BuyoutDriverArgs
): Promise<{ result: { fee: number }; market: MarketHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.buyoutDriver(args);
}

export async function buyoutStaff(
	args: import('$lib/types').BuyoutStaffArgs
): Promise<{ result: { fee: number }; market: MarketHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.buyoutStaff(args);
}

export async function getScoutingSnapshot(): Promise<ScoutingHubSnapshot | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getScoutingSnapshot();
}

export async function assignScoutTarget(
	args: import('$lib/types').ScoutAssignArgs
): Promise<{ result: unknown; scouting: ScoutingHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.assignScoutTarget(args);
}

export async function unassignScoutTarget(
	args: import('$lib/types').ScoutUnassignArgs
): Promise<{ result: boolean; scouting: ScoutingHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.unassignScoutTarget(args);
}

export async function getFoggedProfile(
	args: import('$lib/types').ScoutFoggedProfileArgs
): Promise<import('$lib/types').ScoutFoggedProfileView | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getFoggedProfile(args);
}

export async function getSponsorsSnapshot(): Promise<SponsorsHubSnapshot | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getSponsorsSnapshot();
}

export async function signSponsorDeal(
	args: import('$lib/types').SignSponsorDealArgs
): Promise<{ result: unknown; sponsors: SponsorsHubSnapshot } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.signSponsorDeal(args);
}

export async function weekendBegin(args?: WeekendBeginArgs): Promise<WeekendBeginResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.weekendBegin(args);
}

export async function weekendClear(): Promise<void> {
	if (!isElectron()) return;
	return window.electronAPI.weekendClear();
}

export async function weekendRunQualifying(
	args?: WeekendRunQualifyingArgs
): Promise<QualifyingView | null> {
	if (!isElectron()) return null;
	return window.electronAPI.weekendRunQualifying(args);
}

export async function weekendCommit(
	args?: WeekendCommitArgs
): Promise<WeekendCommitResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.weekendCommit(args);
}

export async function practiceCreate(): Promise<PracticeCreateResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.practiceCreate();
}

export async function practiceTweakSetup(
	tweak: Record<string, number>
): Promise<PracticeCreateResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.practiceTweakSetup(tweak);
}

export async function practiceRunStint(
	directive: StintDirective
): Promise<PracticeStintView | null> {
	if (!isElectron()) return null;
	return window.electronAPI.practiceRunStint(directive);
}

export async function raceCreate(args?: RaceCreateArgs): Promise<RaceCreateResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.raceCreate(args);
}

export async function raceCommand(cmd: RaceCommand): Promise<void> {
	if (!isElectron()) return;
	return window.electronAPI.raceCommand(cmd);
}

export async function raceStepLap(args?: RaceStepArgs): Promise<RaceStepResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.raceStepLap(args);
}

export async function raceTelemetry(): Promise<RaceTelemetry | null> {
	if (!isElectron()) return null;
	return window.electronAPI.raceTelemetry();
}

export async function raceFinish(): Promise<unknown> {
	if (!isElectron()) return null;
	return window.electronAPI.raceFinish();
}
