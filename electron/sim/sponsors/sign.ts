import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	drivers,
	sponsorContracts,
	sponsors,
	teams
} from '../../db/schema.js';
import { receiveCash } from '../finance/index.js';
import {
	BASE_BONUS,
	BASE_PER_RACE,
	BASE_UPFRONT,
	DEFAULT_MAJOR_YEARS,
	DEFAULT_MINOR_RACES,
	DEFAULT_TITLE_YEARS,
	DIVISION_SPONSOR_MULT,
	SLOT_CAPS,
	type SponsorSlotType
} from './constants.js';
import {
	evaluateSponsorEligibility,
	type TeamSponsorProfile
} from './eligibility.js';

async function nextContractId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${sponsorContracts.id}), 0)` })
		.from(sponsorContracts);
	return Number(row?.m ?? 0) + 1;
}

export async function countActiveSlots(
	db: AppDb,
	teamId: number,
	slotType: SponsorSlotType
): Promise<number> {
	const rows = await db
		.select()
		.from(sponsorContracts)
		.where(
			and(
				eq(sponsorContracts.teamId, teamId),
				eq(sponsorContracts.slotType, slotType),
				eq(sponsorContracts.isActive, true)
			)
		);
	// Unique sponsors in this slot type count as one inventory seat
	return new Set(rows.map((r) => r.sponsorId)).size;
}

export async function buildTeamSponsorProfile(
	db: AppDb,
	teamId: number
): Promise<TeamSponsorProfile> {
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
	if (!team) throw new Error(`Team ${teamId} not found`);

	const roster = await db.select().from(drivers).where(eq(drivers.teamId, teamId));
	let bestMkt = 40;
	for (const d of roster) {
		const [m] = await db
			.select()
			.from(attributes)
			.where(
				and(
					eq(attributes.entityId, d.id),
					eq(attributes.entityType, 'driver'),
					eq(attributes.attrName, 'marketability')
				)
			)
			.limit(1);
		if (m && m.currentValue > bestMkt) bestMkt = m.currentValue;
	}

	return {
		teamId,
		nationalityCode: team.nationalityCode,
		reputation: team.reputation,
		standing: team.constructorsStanding,
		driverMarketability: bestMkt,
		division: team.division
	};
}

export type SignSponsorDealInput = {
	teamId: number;
	sponsorId: number;
	slotType: SponsorSlotType;
	/** Override generated amounts (after eligibility mult). */
	upfront?: number;
	perRace?: number;
	bonus?: number;
	bonusTargetPosition?: number;
	yearsRemaining?: number | null;
	remainingRaces?: number | null;
};

export type SignSponsorDealResult = {
	signed: boolean;
	blockReasons: string[];
	payoutMultiplier: number;
	contractIds: number[];
	upfrontPaid: number;
};

/**
 * Sign a sponsor into a free slot; pays upfront immediately (outside cost cap).
 */
export async function signSponsorDeal(
	db: AppDb,
	input: SignSponsorDealInput
): Promise<SignSponsorDealResult> {
	const [sponsor] = await db
		.select()
		.from(sponsors)
		.where(eq(sponsors.id, input.sponsorId))
		.limit(1);
	if (!sponsor) throw new Error(`Sponsor ${input.sponsorId} not found`);

	const used = await countActiveSlots(db, input.teamId, input.slotType);
	if (used >= SLOT_CAPS[input.slotType]) {
		return {
			signed: false,
			blockReasons: ['slot_full'],
			payoutMultiplier: 0,
			contractIds: [],
			upfrontPaid: 0
		};
	}

	const profile = await buildTeamSponsorProfile(db, input.teamId);
	const gate = evaluateSponsorEligibility(
		{
			minMarketability: sponsor.minMarketability,
			minTeamStanding: sponsor.minTeamStanding,
			ethicsSensitivity: sponsor.ethicsSensitivity,
			nationalityCode: sponsor.nationalityCode,
			slotType: input.slotType
		},
		profile
	);

	if (!gate.eligible) {
		return {
			signed: false,
			blockReasons: gate.blockReasons,
			payoutMultiplier: gate.payoutMultiplier,
			contractIds: [],
			upfrontPaid: 0
		};
	}

	const divMult = DIVISION_SPONSOR_MULT[profile.division] ?? 1;
	const mult = gate.payoutMultiplier * divMult;

	const upfront = Math.round(
		(input.upfront ?? BASE_UPFRONT[input.slotType]) * mult
	);
	const perRace = Math.round(
		(input.perRace ?? BASE_PER_RACE[input.slotType]) * mult
	);
	const bonus = Math.round((input.bonus ?? BASE_BONUS[input.slotType]) * mult);

	const years =
		input.yearsRemaining !== undefined
			? input.yearsRemaining
			: input.slotType === 'title'
				? DEFAULT_TITLE_YEARS
				: input.slotType === 'major'
					? DEFAULT_MAJOR_YEARS
					: null;
	const races =
		input.remainingRaces !== undefined
			? input.remainingRaces
			: input.slotType === 'minor'
				? DEFAULT_MINOR_RACES
				: null;

	const bonusTarget =
		input.bonusTargetPosition ??
		(input.slotType === 'title' ? 3 : input.slotType === 'major' ? 8 : 10);

	let id = await nextContractId(db);
	const contractIds: number[] = [];

	const streams: {
		payoutType: 'upfront' | 'per_race' | 'bonus';
		amount: number;
	}[] = [
		{ payoutType: 'upfront', amount: upfront },
		{ payoutType: 'per_race', amount: perRace },
		{ payoutType: 'bonus', amount: bonus }
	];

	for (const s of streams) {
		const cid = id++;
		contractIds.push(cid);
		await db.insert(sponsorContracts).values({
			id: cid,
			teamId: input.teamId,
			sponsorId: input.sponsorId,
			slotType: input.slotType,
			payoutType: s.payoutType,
			amount: s.amount,
			bonusTargetPosition: s.payoutType === 'bonus' ? bonusTarget : null,
			remainingRaces: races,
			yearsRemaining: years,
			isActive: true
		});
	}

	if (upfront > 0) {
		await receiveCash(db, {
			teamId: input.teamId,
			amount: upfront,
			transactionType: 'sponsor_payout'
		});
	}

	return {
		signed: true,
		blockReasons: [],
		payoutMultiplier: gate.payoutMultiplier,
		contractIds,
		upfrontPaid: upfront
	};
}
