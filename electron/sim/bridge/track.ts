import type { SetupVector, TrackLapContext, TrackMoisture } from '../lap/types.js';

export type TrackRow = {
	id: number;
	name: string;
	lengthKm: number | null;
	aeroEfficiencyWeight: number;
	mechanicalGripWeight: number;
	tireAbrasionFactor: number;
	baseGrip: number;
	maxGrip: number;
};

/** Deterministic default setup window from track weights (stand-in until DB targets exist). */
export function defaultSetupTarget(track: TrackRow): SetupVector {
	const aero = track.aeroEfficiencyWeight;
	const mech = track.mechanicalGripWeight;
	return {
		frontWingAngle: 3 + aero * 2,
		rearWingAngle: 6 + aero * 2.5,
		frontArb: 2 + Math.round(mech),
		rearArb: 3 + Math.round(mech),
		frontRideHeightMm: 28 + (1.5 - aero) * 4,
		rearRideHeightMm: 50 + (1.5 - aero) * 6,
		frontCamber: -2.2 - mech * 0.2,
		rearCamber: -1.2 - mech * 0.15,
		frontToe: 0.05,
		rearToe: 0.15,
		brakeBias: 54 + mech
	};
}

/**
 * Build 3 sector profiles from track length + aero/mech weights.
 * S1 power/aero biased, S2 mechanical, S3 mixed.
 */
export function trackToLapContext(
	track: TrackRow,
	opts?: {
		setupCurrent?: SetupVector;
		setupTarget?: SetupVector;
		moisture?: TrackMoisture;
		trackGripMultiplier?: number;
	}
): TrackLapContext {
	const length = track.lengthKm && track.lengthKm > 0 ? track.lengthKm : 5.0;
	// Rough: ~90s lap at 5km → scale base sector times
	const lapBudgetMs = (length / 5) * 90_000;
	const s1 = Math.round(lapBudgetMs * 0.33);
	const s2 = Math.round(lapBudgetMs * 0.38);
	const s3 = Math.round(lapBudgetMs * 0.29);
	const target = opts?.setupTarget ?? defaultSetupTarget(track);
	const current = opts?.setupCurrent ?? { ...target };

	return {
		sectors: [
			{
				baseTimeMs: s1,
				aeroWeight: track.aeroEfficiencyWeight * 1.15,
				mechanicalWeight: track.mechanicalGripWeight * 0.75,
				brakingShare: 0.15,
				corneringShare: 0.2,
				tractionShare: 0.25,
				powerShare: 0.4
			},
			{
				baseTimeMs: s2,
				aeroWeight: track.aeroEfficiencyWeight * 0.7,
				mechanicalWeight: track.mechanicalGripWeight * 1.25,
				brakingShare: 0.35,
				corneringShare: 0.4,
				tractionShare: 0.2,
				powerShare: 0.05
			},
			{
				baseTimeMs: s3,
				aeroWeight: track.aeroEfficiencyWeight,
				mechanicalWeight: track.mechanicalGripWeight,
				brakingShare: 0.2,
				corneringShare: 0.3,
				tractionShare: 0.3,
				powerShare: 0.2
			}
		],
		tireAbrasionFactor: track.tireAbrasionFactor,
		moisture: opts?.moisture ?? 'dry',
		trackGripMultiplier: opts?.trackGripMultiplier ?? track.baseGrip,
		setupTarget: target,
		setupCurrent: current
	};
}
