export {
	ATTR_BAND_HALF_AT_ZERO,
	WEEKLY_CONF_GAIN_BASE,
	MAX_SCOUT_SLOTS,
	DRIVER_META_KEYS
} from './constants.js';
export {
	attrBandFromConfidence,
	metaBandFromConfidence,
	weeklyConfidenceGain,
	parallelScoutSlots
} from './fog.js';
export type { AttrFogBand, MetaFogBand } from './fog.js';
export { getScoutNetworkStats } from './stats.js';
export type { ScoutNetworkStats } from './stats.js';
export {
	getFoggedProfile,
	assignScoutTarget,
	unassignScoutTarget,
	tickTeamScouting,
	tickAllTeamsScouting
} from './profile.js';
export type {
	FoggedPersonnelProfile,
	AssignScoutResult,
	ScoutTickProgress,
	ScoutTickResult
} from './profile.js';
