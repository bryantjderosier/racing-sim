import {
	createRaceSession,
	mulberry32,
	simulateFeatureRace,
	type RaceEntrant
} from '../electron/sim/race/index.ts';
import type {
	CarPerformance,
	DriverLapAttrs,
	SetupVector,
	TrackLapContext
} from '../electron/sim/lap/index.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

const setup: SetupVector = {
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

const driver = (aggression: number): DriverLapAttrs => ({
	braking: 72,
	cornering: 70,
	traction: 68,
	tyreManagement: 75,
	wetDriving: 60,
	composure: 70,
	focus: 72,
	aggression
});

const car = (delta = 0): CarPerformance => ({
	aeroPoints: 100 + delta,
	mechanicalPoints: 100,
	powerPoints: 100,
	dryWeightKg: 800,
	damageFactor: 1
});

const track: TrackLapContext = {
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
			brakingShare: 0.25,
			corneringShare: 0.3,
			tractionShare: 0.25,
			powerShare: 0.2
		}
	],
	tireAbrasionFactor: 1,
	moisture: 'dry',
	trackGripMultiplier: 1,
	setupTarget: setup,
	setupCurrent: setup
};

function field(): RaceEntrant[] {
	return [
		{
			id: 1,
			name: 'Alpha',
			car: car(0),
			driver: driver(55),
			gridPosition: 1,
			fuelKg: 80,
			compound: 'medium',
			pace: 'balanced',
			pitCrewSpeed: 75
		},
		{
			id: 2,
			name: 'Bravo',
			car: car(-2),
			driver: driver(65),
			gridPosition: 2,
			fuelKg: 80,
			compound: 'medium',
			pace: 'balanced',
			pitCrewSpeed: 70
		},
		{
			id: 3,
			name: 'Charlie',
			car: car(3),
			driver: driver(45),
			gridPosition: 3,
			fuelKg: 80,
			compound: 'soft',
			pace: 'push',
			pitCrewSpeed: 72
		}
	];
}

console.log('══════════════════════════════════════════════════════════════');
console.log(' RACE COMMANDS HARNESS');
console.log('══════════════════════════════════════════════════════════════');

const SEED = 424242;
const LAPS = 8;

// Batch vs stepped no-command parity
{
	const batch = simulateFeatureRace(track, field(), {
		laps: LAPS,
		chaos: false,
		rng: mulberry32(SEED)
	});
	const session = createRaceSession(track, field(), {
		laps: LAPS,
		chaos: false,
		rng: mulberry32(SEED)
	});
	while (!session.isComplete()) session.stepLap();
	const stepped = session.result();
	assert(batch.classification.length === stepped.classification.length, 'same class size');
	for (let i = 0; i < batch.classification.length; i++) {
		assert(
			batch.classification[i].totalMs === stepped.classification[i].totalMs,
			`batch==stepped P${i + 1} totalMs`
		);
	}
	assert(batch.pitEvents.length === stepped.pitEvents.length, 'batch==stepped pit count');
}

// Mid-race pace / energy / box / combat
{
	const session = createRaceSession(track, field(), {
		laps: LAPS,
		chaos: false,
		rng: mulberry32(SEED + 1)
	});
	session.stepLap();
	session.applyCommand({ type: 'setPace', entrantId: 1, pace: 'push' });
	session.applyCommand({ type: 'setEnergy', entrantId: 1, energy: 'overtake' });
	let tel = session.telemetry();
	assert(tel.cars.find((r) => r.entrantId === 1)?.pace === 'push', 'pace push');
	assert(tel.cars.find((r) => r.entrantId === 1)?.energy === 'overtake', 'energy overtake');

	session.applyCommand({
		type: 'boxThisLap',
		entrantId: 1,
		compound: 'hard',
		fuelKg: 55,
		paceAfter: 'conserve'
	});
	tel = session.telemetry();
	assert(tel.cars.find((r) => r.entrantId === 1)?.pendingBox?.compound === 'hard', 'pending box');

	session.stepLap(); // lap 2 — should pit
	const afterBox = session.result();
	const pit = afterBox.pitEvents.find((p) => p.entrantId === 1);
	assert(!!pit, 'pit event recorded');
	assert(pit!.compoundOut === 'hard', 'compound out hard');
	assert(pit!.fuelAfter === 55, 'fuel after 55');
	assert(pit!.totalPitMs > 10_000, 'pit cost > 10s');

	tel = session.telemetry();
	assert(tel.cars.find((r) => r.entrantId === 1)?.pendingBox == null, 'box cleared');
	assert(tel.cars.find((r) => r.entrantId === 1)?.pace === 'conserve', 'paceAfter conserve');

	session.applyCommand({ type: 'cancelBox', entrantId: 2 });
	session.applyCommand({
		type: 'boxThisLap',
		entrantId: 2,
		compound: 'soft',
		fuelKg: 50
	});
	session.applyCommand({ type: 'cancelBox', entrantId: 2 });
	tel = session.telemetry();
	assert(tel.cars.find((r) => r.entrantId === 2)?.pendingBox == null, 'cancelBox clears');

	session.applyCommand({
		type: 'combat',
		entrantId: 3,
		order: 'attack_now',
		laps: 2
	});
	tel = session.telemetry();
	assert(tel.cars.find((r) => r.entrantId === 3)?.combat?.order === 'attack_now', 'combat set');

	const beforeMs = tel.cars.find((r) => r.entrantId === 3)!.cumulativeMs;
	session.stepLap();
	tel = session.telemetry();
	const afterMs = tel.cars.find((r) => r.entrantId === 3)!.cumulativeMs;
	const combatLapMs = afterMs - beforeMs;
	assert(combatLapMs > 0, 'combat lap advanced time');
	assert(
		tel.cars.find((r) => r.entrantId === 3)?.combat?.lapsRemaining === 1,
		'combat laps tick down'
	);

	while (!session.isComplete()) session.stepLap();
	const final = session.result();
	assert(final.classification.every((c) => c.lapsCompleted === LAPS), 'all finished laps');
	assert(final.classification.find((c) => c.entrantId === 1)!.stops === 1, 'alpha 1 stop');
}

// Combat time delta vs no-combat (forced success rng)
{
	const make = (combat: boolean) => {
		const session = createRaceSession(track, field(), {
			laps: 3,
			chaos: false,
			rng: () => 0.01 // always succeed combat
		});
		if (combat) {
			session.applyCommand({
				type: 'combat',
				entrantId: 1,
				order: 'attack_now',
				laps: 3
			});
		}
		while (!session.isComplete()) session.stepLap();
		return session.result().classification.find((c) => c.entrantId === 1)!.totalMs;
	};
	const withCombat = make(true);
	const without = make(false);
	assert(withCombat < without, `attack success faster (${withCombat} < ${without})`);
}

console.log('\nAll race-commands checks passed.');
