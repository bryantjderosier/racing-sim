export type Team = {
	id: number;
	name: string;
	shortName: string;
	nationality: string;
	primaryColor: string;
	secondaryColor: string;
	status: 'ACTIVE' | 'DEFUNCT' | 'UNMANAGED_AI' | 'PLAYER_MANAGED';
	tierId: number;
	windTunnelHours: number;
	cfdCapacityFlops: bigint;
	hqLevel: number;
};

export type SeedTeam = {
	id: number;
	name: string;
	short: string;
	nat: string;
	primary: string;
	secondary: string;
	band: 'T' | 'M' | 'B';
	tierId: number;
};

export type NewGameOptions = {
	saveDisplayName?: string;
	playerDisplayName: string;
	playerTeamId: number;
	seasonYear?: number;
	seed?: number;
};

export type GameClock = {
	seasonYear: number;
	week: number;
	day: number;
	phase: string;
	playerDisplayName: string;
	playerTeamId: number | null;
	playerStatus: string;
};

export type AdvanceResult = {
	ok: true;
	seasonYear: number;
	week: number;
	day: number;
	phase: string;
	daysAdvanced: number;
	stoppedOn: string | null;
	message: string;
};
