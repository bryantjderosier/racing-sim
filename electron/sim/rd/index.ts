export {
	HOURS_TO_COMPLETE,
	SLOT_PP_FLOOR,
	SLOT_PP_CEILING,
	AERO_SLOTS,
	DESIGNER_ROLE_BY_SLOT,
	DESIGNER_ATTRS_BY_SLOT
} from './constants.js';
export { computeBlueprintQuality, effectiveTestingHours } from './quality.js';
export {
	bandFromConfidence,
	applyMileageToFog,
	rollFlaws,
	flawsRevealedByConfidence
} from './fog.js';
export {
	startRdProject,
	allocateTestingHours,
	completeRdProject
} from './project.js';
export type {
	StartProjectInput,
	StartProjectResult,
	AllocateHoursInput,
	AllocateHoursResult,
	CompleteProjectResult
} from './project.js';
export {
	queueManufacture,
	completeManufacture,
	applyBlueprintMileage
} from './manufacture.js';
export type {
	QueueManufactureInput,
	QueueManufactureResult,
	CompleteManufactureResult,
	MileageRevealResult
} from './manufacture.js';
export { applyWinterRegression } from './winter.js';
export type { WinterRegressionInput, WinterRegressionResult } from './winter.js';
export type {
	DevelopableSlot,
	RdFocus,
	PartFlawType,
	RegulationImpact,
	QualityInput,
	QualityResult,
	FogBand,
	RolledFlaw
} from './types.js';
