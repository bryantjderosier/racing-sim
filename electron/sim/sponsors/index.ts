export {
	SLOT_CAPS,
	DIVISION_SPONSOR_MULT,
	BASE_UPFRONT,
	BASE_PER_RACE,
	BASE_BONUS
} from './constants.js';
export type { SponsorSlotType, SponsorPayoutType } from './constants.js';
export { seedSponsorCatalog, DEFAULT_SPONSOR_CATALOG } from './pool.js';
export type { SponsorSeed } from './pool.js';
export { evaluateSponsorEligibility } from './eligibility.js';
export type { TeamSponsorProfile, EligibilityResult, SponsorGateInput } from './eligibility.js';
export {
	signSponsorDeal,
	buildTeamSponsorProfile,
	countActiveSlots
} from './sign.js';
export type { SignSponsorDealInput, SignSponsorDealResult } from './sign.js';
export { payRaceSponsors, payAllRaceSponsors } from './tick.js';
export type { RaceSponsorPayout, RaceSponsorPayoutResult } from './tick.js';
export { ageSponsorContractsOneYear, listActiveSponsorDeals } from './age.js';
