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
