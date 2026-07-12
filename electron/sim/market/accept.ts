import {
	ACCEPT_THRESHOLD,
	LEVERAGE_THRESHOLD_RELIEF
} from './constants.js';
import { marketRateAnnual, starWeight, type DriverMarketProfile } from './value.js';

export type ContractOfferTerms = {
	salaryAnnual: number;
	years: number;
	isNumberOne?: boolean;
	buyoutFee?: number;
	releaseClause?: number;
	performanceBonus?: number;
};

export type AcceptContext = {
	driver: DriverMarketProfile;
	/** Offering team. */
	teamReputation: number;
	teamStanding?: number | null;
	/** Head of Scouting Leverage (0–99). */
	scoutLeverage?: number;
	/** Poaching: current team loyalty / existing deal. */
	currentSalary?: number | null;
	leavingTeam?: boolean;
	rng?: () => number;
};

export type AcceptResult = {
	score: number;
	threshold: number;
	accepted: boolean;
	marketRate: number;
	breakdown: Record<string, number>;
};

/**
 * Accept score vs offer. Threshold + small noise; Leverage lowers threshold.
 */
export function evaluateOffer(
	offer: ContractOfferTerms,
	ctx: AcceptContext
): AcceptResult {
	const rng = ctx.rng ?? Math.random;
	const marketRate = marketRateAnnual(ctx.driver);
	const star = starWeight(ctx.driver.attrs);
	const loyalty = ctx.driver.loyalty ?? 50;
	const ego = ctx.driver.ego ?? ctx.driver.attrs.morale_balance ?? 50;

	const salaryRatio = offer.salaryAnnual / Math.max(1, marketRate);
	const salaryPts = Math.max(0, Math.min(40, (salaryRatio - 0.7) * 50));

	const yearsPts =
		offer.years <= 0 ? 0 : offer.years === 1 ? 6 : offer.years === 2 ? 14 : offer.years >= 3 ? 18 : 10;

	const repNeed = 40 + (star - 1) * 40;
	const repPts = Math.max(0, Math.min(20, ((ctx.teamReputation - repNeed) / 30) * 20 * star));

	const standingPts =
		ctx.teamStanding == null
			? 5
			: Math.max(0, Math.min(10, (21 - ctx.teamStanding) * 0.5));

	const numberOnePts = offer.isNumberOne ? 10 : 0;
	const bonusPts = Math.min(5, ((offer.performanceBonus ?? 0) / marketRate) * 8);

	let loyaltyPenalty = 0;
	if (ctx.leavingTeam) {
		loyaltyPenalty = (loyalty / 100) * 12;
		if (ctx.currentSalary != null && offer.salaryAnnual < ctx.currentSalary * 1.05) {
			loyaltyPenalty += 8;
		}
	}

	const moraleBoost = ((ctx.driver.morale - 50) / 50) * 4;
	const egoRep =
		star > 1.05 ? Math.max(-6, Math.min(6, (ctx.teamReputation - 55) / 10)) : 0;

	const breakdown = {
		salary: salaryPts,
		years: yearsPts,
		reputation: repPts,
		standing: standingPts,
		numberOne: numberOnePts,
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
		numberOnePts +
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
