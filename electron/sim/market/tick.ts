import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { aiTeamProfiles, drivers, teams } from '../../db/schema.js';
import { computeAiMaxBid } from './bid.js';
import {
	buildDriverProfile,
	getScoutLeverage,
	signDriverContract
} from './contracts.js';
import { scanMarketHeat, teamsWithOpenSeats, type HotDriver } from './heat.js';
import { evaluateOffer, type ContractOfferTerms } from './accept.js';
import { marketRateAnnual } from './value.js';

export type MarketTickOptions = {
	/** Skip player-managed team auto-bids. */
	playerTeamId?: number;
	rng?: () => number;
	/** Max AI signings this tick. */
	maxSignings?: number;
};

export type MarketTickSigning = {
	driverId: number;
	driverName: string;
	fromTeamId: number | null;
	toTeamId: number;
	salaryAnnual: number;
	buyoutPaid: number;
	acceptScore: number;
};

export type MarketTickResult = {
	hotCount: number;
	openSeats: number[];
	signings: MarketTickSigning[];
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

/**
 * Quiet unless heat: AI teams with need bid on hot drivers / free agents.
 */
export async function tickDriverMarket(
	db: AppDb,
	options: MarketTickOptions = {}
): Promise<MarketTickResult> {
	const rng = options.rng ?? mulberry32(Date.now() % 1_000_000);
	const hot = await scanMarketHeat(db);
	const openSeats = await teamsWithOpenSeats(db);
	const maxSignings = options.maxSignings ?? 3;

	const teamRows = await db.select().from(teams);
	const profiles = await db.select().from(aiTeamProfiles);
	const profileBy = new Map(profiles.map((p) => [p.teamId, p]));

	const signings: MarketTickSigning[] = [];
	let rejectedBids = 0;
	const signedDrivers = new Set<number>();
	const filledTeams = new Set<number>();

	// Prefer free agents and final-window; retirements leave FA pool after age-out (handled as free)
	const targets = [...hot].sort((a, b) => {
		const score = (h: HotDriver) =>
			(h.reasons.includes('free_agent') ? 3 : 0) +
			(h.reasons.includes('final_window') ? 2 : 0) +
			(h.reasons.includes('retirement') ? 1 : 0);
		return score(b) - score(a);
	});

	for (const seatTeamId of [...openSeats, ...teamRows.map((t) => t.id)]) {
		if (signings.length >= maxSignings) break;
		if (options.playerTeamId != null && seatTeamId === options.playerTeamId) continue;
		if (filledTeams.has(seatTeamId)) continue;

		const team = teamRows.find((t) => t.id === seatTeamId);
		if (!team) continue;

		const need = openSeats.includes(seatTeamId) ? 1.2 : 0.35 + rng() * 0.25;
		if (need < 0.7 && !openSeats.includes(seatTeamId)) continue;

		const profile = profileBy.get(seatTeamId);
		let best: {
			driver: HotDriver;
			offer: ContractOfferTerms;
			buyout: number;
		} | null = null;
		let bestValue = -Infinity;

		for (const h of targets) {
			if (signedDrivers.has(h.driverId)) continue;
			if (h.teamId === seatTeamId) continue;
			if (h.reasons.includes('retirement') && h.age >= h.longevity) continue;

			const divProfile = await buildDriverProfile(db, h.driverId, team.division);
			const buyout =
				h.teamId != null && h.teamId !== seatTeamId ? (h.buyoutFee ?? 0) : 0;
			const bid = computeAiMaxBid({
				driver: divProfile,
				liquidCash: team.liquidCash,
				division: team.division,
				archetype: profile?.archetype,
				need,
				buyoutRequired: buyout
			});
			if (buyout > 0 && !bid.canAffordBuyout) continue;

			const fair = marketRateAnnual(divProfile);
			const value = bid.maxSalary / fair - buyout / Math.max(1, team.liquidCash);
			if (value > bestValue) {
				bestValue = value;
				best = { driver: h, offer: bid.offer, buyout };
			}
		}

		if (!best) continue;

		const result = await signDriverContract(db, {
			driverId: best.driver.driverId,
			teamId: seatTeamId,
			offer: best.offer,
			buyoutPaid: best.buyout,
			rng,
			force: false
		});

		if (!result.accepted) {
			rejectedBids++;
			continue;
		}

		signedDrivers.add(best.driver.driverId);
		filledTeams.add(seatTeamId);
		signings.push({
			driverId: best.driver.driverId,
			driverName: best.driver.name,
			fromTeamId: best.driver.teamId,
			toTeamId: seatTeamId,
			salaryAnnual: best.offer.salaryAnnual,
			buyoutPaid: result.buyoutPaid,
			acceptScore: result.evaluation.score
		});

		// refresh team cash cache
		const [fresh] = await db.select().from(teams).where(eq(teams.id, seatTeamId)).limit(1);
		if (fresh) {
			const idx = teamRows.findIndex((t) => t.id === seatTeamId);
			if (idx >= 0) teamRows[idx] = fresh;
		}
	}

	return {
		hotCount: hot.length,
		openSeats,
		signings,
		rejectedBids
	};
}

/**
 * Player-facing: evaluate an offer without signing.
 */
export async function previewDriverOffer(
	db: AppDb,
	args: {
		driverId: number;
		teamId: number;
		offer: ContractOfferTerms;
		rng?: () => number;
	}
) {
	const [team] = await db.select().from(teams).where(eq(teams.id, args.teamId)).limit(1);
	if (!team) throw new Error('Team not found');
	const [driver] = await db.select().from(drivers).where(eq(drivers.id, args.driverId)).limit(1);
	if (!driver) throw new Error('Driver not found');

	const profile = await buildDriverProfile(db, args.driverId, team.division);
	const leverage = await getScoutLeverage(db, args.teamId);
	const leavingTeam = driver.teamId != null && driver.teamId !== args.teamId;

	return evaluateOffer(args.offer, {
		driver: profile,
		teamReputation: team.reputation,
		teamStanding: team.constructorsStanding,
		scoutLeverage: leverage,
		leavingTeam,
		rng: args.rng
	});
}
