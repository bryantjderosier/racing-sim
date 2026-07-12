import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	championshipStandings,
	facilities,
	suppliers,
	teams
} from '../../db/schema.js';
import { WEEKLY_CFD_CAP, WEEKLY_WT_CAP } from '../world/constants.js';
import {
	DEFAULT_CUSTOMER_SUPPLIER_ID,
	DEFAULT_PROMOTE_COUNT,
	DEFAULT_RELEGATE_COUNT,
	DIVISION_COST_CAP,
	PROMO_REPUTATION_DELTA,
	RELEG_REPUTATION_DELTA
} from './promo-constants.js';

export type DivisionMove = {
	teamId: number;
	teamName: string;
	fromDivision: number;
	toDivision: number;
	reason: 'promoted' | 'relegated';
	standingPosition: number;
	points: number;
	cashBefore: number;
	cashAfter: number;
	costCapBefore: number;
	costCapAfter: number;
	engineBefore: number | null;
	engineAfter: number | null;
	engineForcedCustomer: boolean;
};

export type PromotionRelegationOptions = {
	seasonYear: number;
	promoteCount?: number;
	relegateCount?: number;
	/** Override customer supplier when works engines are stripped. */
	customerSupplierId?: number;
};

export type PromotionRelegationResult = {
	moves: DivisionMove[];
	promoted: number;
	relegated: number;
};

type StandingTeam = {
	teamId: number;
	name: string;
	points: number;
	position: number;
	liquidCash: number;
	costCapLimit: number;
	engineSupplierId: number | null;
	reputation: number;
};

async function loadDivisionConstructors(
	db: AppDb,
	seasonYear: number,
	division: number
): Promise<StandingTeam[]> {
	const rows = await db
		.select()
		.from(championshipStandings)
		.where(
			and(
				eq(championshipStandings.seasonYear, seasonYear),
				eq(championshipStandings.division, division),
				eq(championshipStandings.entityType, 'team')
			)
		);

	const teamRows = await db.select().from(teams).where(eq(teams.division, division));
	const byId = new Map(teamRows.map((t) => [t.id, t]));

	const list: StandingTeam[] = [];
	for (const r of rows) {
		const t = byId.get(r.entityId);
		if (!t) continue;
		list.push({
			teamId: t.id,
			name: t.name,
			points: r.points,
			position: r.position ?? 999,
			liquidCash: t.liquidCash,
			costCapLimit: t.costCapLimit,
			engineSupplierId: t.engineSupplierId,
			reputation: t.reputation
		});
	}

	list.sort((a, b) => a.position - b.position || b.points - a.points);
	return list;
}

async function hasPowertrainFactory(db: AppDb, teamId: number): Promise<boolean> {
	const [f] = await db
		.select()
		.from(facilities)
		.where(
			and(eq(facilities.teamId, teamId), eq(facilities.facilityType, 'powertrain_factory'))
		)
		.limit(1);
	return f != null && f.tier >= 1 && !f.isUnderConstruction;
}

/**
 * Works engines illegal outside Div 1 unless team has a Powertrain Factory.
 * On arrival, force a customer lease supplier when rules fail.
 */
export async function revalidateEngineSupplier(
	db: AppDb,
	teamId: number,
	division: number,
	customerSupplierId = DEFAULT_CUSTOMER_SUPPLIER_ID
): Promise<{ engineBefore: number | null; engineAfter: number | null; forced: boolean }> {
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
	if (!team) throw new Error(`Team ${teamId} not found`);

	const engineBefore = team.engineSupplierId;
	let engineAfter = engineBefore;
	let forced = false;

	const factory = await hasPowertrainFactory(db, teamId);
	let supplierIsWorks = false;
	if (engineBefore != null) {
		const [s] = await db.select().from(suppliers).where(eq(suppliers.id, engineBefore)).limit(1);
		supplierIsWorks = s?.isWorks === true;
	}

	const worksIllegal = division > 1 && supplierIsWorks && !factory;
	const needsLease = division > 1 && !factory && engineBefore == null;

	if (worksIllegal || needsLease) {
		const [customer] = await db
			.select()
			.from(suppliers)
			.where(eq(suppliers.id, customerSupplierId))
			.limit(1);
		if (!customer) {
			throw new Error(`Customer supplier ${customerSupplierId} missing — seed suppliers first`);
		}
		if (customer.isWorks) {
			throw new Error('Customer supplier must not be works');
		}
		engineAfter = customer.id;
		forced = engineAfter !== engineBefore;
		await db.update(teams).set({ engineSupplierId: engineAfter }).where(eq(teams.id, teamId));
	}

	return { engineBefore, engineAfter, forced };
}

