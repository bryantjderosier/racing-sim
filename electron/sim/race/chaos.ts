import { setupDistance } from '../lap/math.js';
import { TIRE_CLIFF, TIRE_OPT_TEMP } from '../lap/constants.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	PaceDirective,
	TrackLapContext
} from '../lap/types.js';

export type IncidentSeverity =
	| 'none'
	| 'time_loss'
	| 'spin'
	| 'contact'
	| 'dnf';

export type MechanicalFault = 'none' | 'minor' | 'major' | 'terminal';

export type SafetyCarState = 'none' | 'vsc' | 'safety_car';

export type ChaosIncident = {
	lapNumber: number;
	entrantId: number;
	name: string;
	kind: 'driver' | 'mechanical';
	severity: IncidentSeverity | MechanicalFault;
	label: string;
	timeLossMs: number;
	triggeredSafety: SafetyCarState;
};

export type ChaosLapContext = {
	lapNumber: number;
	track: TrackLapContext;
	state: CarRuntimeState;
	driver: DriverLapAttrs;
	car: CarPerformance;
	/** 0–100 structural reliability pool. */
	reliability: number;
	/** Cars within 1.5s ahead/behind count as traffic pressure. */
	trafficPressure: number;
};

export type ChaosLapOutcome = {
	incident: ChaosIncident | null;
	/** Extra time on this lap. */
	timeLossMs: number;
	/** Updated reliability after wear + faults. */
	reliability: number;
	/** Updated car damage factor. */
	damageFactor: number;
	retired: boolean;
	triggeredSafety: SafetyCarState;
	/** Force pace override while VSC/SC active (caller applies). */
	paceOverride: PaceDirective | null;
};

const PACE_RISK: Record<PaceDirective, number> = {
	conserve: 0.35,
	balanced: 1,
	push: 1.55,
	maximum: 2.2
};

function clamp01(n: number) {
	return Math.max(0, Math.min(1, n));
}

/** Per-lap reliability wear from mileage, pace, dirty air. */
export function reliabilityWear(
	pace: PaceDirective,
	dirtyAir: number,
	lightweightAmp = 1
): number {
	const base = 0.35 * PACE_RISK[pace] * (1 + dirtyAir * 0.5) * lightweightAmp;
	return base;
}

/**
 * Driver incident probability (0–1) before severity roll.
 * Driven by pace, cliff/overheat, setup distance, wet mismatch, traffic, mental attrs.
 */
export function driverIncidentChance(ctx: ChaosLapContext): number {
	const { state, driver, track } = ctx;
	const cliff = TIRE_CLIFF[state.tire.compound];
	const onCliff = state.tire.life < cliff ? (cliff - state.tire.life) / cliff : 0;
	const opt = TIRE_OPT_TEMP[state.tire.compound];
	const overheat = Math.max(0, (state.tire.coreTemp - opt - 12) / 25);
	const setupDist = setupDistance(track.setupCurrent, track.setupTarget);
	const wetMismatch =
		(track.moisture === 'wet' || track.moisture === 'flooded') &&
		(state.tire.compound === 'soft' ||
			state.tire.compound === 'medium' ||
			state.tire.compound === 'hard')
			? 1
			: track.moisture === 'damp' &&
				  (state.tire.compound === 'soft' || state.tire.compound === 'hard')
				? 0.4
				: 0;

	const composure = driver.composure / 99;
	const focus = driver.focus / 99;
	const aggression = driver.aggression / 99;

	let p = 0.012;
	p *= PACE_RISK[state.pace];
	p *= 1 + onCliff * 2.5;
	p *= 1 + overheat * 1.2;
	p *= 1 + setupDist * 1.5;
	p *= 1 + wetMismatch * 1.8;
	p *= 1 + ctx.trafficPressure * 0.9;
	p *= 1.35 - composure * 0.5;
	p *= 1.25 - focus * 0.4;
	p *= 0.85 + aggression * 0.55;
	return clamp01(p);
}

export function rollDriverSeverity(rng: () => number, aggression: number): IncidentSeverity {
	const r = rng();
	const agr = aggression / 99;
	// Higher aggression → heavier tail
	if (r < 0.55 - agr * 0.1) return 'time_loss';
	if (r < 0.82 - agr * 0.05) return 'spin';
	if (r < 0.95) return 'contact';
	return 'dnf';
}

export function mechanicalFaultChance(reliability: number, pace: PaceDirective): number {
	if (reliability >= 55) return 0.002 * PACE_RISK[pace];
	if (reliability >= 40) return 0.02 * PACE_RISK[pace];
	if (reliability >= 25) return 0.08 * PACE_RISK[pace];
	if (reliability >= 12) return 0.18 * PACE_RISK[pace];
	return 0.35 * PACE_RISK[pace];
}

export function rollMechanicalFault(rng: () => number, reliability: number): MechanicalFault {
	const r = rng();
	if (reliability < 12) {
		if (r < 0.45) return 'terminal';
		if (r < 0.75) return 'major';
		return 'minor';
	}
	if (reliability < 25) {
		if (r < 0.15) return 'terminal';
		if (r < 0.5) return 'major';
		return 'minor';
	}
	if (reliability < 40) {
		if (r < 0.05) return 'terminal';
		if (r < 0.35) return 'major';
		return 'minor';
	}
	if (r < 0.7) return 'minor';
	if (r < 0.95) return 'major';
	return 'terminal';
}

