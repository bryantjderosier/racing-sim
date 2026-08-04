import type {
	CarPerformance,
	DriverRatings,
	IssuedTyreSet,
	RaceInput,
	SimulationEntry,
	StrategyCommand,
	TyreCompoundSpec
} from '../core/types';
import { DRY_ENGINE_VERSION, FORMULA_CONFIG } from '../core/config';
import { hashString } from '../core/hash';
import { carFactor } from '../formulas/car';
import { driverFactor } from '../formulas/driver';
import { FICTIONAL_TRACK } from './fictional-track';

const TEAM_NAMES = [
	'Northstar',
	'Vela',
	'Meridian',
	'Forge',
	'Kestrel',
	'Helix',
	'Pioneer',
	'Atlas',
	'Ember',
	'Juniper'
];

const DRIVER_FIRST_NAMES = [
	'Mara',
	'Eli',
	'Noor',
	'Sacha',
	'Tomas',
	'Inez',
	'Kai',
	'Lina',
	'Ravi',
	'Ada'
];

const DRIVER_LAST_NAMES = ['Vale', 'Hart', 'Ibarra'];

export const ACADEMY_COMPOUNDS: Readonly<Record<'soft' | 'medium' | 'hard', TyreCompoundSpec>> =
	Object.freeze({
		soft: {
			name: 'soft',
			peakGripPpm: 1_012_000,
			warmupLaps: 1,
			baseWearPerLapBp: 255,
			wearTimeLossMsPerLap: 1_950,
			wearKneeBp: 2_800,
			postKneeTimeLossMsPerLap: 4_500
		},
		medium: {
			name: 'medium',
			peakGripPpm: 1_005_000,
			warmupLaps: 2,
			baseWearPerLapBp: 178,
			wearTimeLossMsPerLap: 1_420,
			wearKneeBp: 2_200,
			postKneeTimeLossMsPerLap: 8_000
		},
		hard: {
			name: 'hard',
			peakGripPpm: 999_000,
			warmupLaps: 3,
			baseWearPerLapBp: 125,
			wearTimeLossMsPerLap: 1_050,
			wearKneeBp: 4_000,
			postKneeTimeLossMsPerLap: 5_000
		}
	});

function driverRatings(index: number): DriverRatings {
	const team = Math.floor(index / 3);
	const seat = index % 3;
	const baseline = 84 - Math.floor(team / 2) * 4 - seat * 2;
	const rating = (offset: number) => Math.max(0, Math.min(100, baseline + offset * 2));
	return {
		pace: rating(seat === 0 ? 1 : 0),
		raceCraft: rating((index * 3) % 3),
		consistency: rating((index * 5) % 3),
		tyreManagement: rating((index * 7) % 4),
		fuelManagement: rating((index * 2) % 3),
		starts: rating((index * 11) % 3),
		focus: rating((index * 13) % 3),
		aggression: rating((index * 17) % 4),
		composure: rating((index * 19) % 3),
		feedback: rating((index * 23) % 3)
	};
}

function carPerformance(index: number): CarPerformance {
	const team = Math.floor(index / 3);
	const seatVariation = (index % 3) * 0.001;
	const strength = 1.04 - team * 0.007 - seatVariation;
	return {
		topSpeed: strength + (team % 3 === 0 ? 0.008 : -0.003),
		acceleration: strength + (team % 3 === 1 ? 0.007 : -0.002),
		corneringHigh: strength + (team % 3 === 2 ? 0.007 : 0),
		corneringLow: strength + (team % 2 === 0 ? 0.004 : -0.002),
		brakingStability: strength + (team % 2 === 1 ? 0.004 : 0),
		drag: 1.015 - strength * 0.015,
		coolingEfficiency: 0.98 + (9 - team) * 0.004,
		fuelEfficiency: 0.985 + ((team * 3) % 7) * 0.005,
		reliabilityOverall: 0.96 + (9 - team) * 0.003,
		dryWeightKg: 700 + (team % 4) * 0.6
	};
}

function tyreSets(entryId: string): IssuedTyreSet[] {
	return (['soft', 'medium', 'hard'] as const).map((compound) => ({
		id: `${entryId}-${compound}`,
		compound: { ...ACADEMY_COMPOUNDS[compound] }
	}));
}

export function createAcademyEntry(index: number): SimulationEntry {
	const teamIndex = Math.floor(index / 3);
	const seatIndex = index % 3;
	const id = `academy-${String(index + 1).padStart(2, '0')}`;
	return {
		sessionEntryId: id,
		teamId: `team-${String(teamIndex + 1).padStart(2, '0')}`,
		driverId: `driver-${String(index + 1).padStart(2, '0')}`,
		driverName: `${DRIVER_FIRST_NAMES[teamIndex]} ${DRIVER_LAST_NAMES[seatIndex]}`,
		teamName: `${TEAM_NAMES[teamIndex]} Racing`,
		carNumber: teamIndex * 10 + seatIndex + 1,
		gridPosition: index + 1,
		driver: driverRatings(index),
		car: carPerformance(index),
		setupFactorPpm: 997_000 + ((index * 1703) % 7_000),
		tyreWearSetupPpm: 970_000 + ((index * 2137) % 60_001),
		startingFuelGrams: 82_000 + ((index * 317) % 1_400),
		tyreSets: tyreSets(id),
		startingTyreSetId: `${id}-medium`,
		initialMode: 'balanced'
	};
}

