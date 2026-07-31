import type { FormulaConfig, TrackSegment } from '../core/types';

export function dirtyAirFactor(
	gapMs: number,
	segment: TrackSegment,
	config: FormulaConfig
): number {
	if (gapMs <= 0 || gapMs >= config.trafficThresholdMs) return 1;
	const proximity = 1 - gapMs / config.trafficThresholdMs;
	return 1 + (config.maxDirtyAirPenaltyPpm / 1_000_000) * proximity * segment.dirtyAirSensitivity;
}

export function drsFactor(enabled: boolean, segment: TrackSegment, config: FormulaConfig): number {
	return enabled && segment.isDrsActivation ? 1 - config.drsGainPpm / 1_000_000 : 1;
}
