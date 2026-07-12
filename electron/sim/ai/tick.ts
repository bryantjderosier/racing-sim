import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	blueprints,
	facilities,
	manufacturingQueue,
	parts,
	rdProjects,
	teams
} from '../../db/schema.js';
import {
	getFacilityUpgradeQuote,
	startFacilityBuild,
	type FacilityType
} from '../facilities/index.js';
import { rdTestingCashCost } from '../finance/index.js';
import {
	allocateTestingHours,
	queueManufacture,
	startRdProject
} from '../rd/index.js';
import type { DevelopableSlot, RdFocus } from '../rd/types.js';
import { AI_RD_SLOTS, BUILDER_FACILITY_INCOME_SHARE } from './constants.js';
import {
	capSpendCeiling,
	facilityCashReserveNeeded,
	facilityPriority,
	hourSpendFraction,
	listAiTeams,
	loadAiProfile,
	type AiProfile
} from './profile.js';

export type AiTeamAction = {
	teamId: number;
	archetype: string;
	startedProject?: { projectId: number; slot: string };
	allocatedHours?: { projectId: number; wt: number; cfd: number };
	queuedManufacture?: { queueId: number; blueprintId: number };
	startedFacility?: { facilityType: string; toTier: number };
	skippedReasons: string[];
};

export type AiManagersTickResult = {
	teamsActed: number;
	actions: AiTeamAction[];
};

function pickSlot(rng: () => number, activeSlots: Set<string>): DevelopableSlot {
	const open = AI_RD_SLOTS.filter((s) => !activeSlots.has(s));
	const pool = open.length > 0 ? open : [...AI_RD_SLOTS];
	return pool[Math.floor(rng() * pool.length)]!;
}

function focusForProfile(profile: AiProfile, pivotCurrent: number): RdFocus {
	if (profile.archetype === 'pragmatic_pivot' && pivotCurrent < 0.5) return 'next_year';
	if (profile.archetype === 'long_term_builder' && profile.rAndDFocusBias > 0.55) {
		return 'next_year';
	}
	if (profile.archetype === 'aggressive_spender') return 'current_car';
	return pivotCurrent >= 0.5 ? 'current_car' : 'next_year';
}

async function canAffordCap(
	team: { costCapSpent: number; costCapLimit: number; liquidCash: number },
	profile: AiProfile,
	extraCapSpend: number,
	extraCash: number
): Promise<boolean> {
	if (team.liquidCash < extraCash) return false;
	const ceiling = capSpendCeiling(team.costCapLimit, profile);
	return team.costCapSpent + extraCapSpend <= ceiling;
}

/**
 * One AI team week: start/continue R&D, maybe manufacture, maybe facility upgrade.
 */
