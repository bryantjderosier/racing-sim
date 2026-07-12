/** Cost cap ceilings by division (Promotion Financial Shock). */
export const DIVISION_COST_CAP: Record<number, number> = {
	1: 140_000_000,
	2: 75_000_000,
	3: 35_000_000
};

/** Default how many constructors move each way between adjacent divisions. */
export const DEFAULT_PROMOTE_COUNT = 2;
export const DEFAULT_RELEGATE_COUNT = 2;

/** Reputation delta on promotion / relegation. */
export const PROMO_REPUTATION_DELTA = 6;
export const RELEG_REPUTATION_DELTA = -5;

/** Default customer supplier id used when works engines are illegal. */
export const DEFAULT_CUSTOMER_SUPPLIER_ID = 2;
