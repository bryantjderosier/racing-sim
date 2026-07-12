import type { CostCapStatus } from '../finance/status.js';
import type { SetupVector } from '../lap/types.js';
import type { RaceCommand, RaceTelemetry, RunnerTelemetry } from '../race/session.js';
import type { RaceLapLine, RaceResult } from '../race/feature.js';
import type { StintDirective } from '../practice/types.js';

export type ClockView = {
	seasonYear: number;
	week: number;
	day: number;
	tickIndex: number;
};

export type TeamHubView = {
	id: number;
	name: string;
	cash: number;
	wtHours: number;
	cfdHours: number;
	wtHoursCap: number;
	cfdHoursCap: number;
	reputation: number;
	division: number;
	rdPivotCurrent: number;
};

export type FacilityView = {
	id: number;
	facilityType: string;
	tier: number;
	conditionPct: number;
	isUnderConstruction: boolean;
	constructionFinishDate: number | null;
	upgradeQuote: FacilityUpgradeQuoteView | null;
};

export type FacilityUpgradeQuoteView = {
	facilityType: string;
	fromTier: number;
	toTier: number;
	cash: number;
	days: number;
	weeks: number;
	operationalCostAnnual: number;
	underConstruction: boolean;
};

export type NextRoundView = {
	raceIndex: number;
	calendarId: number;
	trackId: number;
	trackName: string;
} | null;

export type CalendarRoundView = {
	raceIndex: number;
	calendarId: number;
	trackId: number;
	trackName: string;
	isCompleted: boolean;
};

export type PivotView = {
	raceIndex: number;
	locked: boolean;
	currentFraction: number;
	/** True when the next incomplete round has reached the pivot race index. */
	gateOpen: boolean;
};

export type StandingsRowView = {
	position: number | null;
	entityId: number;
	name: string;
	teamId: number | null;
	points: number;
};

export type HqHubSnapshot = {
	career: {
		id: string;
		displayName: string;
		playerTeamId: number;
	};
	clock: ClockView;
	team: TeamHubView;
	costCap: CostCapStatus;
	facilities: FacilityView[];
	calendar: CalendarRoundView[];
	pivot: PivotView;
	nextRound: NextRoundView;
	standingsDrivers: StandingsRowView[];
	standingsTeams: StandingsRowView[];
};

export type WeekAdvanceResult = {
	seasonYear: number;
	week: number;
	day: number;
	tickIndex: number;
	teamsUpdated: number;
	facilitiesDecayed: number;
	facilitiesMaintained: number;
	facilitiesCompleted: number;
	manufacturesCompleted: number;
	levelsGained: number;
	xpEventCount: number;
	/** Shallow toast counts from full HQ tick (0 when skipped). */
	scoutingTickCount: number;
	moraleUpdateCount: number;
	aiTeamsActed: number;
};

export type TickHqWeekResult = {
	tick: WeekAdvanceResult;
	hq: HqHubSnapshot;
};

export type EnsureSeasonResult = {
	seasonYear: number;
	division: number;
	raceCount: number;
	created: boolean;
	nextRound: NextRoundView;
};

export type ThinEntrantView = {
	teamId: number;
	driverId: number;
	driverName: string;
	carId: number;
};

export type WeekendBeginResult = {
	trackId: number;
	trackName: string;
	entrants: ThinEntrantView[];
};

export type PracticeCreateResult = {
	setup: SetupVector;
	trimTiers: {
		qualifying: number;
		race: number;
		wetWeather: number;
	};
};

export type PracticeStintView = {
	averageLapMs: number;
	bestLapMs: number;
	lapCount: number;
	setupDistance: number;
	briefLines: string[];
	briefClarity: string;
	trimTiers: {
		qualifying: number;
		race: number;
		wetWeather: number;
	};
};

export type RaceCreateResult = {
	totalLaps: number;
	telemetry: RaceTelemetry;
};

export type RaceStepResult = {
	lines: RaceLapLine[];
	telemetry: RaceTelemetry;
	complete: boolean;
};

export type AdvanceWeekArgs = {
	maintainFacilities?: boolean;
};

export type GetStandingsArgs = {
	entityType: 'driver' | 'team';
};

export type EnsureSeasonArgs = {
	raceCount?: number;
};

export type WeekendBeginArgs = {
	trackId?: number;
};

export type QualifyingGridRowView = {
	position: number;
	entrantId: number;
	name: string;
	bestLapMs: number | null;
	session: string;
};

export type QualifyingView = {
	format: string;
	poleMs: number | null;
	grid: QualifyingGridRowView[];
};

export type WeekendCommitResult = {
	raceEventId: number;
	raceIndex: number;
	calendarId: number;
	awards: { driverId: number; teamId: number; points: number }[];
	nextRound: NextRoundView;
	weeksAdvanced: number;
};

export type RaceCreateArgs = {
	laps?: number;
	seed?: number;
};

export type RaceStepArgs = {
	n?: number;
};

export type WeekendRunQualifyingArgs = {
	format?: 'div1_knockout' | 'div2_single' | 'div3_reverse_points';
	seed?: number;
};

export type WeekendCommitArgs = {
	weeksAfterRace?: number;
};

export type UpgradeFacilityArgs = {
	facilityType: string;
};

export type SetRdPivotArgs = {
	/** 1 = 100% current car, 0 = 100% next-year. */
	currentFraction: number;
	/** Defaults true. */
	lockSeason?: boolean;
};

export type {
	CostCapStatus,
	RaceCommand,
	RaceTelemetry,
	RunnerTelemetry,
	RaceResult,
	SetupVector,
	StintDirective
};
