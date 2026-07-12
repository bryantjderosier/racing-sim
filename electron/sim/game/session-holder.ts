import type { AppDb } from '../../db/node.js';
import { teams } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { loadGridEntrants, loadPracticeEntrant, type LoadedPracticeEntrant } from '../bridge/load.js';
import type { SetupVector } from '../lap/types.js';
import {
	applySetupTweak,
	createPracticeSession,
	runPracticeStint,
	type PracticeSessionState
} from '../practice/session.js';
import type { StintDirective } from '../practice/types.js';
import {
	createRaceSession,
	mulberry32,
	type RaceCommand,
	type RaceSession,
	type RaceTelemetry
} from '../race/session.js';
import type { RaceEntrant, RaceLapLine, RaceResult } from '../race/feature.js';
import {
	simulateQualifying,
	type QualifyingFormat,
	type QualifyingResult
} from '../race/qualifying.js';
import { commitWeekendRace } from '../season/commit.js';
import { getNextRoundView } from './season.js';
import type {
	PracticeCreateResult,
	PracticeStintView,
	QualifyingView,
	RaceCreateArgs,
	RaceCreateResult,
	RaceStepResult,
	ThinEntrantView,
	WeekendBeginArgs,
	WeekendBeginResult,
	WeekendCommitArgs,
	WeekendCommitResult,
	WeekendRunQualifyingArgs
} from './types.js';

type WeekendState = {
	trackId: number;
	trackName: string;
	division: number;
	playerTeamId: number;
	entrants: LoadedPracticeEntrant[];
	practice: PracticeSessionState | null;
	practiceEntrant: LoadedPracticeEntrant | null;
	quali: QualifyingResult | null;
	race: RaceSession | null;
	lastRaceResult: RaceResult | null;
};

let state: WeekendState | null = null;

function requireWeekend(): WeekendState {
	if (!state) throw new Error('No weekend in progress. Call weekend:begin first.');
	return state;
}

function thinEntrants(entrants: LoadedPracticeEntrant[]): ThinEntrantView[] {
	return entrants.map((e) => ({
		teamId: e.teamId,
		driverId: e.driverId,
		driverName: e.driverName,
		carId: e.carId
	}));
}

function toQualifyingView(q: QualifyingResult): QualifyingView {
	return {
		format: q.format,
		poleMs: q.poleMs,
		grid: q.grid.map((g) => ({
			position: g.position,
			entrantId: g.entrantId,
			name: g.name,
			bestLapMs: g.bestMs,
			session: g.session
		}))
	};
}

export function clearWeekend(): void {
	state = null;
}

export function getWeekendState(): WeekendState | null {
	return state;
}

export async function beginWeekend(
	db: AppDb,
	playerTeamId: number,
	args: WeekendBeginArgs = {}
): Promise<WeekendBeginResult> {
	clearWeekend();

	let trackId = args.trackId;
	if (trackId == null) {
		const next = await getNextRoundView(db);
		if (!next) throw new Error('No upcoming race. Ensure a season first.');
		trackId = next.trackId;
	}

	const loaded = await loadGridEntrants(db, { trackId, division: 1 });
	state = {
		trackId,
		trackName: loaded.trackName,
		division: 1,
		playerTeamId,
		entrants: loaded.entrants,
		practice: null,
		practiceEntrant: null,
		quali: null,
		race: null,
		lastRaceResult: null
	};

	return {
		trackId,
		trackName: loaded.trackName,
		entrants: thinEntrants(loaded.entrants)
	};
}

export async function createPractice(
	db: AppDb,
	playerTeamId: number
): Promise<PracticeCreateResult> {
	const w = requireWeekend();
	const entrant =
		w.entrants.find((e) => e.teamId === playerTeamId) ??
		(await loadPracticeEntrant(db, { teamId: playerTeamId, trackId: w.trackId }));

	const practice = createPracticeSession(entrant.track);
	w.practice = practice;
	w.practiceEntrant = entrant;

	return {
		setup: { ...practice.setupCurrent },
		trimTiers: {
			qualifying: practice.trims.qualifying.tier,
			race: practice.trims.race.tier,
			wetWeather: practice.trims.wetWeather.tier
		}
	};
}

export function tweakPracticeSetup(tweak: Partial<SetupVector>): PracticeCreateResult {
	const w = requireWeekend();
	if (!w.practice) throw new Error('No practice session. Call practice:create first.');
	w.practice = applySetupTweak(w.practice, tweak);
	return {
		setup: { ...w.practice.setupCurrent },
		trimTiers: {
			qualifying: w.practice.trims.qualifying.tier,
			race: w.practice.trims.race.tier,
			wetWeather: w.practice.trims.wetWeather.tier
		}
	};
}

export function runPracticeStintView(
	directive: StintDirective,
	runtimeDefaults?: { fuelKg?: number; batteryPct?: number }
): PracticeStintView {
	const w = requireWeekend();
	if (!w.practice || !w.practiceEntrant) {
		throw new Error('No practice session. Call practice:create first.');
	}

	const { session, result } = runPracticeStint(
		w.practice,
		w.practiceEntrant.car,
		w.practiceEntrant.driver,
		w.practiceEntrant.personnel,
		{
			fuelKg: runtimeDefaults?.fuelKg ?? 40,
			batteryPct: runtimeDefaults?.batteryPct ?? 80,
			tire: { compound: 'soft', life: 1, coreTemp: 75 },
			pace: directive.pace ?? 'push',
			energy: 'balanced',
			dirtyAir: 0
		},
		directive
	);
	w.practice = session;

	return {
		averageLapMs: result.stint.averageLapMs,
		bestLapMs: result.stint.bestLapMs,
		lapCount: result.stint.laps.length,
		setupDistance: result.setupDistance,
		briefLines: result.brief.lines,
		briefClarity: result.brief.clarity,
		trimTiers: {
			qualifying: result.trims.qualifying.tier,
			race: result.trims.race.tier,
			wetWeather: result.trims.wetWeather.tier
		}
	};
}

