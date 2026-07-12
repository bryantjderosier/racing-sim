import {
	applySetupTweak,
	createPracticeSession,
	runPracticeStint,
	type PracticePersonnel
} from '../electron/sim/practice/index.ts';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	SetupVector,
	TrackLapContext
} from '../electron/sim/lap/index.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

function fmt(ms: number) {
	const s = ms / 1000;
	const min = Math.floor(s / 60);
	const rem = s - min * 60;
	return `${min}:${rem.toFixed(3).padStart(6, '0')}`;
}

const targetSetup: SetupVector = {
	frontWingAngle: 5,
	rearWingAngle: 8,
	frontArb: 3,
	rearArb: 4,
	frontRideHeightMm: 30,
	rearRideHeightMm: 55,
	frontCamber: -2.5,
	rearCamber: -1.5,
	frontToe: 0.1,
	rearToe: 0.2,
	brakeBias: 55
};

/** Intentionally off-window. */
const badSetup: SetupVector = {
	...targetSetup,
	rearRideHeightMm: 62,
	rearArb: 7,
	frontWingAngle: 8
};

const midDriver: DriverLapAttrs = {
	braking: 70,
	cornering: 70,
	traction: 70,
	tyreManagement: 70,
	wetDriving: 70,
	composure: 70,
	focus: 70,
	aggression: 50
};

const midCar: CarPerformance = {
	aeroPoints: 100,
	mechanicalPoints: 100,
	powerPoints: 100,
	dryWeightKg: 800,
	damageFactor: 1
};

const elitePersonnel: PracticePersonnel = {
	driverFeedback: 88,
	engineerSetup: 90,
	engineerAnalysis: 85
};

const weakPersonnel: PracticePersonnel = {
	driverFeedback: 30,
	engineerSetup: 28,
	engineerAnalysis: 25
};

function makeTrack(): TrackLapContext {
	return {
		sectors: [
			{
				baseTimeMs: 28000,
				aeroWeight: 1.2,
				mechanicalWeight: 0.7,
				brakingShare: 0.2,
				corneringShare: 0.2,
				tractionShare: 0.2,
				powerShare: 0.4
			},
			{
				baseTimeMs: 32000,
				aeroWeight: 0.6,
				mechanicalWeight: 1.3,
				brakingShare: 0.35,
				corneringShare: 0.4,
				tractionShare: 0.2,
				powerShare: 0.05
			},
			{
				baseTimeMs: 25000,
				aeroWeight: 1.0,
				mechanicalWeight: 0.9,
				brakingShare: 0.15,
				corneringShare: 0.25,
				tractionShare: 0.35,
				powerShare: 0.25
			}
		],
		tireAbrasionFactor: 1.0,
		moisture: 'dry',
		trackGripMultiplier: 0.95,
		setupTarget: { ...targetSetup },
		setupCurrent: { ...badSetup }
	};
}

function printStintSheet(
	label: string,
	laps: { lapNumber: number; sectorTimesMs: [number, number, number]; lapTimeMs: number }[]
) {
	console.log(`\n${label}`);
	console.log('Lap  |   S1      S2      S3   |   Lap time');
	console.log('-----+------------------------+-----------');
	for (const lap of laps) {
		const [s1, s2, s3] = lap.sectorTimesMs;
		console.log(
			`${String(lap.lapNumber).padStart(3)}  | ${fmt(s1)} ${fmt(s2)} ${fmt(s3)} | ${fmt(lap.lapTimeMs)}`
		);
	}
}

function freshState(overrides: Partial<CarRuntimeState> = {}): CarRuntimeState {
	return {
		fuelKg: 28,
		batteryPct: 90,
		tire: { compound: 'soft', life: 1, coreTemp: 70 },
		pace: 'push',
		energy: 'balanced',
		dirtyAir: 0,
		...overrides
	};
}

console.log('Practice session loop\n');

let session = createPracticeSession(makeTrack(), badSetup);

// Stint 1 — off-window, short low-fuel → quali trim + high-clarity brief
const s1 = runPracticeStint(
	session,
	midCar,
	midDriver,
	elitePersonnel,
	freshState(),
	{ lapCount: 4, pace: 'push' }
);
session = s1.session;

printStintSheet('Stint 1 (off-window, quali-style)', s1.result.stint.laps);
console.log('\nEngineering brief (' + s1.result.brief.clarity + '):');
for (const line of s1.result.brief.lines) console.log('  • ' + line);
console.log(
	`Trim: ${s1.result.trimAwards[0].kind} +${s1.result.trimAwards[0].xpGained} XP → tier ${s1.result.trimAwards[0].tierAfter}`
);
console.log(`Setup distance: ${s1.result.setupDistance.toFixed(3)}`);

assert(s1.result.brief.clarity === 'high', 'elite personnel → high clarity brief');
assert(s1.result.trimAwards[0].kind === 'qualifying_trim', 'low fuel short push → quali trim');
assert(s1.result.trimAwards[0].xpGained > 0, 'earned trim XP');

// Player follows the brief (approximate correct direction from true focus)
const focus = s1.result.brief.trueFocusKeys[0];
assert(!!focus, 'brief exposes focus axis for high clarity');
session = applySetupTweak(session, {
	rearRideHeightMm: 55,
	rearArb: 4,
	frontWingAngle: 5
});

const s2 = runPracticeStint(
	session,
	midCar,
	midDriver,
	elitePersonnel,
	freshState({ fuelKg: 28 }),
	{ lapCount: 4, pace: 'push' }
);
session = s2.session;

printStintSheet('Stint 2 (after setup tweak)', s2.result.stint.laps);
console.log(
	`Best L1 ${fmt(s1.result.stint.bestLapMs)} → L2 ${fmt(s2.result.stint.bestLapMs)} (dist ${s2.result.setupDistance.toFixed(3)})`
);

assert(
	s2.result.stint.bestLapMs < s1.result.stint.bestLapMs,
	'setup tweak improved best lap'
);
assert(s2.result.setupDistance < s1.result.setupDistance, 'closer to setup window');
assert(session.trims.qualifying.xp > s1.result.trims.qualifying.xp - s1.result.trimAwards[0].xpGained, 'quali XP accumulates');

// Weak personnel → foggy brief
const weakSession = createPracticeSession(makeTrack(), badSetup);
const weak = runPracticeStint(
	weakSession,
	midCar,
	midDriver,
	weakPersonnel,
	freshState(),
	{ lapCount: 3, pace: 'push' }
);
assert(weak.result.brief.clarity === 'low', 'weak personnel → low clarity');
console.log('\nWeak brief sample: ' + weak.result.brief.lines[0]);

// Race trim path
const raceSession = createPracticeSession(makeTrack(), targetSetup);
const race = runPracticeStint(
	raceSession,
	midCar,
	midDriver,
	elitePersonnel,
	freshState({
		fuelKg: 70,
		pace: 'balanced',
		tire: { compound: 'medium', life: 1, coreTemp: 85 }
	}),
	{ lapCount: 8, pace: 'balanced' }
);
assert(race.result.trimAwards[0].kind === 'race_trim', 'high fuel long stint → race trim');

console.log('\nSession trims after stint 2:', {
	quali: session.trims.qualifying,
	race: race.result.trims.race
});

console.log('\nAll practice checks passed.');
