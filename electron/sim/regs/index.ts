export {
	PROPOSAL_TEMPLATES,
	CAPITAL_WEIGHT_PER_UNIT,
	MAX_CAPITAL_SPEND,
	proposalPasses
} from './constants.js';
export type { RegProposal } from './constants.js';
export { generateWinterProposals } from './proposals.js';
export { decideAiVote, tallyProposal, voteWeight } from './vote.js';
export type { AiVoteContext, TallyResult } from './vote.js';
export { runWinterRegulations, getActiveRegulations } from './session.js';
export type {
	PlayerVote,
	WinterRegsOptions,
	WinterRegsResult,
	PassedRuleResult
} from './session.js';
