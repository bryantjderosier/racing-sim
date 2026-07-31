import { canonicalStringify } from '../core/canonicalize';
import { runRace } from '../core/engine';
import { createAcademyRaceInput } from '../fixtures/academy-baseline';
import { timingSheetCsv } from '../output/telemetry';
import { argumentValue, integerArgument } from './arguments';

const entryCount = integerArgument('entries', 30);
const lapCount = integerArgument('laps', 50);
const seed = argumentValue('seed', 'academy-baseline-001');
const format = argumentValue('format', 'table');
const input = createAcademyRaceInput({ entryCount, lapCount, seed });
const result = runRace(input);

if (format === 'json') {
	process.stdout.write(`${canonicalStringify(result)}\n`);
} else if (format === 'csv') {
	process.stdout.write(`${timingSheetCsv(result)}\n`);
} else if (format === 'table') {
	const detailByEntry = new Map(
		result.raceDetails.map((detail) => [detail.sessionEntryId, detail])
	);
	console.table(
		result.sessionResults.map((entry) => ({
			pos: entry.position,
			entry: entry.sessionEntryId,
			grid: entry.gridPosition,
			timeMs: entry.totalTimeMs,
			gapMs: entry.gapToWinnerMs,
			bestLapMs: entry.bestLapMs,
			stops: detailByEntry.get(entry.sessionEntryId)!.pitStops
		}))
	);
	console.log(`finalStateHash=${result.finalStateHash} events=${result.events.length}`);
} else {
	throw new Error('--format must be table, json, or csv');
}
