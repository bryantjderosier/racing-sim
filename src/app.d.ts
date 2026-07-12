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
	NewCareerTeamOption,
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

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		electronAPI: {
			ping: () => Promise<string>;
			getTeams: () => Promise<Team[]>;
			createTeam: (name: string) => Promise<Team>;
			listCareers: () => Promise<CareerSummary[]>;
			listTeamOptions: () => Promise<NewCareerTeamOption[]>;
			bootstrapCareer: (opts: BootstrapCareerOptions) => Promise<BootstrapCareerResult>;
			createCareer: (opts: CreateCareerOptions) => Promise<CareerSummary>;
			openCareer: (id: string) => Promise<CareerSummary>;
			closeCareer: () => Promise<void>;
			deleteCareer: (id: string) => Promise<void>;
			setPlayerTeam: (teamId: number) => Promise<CareerSummary>;
			getCareerSummary: () => Promise<CareerSummary | null>;
			getHqSnapshot: () => Promise<HqHubSnapshot>;
			advanceWeek: (args?: AdvanceWeekArgs) => Promise<WeekAdvanceResult>;
			tickHqWeek: (args?: AdvanceWeekArgs) => Promise<TickHqWeekResult>;
			getStandings: (args: GetStandingsArgs) => Promise<StandingsRowView[]>;
			ensureSeason: (args?: EnsureSeasonArgs) => Promise<EnsureSeasonResult>;
			getNextRound: () => Promise<NextRoundView>;
			getCalendar: () => Promise<import('$lib/types').CalendarRoundView[]>;
			upgradeFacility: (
				args: import('$lib/types').UpgradeFacilityArgs
			) => Promise<{ result: unknown; hq: HqHubSnapshot }>;
			setRdPivot: (
				args: import('$lib/types').SetRdPivotArgs
			) => Promise<{ currentFraction: number; locked: boolean; hq: HqHubSnapshot }>;
			weekendBegin: (args?: WeekendBeginArgs) => Promise<WeekendBeginResult>;
			weekendClear: () => Promise<void>;
			weekendRunQualifying: (args?: WeekendRunQualifyingArgs) => Promise<QualifyingView>;
			weekendCommit: (args?: WeekendCommitArgs) => Promise<WeekendCommitResult>;
			practiceCreate: () => Promise<PracticeCreateResult>;
			practiceTweakSetup: (tweak: Record<string, number>) => Promise<PracticeCreateResult>;
			practiceRunStint: (directive: StintDirective) => Promise<PracticeStintView>;
			raceCreate: (args?: RaceCreateArgs) => Promise<RaceCreateResult>;
			raceCommand: (cmd: RaceCommand) => Promise<void>;
			raceStepLap: (args?: RaceStepArgs) => Promise<RaceStepResult>;
			raceTelemetry: () => Promise<RaceTelemetry>;
			raceFinish: () => Promise<unknown>;
		};
	}
}

export {};
