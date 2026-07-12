import { eq } from 'drizzle-orm';
import type { AppDb } from '../../../db/node.js';
import { aiTeamProfiles, staff, teams } from '../../../db/schema.js';
import type { ContractOfferTerms } from '../accept.js';
import { getScoutLeverage } from '../contracts.js';
import { computeStaffAiMaxBid } from './bid.js';
import { buildStaffProfile, signStaffContract } from './contracts.js';
import { evaluateStaffOffer } from './accept.js';
import { scanStaffMarketHeat, teamsMissingStaffRoles, type HotStaff } from './heat.js';
import { staffMarketRateAnnual } from './value.js';
import type { StaffRole } from './types.js';

export type StaffMarketTickOptions = {
	playerTeamId?: number;
	rng?: () => number;
	maxSignings?: number;
};

export type StaffMarketTickSigning = {
	staffId: number;
	staffName: string;
	role: StaffRole;
	fromTeamId: number | null;
	toTeamId: number;
	salaryAnnual: number;
	buyoutPaid: number;
	acceptScore: number;
};

export type StaffMarketTickResult = {
	hotCount: number;
	openRoles: { teamId: number; missingRoles: StaffRole[] }[];
	signings: StaffMarketTickSigning[];
	rejectedBids: number;
};

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

async function clearRoleIncumbent(db: AppDb, teamId: number, role: StaffRole, exceptId: number) {
	const incumbents = await db.select().from(staff).where(eq(staff.teamId, teamId));
	for (const s of incumbents) {
		if (s.role === role && s.id !== exceptId) {
			await db
				.update(staff)
				.set({ teamId: null, assignedDriverId: null })
				.where(eq(staff.id, s.id));
		}
	}
}

/**
 * AI teams fill missing core roles from hot staff / free agents.
 */
export async function tickStaffMarket(
	db: AppDb,
	options: StaffMarketTickOptions = {}
): Promise<StaffMarketTickResult> {
	const rng = options.rng ?? mulberry32(Date.now() % 1_000_000);
	const hot = await scanStaffMarketHeat(db);
	const openRoles = await teamsMissingStaffRoles(db);
	const maxSignings = options.maxSignings ?? 4;

	const teamRows = await db.select().from(teams);
	const profiles = await db.select().from(aiTeamProfiles);
	const profileBy = new Map(profiles.map((p) => [p.teamId, p]));

	const signings: StaffMarketTickSigning[] = [];
	let rejectedBids = 0;
	const signedStaff = new Set<number>();
	const filledKeys = new Set<string>();

	const targets = [...hot].sort((a, b) => {
		const score = (h: HotStaff) =>
			(h.reasons.includes('free_agent') ? 3 : 0) +
			(h.reasons.includes('final_window') ? 2 : 0);
		return score(b) - score(a);
	});

	for (const open of openRoles) {
		if (signings.length >= maxSignings) break;
		if (options.playerTeamId != null && open.teamId === options.playerTeamId) continue;

		const team = teamRows.find((t) => t.id === open.teamId);
		if (!team) continue;
		const profile = profileBy.get(open.teamId);

		for (const role of open.missingRoles) {
			if (signings.length >= maxSignings) break;
			const fillKey = `${open.teamId}:${role}`;
			if (filledKeys.has(fillKey)) continue;

			let best: {
				member: HotStaff;
				offer: ContractOfferTerms;
				buyout: number;
				budgetGuarantee: boolean;
			} | null = null;
			let bestValue = -Infinity;

			for (const h of targets) {
				if (signedStaff.has(h.staffId)) continue;
				if (h.role !== role) continue;
				if (h.teamId === open.teamId) continue;

				const staffProfile = await buildStaffProfile(db, h.staffId, team.division);
				const buyout =
					h.teamId != null && h.teamId !== open.teamId ? (h.buyoutFee ?? 0) : 0;
				const bid = computeStaffAiMaxBid({
					staff: staffProfile,
					liquidCash: team.liquidCash,
					division: team.division,
					archetype: profile?.archetype,
					need: 1.15,
					buyoutRequired: buyout
				});
				if (buyout > 0 && !bid.canAffordBuyout) continue;

				const fair = staffMarketRateAnnual(staffProfile);
				const value = bid.maxSalary / fair - buyout / Math.max(1, team.liquidCash);
				if (value > bestValue) {
					bestValue = value;
					best = {
						member: h,
						offer: bid.offer,
						buyout,
						budgetGuarantee: bid.budgetGuarantee
					};
				}
			}

			if (!best) continue;

			await clearRoleIncumbent(db, open.teamId, role, best.member.staffId);

			const result = await signStaffContract(db, {
				staffId: best.member.staffId,
				teamId: open.teamId,
				offer: best.offer,
				buyoutPaid: best.buyout,
				budgetGuarantee: best.budgetGuarantee,
				rng
			});

			if (!result.accepted) {
				rejectedBids++;
				continue;
			}

			signedStaff.add(best.member.staffId);
			filledKeys.add(fillKey);
			signings.push({
				staffId: best.member.staffId,
				staffName: best.member.name,
				role,
				fromTeamId: best.member.teamId,
				toTeamId: open.teamId,
				salaryAnnual: best.offer.salaryAnnual,
				buyoutPaid: result.buyoutPaid,
				acceptScore: result.evaluation.score
			});

			const [fresh] = await db.select().from(teams).where(eq(teams.id, open.teamId)).limit(1);
			if (fresh) {
				const idx = teamRows.findIndex((t) => t.id === open.teamId);
				if (idx >= 0) teamRows[idx] = fresh;
			}
		}
	}

	return {
		hotCount: hot.length,
		openRoles,
		signings,
		rejectedBids
	};
}

export async function previewStaffOffer(
	db: AppDb,
	args: {
		staffId: number;
		teamId: number;
		offer: ContractOfferTerms;
		budgetGuarantee?: boolean;
		rng?: () => number;
	}
) {
	const [team] = await db.select().from(teams).where(eq(teams.id, args.teamId)).limit(1);
	if (!team) throw new Error('Team not found');
	const [member] = await db.select().from(staff).where(eq(staff.id, args.staffId)).limit(1);
	if (!member) throw new Error('Staff not found');

	const profile = await buildStaffProfile(db, args.staffId, team.division);
	const leverage = await getScoutLeverage(db, args.teamId);

	return evaluateStaffOffer(args.offer, {
		staff: profile,
		teamReputation: team.reputation,
		teamStanding: team.constructorsStanding,
		scoutLeverage: leverage,
		leavingTeam: member.teamId != null && member.teamId !== args.teamId,
		budgetGuarantee: args.budgetGuarantee,
		rng: args.rng
	});
}
