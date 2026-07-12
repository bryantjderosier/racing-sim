/** Seasonal cost-cap ceilings by division. */
export const DIVISION_COST_CAP: Record<number, number> = {
	1: 140_000_000,
	2: 75_000_000,
	3: 35_000_000
};

/** Over spend / limit. Minor = (0, 0.05], major = > 0.05. */
export const MINOR_BREACH_MAX_OVERAGE = 0.05;

/** Cash fine as fraction of overage. */
export const MINOR_BREACH_FINE_OF_OVERAGE = 1.5;
export const MAJOR_BREACH_FINE_OF_OVERAGE = 2.5;

/** Next-season WT weekly-cap multipliers after breach. */
export const MINOR_BREACH_WT_MULT = 0.85;
export const MAJOR_BREACH_WT_MULT = 0.8;

/** Constructors points stripped on major breach. */
export const MAJOR_BREACH_POINTS_PENALTY = 25;

/** Cash cost of R&D testing hours (inside cost cap). */
export const RD_WT_HOUR_CASH = 18_000;
export const RD_CFD_HOUR_CASH = 9_000;

/** Top N staff salaries exempt from cost cap. */
export const TOP_STAFF_SALARY_EXEMPT = 3;

/** Weeks per season for payroll amortization. */
export const PAYROLL_WEEKS_PER_YEAR = 52;

/** Constructors prize pool by division (P1 index 0). */
export const CONSTRUCTORS_PRIZE_BY_DIVISION: Record<number, number[]> = {
	1: [
		45_000_000, 38_000_000, 32_000_000, 27_000_000, 23_000_000, 20_000_000, 17_000_000,
		15_000_000, 13_000_000, 11_500_000, 10_000_000, 9_000_000, 8_000_000, 7_000_000,
		6_200_000, 5_500_000, 5_000_000, 4_500_000, 4_000_000, 3_500_000
	],
	2: [
		18_000_000, 15_000_000, 12_500_000, 10_500_000, 9_000_000, 7_800_000, 6_800_000,
		6_000_000, 5_200_000, 4_500_000, 4_000_000, 3_500_000, 3_100_000, 2_800_000,
		2_500_000, 2_200_000, 2_000_000, 1_800_000, 1_600_000, 1_400_000
	],
	3: [
		6_000_000, 5_000_000, 4_200_000, 3_500_000, 3_000_000, 2_600_000, 2_200_000,
		1_900_000, 1_650_000, 1_450_000, 1_300_000, 1_150_000, 1_050_000, 950_000, 850_000,
		780_000, 720_000, 660_000, 600_000, 550_000
	]
};
