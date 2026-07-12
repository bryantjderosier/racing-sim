import {
	DIVISION_MARKET_BASE,
	DIVISION_SALARY_CAP,
	PACE_ATTRS
} from './constants.js';

export type DriverMarketProfile = {
	driverId: number;
	age: number;
	morale: number;
	ego?: number;
	loyalty?: number;
	attrs: Record<string, number>;
	/** Current division of their team (or target division if free). */
	division: number;
};

export function paceScore(attrs: Record<string, number>): number {
	let sum = 0;
	for (const k of PACE_ATTRS) sum += attrs[k] ?? 50;
	return sum / PACE_ATTRS.length;
}

/**
 * Fair annual market rate from pace + marketability + division.
 */
export function marketRateAnnual(profile: DriverMarketProfile): number {
	const pace = paceScore(profile.attrs) / 100;
	const mkt = (profile.attrs.marketability ?? 50) / 100;
	const base = DIVISION_MARKET_BASE[profile.division] ?? DIVISION_MARKET_BASE[1];
	const agePenalty = profile.age > 34 ? 1 - (profile.age - 34) * 0.04 : 1;
	const rate = base * (0.35 + 0.65 * pace) * (0.8 + 0.4 * mkt) * Math.max(0.55, agePenalty);
	const cap = DIVISION_SALARY_CAP[profile.division] ?? DIVISION_SALARY_CAP[1];
	return Math.round(Math.min(cap, Math.max(base * 0.25, rate)));
}

export function starWeight(attrs: Record<string, number>): number {
	const pace = paceScore(attrs);
	return pace >= 82 ? 1.25 : pace >= 75 ? 1.1 : 1;
}
