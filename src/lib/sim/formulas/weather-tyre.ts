import { clamp, roundHalfEven } from '../core/math';
import type {
	EngineMode,
	TrackSegment,
	TyreCompoundSpec,
	TyreConservation,
	WeatherTyreConfig
} from '../core/types';

const PPM = 1_000_000;
const BASIS_POINTS = 10_000;

function required(value: number | undefined, name: string): number {
	if (value === undefined) throw new Error(`Weather tyre field ${name} is required`);
	return value;
}

function thermalDistanceDeciC(compound: TyreCompoundSpec, temperatureDeciC: number): number {
	const minimum = required(compound.operatingTempMinDeciC, 'operatingTempMinDeciC');
	const maximum = required(compound.operatingTempMaxDeciC, 'operatingTempMaxDeciC');
	return Math.max(minimum - temperatureDeciC, temperatureDeciC - maximum, 0);
}

export function weatherTyreTemperatureDeciC(
	compound: TyreCompoundSpec,
	currentTemperatureDeciC: number,
	mode: EngineMode,
	conservation: TyreConservation,
	segment: TrackSegment,
	racingLineWetnessBp: number,
	trackTempDeciC: number,
	config: Readonly<WeatherTyreConfig>
): number {
	const energyDeltaPpm = roundHalfEven((segment.tyreEnergyFactor - 1) * PPM);
	const energyHeatDeciC = roundHalfEven((energyDeltaPpm * config.segmentEnergyHeatDeciC) / PPM);
	const modeHeatDeciC =
		mode === 'attack'
			? config.attackModeHeatDeciC
			: mode === 'conserve'
				? config.conserveModeHeatDeciC
				: 0;
	const conservationHeatDeciC =
		conservation === 'push'
			? config.pushConservationHeatDeciC
			: conservation === 'save'
				? config.saveConservationHeatDeciC
				: 0;
	const surfaceCoolingDeciC = roundHalfEven(
		(racingLineWetnessBp * config.surfaceWaterCoolingDeciC) / BASIS_POINTS
	);
	const compoundCoolingDeciC = roundHalfEven(
		(required(compound.optimalWetnessMinBp, 'optimalWetnessMinBp') *
			config.compoundWetnessCoolingDeciC) /
			BASIS_POINTS
	);
	const targetTemperatureDeciC =
		trackTempDeciC +
		config.frictionHeatDeciC +
		energyHeatDeciC +
		modeHeatDeciC +
		conservationHeatDeciC -
		surfaceCoolingDeciC -
		compoundCoolingDeciC;
	const temperatureChangeDeciC = roundHalfEven(
		((targetTemperatureDeciC - currentTemperatureDeciC) * config.temperatureResponsePpmPerSegment) /
			PPM
	);
	return clamp(currentTemperatureDeciC + temperatureChangeDeciC, -500, 1_500);
}

export function weatherTyreFactor(
	compound: TyreCompoundSpec,
	temperatureDeciC: number,
	racingLineWetnessBp: number,
	segment: TrackSegment,
	config: Readonly<WeatherTyreConfig>
): number {
	const minimumWetnessBp = required(compound.optimalWetnessMinBp, 'optimalWetnessMinBp');
	const maximumWetnessBp = required(compound.optimalWetnessMaxBp, 'optimalWetnessMaxBp');
	const belowRangeBp = Math.max(0, minimumWetnessBp - racingLineWetnessBp);
	const aboveRangeBp = Math.max(0, racingLineWetnessBp - maximumWetnessBp);
	const belowRangePenaltyPpm = roundHalfEven(
		(belowRangeBp * required(compound.underWetnessLossPpm, 'underWetnessLossPpm')) / BASIS_POINTS
	);
	const aboveRangePenaltyPpm = roundHalfEven(
		((aboveRangeBp * required(compound.overWetnessLossPpm, 'overWetnessLossPpm')) / BASIS_POINTS) *
			(PPM / required(compound.waterClearingPpm, 'waterClearingPpm'))
	);
	const wetnessPenaltyPpm = roundHalfEven(
		((belowRangePenaltyPpm + aboveRangePenaltyPpm) *
			required(segment.wetGripSensitivityPpm, 'wetGripSensitivityPpm')) /
			PPM
	);
	const thermalPenaltyPpm = Math.min(
		config.maximumThermalGripLossPpm,
		thermalDistanceDeciC(compound, temperatureDeciC) * config.thermalGripLossPpmPerDeciC
	);
	return 1 + (wetnessPenaltyPpm + thermalPenaltyPpm) / PPM;
}

export function weatherAdjustedTyreWearBp(
	compound: TyreCompoundSpec,
	currentWearBp: number,
	baseUpdatedWearBp: number,
	temperatureDeciC: number,
	racingLineWetnessBp: number,
	wearLimitBp: number,
	config: Readonly<WeatherTyreConfig>
): number {
	const baseWearDeltaBp = Math.max(0, baseUpdatedWearBp - currentWearBp);
	const minimumWetnessBp = required(compound.optimalWetnessMinBp, 'optimalWetnessMinBp');
	const belowRangeBp = Math.max(0, minimumWetnessBp - racingLineWetnessBp);
	const dryMismatchPpm =
		minimumWetnessBp === 0 ? 0 : roundHalfEven((belowRangeBp * PPM) / minimumWetnessBp);
	const dryWearMultiplierPpm =
		PPM +
		roundHalfEven(
			(dryMismatchPpm *
				(required(compound.dryTrackWearMultiplierPpm, 'dryTrackWearMultiplierPpm') - PPM)) /
				PPM
		);
	const thermalWearMultiplierPpm =
		PPM +
		Math.min(
			config.maximumThermalWearPpm,
			thermalDistanceDeciC(compound, temperatureDeciC) * config.thermalWearPpmPerDeciC
		);
	const adjustedWearDeltaBp = roundHalfEven(
		(baseWearDeltaBp * dryWearMultiplierPpm * thermalWearMultiplierPpm) / PPM / PPM
	);
	return clamp(currentWearBp + Math.max(1, adjustedWearDeltaBp), 0, wearLimitBp);
}