export function runWeekendQualifying(args: WeekendRunQualifyingArgs = {}): QualifyingView {
	const w = requireWeekend();
	const format: QualifyingFormat = args.format ?? 'div1_knockout';
	const playerTrim = w.practice?.trims.qualifying.tier ?? 0;

	const track =
		w.practice?.setupCurrent != null
			? { ...w.entrants[0].track, setupCurrent: w.practice.setupCurrent }
			: w.entrants[0].track;

	const field = w.entrants.map((e) => ({
		id: e.driverId,
		name: e.driverName,
		car: e.car,
		driver: e.driver,
		compound: 'soft' as const,
		qualifyingTrimTier: e.teamId === w.playerTeamId ? playerTrim : 0
	}));

	w.quali = simulateQualifying(track, field, {
		format,
		cutoffs: { q1Eliminate: 5, q2Eliminate: 5 }
	});

	return toQualifyingView(w.quali);
}

function toRaceEntrants(w: WeekendState): {
	track: (typeof w.entrants)[0]['track'];
	entrants: RaceEntrant[];
} {
	const playerSetup = w.practice?.setupCurrent;
	const track =
		playerSetup != null
			? { ...w.entrants[0].track, setupCurrent: playerSetup }
			: w.entrants[0].track;

	const gridPos = new Map<number, number>();
	if (w.quali) {
		for (const g of w.quali.grid) gridPos.set(g.entrantId, g.position);
	}

	const entrants: RaceEntrant[] = w.entrants.map((e, i) => ({
		id: e.driverId,
		name: e.driverName,
		car: e.car,
		driver: e.driver,
		gridPosition: gridPos.get(e.driverId) ?? i + 1,
		fuelKg: 55,
		compound: 'medium' as const,
		pace: 'balanced' as const,
		batteryPct: 100,
		reliability: 90,
		pitCrewSpeed: 72
	}));

	entrants.sort((a, b) => a.gridPosition - b.gridPosition);
	return { track, entrants };
}

export function createRace(args: RaceCreateArgs = {}): RaceCreateResult {
	const w = requireWeekend();
	if (w.race) throw new Error('Race already in progress');

	const laps = args.laps ?? 12;
	const rng = args.seed != null ? mulberry32(args.seed) : Math.random;
	const { track, entrants } = toRaceEntrants(w);

	w.race = createRaceSession(track, entrants, {
		laps,
		chaos: false,
		rng
	});
	w.lastRaceResult = null;

	return {
		totalLaps: laps,
		telemetry: w.race.telemetry()
	};
}

export function raceCommand(cmd: RaceCommand): void {
	const w = requireWeekend();
	if (!w.race) throw new Error('No race in progress');
	w.race.applyCommand(cmd);
}

export function raceStepLap(n = 1): RaceStepResult {
	const w = requireWeekend();
	if (!w.race) throw new Error('No race in progress');

	const lines: RaceLapLine[] = [];
	const steps = Math.max(1, Math.floor(n));
	for (let i = 0; i < steps; i++) {
		if (w.race.isComplete()) break;
		lines.push(...w.race.stepLap());
	}

	return {
		lines,
		telemetry: w.race.telemetry(),
		complete: w.race.isComplete()
	};
}

export function raceTelemetry(): RaceTelemetry {
	const w = requireWeekend();
	if (!w.race) throw new Error('No race in progress');
	return w.race.telemetry();
}

export function raceFinish(): RaceResult {
	const w = requireWeekend();
	if (!w.race) throw new Error('No race in progress');
	if (!w.race.isComplete()) {
		while (!w.race.isComplete()) w.race.stepLap();
	}
	const result = w.race.result();
	w.lastRaceResult = result;
	w.race = null;
	return result;
}

export async function commitInteractiveWeekend(
	db: AppDb,
	args: WeekendCommitArgs = {}
): Promise<WeekendCommitResult> {
	const w = requireWeekend();
	if (!w.lastRaceResult) throw new Error('No finished race to commit. Call race:finish first.');

	const driverToTeam = new Map(w.entrants.map((e) => [e.driverId, e.teamId]));
	const gridByEntrant = new Map<number, number>();
	if (w.quali) {
		for (const g of w.quali.grid) gridByEntrant.set(g.entrantId, g.position);
	}

	const [player] = await db.select().from(teams).where(eq(teams.id, w.playerTeamId)).limit(1);

	const committed = await commitWeekendRace(db, {
		division: w.division,
		playerTeamId: w.playerTeamId,
		playerPivotFraction: player?.rdPivotCurrent,
		trackId: w.trackId,
		raceResult: w.lastRaceResult,
		gridByEntrant,
		driverToTeam,
		poleEntrantId: w.quali?.grid[0]?.entrantId ?? null,
		weeksAfterRace: args.weeksAfterRace ?? 0
	});

	clearWeekend();
	return {
		...committed,
		nextRound: await getNextRoundView(db)
	};
}
