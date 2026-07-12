import { setupDistance } from '../lap/math.js';
import { moraleFeedbackMult } from '../morale/index.js';
import type { SetupVector } from '../lap/types.js';
import type { BriefClarity, EngineeringBrief, PracticePersonnel } from './types.js';

const AXIS_LABEL: Record<keyof SetupVector, string> = {
	frontWingAngle: 'front wing',
	rearWingAngle: 'rear wing',
	frontArb: 'front anti-roll bar',
	rearArb: 'rear anti-roll bar',
	frontRideHeightMm: 'front ride height',
	rearRideHeightMm: 'rear ride height',
	frontCamber: 'front camber',
	rearCamber: 'rear camber',
	frontToe: 'front toe',
	rearToe: 'rear toe',
	brakeBias: 'brake bias'
};

const AXIS_UNIT: Partial<Record<keyof SetupVector, string>> = {
	frontWingAngle: '°',
	rearWingAngle: '°',
	frontArb: ' click',
	rearArb: ' click',
	frontRideHeightMm: 'mm',
	rearRideHeightMm: 'mm',
	brakeBias: '%'
};

function clarityFromScore(score: number): BriefClarity {
	if (score >= 75) return 'high';
	if (score >= 45) return 'mid';
	return 'low';
}

function rankedAxes(current: SetupVector, target: SetupVector): { key: keyof SetupVector; delta: number }[] {
	const keys = Object.keys(target) as (keyof SetupVector)[];
	return keys
		.map((key) => ({ key, delta: target[key] - current[key] }))
		.filter((a) => Math.abs(a.delta) > 1e-6)
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function directionPhrase(delta: number, key: keyof SetupVector): string {
	const abs = Math.abs(delta);
	const unit = AXIS_UNIT[key] ?? '';
	if (key.includes('Arb') || key.includes('Wing') || key === 'brakeBias') {
		return delta > 0 ? `increase by ${formatVal(abs, unit)}` : `decrease by ${formatVal(abs, unit)}`;
	}
	if (key.includes('RideHeight') || key.includes('Camber') || key.includes('Toe')) {
		return delta > 0
			? `raise/increase by ${formatVal(abs, unit)}`
			: `lower/reduce by ${formatVal(abs, unit)}`;
	}
	return delta > 0 ? `increase by ${formatVal(abs, unit)}` : `decrease by ${formatVal(abs, unit)}`;
}

function formatVal(n: number, unit: string): string {
	const rounded = Math.abs(n) >= 1 ? n.toFixed(0) : n.toFixed(1);
	return `${rounded}${unit}`;
}

/**
 * Fogged engineering brief: true setup window always exists;
 * Feedback + RE Setup/Analysis control how clearly it is stated.
 */
export function generateEngineeringBrief(
	current: SetupVector,
	target: SetupVector,
	personnel: PracticePersonnel,
	rng: () => number = Math.random
): EngineeringBrief {
	const feedbackEff = Math.round(
		personnel.driverFeedback * moraleFeedbackMult(personnel.driverMorale ?? 50)
	);
	const qualityScore = Math.round(
		(feedbackEff + personnel.engineerSetup + personnel.engineerAnalysis) / 3
	);
	const clarity = clarityFromScore(qualityScore);
	const dist = setupDistance(current, target);
	const axes = rankedAxes(current, target);
	const focus = axes.slice(0, 2).map((a) => a.key);

	if (dist <= 0.08) {
		return {
			clarity,
			qualityScore,
			trueFocusKeys: [],
			lines: ['The car feels balanced in the window. Only fine-tuning left.']
		};
	}

	if (axes.length === 0) {
		return {
			clarity,
			qualityScore,
			trueFocusKeys: [],
			lines: ['No clear setup signal from this stint.']
		};
	}

	const top = axes[0];
	const second = axes[1];

	if (clarity === 'high') {
		const lines = [
			`The driver notes imbalance linked to the ${AXIS_LABEL[top.key]}. I recommend ${directionPhrase(top.delta, top.key)}.`
		];
		if (second && Math.abs(second.delta) > Math.abs(top.delta) * 0.35) {
			lines.push(`Secondary: ${AXIS_LABEL[second.key]} — ${directionPhrase(second.delta, second.key)}.`);
		}
		return { clarity, qualityScore, trueFocusKeys: focus, lines };
	}

	if (clarity === 'mid') {
		const area =
			top.key.includes('Wing') || top.key.includes('RideHeight')
				? 'aero platform / ride height'
				: top.key.includes('Arb') || top.key.includes('Camber')
					? 'mechanical balance'
					: 'brake or alignment';
		return {
			clarity,
			qualityScore,
			trueFocusKeys: focus,
			lines: [
				`The rear/front end feels unstable in places. Look at ${area}, but we aren't sure of the exact value.`,
				second
					? `Possibly also related to ${AXIS_LABEL[second.key]}.`
					: 'Need another stint to tighten the diagnosis.'
			]
		};
	}

	// Low: vague or occasionally wrong axis
	const lie = rng() < 0.35 && axes.length > 2;
	const wrong = lie ? axes[axes.length - 1] : null;
	if (wrong) {
		return {
			clarity,
			qualityScore,
			trueFocusKeys: focus,
			lines: [
				`The car feels loose overall. Adjusting ${AXIS_LABEL[wrong.key]} might help?`,
				'(Confidence is low — treat this as a guess.)'
			]
		};
	}
	return {
		clarity,
		qualityScore,
		trueFocusKeys: focus,
		lines: [
			'The car feels loose overall. Wings might help?',
			'(Feedback quality is limited this stint.)'
		]
	};
}
