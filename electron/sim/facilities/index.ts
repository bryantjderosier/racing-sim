export {
	FACILITY_COST_BASE,
	MAX_FACILITY_TIER,
	upgradeCost,
	daysToWeeks,
	parallelProjectSlots
} from './costs.js';
export type { FacilityType, FacilityUpgradeCost } from './costs.js';
export {
	startFacilityBuild,
	completeFacilityBuilds,
	getFacilityUpgradeQuote
} from './build.js';
export type {
	StartFacilityBuildInput,
	StartFacilityBuildResult,
	CompletedFacility
} from './build.js';

// Re-export efficiency helpers used alongside builds
export {
	facilityEfficiencyMult,
	applyFacilityDecay,
	applyFacilityMaintenance
} from '../world/facilities.js';
