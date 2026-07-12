import {
	AI_STAFF_BUDGET_FRACTION,
	DEFAULT_STAFF_CONTRACT_YEARS,
	DIVISION_STAFF_SALARY_CAP
} from './constants.js';
import type { ContractOfferTerms } from '../accept.js';
import { ARCHETYPE_BID_MULT, BUYOUT_MULT_IF_MISSING } from '../constants.js';
import { staffMarketRateAnnual } from './value.js';
import type { StaffMarketProfile } from './types.js';

export type StaffAiBidContext = {
	staff: StaffMarketProfile;
	liquidCash: number;
	division: number;
	archetype?: string;
	need: number;
	buyoutRequired?: number;
};

export function computeStaffAiMaxBid(ctx: StaffAiBidContext): {
	maxSalary: number;
	offer: ContractOfferTerms;
	canAffordBuyout: boolean;
	budgetGuarantee: boolean;
} {
	const fair = staffMarketRateAnnual(ctx.staff);
	const arch = ARCHETYPE_BID_MULT[ctx.archetype ?? ''] ?? 1;
	const need = Math.max(0.25, Math.min(1.4, ctx.need));
	const budgetSlice = ctx.liquidCash * AI_STAFF_BUDGET_FRACTION;
	const cap = DIVISION_STAFF_SALARY_CAP[ctx.division] ?? DIVISION_STAFF_SALARY_CAP[1];

	let maxSalary = Math.min(cap, fair * need * arch, budgetSlice);
	maxSalary = Math.round(Math.max(fair * 0.55, maxSalary));

	const buyout = ctx.buyoutRequired ?? 0;
	const canAffordBuyout = ctx.liquidCash >= buyout + maxSalary * 0.1;
	if (!canAffordBuyout && buyout > 0) maxSalary = Math.round(maxSalary * 0.75);

	const budgetGuarantee = need >= 0.9 || (ctx.archetype === 'long_term_builder' && need >= 0.7);

	return {
		maxSalary,
		canAffordBuyout: ctx.liquidCash >= buyout,
		budgetGuarantee,
		offer: {
			salaryAnnual: maxSalary,
			years: DEFAULT_STAFF_CONTRACT_YEARS,
			isNumberOne: false,
			buyoutFee: Math.round(maxSalary * BUYOUT_MULT_IF_MISSING * 0.55),
			releaseClause: Math.round(maxSalary * 2.2),
			performanceBonus: Math.round(maxSalary * 0.06)
		}
	};
}
