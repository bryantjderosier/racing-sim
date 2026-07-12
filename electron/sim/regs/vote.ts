import type { DevelopableSlot } from '../rd/types.js';
import type { RegProposal } from './constants.js';
import { CAPITAL_WEIGHT_PER_UNIT, MAX_CAPITAL_SPEND } from './constants.js';

export type AiVoteContext = {
	archetype?: string;
	/** Team avg PP in affected slot (null if no parts / global). */
	slotStrength: number | null;
	/** Field avg PP in that slot. */
	fieldSlotAvg: number | null;
	/** Fraction on next-year car (1 - rdPivotCurrent). */
	nextYearPivot: number;
	rng?: () => number;
};

/**
 * AI vote: archetype + car strength in slot.
 * Strong in slot → oppose harsh hits; builders favor resets; spenders protect current kit.
 */
export function decideAiVote(proposal: RegProposal, ctx: AiVoteContext): {
	voteFor: boolean;
	capitalSpend: number;
} {
	const rng = ctx.rng ?? Math.random;
	let lean = 0; // >0 means vote FOR the proposal

	const slot = proposal.affectedSlot;
	if (slot && ctx.slotStrength != null && ctx.fieldSlotAvg != null && ctx.fieldSlotAvg > 0) {
		const relative = ctx.slotStrength / ctx.fieldSlotAvg;
		if (proposal.impact === 'category_ban' || proposal.impact === 'major_overhaul') {
			lean -= (relative - 1) * 2.5;
		} else {
			lean -= (relative - 1) * 1.2;
		}
	}

	const arch = ctx.archetype ?? 'pragmatic_pivot';
	if (arch === 'aggressive_spender') {
		lean -= proposal.impact === 'minor_tweak' ? 0.3 : 1.2;
	} else if (arch === 'long_term_builder') {
		lean += proposal.impact === 'minor_tweak' ? 0.4 : 0.9;
	} else {
		// pragmatic: support if already pivoted to next year
		lean += (ctx.nextYearPivot - 0.4) * 1.5;
		if (proposal.impact === 'category_ban') lean -= 0.5;
	}

	lean += (rng() - 0.5) * 0.8;
	const voteFor = lean > 0;

	// Shallow capital: spend when lean is close / high conviction
	let capitalSpend = 0;
	const conviction = Math.abs(lean);
	if (conviction > 0.9 && rng() < 0.45) {
		capitalSpend = Math.min(MAX_CAPITAL_SPEND, Math.round(conviction * 2));
	}

	return { voteFor, capitalSpend };
}

export function voteWeight(capitalSpent: number): number {
	return 1 + Math.max(0, Math.min(MAX_CAPITAL_SPEND, capitalSpent)) * CAPITAL_WEIGHT_PER_UNIT;
}

export type TallyResult = {
	proposalId: number;
	yesWeight: number;
	noWeight: number;
	passed: boolean;
	votesFor: number;
	votesAgainst: number;
};

export function tallyProposal(
	proposalId: number,
	votes: { voteFor: boolean; politicalCapitalSpent: number }[]
): TallyResult {
	let yesWeight = 0;
	let noWeight = 0;
	let votesFor = 0;
	let votesAgainst = 0;
	for (const v of votes) {
		const w = voteWeight(v.politicalCapitalSpent);
		if (v.voteFor) {
			yesWeight += w;
			votesFor++;
		} else {
			noWeight += w;
			votesAgainst++;
		}
	}
	return {
		proposalId,
		yesWeight,
		noWeight,
		passed: yesWeight > noWeight,
		votesFor,
		votesAgainst
	};
}

export type SlotStrengthMap = Map<number, Partial<Record<DevelopableSlot, number>>>;