function strategyForEntry(
	entry: SimulationEntry,
	index: number,
	lapCount: number,
	twoStop: boolean
): StrategyCommand[] {
	const commands: StrategyCommand[] = [];
	const firstLap = twoStop
		? Math.max(5, Math.round(lapCount * 0.3))
		: Math.max(5, Math.round(lapCount * 0.42));
	commands.push({
		sequence: index * 10 + 1,
		sessionEntryId: entry.sessionEntryId,
		triggerLap: firstLap,
		triggerSegmentId: 'seg-14',
		action: {
			type: 'pit',
			tyreSetId: `${entry.sessionEntryId}-${twoStop ? 'medium' : 'hard'}`
		}
	});
	if (twoStop) {
		commands.push({
			sequence: index * 10 + 2,
			sessionEntryId: entry.sessionEntryId,
			triggerLap: Math.max(firstLap + 5, Math.round(lapCount * 0.64)),
			triggerSegmentId: 'seg-14',
			action: { type: 'pit', tyreSetId: `${entry.sessionEntryId}-hard` }
		});
	}
	return commands;
}

export interface AcademyFixtureOptions {
	seed?: string;
	entryCount?: number;
	lapCount?: number;
	gridMode?: AcademyGridMode;
}

export type AcademyGridMode = 'performance' | 'scrambled';

function predictedQualifyingTimeMs(entry: SimulationEntry): number {
	return FICTIONAL_TRACK.segments.reduce(
		(total, segment) =>
			total +
			segment.baseTimeMs *
				carFactor(entry.car, segment, FORMULA_CONFIG) *
				driverFactor(entry.driver, segment, FORMULA_CONFIG) *
				(entry.setupFactorPpm / 1_000_000),
		0
	);
}

function usesTwoStopStrategy(entry: SimulationEntry, seed: string, lapCount: number): boolean {
	if (lapCount < 30) return false;
	const seatIndex = (Number.parseInt(entry.sessionEntryId.slice(-2), 10) - 1) % 3;
	const selectedSeat =
		Number.parseInt(hashString(`${seed}:strategy:${entry.teamId}`).slice(0, 8), 16) % 3;
	return seatIndex === selectedSeat;
}

function applyGrid(
	entries: SimulationEntry[],
	mode: AcademyGridMode,
	seed: string
): SimulationEntry[] {
	const qualifyingTimeMs = (entry: SimulationEntry) => {
		const draw =
			Number.parseInt(hashString(`${seed}:qualifying:${entry.sessionEntryId}`).slice(0, 8), 16) /
			0xffffffff;
		return predictedQualifyingTimeMs(entry) + (draw * 2 - 1) * FORMULA_CONFIG.qualifyingVarianceMs;
	};
	const ordered =
		mode === 'performance'
			? [...entries].sort(
					(left, right) =>
						qualifyingTimeMs(left) - qualifyingTimeMs(right) ||
						left.sessionEntryId.localeCompare(right.sessionEntryId)
				)
			: [...entries].sort(
					(left, right) =>
						hashString(`${seed}:grid:${left.sessionEntryId}`).localeCompare(
							hashString(`${seed}:grid:${right.sessionEntryId}`)
						) || left.sessionEntryId.localeCompare(right.sessionEntryId)
				);
	const positionById = new Map(
		ordered.map((entry, index) => [entry.sessionEntryId, index + 1] as const)
	);
	return entries.map((entry) => ({
		...entry,
		gridPosition: positionById.get(entry.sessionEntryId)!
	}));
}

export function createAcademyRaceInput(options: AcademyFixtureOptions = {}): RaceInput {
	const entryCount = options.entryCount ?? 30;
	const lapCount = options.lapCount ?? 50;
	const seed = options.seed ?? 'academy-baseline-001';
	if (entryCount < 1 || entryCount > 30) throw new Error('Academy fixture supports 1–30 entries');
	const entries = applyGrid(
		Array.from({ length: entryCount }, (_, index) => createAcademyEntry(index)),
		options.gridMode ?? 'performance',
		seed
	);
	const strategyByEntry = new Map(
		entries.map((entry) => [entry.sessionEntryId, usesTwoStopStrategy(entry, seed, lapCount)])
	);
	for (const entry of entries) {
		entry.startingTyreSetId = `${entry.sessionEntryId}-${
			strategyByEntry.get(entry.sessionEntryId) ? 'soft' : 'medium'
		}`;
	}
	const commands = entries.flatMap((entry, index) =>
		strategyForEntry(entry, index, lapCount, strategyByEntry.get(entry.sessionEntryId)!)
	);
	return {
		formulaVersion: FORMULA_CONFIG.version,
		engineVersion: DRY_ENGINE_VERSION,
		seed,
		rules: {
			lapCount,
			refuelingEnabled: false,
			ersEnabled: false,
			drsEnabled: true,
			drsActivationLap: 3,
			drsGapThresholdMs: 1_000,
			mandatoryPitStops: lapCount >= 10 ? 1 : 0,
			points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
			fastestLapPoint: 1,
			polePoint: 0
		},
		track: structuredClone(FICTIONAL_TRACK),
		entries,
		commands
	};
}
