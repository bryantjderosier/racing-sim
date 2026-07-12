export {
	HEAT_WEEK_THRESHOLD,
	ACCEPT_THRESHOLD,
	DIVISION_SALARY_CAP,
	DIVISION_MARKET_BASE
} from './constants.js';
export { paceScore, marketRateAnnual, starWeight } from './value.js';
export type { DriverMarketProfile } from './value.js';
export { evaluateOffer } from './accept.js';
export type { ContractOfferTerms, AcceptContext, AcceptResult } from './accept.js';
export { computeAiMaxBid } from './bid.js';
export type { AiBidContext, AiBidResult } from './bid.js';
export { scanMarketHeat, teamsWithOpenSeats } from './heat.js';
export type { HotDriver, MarketHeatReason } from './heat.js';
export {
	buildDriverProfile,
	getScoutLeverage,
	signDriverContract,
	buyoutDriver,
	seedDriverContracts
} from './contracts.js';
export type { SignContractInput, SignContractResult, SeedContractRow } from './contracts.js';
export { tickDriverMarket, previewDriverOffer } from './tick.js';
export type { MarketTickOptions, MarketTickResult, MarketTickSigning } from './tick.js';

export {
	tickStaffMarket,
	previewStaffOffer,
	signStaffContract,
	buyoutStaff,
	seedStaffContracts,
	scanStaffMarketHeat,
	teamsMissingStaffRoles,
	evaluateStaffOffer,
	staffMarketRateAnnual,
	buildStaffProfile
} from './staff/index.js';
export type {
	StaffRole,
	StaffMarketProfile,
	HotStaff,
	StaffMarketTickResult,
	StaffMarketTickSigning,
	SignStaffContractResult
} from './staff/index.js';
