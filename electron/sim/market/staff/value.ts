import {
	DIVISION_STAFF_MARKET_BASE,
	DIVISION_STAFF_SALARY_CAP,
	STAFF_SKILL_ATTRS
} from './constants.js';
import type { StaffMarketProfile, StaffRole } from './types.js';

export function skillScore(role: StaffRole, attrs: Record<string, number>): number {
	const keys = STAFF_SKILL_ATTRS[role] ?? [];
	if (keys.length === 0) return 50;
	let sum = 0;
	for (const k of keys) sum += attrs[k] ?? 50;
	return sum / keys.length;
}

export function staffMarketRateAnnual(profile: StaffMarketProfile): number {
	const skill = skillScore(profile.role, profile.attrs) / 100;
	const base = DIVISION_STAFF_MARKET_BASE[profile.division] ?? DIVISION_STAFF_MARKET_BASE[1];
	const rate = base * (0.4 + 0.6 * skill);
	const cap = DIVISION_STAFF_SALARY_CAP[profile.division] ?? DIVISION_STAFF_SALARY_CAP[1];
	return Math.round(Math.min(cap, Math.max(base * 0.3, rate)));
}

export function staffStarWeight(profile: StaffMarketProfile): number {
	const skill = skillScore(profile.role, profile.attrs);
	return skill >= 85 ? 1.2 : skill >= 75 ? 1.08 : 1;
}
