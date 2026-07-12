export {
	DIVISION_STAFF_SALARY_CAP,
	DIVISION_STAFF_MARKET_BASE,
	CORE_STAFF_ROLES,
	STAFF_SKILL_ATTRS
} from './constants.js';
export type { StaffRole, StaffMarketProfile } from './types.js';
export { skillScore, staffMarketRateAnnual, staffStarWeight } from './value.js';
export { evaluateStaffOffer } from './accept.js';
export type { StaffAcceptContext } from './accept.js';
export { computeStaffAiMaxBid } from './bid.js';
export type { StaffAiBidContext } from './bid.js';
export { scanStaffMarketHeat, teamsMissingStaffRoles, loadStaffAttrs } from './heat.js';
export type { HotStaff, MarketHeatReason } from './heat.js';
export {
	buildStaffProfile,
	signStaffContract,
	buyoutStaff,
	seedStaffContracts
} from './contracts.js';
export type {
	SignStaffContractInput,
	SignStaffContractResult,
	SeedStaffContractRow
} from './contracts.js';
export { tickStaffMarket, previewStaffOffer } from './tick.js';
export type {
	StaffMarketTickOptions,
	StaffMarketTickResult,
	StaffMarketTickSigning
} from './tick.js';
