import type { DevelopableSlot, RegulationImpact } from '../rd/types.js';

export type RegProposal = {
	id: number;
	description: string;
	impact: RegulationImpact;
	affectedSlot: DevelopableSlot | null;
	/** Display / history penalty pct. */
	performancePenaltyPct: number;
};

export const PROPOSAL_TEMPLATES: Omit<RegProposal, 'id'>[] = [
	{
		description: 'Floor edge restriction — trim underfloor volume',
		impact: 'minor_tweak',
		affectedSlot: 'underfloor',
		performancePenaltyPct: 10
	},
	{
		description: 'Front wing endplate simplification',
		impact: 'minor_tweak',
		affectedSlot: 'front_wing',
		performancePenaltyPct: 10
	},
	{
		description: 'Rear wing beam-wing ban package',
		impact: 'major_overhaul',
		affectedSlot: 'rear_wing',
		performancePenaltyPct: 40
	},
	{
		description: 'Sidepod inlet geometry freeze',
		impact: 'minor_tweak',
		affectedSlot: 'sidepods',
		performancePenaltyPct: 10
	},
	{
		description: 'Suspension geometry clamp (mechanical overhaul)',
		impact: 'major_overhaul',
		affectedSlot: 'suspension',
		performancePenaltyPct: 40
	},
	{
		description: 'Underfloor ground-effect category ban',
		impact: 'category_ban',
		affectedSlot: 'underfloor',
		performancePenaltyPct: 100
	},
	{
		description: 'Power unit fuel-flow & ERS mapping limits',
		impact: 'major_overhaul',
		affectedSlot: 'power_unit',
		performancePenaltyPct: 40
	},
	{
		description: 'Front wing element count reduction',
		impact: 'minor_tweak',
		affectedSlot: 'front_wing',
		performancePenaltyPct: 10
	},
	{
		description: 'Sidepod cooling duct ban (category)',
		impact: 'category_ban',
		affectedSlot: 'sidepods',
		performancePenaltyPct: 100
	}
];

/** Weight of 1.0 political capital → extra vote weight. */
export const CAPITAL_WEIGHT_PER_UNIT = 0.1;

/** Max capital a team may spend on one proposal. */
export const MAX_CAPITAL_SPEND = 5;

/** Pass if weighted yes > weighted no (strict majority of weight). */
export function proposalPasses(yesWeight: number, noWeight: number): boolean {
	return yesWeight > noWeight;
}
