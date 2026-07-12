import {
	AI_BUDGET_FRACTION,
	ARCHETYPE_BID_MULT,
	BUYOUT_MULT_IF_MISSING,
	DEFAULT_CONTRACT_YEARS,
	DIVISION_SALARY_CAP
} from './constants.js';
import type { ContractOfferTerms } from './accept.js';
import { marketRateAnnual, type DriverMarketProfile } from './value.js';

export type AiBidContext = {
	driver: DriverMarketProfile;
	liquidCash: number;
	division: number;
	archetype?: string;
	/** 0–1 how badly the seat is needed (open seat / weak roster). */
	need: number;
	/** Buyout required to pry from current team. */
	buyoutRequired?: number;
};

export type AiBidResult = {
	maxSalary: number;
	offer: ContractOfferTerms;
	canAffordBuyout: boolean;
	totalCashOutlay: number;
};

/**
 * AI max offer: budget × need × target value; archetype bias; division cap.
 */
export function computeAiMaxBid(ctx: AiBidContext): AiBidResult {
	const fair = marketRateAnnual(ctx.driver);
	const arch = ARCHETYPE_BID_MULT[ctx.archetype ?? ''] ?? 1;
	const need = Math.max(0.2, Math.min(1.4, ctx.need));
	const budgetSlice = ctx.liquidCash * AI_BUDGET_FRACTION;
	const cap = DIVISION_SALARY_CAP[ctx.division] ?? DIVISION_SALARY_CAP[1];

	let maxSalary = Math.min(cap, fair * need * arch, budgetSlice);
	maxSalary = Math.round(Math.max(fair * 0.55, maxSalary));

	const buyout = ctx.buyoutRequired ?? 0;
	const canAffordBuyout = ctx.liquidCash >= buyout + maxSalary * 0.1;
	if (!canAffordBuyout && buyout > 0) {
		maxSalary = Math.round(maxSalary * 0.75);
	}

	const isNumberOne = need >= 0.85;
	const offer: ContractOfferTerms = {
		salaryAnnual: maxSalary,
		years: DEFAULT_CONTRACT_YEARS,
		isNumberOne,
		buyoutFee: Math.round(maxSalary * BUYOUT_MULT_IF_MISSING * 0.6),
		releaseClause: Math.round(maxSalary * 2.5),
		performanceBonus: Math.round(maxSalary * 0.08)
	};

	return {
		maxSalary,
		offer,
		canAffordBuyout: ctx.liquidCash >= buyout,
		totalCashOutlay: buyout
	};
}
