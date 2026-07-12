export {
	ARCHETYPE_CAP_BUFFER,
	ARCHETYPE_HOUR_SPEND,
	AI_FACILITY_PRIORITY,
	AI_RD_SLOTS
} from './constants.js';
export {
	loadAiProfile,
	listAiTeams,
	capSpendCeiling,
	hourSpendFraction,
	facilityPriority
} from './profile.js';
export type { AiArchetype, AiProfile } from './profile.js';
export { tickAiTeam, tickAllAiManagers } from './tick.js';
export type { AiTeamAction, AiManagersTickResult } from './tick.js';
