import type {
	EntrySimulationState,
	RaceInput,
	RaceResultDetailOutput,
	SessionPointAwardOutput,
	SessionResultOutput
} from '../core/types';

function finalOrder(states: EntrySimulationState[]): EntrySimulationState[] {
	return [...states].sort(
		(left, right) =>
			left.elapsedMs - right.elapsedMs || left.sessionEntryId.localeCompare(right.sessionEntryId)
	);
}

export function buildSessionResults(
	input: RaceInput,
	states: EntrySimulationState[]
): SessionResultOutput[] {
	const ordered = finalOrder(states);
	const winnerTime = ordered[0].elapsedMs;
	return ordered.map((state, index) => ({
		sessionEntryId: state.sessionEntryId,
		position: index + 1,
		gridPosition: state.gridPosition,
		status: 'finished',
		totalTimeMs: state.elapsedMs,
		gapToWinnerMs: state.elapsedMs - winnerTime,
		bestLapMs: state.fastestLapMs ?? 0,
		lapsCompleted: input.rules.lapCount
	}));
}

export function buildRaceDetails(
	results: SessionResultOutput[],
	states: EntrySimulationState[]
): RaceResultDetailOutput[] {
	const statesById = new Map(states.map((state) => [state.sessionEntryId, state]));
	return results.map((result) => {
		const state = statesById.get(result.sessionEntryId)!;
		return {
			sessionEntryId: result.sessionEntryId,
			pitStops: state.pitStops,
			lapsLed: state.lapsLed,
			positionsGained: result.gridPosition - result.position
		};
	});
}

export function buildPointAwards(
	input: RaceInput,
	results: SessionResultOutput[]
): SessionPointAwardOutput[] {
	const awards: SessionPointAwardOutput[] = [];
	for (const result of results) {
		const points = input.rules.points[result.position - 1] ?? 0;
		if (points > 0)
			awards.push({ sessionEntryId: result.sessionEntryId, reason: 'position', points });
	}
	const fastest = [...results].sort(
		(left, right) =>
			left.bestLapMs - right.bestLapMs || left.sessionEntryId.localeCompare(right.sessionEntryId)
	)[0];
	if (fastest && input.rules.fastestLapPoint > 0) {
		awards.push({
			sessionEntryId: fastest.sessionEntryId,
			reason: 'fastest_lap',
			points: input.rules.fastestLapPoint
		});
	}
	const pole = [...input.entries].sort(
		(left, right) =>
			left.gridPosition - right.gridPosition ||
			left.sessionEntryId.localeCompare(right.sessionEntryId)
	)[0];
	if (pole && input.rules.polePoint > 0) {
		awards.push({
			sessionEntryId: pole.sessionEntryId,
			reason: 'pole',
			points: input.rules.polePoint
		});
	}
	return awards;
}
