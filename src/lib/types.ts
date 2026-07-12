export type Team = {
	id: number;
	name: string;
	shortName: string;
	nationalityCode: string | null;
	primaryColor: string;
	secondaryColor: string;
	status: 'ACTIVE' | 'DEFUNCT' | 'UNMANAGED_AI' | 'PLAYER_MANAGED';
	liquidCash: number;
	costCapLimit: number;
	costCapSpent: number;
	engineSupplierId: number | null;
	division: number;
	constructorsStanding: number | null;
	reputation: number;
	rdPivotCurrent: number;
	wtHoursRemaining: number;
	cfdHoursRemaining: number;
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
	active: boolean;
};

export type CreateCareerOptions = {
	displayName: string;
	playerTeamId?: number;
};

export type NewCareerTeamOption = {
	id: number;
	name: string;
	shortName: string;
	nationalityCode: string;
	division: number;
};

export type BootstrapCareerOptions = {
	displayName: string;
	playerTeamId?: number;
	raceCount?: number;
};

export type CostCapStatus = {
	teamId: number;
	limit: number;
	spent: number;
	remaining: number;
	utilization: number;
	overage: number;
	overagePct: number;
	breach: 'none' | 'minor' | 'major';
	wtHoursCapMult: number;
};

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

export type FacilityView = {
	id: number;
	facilityType: string;
	tier: number;
	conditionPct: number;
	isUnderConstruction: boolean;
	constructionFinishDate: number | null;
	upgradeQuote: FacilityUpgradeQuoteView | null;
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

export type BootstrapCareerResult = {
	career: CareerSummary;
	hq: HqHubSnapshot;
	season: EnsureSeasonResult;
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
	setup: Record<string, number>;
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

export type RaceTelemetry = {
	lap: number;
	totalLaps: number;
	safety: string;
	cars: {
		entrantId: number;
		name: string;
		position: number;
		gapToLeaderMs: number;
		tireLife: number;
		fuelKg: number;
		pace: string;
		energy: string;
		retired: boolean;
		cumulativeMs: number;
	}[];
};

export type RaceCreateResult = {
	totalLaps: number;
	telemetry: RaceTelemetry;
};

export type RaceStepResult = {
	lines: unknown[];
	telemetry: RaceTelemetry;
	complete: boolean;
};

export type AdvanceWeekArgs = { maintainFacilities?: boolean };
export type GetStandingsArgs = { entityType: 'driver' | 'team' };
export type EnsureSeasonArgs = { raceCount?: number };
export type WeekendBeginArgs = { trackId?: number };
export type RaceCreateArgs = { laps?: number; seed?: number };
export type RaceStepArgs = { n?: number };
export type WeekendRunQualifyingArgs = {
	format?: 'div1_knockout' | 'div2_single' | 'div3_reverse_points';
	seed?: number;
};
export type WeekendCommitArgs = { weeksAfterRace?: number };
export type UpgradeFacilityArgs = { facilityType: string };
export type SetRdPivotArgs = { currentFraction: number; lockSeason?: boolean };
export type RdProjectView = {
	id: number;
	slot: string;
	focus: string;
	progress: number;
	allocatedWtHours: number;
	allocatedCfdHours: number;
	leadDesignerId: number | null;
	leadDesignerName: string | null;
	resultingBlueprintId: number | null;
	status: string;
	hoursToComplete: number;
};
export type RdBlueprintFlawView = {
	flawType: string;
	severity: number;
};
export type RdBlueprintView = {
	id: number;
	name: string;
	slot: string;
	seasonYear: number;
	knownMin: number | null;
	knownMax: number | null;
	scoutConfidence: number;
	baseReliability: number;
	isInvalidated: boolean;
	revealedFlaws: RdBlueprintFlawView[];
	queued: boolean;
};
export type RdQueueView = {
	id: number;
	blueprintId: number;
	blueprintName: string;
	slot: string;
	isLightweight: boolean;
	completionDate: number;
	status: string;
};
export type RdDesignerView = {
	id: number;
	name: string;
	role: string;
};
export type RdHubSnapshot = {
	career: {
		id: string;
		displayName: string;
		playerTeamId: number;
	};
	clock: ClockView;
	team: TeamHubView;
	pivot: PivotView;
	projects: RdProjectView[];
	blueprints: RdBlueprintView[];
	queue: RdQueueView[];
	designers: RdDesignerView[];
	openSlots: string[];
};
export type StartRdProjectArgs = {
	slot: string;
	focus?: 'current_car' | 'next_year';
	leadDesignerId?: number;
};
export type AllocateRdHoursArgs = {
	projectId: number;
	wtHours?: number;
	cfdHours?: number;
};
export type QueueManufactureArgs = {
	blueprintId: number;
	isLightweight?: boolean;
};
export type MarketContractOfferView = {
	salaryAnnual: number;
	years: number;
	isNumberOne?: boolean;
	buyoutFee?: number;
	releaseClause?: number;
	performanceBonus?: number;
};
export type MarketRosterDriverView = {
	driverId: number;
	name: string;
	age: number;
	salaryAnnual: number | null;
	yearsRemaining: number | null;
	buyoutFee: number | null;
	isNumberOne: boolean;
	contractId: number | null;
};
export type MarketRosterStaffView = {
	staffId: number;
	name: string;
	role: string;
	salaryAnnual: number | null;
	yearsRemaining: number | null;
	buyoutFee: number | null;
	contractId: number | null;
};
export type MarketHotDriverView = {
	driverId: number;
	name: string;
	teamId: number | null;
	teamName: string | null;
	age: number;
	reasons: string[];
	yearsRemaining: number | null;
	salaryAnnual: number | null;
	buyoutFee: number | null;
	releaseClause: number | null;
	marketRate: number;
	onPlayerTeam: boolean;
};
export type MarketHotStaffView = {
	staffId: number;
	name: string;
	role: string;
	teamId: number | null;
	teamName: string | null;
	reasons: string[];
	yearsRemaining: number | null;
	salaryAnnual: number | null;
	buyoutFee: number | null;
	marketRate: number;
	onPlayerTeam: boolean;
};
export type MarketAcceptPreviewView = {
	score: number;
	threshold: number;
	accepted: boolean;
	marketRate: number;
};
export type MarketHubSnapshot = {
	career: {
		id: string;
		displayName: string;
		playerTeamId: number;
	};
	clock: ClockView;
	team: TeamHubView;
	rosterDrivers: MarketRosterDriverView[];
	rosterStaff: MarketRosterStaffView[];
	hotDrivers: MarketHotDriverView[];
	hotStaff: MarketHotStaffView[];
	openDriverSeats: number;
	missingStaffRoles: string[];
};
export type SignDriverOfferArgs = {
	driverId: number;
	offer: MarketContractOfferView;
	buyoutPaid?: number;
};
export type SignStaffOfferArgs = {
	staffId: number;
	offer: MarketContractOfferView;
	buyoutPaid?: number;
};
export type PreviewDriverOfferArgs = {
	driverId: number;
	offer: MarketContractOfferView;
};
export type PreviewStaffOfferArgs = {
	staffId: number;
	offer: MarketContractOfferView;
};
export type BuyoutDriverArgs = {
	driverId: number;
	fee?: number;
};
export type BuyoutStaffArgs = {
	staffId: number;
	fee?: number;
};
export type ScoutNetworkView = {
	slotsUsed: number;
	slotsMax: number;
	detection: number;
	accuracy: number;
	appraisal: number;
	coverage: number;
	leverage: number;
	hqTier: number;
	weeklyGainEstimate: number;
};
export type ScoutAssignmentView = {
	entityId: number;
	entityType: 'driver' | 'staff';
	name: string;
	teamId: number | null;
	teamName: string | null;
	role: string | null;
	confidenceLevel: number;
	isAssigned: boolean;
};
export type ScoutCandidateView = {
	entityId: number;
	entityType: 'driver' | 'staff';
	name: string;
	teamId: number | null;
	teamName: string | null;
	role: string | null;
	confidenceLevel: number;
	isAssigned: boolean;
	reasons: string[];
};
export type ScoutAttrBandView = {
	attrName: string;
	knownMin: number;
	knownMax: number;
	trueValue?: number;
};
export type ScoutFoggedProfileView = {
	entityId: number;
	entityType: 'driver' | 'staff';
	name: string;
	confidenceLevel: number;
	fullyRevealed: boolean;
	attrs: ScoutAttrBandView[];
	meta: ScoutAttrBandView[];
};
export type ScoutingHubSnapshot = {
	career: {
		id: string;
		displayName: string;
		playerTeamId: number;
	};
	clock: ClockView;
	team: TeamHubView;
	network: ScoutNetworkView;
	assignments: ScoutAssignmentView[];
	candidates: ScoutCandidateView[];
};
export type ScoutAssignArgs = {
	entityId: number;
	entityType: 'driver' | 'staff';
};
export type ScoutUnassignArgs = {
	entityId: number;
	entityType: 'driver' | 'staff';
};
export type ScoutFoggedProfileArgs = {
	entityId: number;
	entityType: 'driver' | 'staff';
};
export type SponsorDealStreamView = {
	payoutType: string;
	amount: number;
	bonusTargetPosition: number | null;
};
export type SponsorActiveDealView = {
	sponsorId: number;
	sponsorName: string;
	slotType: string;
	yearsRemaining: number | null;
	remainingRaces: number | null;
	streams: SponsorDealStreamView[];
};
export type SponsorCatalogView = {
	sponsorId: number;
	name: string;
	nationalityCode: string | null;
	minMarketability: number;
	minTeamStanding: number | null;
	ethicsSensitivity: number;
	eligibility: Record<
		string,
		{ eligible: boolean; blockReasons: string[]; payoutMultiplier: number }
	>;
	alreadySigned: boolean;
};
export type SponsorSlotInventoryView = {
	slotType: string;
	used: number;
	cap: number;
};
export type SponsorsHubSnapshot = {
	career: {
		id: string;
		displayName: string;
		playerTeamId: number;
	};
	clock: ClockView;
	team: TeamHubView;
	profile: {
		reputation: number;
		standing: number | null;
		driverMarketability: number;
		nationalityCode: string | null;
	};
	slots: SponsorSlotInventoryView[];
	deals: SponsorActiveDealView[];
	catalog: SponsorCatalogView[];
};
export type SignSponsorDealArgs = {
	sponsorId: number;
	slotType: 'title' | 'major' | 'minor';
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
export type StintDirective = {
	intent?: string;
	lapCount: number;
	pace?: string;
};
export type RaceCommand =
	| { type: 'setPace'; entrantId: number; pace: string }
	| { type: 'setEnergy'; entrantId: number; energy: string }
	| {
			type: 'boxThisLap';
			entrantId: number;
			compound: string;
			fuelKg: number;
			paceAfter?: string;
			afterCurrentLap?: boolean;
	  }
	| { type: 'cancelBox'; entrantId: number }
	| {
			type: 'combat';
			entrantId: number;
			order: string;
			laps?: number;
			teammateId?: number;
	  }
	| { type: 'clearCombat'; entrantId: number };
