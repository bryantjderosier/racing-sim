import type { RaceEvent, RaceEventType } from '../core/types';

export function createRaceEvent(
	events: RaceEvent[],
	type: RaceEventType,
	simulationTimeMs: number,
	lap: number,
	segmentId: string,
	sessionEntryIds: string[],
	payload: RaceEvent['payload'] = {}
): RaceEvent {
	return {
		sequence: events.length + 1,
		type,
		simulationTimeMs,
		lap,
		segmentId,
		sessionEntryIds: [...sessionEntryIds].sort(),
		payload
	};
}
