import {
	simulateLap,
	simulateStint,
	type CarPerformance,
	type CarRuntimeState,
	type DriverLapAttrs,
	type SetupVector,
	type TrackLapContext
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

const baselineSetup: SetupVector = {
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

function makeTrack(overrides: Partial<TrackLapContext> = {}): TrackLapContext {
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
		setupTarget: { ...baselineSetup },
		setupCurrent: { ...baselineSetup },
		...overrides
	};
}

function freshState(overrides: Partial<CarRuntimeState> = {}): CarRuntimeState {
	return {
		fuelKg: 50,
		batteryPct: 80,
		tire: { compound: 'medium', life: 1, coreTemp: 75 },
		pace: 'balanced',
		energy: 'balanced',
		dirtyAir: 0,
		...overrides
	};
}

console.log('Unit checks\n');

{
	const track = makeTrack();
	const base = simulateLap(midCar, midDriver, track, freshState());
	const aero = simulateLap({ ...midCar, aeroPoints: 140 }, midDriver, track, freshState());
	assert(aero.lapTimeMs < base.lapTimeMs, `aero car faster (${fmt(aero.lapTimeMs)} < ${fmt(base.lapTimeMs)})`);
}

{
	const track = makeTrack();
	const healthy = simulateLap(
		midCar,
		midDriver,
		track,
		freshState({ tire: { compound: 'soft', life: 0.7, coreTemp: 95 } })
	);
	const cliff = simulateLap(
		midCar,
		midDriver,
		track,
		freshState({ tire: { compound: 'soft', life: 0.15, coreTemp: 95 } })
	);
	assert(cliff.lapTimeMs > healthy.lapTimeMs + 1500, 'soft cliff slower than mid-life');
}

{
	const conserve = simulateLap(midCar, midDriver, makeTrack(), freshState({ pace: 'conserve' }));
	const push = simulateLap(midCar, midDriver, makeTrack(), freshState({ pace: 'push' }));
	assert(push.lapTimeMs < conserve.lapTimeMs, 'push faster than conserve');
	assert(push.stateAfter.tire.life < conserve.stateAfter.tire.life, 'push wears more');
}

console.log('\nPractice stint (8 laps, soft, push)\n');

const stint = simulateStint(
	midCar,
	midDriver,
	makeTrack(),
	freshState({
		fuelKg: 40,
		tire: { compound: 'soft', life: 1, coreTemp: 70 },
		pace: 'push',
		energy: 'balanced'
	}),
	{ lapCount: 8, gripGainPerLap: 0.005, gripCap: 1.02 }
);

console.log(
	'Lap  |   S1      S2      S3   |   Lap time | Life  Temp  Fuel'
);
console.log('-----+------------------------+-----------+------------------');
for (const lap of stint.laps) {
	const [s1, s2, s3] = lap.sectorTimesMs;
	console.log(
		`${String(lap.lapNumber).padStart(3)}  | ${fmt(s1)} ${fmt(s2)} ${fmt(s3)} | ${fmt(lap.lapTimeMs)} | ${lap.tireLife.toFixed(2)}  ${lap.tireCoreTemp.toFixed(0).padStart(3)}°  ${lap.fuelKg.toFixed(1)}kg`
	);
}

console.log(
	`\nBest: L${stint.bestLapNumber} ${fmt(stint.bestLapMs)}  |  Avg: ${fmt(stint.averageLapMs)}  |  End life: ${stint.stateAfter.tire.life.toFixed(3)}`
);

assert(stint.laps.length === 8, 'stint has 8 laps');
assert(
	stint.laps.every((l) => l.sectorTimesMs.length === 3 && l.lapTimeMs === l.sectorTimesMs[0] + l.sectorTimesMs[1] + l.sectorTimesMs[2]),
	'each lap = S1+S2+S3'
);
assert(stint.laps[0].tireLife > stint.laps[7].tireLife, 'tires wear across stint');
assert(stint.bestLapMs === Math.min(...stint.laps.map((l) => l.lapTimeMs)), 'best lap matches min');

console.log('\nAll checks passed.');
