import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	aiTeamProfiles,
	blueprints,
	facilities,
	regulationVotes,
	regulatoryHistory,
	teams
} from '../../db/schema.js';
import { applyWinterRegression } from '../rd/winter.js';
import type { DevelopableSlot } from '../rd/types.js';
import type { RegProposal } from './constants.js';
import { generateWinterProposals } from './proposals.js';
import { decideAiVote, tallyProposal, type TallyResult } from './vote.js';

async function nextHistoryId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${regulatoryHistory.id}), 0)` })
		.from(regulatoryHistory);
	return Number(row?.m ?? 0) + 1;
}

async function nextVoteId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${regulationVotes.id}), 0)` })
		.from(regulationVotes);
	return Number(row?.m ?? 0) + 1;
}

async function slotStrengthByTeam(db: AppDb): Promise<{
	byTeam: Map<number, Partial<Record<DevelopableSlot, number>>>;
	fieldAvg: Partial<Record<DevelopableSlot, number>>;
}> {
	const rows = await db
		.select()
		.from(blueprints)
		.where(eq(blueprints.isInvalidated, false));
	const byTeam = new Map<number, Partial<Record<DevelopableSlot, number>>>();
	const sums: Partial<Record<DevelopableSlot, { sum: number; n: number }>> = {};

	for (const r of rows) {
		const slot = r.slot as DevelopableSlot;
		const teamMap = byTeam.get(r.teamId) ?? {};
		const prev = teamMap[slot];
		teamMap[slot] = prev == null ? r.performancePoints : Math.max(prev, r.performancePoints);
		byTeam.set(r.teamId, teamMap);

		const s = sums[slot] ?? { sum: 0, n: 0 };
		s.sum += r.performancePoints;
		s.n += 1;
		sums[slot] = s;
	}

	const fieldAvg: Partial<Record<DevelopableSlot, number>> = {};
	for (const [slot, s] of Object.entries(sums) as [DevelopableSlot, { sum: number; n: number }][]) {
		fieldAvg[slot] = s.n ? s.sum / s.n : 0;
	}
	return { byTeam, fieldAvg };
}

async function hqReliefForTeam(db: AppDb, teamId: number): Promise<number> {
	const facs = await db.select().from(facilities).where(eq(facilities.teamId, teamId));
	const design = facs.find((f) => f.facilityType === 'design_studio');
	if (design && design.tier >= 5) return 0.2;
	return 0;
}

export type PlayerVote = {
	proposalId: number;
	voteFor: boolean;
	politicalCapitalSpent?: number;
};

export type WinterRegsOptions = {
	seasonYear: number;
	/** Incoming season year for history rows (usually seasonYear+1). */
	applyToSeasonYear?: number;
	playerTeamId?: number;
	playerVotes?: PlayerVote[];
	proposals?: RegProposal[];
	rng?: () => number;
};

export type PassedRuleResult = {
	proposal: RegProposal;
	tally: TallyResult;
	blueprintsTouched: number;
	invalidated: number;
};

export type WinterRegsResult = {
	proposals: RegProposal[];
	tallies: TallyResult[];
	passed: PassedRuleResult[];
	votesCast: number;
};

/**
 * Winter regulation session: 3 proposals → one vote per team → apply passed rules
 * with per-team pivot credit offsetting regression.
 */
export async function runWinterRegulations(
	db: AppDb,
	options: WinterRegsOptions
): Promise<WinterRegsResult> {
	const rng =
		options.rng ??
		(() => {
			let s = options.seasonYear * 7919;
			return () => {
				s = (s * 1664525 + 1013904223) >>> 0;
				return s / 4294967296;
			};
		})();

	const applyYear = options.applyToSeasonYear ?? options.seasonYear + 1;
	const proposals =
		options.proposals ?? generateWinterProposals(options.seasonYear, rng);

	await db
		.delete(regulationVotes)
		.where(eq(regulationVotes.seasonYear, options.seasonYear));

	const teamRows = await db.select().from(teams);
	const profiles = await db.select().from(aiTeamProfiles);
	const profileBy = new Map(profiles.map((p) => [p.teamId, p]));
	const { byTeam, fieldAvg } = await slotStrengthByTeam(db);

	const playerVoteMap = new Map(
		(options.playerVotes ?? []).map((v) => [v.proposalId, v])
	);

	let voteId = await nextVoteId(db);
	let votesCast = 0;
	const votesByProposal = new Map<
		number,
		{ voteFor: boolean; politicalCapitalSpent: number }[]
	>();

	for (const p of proposals) {
		votesByProposal.set(p.id, []);
	}

	for (const team of teamRows) {
		const profile = profileBy.get(team.id);
		const nextYearPivot = 1 - team.rdPivotCurrent;
		const teamSlots = byTeam.get(team.id) ?? {};

		for (const p of proposals) {
			let voteFor: boolean;
			let capital = 0;

			if (options.playerTeamId != null && team.id === options.playerTeamId) {
				const pv = playerVoteMap.get(p.id);
				voteFor = pv?.voteFor ?? false;
				capital = pv?.politicalCapitalSpent ?? 0;
			} else {
				const slot = p.affectedSlot;
				const decided = decideAiVote(p, {
					archetype: profile?.archetype,
					slotStrength: slot ? (teamSlots[slot] ?? null) : null,
					fieldSlotAvg: slot ? (fieldAvg[slot] ?? null) : null,
					nextYearPivot,
					rng
				});
				voteFor = decided.voteFor;
				capital = decided.capitalSpend;
			}

			await db.insert(regulationVotes).values({
				id: voteId++,
				seasonYear: options.seasonYear,
				proposalId: p.id,
				teamId: team.id,
				voteFor,
				politicalCapitalSpent: capital
			});
			votesByProposal.get(p.id)!.push({
				voteFor,
				politicalCapitalSpent: capital
			});
			votesCast++;
		}
	}

	const tallies: TallyResult[] = [];
	const passed: PassedRuleResult[] = [];
	let histId = await nextHistoryId(db);

	for (const p of proposals) {
		const tally = tallyProposal(p.id, votesByProposal.get(p.id) ?? []);
		tallies.push(tally);
		if (!tally.passed) continue;

		await db.insert(regulatoryHistory).values({
			id: histId++,
			seasonYear: applyYear,
			ruleDescription: p.description,
			impactType: p.impact,
			affectedSlot: p.affectedSlot,
			performancePenaltyPct: p.performancePenaltyPct,
			isActive: true
		});

		let touched = 0;
		let invalidated = 0;
		for (const team of teamRows) {
			const pivotCredit = Math.max(0, Math.min(1, 1 - team.rdPivotCurrent));
			const hqRelief = await hqReliefForTeam(db, team.id);
			const result = await applyWinterRegression(db, {
				impact: p.impact,
				affectedSlots: p.affectedSlot ? [p.affectedSlot] : undefined,
				pivotCredit,
				hqRegressionRelief: hqRelief,
				teamId: team.id
			});
			touched += result.blueprintsTouched;
			invalidated += result.invalidated;
		}

		passed.push({ proposal: p, tally, blueprintsTouched: touched, invalidated });
	}

	return { proposals, tallies, passed, votesCast };
}

export async function getActiveRegulations(db: AppDb, seasonYear: number) {
	return db
		.select()
		.from(regulatoryHistory)
		.where(
			and(eq(regulatoryHistory.seasonYear, seasonYear), eq(regulatoryHistory.isActive, true))
		);
}
