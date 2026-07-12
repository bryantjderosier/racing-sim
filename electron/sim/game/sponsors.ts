import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { sponsors, teams } from '../../db/schema.js';
import type { CareerSummary } from '../career/store.js';
import {
	BASE_BONUS,
	BASE_PER_RACE,
	BASE_UPFRONT,
	DIVISION_SPONSOR_MULT,
	SLOT_CAPS,
	buildTeamSponsorProfile,
	countActiveSlots,
	evaluateSponsorEligibility,
	listActiveSponsorDeals,
	signSponsorDeal,
	type SignSponsorDealResult,
	type SponsorSlotType
} from '../sponsors/index.js';
import { ensureClock } from '../world/tick.js';
import { getSeasonCaps } from './desk.js';
import type {
	SignSponsorDealArgs,
	SponsorActiveDealView,
	SponsorCatalogView,
	SponsorsHubSnapshot
} from './types.js';

const SLOT_TYPES: SponsorSlotType[] = ['title', 'major', 'minor'];

export async function getSponsorsSnapshot(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>
): Promise<SponsorsHubSnapshot> {
	const playerTeamId = career.playerTeamId;
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const caps = await getSeasonCaps(db, clock.seasonYear, team.division);
	const profile = await buildTeamSponsorProfile(db, playerTeamId);
	const dealRows = await listActiveSponsorDeals(db, playerTeamId);
	const catalogRows = await db.select().from(sponsors);

	const sponsorNameById = new Map(catalogRows.map((s) => [s.id, s.name]));
	const dealGroups = new Map<string, SponsorActiveDealView>();
	for (const row of dealRows) {
		const key = `${row.sponsorId}:${row.slotType}`;
		const existing = dealGroups.get(key);
		if (existing) {
			existing.streams.push({
				payoutType: row.payoutType,
				amount: row.amount,
				bonusTargetPosition: row.bonusTargetPosition
			});
			continue;
		}
		dealGroups.set(key, {
			sponsorId: row.sponsorId,
			sponsorName: sponsorNameById.get(row.sponsorId) ?? `Sponsor ${row.sponsorId}`,
			slotType: row.slotType,
			yearsRemaining: row.yearsRemaining,
			remainingRaces: row.remainingRaces,
			streams: [
				{
					payoutType: row.payoutType,
					amount: row.amount,
					bonusTargetPosition: row.bonusTargetPosition
				}
			]
		});
	}

	const signedSponsorIds = new Set(dealRows.map((d) => d.sponsorId));
	const slotCounts: Record<SponsorSlotType, number> = {
		title: await countActiveSlots(db, playerTeamId, 'title'),
		major: await countActiveSlots(db, playerTeamId, 'major'),
		minor: await countActiveSlots(db, playerTeamId, 'minor')
	};

	const catalog: SponsorCatalogView[] = catalogRows.map((s) => {
		const eligibility: SponsorCatalogView['eligibility'] = {};
		for (const slotType of SLOT_TYPES) {
			const gate = evaluateSponsorEligibility(
				{
					minMarketability: s.minMarketability,
					minTeamStanding: s.minTeamStanding,
					ethicsSensitivity: s.ethicsSensitivity,
					nationalityCode: s.nationalityCode,
					slotType
				},
				profile
			);
			eligibility[slotType] = {
				eligible: gate.eligible && slotCounts[slotType] < SLOT_CAPS[slotType],
				blockReasons: [
					...gate.blockReasons,
					...(slotCounts[slotType] >= SLOT_CAPS[slotType] ? ['slot_full'] : [])
				],
				payoutMultiplier:
					gate.payoutMultiplier * (DIVISION_SPONSOR_MULT[profile.division] ?? 1)
			};
		}
		return {
			sponsorId: s.id,
			name: s.name,
			nationalityCode: s.nationalityCode,
			minMarketability: s.minMarketability,
			minTeamStanding: s.minTeamStanding,
			ethicsSensitivity: s.ethicsSensitivity,
			eligibility,
			alreadySigned: signedSponsorIds.has(s.id)
		};
	});

	return {
		career: {
			id: career.id,
			displayName: career.displayName,
			playerTeamId
		},
		clock: {
			seasonYear: clock.seasonYear,
			week: clock.week,
			day: clock.day,
			tickIndex: clock.tickIndex
		},
		team: {
			id: team.id,
			name: team.name,
			cash: team.liquidCash,
			wtHours: team.wtHoursRemaining,
			cfdHours: team.cfdHoursRemaining,
			wtHoursCap: caps.wtHoursWeeklyCap * (team.wtHoursCapMult ?? 1),
			cfdHoursCap: caps.cfdHoursWeeklyCap,
			reputation: team.reputation,
			division: team.division,
			rdPivotCurrent: team.rdPivotCurrent
		},
		profile: {
			reputation: profile.reputation,
			standing: profile.standing,
			driverMarketability: profile.driverMarketability,
			nationalityCode: profile.nationalityCode
		},
		slots: SLOT_TYPES.map((slotType) => ({
			slotType,
			used: slotCounts[slotType],
			cap: SLOT_CAPS[slotType]
		})),
		deals: [...dealGroups.values()],
		catalog
	};
}

export async function signPlayerSponsorDeal(
	db: AppDb,
	playerTeamId: number,
	args: SignSponsorDealArgs
): Promise<SignSponsorDealResult> {
	return signSponsorDeal(db, {
		teamId: playerTeamId,
		sponsorId: args.sponsorId,
		slotType: args.slotType
	});
}

/** Quote baseline deal amounts for UI (before eligibility mult is applied in sign). */
export function sponsorBaseAmounts(slotType: SponsorSlotType) {
	return {
		upfront: BASE_UPFRONT[slotType],
		perRace: BASE_PER_RACE[slotType],
		bonus: BASE_BONUS[slotType]
	};
}
