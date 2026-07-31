import type { RaceRunResult } from '../core/types';

export function timingSheetCsv(result: RaceRunResult): string {
	const header = 'position,entry_id,grid,total_time_ms,gap_ms,best_lap_ms,pit_stops,laps_led';
	const details = new Map(result.raceDetails.map((detail) => [detail.sessionEntryId, detail]));
	const rows = result.sessionResults.map((entry) => {
		const detail = details.get(entry.sessionEntryId)!;
		return [
			entry.position,
			entry.sessionEntryId,
			entry.gridPosition,
			entry.totalTimeMs,
			entry.gapToWinnerMs,
			entry.bestLapMs,
			detail.pitStops,
			detail.lapsLed
		].join(',');
	});
	return [header, ...rows].join('\n');
}
