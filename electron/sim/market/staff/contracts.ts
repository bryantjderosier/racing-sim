import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../../db/node.js';
import {
	contracts,
	financialLedger,
	staff,
	teams,
	worldClock
} from '../../../db/schema.js';
import type { AcceptResult, ContractOfferTerms } from '../accept.js';
import { getScoutLeverage } from '../contracts.js';
import { evaluateStaffOffer } from './accept.js';
import { loadStaffAttrs } from './heat.js';
import type { StaffMarketProfile, StaffRole } from './types.js';

async function nextContractId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${contracts.id}), 0)` })
		.from(contracts);
	return Number(row?.m ?? 0) + 1;
}

async function nextLedgerId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${financialLedger.id}), 0)` })
		.from(financialLedger);
	return Number(row?.m ?? 0) + 1;
}

export async function buildStaffProfile(
	db: AppDb,
	staffId: number,
	divisionOverride?: number
): Promise<StaffMarketProfile> {
	const [s] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
	if (!s) throw new Error(`Staff ${staffId} not found`);
	const attrs = await loadStaffAttrs(db, staffId);
	let division = divisionOverride ?? 1;
	if (s.teamId != null) {
		const [t] = await db.select().from(teams).where(eq(teams.id, s.teamId)).limit(1);
		if (t) division = t.division;
	}
	return {
		staffId: s.id,
		role: s.role as StaffRole,
		morale: s.morale,
		ego: s.ego,
		loyalty: s.loyalty,
		attrs,
		division
	};
}

export type SignStaffContractInput = {
	staffId: number;
	teamId: number;
	offer: ContractOfferTerms;
	buyoutPaid?: number;
	budgetGuarantee?: boolean;
	rng?: () => number;
	force?: boolean;
};

export type SignStaffContractResult = {
	contractId: number;
	accepted: boolean;
	evaluation: AcceptResult;
	buyoutPaid: number;
};

export async function signStaffContract(
	db: AppDb,
	input: SignStaffContractInput
): Promise<SignStaffContractResult> {
	const [member] = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1);
	if (!member) throw new Error(`Staff ${input.staffId} not found`);
	const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
	if (!team) throw new Error(`Team ${input.teamId} not found`);

	const profile = await buildStaffProfile(db, input.staffId, team.division);
	const leverage = await getScoutLeverage(db, input.teamId);

	const [prior] = await db
		.select()
		.from(contracts)
		.where(
			and(
				eq(contracts.entityId, input.staffId),
				eq(contracts.entityType, 'staff'),
				eq(contracts.isActive, true)
			)
		)
		.limit(1);

	const leavingTeam =
		prior != null && prior.teamId !== input.teamId && member.teamId != null;

	const evaluation = evaluateStaffOffer(input.offer, {
		staff: profile,
		teamReputation: team.reputation,
		teamStanding: team.constructorsStanding,
		scoutLeverage: leverage,
		currentSalary: prior?.salaryAnnual ?? null,
		leavingTeam,
		budgetGuarantee: input.budgetGuarantee,
		rng: input.rng
	});

	if (!input.force && !evaluation.accepted) {
		return { contractId: 0, accepted: false, evaluation, buyoutPaid: 0 };
	}

	let buyoutPaid = 0;
	if (leavingTeam && prior) {
		buyoutPaid = input.buyoutPaid ?? prior.buyoutFee;
		if (buyoutPaid > 0) {
			if (team.liquidCash < buyoutPaid) throw new Error('Insufficient cash for staff buyout');
			await db
				.update(teams)
				.set({ liquidCash: team.liquidCash - buyoutPaid })
				.where(eq(teams.id, team.id));
			const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
			await db.insert(financialLedger).values({
				id: await nextLedgerId(db),
				teamId: input.teamId,
				amount: -buyoutPaid,
				transactionType: 'buyout_fee',
				isCostCapApplicable: false,
				seasonIndex: clock?.seasonYear ?? 2026,
				timestamp: clock?.tickIndex ?? 0
			});
		}
		await db.update(contracts).set({ isActive: false }).where(eq(contracts.id, prior.id));
	} else if (prior) {
		await db.update(contracts).set({ isActive: false }).where(eq(contracts.id, prior.id));
	}

	const contractId = await nextContractId(db);
	await db.insert(contracts).values({
		id: contractId,
		entityId: input.staffId,
		entityType: 'staff',
		teamId: input.teamId,
		salaryAnnual: input.offer.salaryAnnual,
		yearsRemaining: input.offer.years,
		buyoutFee: input.offer.buyoutFee ?? 0,
		releaseClause: input.offer.releaseClause ?? null,
		performanceBonus: input.offer.performanceBonus ?? null,
		isNumberOne: input.offer.isNumberOne ?? false,
		isActive: true
	});

	await db
		.update(staff)
		.set({ teamId: input.teamId, assignedDriverId: null })
		.where(eq(staff.id, input.staffId));

	return { contractId, accepted: true, evaluation, buyoutPaid };
}

export async function buyoutStaff(
	db: AppDb,
	args: { teamId: number; staffId: number; fee?: number }
): Promise<{ fee: number }> {
	const [member] = await db.select().from(staff).where(eq(staff.id, args.staffId)).limit(1);
	if (!member) throw new Error(`Staff ${args.staffId} not found`);
	const [team] = await db.select().from(teams).where(eq(teams.id, args.teamId)).limit(1);
	if (!team) throw new Error(`Team ${args.teamId} not found`);

	const [prior] = await db
		.select()
		.from(contracts)
		.where(
			and(
				eq(contracts.entityId, args.staffId),
				eq(contracts.entityType, 'staff'),
				eq(contracts.isActive, true)
			)
		)
		.limit(1);
	if (!prior) throw new Error('No active staff contract to buy out');

	const fee = args.fee ?? prior.buyoutFee;
	if (team.liquidCash < fee) throw new Error('Insufficient cash for staff buyout');

	await db
		.update(teams)
		.set({ liquidCash: team.liquidCash - fee })
		.where(eq(teams.id, team.id));
	const [clock] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	await db.insert(financialLedger).values({
		id: await nextLedgerId(db),
		teamId: args.teamId,
		amount: -fee,
		transactionType: 'buyout_fee',
		isCostCapApplicable: false,
		seasonIndex: clock?.seasonYear ?? 2026,
		timestamp: clock?.tickIndex ?? 0
	});
	await db.update(contracts).set({ isActive: false }).where(eq(contracts.id, prior.id));
	await db
		.update(staff)
		.set({ teamId: null, assignedDriverId: null })
		.where(eq(staff.id, args.staffId));

	return { fee };
}

export type SeedStaffContractRow = {
	staffId: number;
	teamId: number;
	salaryAnnual: number;
	yearsRemaining: number;
	buyoutFee?: number;
};

export async function seedStaffContracts(
	db: AppDb,
	rows: SeedStaffContractRow[]
): Promise<number> {
	let id = await nextContractId(db);
	for (const r of rows) {
		await db.insert(contracts).values({
			id: id++,
			entityId: r.staffId,
			entityType: 'staff',
			teamId: r.teamId,
			salaryAnnual: r.salaryAnnual,
			yearsRemaining: r.yearsRemaining,
			buyoutFee: r.buyoutFee ?? r.salaryAnnual * 1.4,
			releaseClause: r.salaryAnnual * 2,
			performanceBonus: r.salaryAnnual * 0.04,
			isNumberOne: false,
			isActive: true
		});
	}
	return rows.length;
}