const DRIVER_LOSS: Record<Exclude<IncidentSeverity, 'none'>, [number, number]> = {
	time_loss: [1500, 4000],
	spin: [8000, 15000],
	contact: [12000, 25000],
	dnf: [0, 0]
};

const MECH_LOSS: Record<Exclude<MechanicalFault, 'none'>, [number, number]> = {
	minor: [800, 2500],
	major: [5000, 12000],
	terminal: [0, 0]
};

function randRange(rng: () => number, lo: number, hi: number) {
	return Math.round(lo + rng() * (hi - lo));
}

/**
 * Resolve chaos for one car on one lap (after the flying lap is simulated).
 */
export function resolveChaosLap(
	ctx: ChaosLapContext,
	args: {
		name: string;
		rng: () => number;
		/** Amplify wear for lightweight builds. */
		lightweightAmp?: number;
	}
): ChaosLapOutcome {
	const rng = args.rng;
	let reliability = Math.max(
		0,
		ctx.reliability - reliabilityWear(ctx.state.pace, ctx.state.dirtyAir, args.lightweightAmp ?? 1)
	);
	let damageFactor = ctx.car.damageFactor;
	let timeLossMs = 0;
	let retired = false;
	let triggeredSafety: SafetyCarState = 'none';
	let incident: ChaosIncident | null = null;

	// Mechanical first (independent)
	const mechP = mechanicalFaultChance(reliability, ctx.state.pace);
	if (rng() < mechP) {
		const fault = rollMechanicalFault(rng, reliability);
		if (fault === 'terminal') {
			retired = true;
			triggeredSafety = 'safety_car';
			incident = {
				lapNumber: ctx.lapNumber,
				entrantId: -1, // filled by caller
				name: args.name,
				kind: 'mechanical',
				severity: fault,
				label: 'Terminal mechanical failure',
				timeLossMs: 0,
				triggeredSafety
			};
			return {
				incident,
				timeLossMs: 0,
				reliability,
				damageFactor: Math.min(damageFactor, 0.35),
				retired: true,
				triggeredSafety,
				paceOverride: null
			};
		}
		const [lo, hi] = MECH_LOSS[fault];
		timeLossMs = randRange(rng, lo, hi);
		if (fault === 'minor') damageFactor = Math.max(0.35, damageFactor - 0.08);
		if (fault === 'major') {
			damageFactor = Math.max(0.25, damageFactor - 0.2);
			triggeredSafety = 'vsc';
		}
		incident = {
			lapNumber: ctx.lapNumber,
			entrantId: -1,
			name: args.name,
			kind: 'mechanical',
			severity: fault,
			label:
				fault === 'minor'
					? 'Minor hybrid / aero fault'
					: 'Major mechanical issue',
			timeLossMs,
			triggeredSafety
		};
	}

	// Driver incident (skip if already terminal)
	if (!retired) {
		const p = driverIncidentChance(ctx);
		if (rng() < p) {
			const sev = rollDriverSeverity(rng, ctx.driver.aggression);
			if (sev === 'dnf') {
				retired = true;
				triggeredSafety = 'safety_car';
				incident = {
					lapNumber: ctx.lapNumber,
					entrantId: -1,
					name: args.name,
					kind: 'driver',
					severity: sev,
					label: 'Crash — retired',
					timeLossMs: 0,
					triggeredSafety
				};
			} else {
				const [lo, hi] = DRIVER_LOSS[sev];
				const loss = randRange(rng, lo, hi);
				timeLossMs += loss;
				if (sev === 'spin') triggeredSafety = triggeredSafety === 'safety_car' ? 'safety_car' : 'vsc';
				if (sev === 'contact') {
					damageFactor = Math.max(0.3, damageFactor - 0.15);
					triggeredSafety = 'safety_car';
				}
				incident = {
					lapNumber: ctx.lapNumber,
					entrantId: -1,
					name: args.name,
					kind: 'driver',
					severity: sev,
					label:
						sev === 'time_loss'
							? 'Lock-up / wide'
							: sev === 'spin'
								? 'Spin'
								: 'Contact',
					timeLossMs: loss,
					triggeredSafety
				};
			}
		}
	}

	return {
		incident,
		timeLossMs,
		reliability,
		damageFactor,
		retired,
		triggeredSafety,
		paceOverride: null
	};
}

/** SC/VSC duration defaults (laps remaining including current). */
export function safetyDuration(state: SafetyCarState): number {
	if (state === 'vsc') return 2;
	if (state === 'safety_car') return 3;
	return 0;
}

/** Lap time multiplier under SC/VSC (racing pace suppressed). */
export function safetyLapMult(state: SafetyCarState): number {
	if (state === 'vsc') return 1.12;
	if (state === 'safety_car') return 1.38;
	return 1;
}

/** Pit lane loss factor under SC/VSC (cheaper to pit). */
export function safetyPitFactor(state: SafetyCarState): number {
	if (state === 'vsc') return 0.6;
	if (state === 'safety_car') return 0.45;
	return 1;
}
