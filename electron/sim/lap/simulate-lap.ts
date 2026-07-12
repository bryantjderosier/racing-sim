import { simulateSector } from './sector.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	LapResult,
	SectorBreakdown,
	TrackLapContext
} from './types.js';

/**
 * Resolve one flying lap as three multiplicative sector times.
 * Mutates runtime state through wear, fuel burn, battery, and tire temp.
 */
export function simulateLap(
	car: CarPerformance,
	driver: DriverLapAttrs,
	track: TrackLapContext,
	state: CarRuntimeState
): LapResult {
	let runtime = state;
	const sectors: SectorBreakdown[] = [];
	const times: number[] = [];

	for (const sector of track.sectors) {
		const { breakdown, stateAfter } = simulateSector(
			sector,
			car,
			driver,
			track,
			runtime
		);
		sectors.push(breakdown);
		times.push(breakdown.timeMs);
		runtime = stateAfter;
	}

	const sectorTimesMs = times as [number, number, number];
	return {
		sectorTimesMs,
		lapTimeMs: sectorTimesMs[0] + sectorTimesMs[1] + sectorTimesMs[2],
		sectors: sectors as [SectorBreakdown, SectorBreakdown, SectorBreakdown],
		stateAfter: runtime
	};
}
