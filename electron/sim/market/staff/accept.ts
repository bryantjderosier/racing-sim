import { ACCEPT_THRESHOLD, LEVERAGE_THRESHOLD_RELIEF } from '../constants.js';
import type { AcceptResult, ContractOfferTerms } from '../accept.js';
import { BUDGET_GUARANTEE_PTS } from './constants.js';
import type { StaffMarketProfile } from './types.js';
import { staffMarketRateAnnual, staffStarWeight } from './value.js';

export type StaffAcceptContext = {
	staff: StaffMarketProfile;
	teamReputation: number;
	teamStanding?: number | null;
	scoutLeverage?: number;
	currentSalary?: number | null;
	leavingTeam?: boolean;
	budgetGuarantee?: boolean;
	rng?: () => number;
};

export function evaluateStaffOffer(
	offer: ContractOfferTerms,
	ctx: StaffAcceptContext
): AcceptResult {
	const rng = ctx.rng ?? Math.random;
	const marketRate = staffMarketRateAnnual(ctx.staff);
	const star = staffStarWeight(ctx.staff);
	const loyalty = ctx.staff.loyalty;
	const salaryRatio = offer.salaryAnnual / Math.max(1, marketRate);
	const salaryPts = Math.max(0, Math.min(40, (salaryRatio - 0.7) * 50));
	const yearsPts =
		offer.years <= 0 ? 0 : offer.years === 1 ? 6 : offer.years === 2 ? 14 : 18;

	const repNeed = 38 + (star - 1) * 35;
	const repPts = Math.max(0, Math.min(18, ((ctx.teamReputation - repNeed) / 30) * 18 * star));
	const standingPts =
		ctx.teamStanding == null
			? 4
			: Math.max(0, Math.min(8, (21 - ctx.teamStanding) * 0.4));

	const budgetPts = ctx.budgetGuarantee ? BUDGET_GUARANTEE_PTS : 0;
	const bonusPts = Math.min(5, ((offer.performanceBonus ?? 0) / marketRate) * 8);

	let loyaltyPenalty = 0;
	if (ctx.leavingTeam) {
		loyaltyPenalty = (loyalty / 100) * 14;
		if (ctx.currentSalary != null && offer.salaryAnnual < ctx.currentSalary * 1.08) {
			loyaltyPenalty += 7;
		}
	}

	const moraleBoost = ((ctx.staff.morale - 50) / 50) * 3;
	const egoRep =
		star > 1.05 ? Math.max(-5, Math.min(5, (ctx.teamReputation - 50) / 12)) : 0;

	const breakdown = {
		salary: salaryPts,
		years: yearsPts,
		reputation: repPts,
		standing: standingPts,
		budgetGuarantee: budgetPts,
		bonus: bonusPts,
		morale: moraleBoost,
		egoRep,
		loyaltyPenalty: -loyaltyPenalty
	};

	const score =
		salaryPts +
		yearsPts +
		repPts +
		standingPts +
		budgetPts +
		bonusPts +
		moraleBoost +
		egoRep -
		loyaltyPenalty;

	const leverage = ctx.scoutLeverage ?? 40;
	const threshold =
		ACCEPT_THRESHOLD - leverage * LEVERAGE_THRESHOLD_RELIEF + (rng() - 0.5) * 6;

	return {
		score,
		threshold,
		accepted: score >= threshold,
		marketRate,
		breakdown
	};
}
