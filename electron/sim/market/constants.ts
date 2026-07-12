/** Final-year week when heat opens (≈ last 6 months). */
export const HEAT_WEEK_THRESHOLD = 27;

/** Accept if score >= threshold + noise. */
export const ACCEPT_THRESHOLD = 52;

/** Scout Leverage: each point reduces effective threshold. */
export const LEVERAGE_THRESHOLD_RELIEF = 0.12;

/** Soft AI salary ceilings by division (annual). */
export const DIVISION_SALARY_CAP: Record<number, number> = {
	1: 8_000_000,
	2: 3_200_000,
	3: 1_200_000
};

/** Baseline market rate at pace/mkt mid for division. */
export const DIVISION_MARKET_BASE: Record<number, number> = {
	1: 2_800_000,
	2: 900_000,
	3: 280_000
};

export const PACE_ATTRS = [
	'braking',
	'cornering',
	'traction',
	'qualifying',
	'tyre_management',
	'consistency'
] as const;

/** Archetype spend multipliers on max bid. */
export const ARCHETYPE_BID_MULT: Record<string, number> = {
	aggressive_spender: 1.25,
	long_term_builder: 0.85,
	pragmatic_pivot: 1.0
};

/** Cash fraction AI will commit to one seat. */
export const AI_BUDGET_FRACTION = 0.08;

export const DEFAULT_CONTRACT_YEARS = 2;
export const BUYOUT_MULT_IF_MISSING = 1.8;
