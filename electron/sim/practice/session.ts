import { setupDistance } from '../lap/math.js';
import { simulateStint } from '../lap/stint.js';
import type {
	CarPerformance,
	CarRuntimeState,
	DriverLapAttrs,
	SetupVector,
	TrackLapContext
} from '../lap/types.js';
import { generateEngineeringBrief } from './brief.js';
import {
	applyTrimXp,
	computeTrimXp,
	createEmptyTrims,
	inferTrimIntent,
	updateSlicksFrozen
} from './trim.js';
import type {
	KnowledgeTrims,
	PracticePersonnel,
	PracticeStintResult,
	StintDirective
} from './types.js';

export type PracticeSessionState = {
	trims: KnowledgeTrims;
	setupCurrent: SetupVector;
	track: TrackLapContext;
};

export function createPracticeSession(
	track: TrackLapContext,
	setupCurrent?: SetupVector
): PracticeSessionState {
	return {
		trims: createEmptyTrims(),
		setupCurrent: { ...(setupCurrent ?? track.setupCurrent) },
		track: {
			...track,
			setupCurrent: { ...(setupCurrent ?? track.setupCurrent) }
		}
	};
}

/** Apply a partial setup tweak (player action between stints). */
export function applySetupTweak(
	session: PracticeSessionState,
	tweak: Partial<SetupVector>
): PracticeSessionState {
	const setupCurrent = { ...session.setupCurrent, ...tweak };
	return {
		...session,
		setupCurrent,
		track: { ...session.track, setupCurrent }
	};
}

/**
 * Run one practice stint: timing sheet + trim XP + engineering brief.
 */
export function runPracticeStint(
	session: PracticeSessionState,
	car: CarPerformance,
	driver: DriverLapAttrs,
	personnel: PracticePersonnel,
	runtime: CarRuntimeState,
	directive: StintDirective
): { session: PracticeSessionState; result: PracticeStintResult } {
	let trims = updateSlicksFrozen(session.trims, session.track.moisture);
	const track: TrackLapContext = {
		...session.track,
		setupCurrent: session.setupCurrent
	};

	const stint = simulateStint(car, driver, track, runtime, {
		lapCount: directive.lapCount,
		pace: directive.pace ?? runtime.pace
	});

	const dist = setupDistance(session.setupCurrent, track.setupTarget);
	const hitCliff = stint.laps.some((l) => l.tireLife < 0.3);
	const compound = runtime.tire.compound;
	const pace = directive.pace ?? runtime.pace;

	const intent =
		directive.intent ??
		inferTrimIntent({
			fuelKg: runtime.fuelKg,
			lapCount: directive.lapCount,
			pace,
			compound,
			moisture: track.moisture
		});

	const xp = computeTrimXp({
		lapCount: directive.lapCount,
		setupDistance: dist,
		driverFeedback: personnel.driverFeedback,
		hitCliff,
		avgLapMs: stint.averageLapMs,
		bestLapMs: stint.bestLapMs
	});

	const applied = applyTrimXp(trims, intent, xp, compound);
	trims = applied.trims;

	const brief = generateEngineeringBrief(
		session.setupCurrent,
		track.setupTarget,
		personnel
	);

	const nextSession: PracticeSessionState = {
		...session,
		trims,
		track
	};

	return {
		session: nextSession,
		result: {
			stint,
			trimAwards: [
				{
					kind: intent,
					compound: intent === 'compound_knowledge' ? compound : undefined,
					xpGained: applied.xpApplied,
					tierAfter: applied.tierAfter
				}
			],
			trims,
			brief,
			setupDistance: dist
		}
	};
}
