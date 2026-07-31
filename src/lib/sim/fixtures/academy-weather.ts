import type { TyreCompoundSpec } from '../core/types';
import { ACADEMY_COMPOUNDS } from './academy-baseline';

const SLICK_WEATHER_SPEC = Object.freeze({
	optimalWetnessMinBp: 0,
	optimalWetnessMaxBp: 800,
	underWetnessLossPpm: 1,
	overWetnessLossPpm: 500_000,
	waterClearingPpm: 650_000,
	dryTrackWearMultiplierPpm: 1_000_000,
	operatingTempMinDeciC: 800,
	operatingTempMaxDeciC: 1_050
});

export const ACADEMY_WEATHER_COMPOUNDS: Readonly<
	Record<'soft' | 'medium' | 'hard' | 'intermediate' | 'wet', TyreCompoundSpec>
> = Object.freeze({
	soft: { ...ACADEMY_COMPOUNDS.soft, ...SLICK_WEATHER_SPEC },
	medium: { ...ACADEMY_COMPOUNDS.medium, ...SLICK_WEATHER_SPEC },
	hard: { ...ACADEMY_COMPOUNDS.hard, ...SLICK_WEATHER_SPEC },
	intermediate: {
		name: 'intermediate',
		peakGripPpm: 995_000,
		warmupLaps: 1.5,
		baseWearPerLapBp: 165,
		wearTimeLossMsPerLap: 1_700,
		wearKneeBp: 3_000,
		postKneeTimeLossMsPerLap: 6_500,
		optimalWetnessMinBp: 1_800,
		optimalWetnessMaxBp: 6_000,
		underWetnessLossPpm: 260_000,
		overWetnessLossPpm: 320_000,
		waterClearingPpm: 1_000_000,
		dryTrackWearMultiplierPpm: 1_800_000,
		operatingTempMinDeciC: 650,
		operatingTempMaxDeciC: 850
	},
	wet: {
		name: 'wet',
		peakGripPpm: 985_000,
		warmupLaps: 1.2,
		baseWearPerLapBp: 150,
		wearTimeLossMsPerLap: 1_600,
		wearKneeBp: 3_000,
		postKneeTimeLossMsPerLap: 6_000,
		optimalWetnessMinBp: 5_000,
		optimalWetnessMaxBp: 10_000,
		underWetnessLossPpm: 400_000,
		overWetnessLossPpm: 1,
		waterClearingPpm: 1_500_000,
		dryTrackWearMultiplierPpm: 3_000_000,
		operatingTempMinDeciC: 500,
		operatingTempMaxDeciC: 750
	}
});
