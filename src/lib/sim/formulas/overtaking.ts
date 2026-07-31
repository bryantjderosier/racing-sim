import { clamp } from '../core/math';
import type {
	DriverRatings,
	FormulaConfig,
	OvertakingAggression,
	TrackSegment
} from '../core/types';

export function overtakeOpportunityProbability(
	gapMs: number,
	attackerSegmentMs: number,
	defenderSegmentMs: number,
	drsEligible: boolean,
	segment: TrackSegment,
	config: FormulaConfig
): number {
	const gapCloseness = clamp(1 - gapMs / config.overtakeAttemptGapMs, 0, 1);
	const passingZoneQuality = clamp(1 - segment.overtakingDifficulty, 0, 1);
	const paceAdvantage = clamp((defenderSegmentMs - attackerSegmentMs) / 800, 0, 1);
	return clamp(
		config.overtakeOpportunityBase +
			gapCloseness * config.overtakeOpportunityGapWeight +
			passingZoneQuality * config.overtakeOpportunityZoneWeight +
			paceAdvantage * config.overtakeOpportunityPaceWeight +
			(drsEligible ? config.overtakeOpportunityDrsWeight : 0),
		0,
		config.overtakeOpportunityMaximum
	);
}

export function overtakeProbability(
	attacker: DriverRatings,
	defender: DriverRatings,
	attackerSegmentMs: number,
	defenderSegmentMs: number,
	aggression: OvertakingAggression,
	drsEligible: boolean,
	segment: TrackSegment
): number {
	const paceEdge = (defenderSegmentMs - attackerSegmentMs) / 900;
	const skillEdge =
		(attacker.raceCraft - defender.raceCraft) * 0.025 +
		(attacker.composure - defender.composure) * 0.012;
	const aggressionEdge = aggression === 'high' ? 0.08 : aggression === 'low' ? -0.06 : 0;
	const drsEdge = drsEligible ? 0.14 : 0;
	return clamp(
		0.44 + paceEdge + skillEdge + aggressionEdge + drsEdge - segment.overtakingDifficulty * 0.38,
		0.03,
		0.93
	);
}
