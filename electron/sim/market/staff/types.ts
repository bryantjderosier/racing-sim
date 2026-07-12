export type StaffRole =
	| 'aero'
	| 'mechanical'
	| 'powertrain'
	| 'race_engineer'
	| 'scout'
	| 'pit_crew';

export type StaffMarketProfile = {
	staffId: number;
	role: StaffRole;
	morale: number;
	ego: number;
	loyalty: number;
	attrs: Record<string, number>;
	division: number;
};
