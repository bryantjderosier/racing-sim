/** Aggressive spender may nudge slightly over cap. */
export const ARCHETYPE_CAP_BUFFER: Record<string, number> = {
	aggressive_spender: 1.01,
	long_term_builder: 0.92,
	pragmatic_pivot: 0.96
};

/** Fraction of remaining weekly WT/CFD hours to spend. */
export const ARCHETYPE_HOUR_SPEND: Record<string, number> = {
	aggressive_spender: 0.85,
	long_term_builder: 0.45,
	pragmatic_pivot: 0.65
};

/** Cash reserve floor before facility upgrades. */
export const FACILITY_CASH_RESERVE_MULT: Record<string, number> = {
	aggressive_spender: 3.5,
	long_term_builder: 1.2,
	pragmatic_pivot: 1.8
};

/** Long-term builder soft share of cash toward facilities. */
export const BUILDER_FACILITY_INCOME_SHARE = 0.4;

export const AI_FACILITY_PRIORITY: Record<string, string[]> = {
	aggressive_spender: ['simulator', 'wind_tunnel', 'cfd_lab', 'foundry'],
	long_term_builder: ['wind_tunnel', 'cfd_lab', 'foundry', 'simulator', 'staff_academy'],
	pragmatic_pivot: ['cfd_lab', 'design_studio', 'wind_tunnel', 'scouting_hq']
};

export const AI_RD_SLOTS = [
	'front_wing',
	'rear_wing',
	'underfloor',
	'sidepods',
	'suspension',
	'power_unit'
] as const;
