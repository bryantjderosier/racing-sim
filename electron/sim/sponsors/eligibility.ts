import {
	ETHICS_BLOCK_THRESHOLD,
	NAT_MISMATCH_PENALTY,
	type SponsorSlotType
} from './constants.js';

export type TeamSponsorProfile = {
	teamId: number;
	nationalityCode: string | null;
	reputation: number;
	/** Constructors standing (1 = best); null if unknown. */
	standing: number | null;
	/** Best driver marketability on the roster. */
	driverMarketability: number;
	division: number;
};

export type SponsorGateInput = {
	minMarketability: number;
	minTeamStanding: number | null;
	ethicsSensitivity: number;
	nationalityCode: string | null;
	slotType: SponsorSlotType;
};

export type EligibilityResult = {
	eligible: boolean;
	blockReasons: string[];
	/** 0–1 multiplier applied to all payouts if signed. */
	payoutMultiplier: number;
};

/**
 * Gates: marketability, optional standing, ethics mismatch.
 * Soft nationality mismatch reduces payout (does not block).
 */
export function evaluateSponsorEligibility(
	sponsor: SponsorGateInput,
	team: TeamSponsorProfile
): EligibilityResult {
	const blockReasons: string[] = [];
	let payoutMultiplier = 1;

	if (team.driverMarketability < sponsor.minMarketability) {
		blockReasons.push('marketability');
	}

	if (sponsor.minTeamStanding != null) {
		if (team.standing == null || team.standing > sponsor.minTeamStanding) {
			blockReasons.push('standing');
		}
	}

	// Title slot demands stronger standing even if sponsor gate is loose
	if (sponsor.slotType === 'title' && (team.standing == null || team.standing > 8)) {
		if (!blockReasons.includes('standing')) blockReasons.push('standing');
	}

	const ethicsRisk =
		sponsor.ethicsSensitivity * Math.max(0, 1 - team.reputation / 100);
	if (ethicsRisk >= ETHICS_BLOCK_THRESHOLD) {
		blockReasons.push('ethics');
	} else if (ethicsRisk > 0.2) {
		payoutMultiplier *= 1 - ethicsRisk * 0.4;
	}

	if (
		sponsor.nationalityCode &&
		team.nationalityCode &&
		sponsor.nationalityCode !== team.nationalityCode
	) {
		payoutMultiplier *= 1 - NAT_MISMATCH_PENALTY;
	}

	return {
		eligible: blockReasons.length === 0,
		blockReasons,
		payoutMultiplier: Math.max(0.35, Math.min(1, payoutMultiplier))
	};
}