export async function tickAiTeam(
	db: AppDb,
	teamId: number,
	rng: () => number = Math.random
): Promise<AiTeamAction> {
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
	if (!team) throw new Error(`Team ${teamId} not found`);
	if (team.status === 'PLAYER_MANAGED') {
		return {
			teamId,
			archetype: 'player',
			skippedReasons: ['player_managed']
		};
	}

	const profile = await loadAiProfile(db, teamId);
	const action: AiTeamAction = {
		teamId,
		archetype: profile.archetype,
		skippedReasons: []
	};

	const active = await db
		.select()
		.from(rdProjects)
		.where(and(eq(rdProjects.teamId, teamId), eq(rdProjects.status, 'fabricating')));
	const activeSlots = new Set(active.map((p) => p.slot));

	let project = active[0] ?? null;
	if (!project) {
		const slot = pickSlot(rng, activeSlots);
		const focus = focusForProfile(profile, team.rdPivotCurrent);
		try {
			const started = await startRdProject(db, { teamId, slot, focus });
			action.startedProject = { projectId: started.projectId, slot };
			const [p] = await db
				.select()
				.from(rdProjects)
				.where(eq(rdProjects.id, started.projectId))
				.limit(1);
			project = p ?? null;
		} catch (e) {
			action.skippedReasons.push(`rd_start:${(e as Error).message}`);
		}
	}

	if (project) {
		const frac = hourSpendFraction(profile);
		let wt = Math.floor(team.wtHoursRemaining * frac);
		let cfd = Math.floor(team.cfdHoursRemaining * frac);
		if (wt < 1 && team.wtHoursRemaining >= 1) wt = 1;
		if (cfd < 1 && team.cfdHoursRemaining >= 1) cfd = 1;
		const cost = rdTestingCashCost(wt, cfd);
		const [fresh] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
		if (
			fresh &&
			(wt > 0 || cfd > 0) &&
			(await canAffordCap(fresh, profile, cost, cost))
		) {
			try {
				await allocateTestingHours(db, {
					projectId: project.id,
					wtHours: wt,
					cfdHours: cfd,
					autoComplete: true,
					rng
				});
				action.allocatedHours = { projectId: project.id, wt, cfd };
			} catch (e) {
				action.skippedReasons.push(`rd_alloc:${(e as Error).message}`);
			}
		} else {
			action.skippedReasons.push('rd_budget');
		}
	}

	// Manufacture newest unbuilt blueprint if aggressive / pragmatic and cash ok
	const shouldMfg =
		profile.archetype === 'aggressive_spender' ||
		(profile.archetype === 'pragmatic_pivot' && rng() < 0.45) ||
		(profile.archetype === 'long_term_builder' && rng() < 0.2);

	if (shouldMfg) {
		const bps = await db
			.select()
			.from(blueprints)
			.where(and(eq(blueprints.teamId, teamId), eq(blueprints.isInvalidated, false)));
		const existingParts = await db.select().from(parts).where(eq(parts.teamId, teamId));
		const queued = await db
			.select()
			.from(manufacturingQueue)
			.where(
				and(
					eq(manufacturingQueue.teamId, teamId),
					eq(manufacturingQueue.status, 'fabricating')
				)
			);
		const usedBp = new Set([
			...existingParts.map((p) => p.blueprintId),
			...queued.map((q) => q.blueprintId)
		]);
		const candidate = bps
			.filter((b) => !usedBp.has(b.id))
			.sort((a, b) => b.performancePoints - a.performancePoints)[0];
		if (candidate) {
			const [fresh] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
			try {
				if (fresh && (await canAffordCap(fresh, profile, 180_000, 180_000))) {
					const q = await queueManufacture(db, {
						teamId,
						blueprintId: candidate.id
					});
					action.queuedManufacture = {
						queueId: q.queueId,
						blueprintId: candidate.id
					};
				}
			} catch (e) {
				action.skippedReasons.push(`mfg:${(e as Error).message}`);
			}
		}
	}

	// Facility upgrade
	const facRate = profile.facilityInvestmentRate;
	const wantFacility =
		profile.archetype === 'long_term_builder'
			? rng() < Math.max(0.35, facRate)
			: profile.archetype === 'aggressive_spender'
				? rng() < facRate * 0.25
				: rng() < facRate * 0.55;

	if (wantFacility) {
		const [fresh] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
		if (fresh) {
			const owned = await db.select().from(facilities).where(eq(facilities.teamId, teamId));
			const byType = new Map(owned.map((f) => [f.facilityType, f]));
			for (const pref of facilityPriority(profile)) {
				const fac = byType.get(pref);
				const fromTier = fac?.tier ?? 0;
				if (fac?.isUnderConstruction) continue;
				const quote = await getFacilityUpgradeQuote(pref as FacilityType, fromTier);
				if (!quote) continue;
				const reserve = facilityCashReserveNeeded(profile, quote.cash);
				const builderOk =
					profile.archetype !== 'long_term_builder' ||
					fresh.liquidCash * BUILDER_FACILITY_INCOME_SHARE >= quote.cash * 0.5;
				if (fresh.liquidCash < quote.cash + reserve * 0.15) continue;
				if (!builderOk && profile.archetype === 'long_term_builder') continue;
				// Facilities outside cap — only cash check
				if (fresh.liquidCash < quote.cash) continue;
				if (
					profile.archetype === 'aggressive_spender' &&
					fresh.liquidCash < quote.cash * 2.5
				) {
					continue;
				}
				try {
					const build = await startFacilityBuild(db, {
						teamId,
						facilityType: pref as FacilityType
					});
					action.startedFacility = {
						facilityType: pref,
						toTier: build.toTier
					};
					break;
				} catch (e) {
					action.skippedReasons.push(`fac:${(e as Error).message}`);
				}
			}
			if (!action.startedFacility) action.skippedReasons.push('no_facility');
		}
	}

	return action;
}

export async function tickAllAiManagers(
	db: AppDb,
	options: { rng?: () => number; teamIds?: number[] } = {}
): Promise<AiManagersTickResult> {
	const rng = options.rng ?? Math.random;
	const ids = options.teamIds ?? (await listAiTeams(db));
	const actions: AiTeamAction[] = [];
	for (const id of ids) {
		try {
			actions.push(await tickAiTeam(db, id, rng));
		} catch (e) {
			actions.push({
				teamId: id,
				archetype: 'unknown',
				skippedReasons: [`fatal:${(e as Error).message}`]
			});
		}
	}
	return {
		teamsActed: actions.filter((a) => !a.skippedReasons.includes('player_managed')).length,
		actions
	};
}
