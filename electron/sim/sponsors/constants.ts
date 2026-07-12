export type SponsorSlotType = 'title' | 'major' | 'minor';
export type SponsorPayoutType = 'upfront' | 'per_race' | 'bonus';

/** Inventory caps per team. */
export const SLOT_CAPS: Record<SponsorSlotType, number> = {
	title: 1,
	major: 2,
	minor: 3
};

/** Division scales for offered amounts. */
export const DIVISION_SPONSOR_MULT: Record<number, number> = {
	1: 1,
	2: 0.55,
	3: 0.28
};

export const BASE_UPFRONT: Record<SponsorSlotType, number> = {
	title: 12_000_000,
	major: 4_500_000,
	minor: 800_000
};

export const BASE_PER_RACE: Record<SponsorSlotType, number> = {
	title: 450_000,
	major: 280_000,
	minor: 90_000
};

export const BASE_BONUS: Record<SponsorSlotType, number> = {
	title: 2_500_000,
	major: 900_000,
	minor: 350_000
};

export const DEFAULT_TITLE_YEARS = 3;
export const DEFAULT_MAJOR_YEARS = 2;
export const DEFAULT_MINOR_RACES = 6;

/** Ethics mismatch above this blocks the deal. */
export const ETHICS_BLOCK_THRESHOLD = 0.72;

/** Soft nationality mismatch payout penalty. */
export const NAT_MISMATCH_PENALTY = 0.08;
