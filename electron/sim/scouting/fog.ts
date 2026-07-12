import {
	ATTR_BAND_HALF_AT_ZERO,
	MAX_SCOUT_SLOTS,
	WEEKLY_CONF_GAIN_BASE
} from './constants.js';

export type AttrFogBand = {
	attrName: string;
	knownMin: number;
	knownMax: number;
	/** Present only when fully revealed. */
	trueValue?: number;
	ceilingMin: number;
	ceilingMax: number;
	trueCeiling?: number;
};

export type MetaFogBand = {
	key: string;
	knownMin: number;
	knownMax: number;
	trueValue?: number;
};

function clampAttr(n: number): number {
	return Math.max(1, Math.min(99, Math.round(n)));
}

/**
 * Uncertainty band around a 1–99 attribute.
 * Accuracy shrinks half-width; confidence collapses toward true value.
 */
export function attrBandFromConfidence(
	attrName: string,
	trueValue: number,
	trueCeiling: number,
	confidence: number,
	accuracy: number
): AttrFogBand {
	const c = Math.max(0, Math.min(100, confidence));
	const acc = Math.max(0, Math.min(99, accuracy));
	const half = ATTR_BAND_HALF_AT_ZERO * (1 - c / 100) * (1 - acc / 250);

	if (c >= 100) {
		return {
			attrName,
			knownMin: trueValue,
			knownMax: trueValue,
			trueValue,
			ceilingMin: trueCeiling,
			ceilingMax: trueCeiling,
			trueCeiling
		};
	}

	const knownMin = clampAttr(trueValue - half);
	const knownMax = clampAttr(trueValue + half);
	const ceilHalf = half * 1.15;
	return {
		attrName,
		knownMin,
		knownMax,
		ceilingMin: clampAttr(trueCeiling - ceilHalf),
		ceilingMax: clampAttr(trueCeiling + ceilHalf)
	};
}

/** Injury proneness (0–1 ratio) or longevity (age int). */
export function metaBandFromConfidence(
	key: string,
	trueValue: number,
	confidence: number,
	appraisal: number,
	isRatio: boolean
): MetaFogBand {
	const c = Math.max(0, Math.min(100, confidence));
	const app = Math.max(0, Math.min(99, appraisal));
	const effective = Math.min(100, c + app * 0.15);
	if (effective >= 90) {
		return { key, knownMin: trueValue, knownMax: trueValue, trueValue };
	}
	if (isRatio) {
		const half = 0.35 * (1 - effective / 100);
		return {
			key,
			knownMin: Math.max(0, Math.round((trueValue - half) * 100) / 100),
			knownMax: Math.min(1, Math.round((trueValue + half) * 100) / 100)
		};
	}
	const half = Math.max(1, Math.round(4 * (1 - effective / 100)));
	return {
		key,
		knownMin: Math.max(18, Math.round(trueValue - half)),
		knownMax: Math.min(45, Math.round(trueValue + half))
	};
}

export function weeklyConfidenceGain(args: {
	detection: number;
	accuracy: number;
	hqEfficiencyMult: number;
}): number {
	const det = Math.max(1, args.detection);
	const acc = Math.max(1, args.accuracy);
	const gain =
		WEEKLY_CONF_GAIN_BASE *
		(0.55 + det / 120) *
		(0.85 + acc / 200) *
		args.hqEfficiencyMult;
	return Math.max(1, Math.round(gain));
}

export function parallelScoutSlots(coverage: number, hqTier: number): number {
	const fromCoverage = Math.floor(coverage / 35);
	const fromHq = hqTier >= 5 ? 2 : hqTier >= 3 ? 1 : 0;
	return Math.max(1, Math.min(MAX_SCOUT_SLOTS, 1 + fromCoverage + fromHq));
}
