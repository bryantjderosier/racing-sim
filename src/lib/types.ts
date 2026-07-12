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
