import type { FormulaConfig, SimulationTrack } from '../core/types';

export function pitStopLossMs(track: SimulationTrack, config: FormulaConfig): number {
	return track.pitLaneLossMs + config.pitServiceMs;
}