async function applyTeamDivisionChange(
	db: AppDb,
	args: {
		team: StandingTeam;
		fromDivision: number;
		toDivision: number;
		reason: 'promoted' | 'relegated';
		customerSupplierId: number;
	}
): Promise<DivisionMove> {
	const newCap = DIVISION_COST_CAP[args.toDivision] ?? DIVISION_COST_CAP[1];
	const wtCap = WEEKLY_WT_CAP[args.toDivision] ?? WEEKLY_WT_CAP[1];
	const cfdCap = WEEKLY_CFD_CAP[args.toDivision] ?? WEEKLY_CFD_CAP[1];
	const repDelta =
		args.reason === 'promoted' ? PROMO_REPUTATION_DELTA : RELEG_REPUTATION_DELTA;

	// Financial shock: cap scales, cash unchanged; reset spent for new season tier
	await db
		.update(teams)
		.set({
			division: args.toDivision,
			costCapLimit: newCap,
			costCapSpent: 0,
			wtHoursRemaining: wtCap,
			cfdHoursRemaining: cfdCap,
			reputation: Math.max(0, Math.min(100, args.team.reputation + repDelta)),
			constructorsStanding: null
		})
		.where(eq(teams.id, args.team.teamId));

	const engine = await revalidateEngineSupplier(
		db,
		args.team.teamId,
		args.toDivision,
		args.customerSupplierId
	);

	return {
		teamId: args.team.teamId,
		teamName: args.team.name,
		fromDivision: args.fromDivision,
		toDivision: args.toDivision,
		reason: args.reason,
		standingPosition: args.team.position,
		points: args.team.points,
		cashBefore: args.team.liquidCash,
		cashAfter: args.team.liquidCash,
		costCapBefore: args.team.costCapLimit,
		costCapAfter: newCap,
		engineBefore: engine.engineBefore,
		engineAfter: engine.engineAfter,
		engineForcedCustomer: engine.forced
	};
}

/**
 * End-of-season promotion / relegation by constructors standings.
 * Default top 2 up / bottom 2 down between adjacent divisions.
 */
export async function applyPromotionRelegation(
	db: AppDb,
	options: PromotionRelegationOptions
): Promise<PromotionRelegationResult> {
	const promoteCount = options.promoteCount ?? DEFAULT_PROMOTE_COUNT;
	const relegateCount = options.relegateCount ?? DEFAULT_RELEGATE_COUNT;
	const customerSupplierId = options.customerSupplierId ?? DEFAULT_CUSTOMER_SUPPLIER_ID;

	const d1 = await loadDivisionConstructors(db, options.seasonYear, 1);
	const d2 = await loadDivisionConstructors(db, options.seasonYear, 2);
	const d3 = await loadDivisionConstructors(db, options.seasonYear, 3);

	type Planned = {
		team: StandingTeam;
		from: number;
		to: number;
		reason: 'promoted' | 'relegated';
	};
	const planned: Planned[] = [];

	const takeBottom = (list: StandingTeam[], n: number) =>
		list.length === 0 ? [] : list.slice(Math.max(0, list.length - Math.min(n, list.length)));
	const takeTop = (list: StandingTeam[], n: number) => list.slice(0, Math.min(n, list.length));

	// Div1 ↔ Div2
	if (d1.length > 0 && d2.length > 0) {
		for (const t of takeBottom(d1, relegateCount)) {
			planned.push({ team: t, from: 1, to: 2, reason: 'relegated' });
		}
		for (const t of takeTop(d2, promoteCount)) {
			planned.push({ team: t, from: 2, to: 1, reason: 'promoted' });
		}
	}

	// Div2 ↔ Div3
	if (d2.length > 0 && d3.length > 0) {
		for (const t of takeBottom(d2, relegateCount)) {
			planned.push({ team: t, from: 2, to: 3, reason: 'relegated' });
		}
		for (const t of takeTop(d3, promoteCount)) {
			planned.push({ team: t, from: 3, to: 2, reason: 'promoted' });
		}
	}

	// Avoid double-moving the same team (e.g. tiny Div2)
	const seen = new Set<number>();
	const unique = planned.filter((p) => {
		if (seen.has(p.team.teamId)) return false;
		seen.add(p.team.teamId);
		return true;
	});

	const moves: DivisionMove[] = [];
	for (const p of unique) {
		moves.push(
			await applyTeamDivisionChange(db, {
				team: p.team,
				fromDivision: p.from,
				toDivision: p.to,
				reason: p.reason,
				customerSupplierId
			})
		);
	}

	return {
		moves,
		promoted: moves.filter((m) => m.reason === 'promoted').length,
		relegated: moves.filter((m) => m.reason === 'relegated').length
	};
}
