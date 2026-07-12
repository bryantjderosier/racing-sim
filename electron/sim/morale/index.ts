export {
	MOOD_MIN,
	MOOD_MAX,
	MOOD_NEUTRAL,
	WEEKLY_DRIFT,
	QUIT_MORALE_THRESHOLD,
	QUIT_LOYALTY_THRESHOLD,
	TOXIC_EGO_THRESHOLD
} from './constants.js';
export {
	clampMood,
	moraleXpMult,
	moraleFeedbackMult,
	moraleStrategyErrorChance,
	quitRiskScore,
	driftTowardNeutral
} from './effects.js';
export { tickMorale } from './tick.js';
export type {
	RaceMoraleResult,
	TeamOrderEvent,
	MoraleTickOptions,
	MoraleEntityUpdate,
	MoraleTickResult
} from './tick.js';
