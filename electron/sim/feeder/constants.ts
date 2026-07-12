export type PotentialTier = 'bronze' | 'silver' | 'gold' | 'elite';

/** Age at which graduation is considered. */
export const GRADUATION_AGE = 16;

/**
 * Aggregate pace-attr average required to graduate (tier alone insufficient).
 */
export const GRADUATION_ATTR_THRESHOLD = 42;

export const PACE_ATTRS_FOR_GRAD = [
	'braking',
	'cornering',
	'traction',
	'qualifying',
	'tyre_management',
	'consistency',
	'focus'
] as const;

/** Ceiling band midpoints / half-widths by tier. */
export const TIER_CEILING: Record<
	PotentialTier,
	{ mid: number; spread: number; startMid: number; volatility: number }
> = {
	bronze: { mid: 62, spread: 6, startMid: 32, volatility: 0.35 },
	silver: { mid: 72, spread: 6, startMid: 36, volatility: 0.55 },
	gold: { mid: 82, spread: 6, startMid: 40, volatility: 0.75 },
	elite: { mid: 90, spread: 5, startMid: 44, volatility: 1.0 }
};

/** Base attr growth points per strong feeder season result. */
export const FEEDER_GROWTH_BASE = 2.2;

/** Probability a prospect is "discovered" per scout pass at Detection 50 / HQ tier 1. */
export const DETECTION_BASE_CHANCE = 0.12;

export const DRIVER_ATTR_NAMES = [
	'braking',
	'cornering',
	'traction',
	'tyre_management',
	'wet_driving',
	'composure',
	'focus',
	'aggression',
	'feedback',
	'qualifying',
	'overtaking',
	'defending',
	'launch',
	'traffic_navigation',
	'consistency',
	'adaptability',
	'development',
	'marketability',
	'morale_balance',
	'teamwork'
] as const;

export const NAT_POOL = ['ITA', 'GBR', 'DEU', 'FRA', 'ESP', 'BRA', 'JPN', 'NLD', 'USA', 'FIN'] as const;
