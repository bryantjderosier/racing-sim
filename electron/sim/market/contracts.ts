import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributes,
	contracts,
	drivers,
	financialLedger,
	staff,
	teams,
	worldClock
} from '../../db/schema.js';
import {
	evaluateOffer,
	type AcceptResult,
	type ContractOfferTerms
} from './accept.js';
import { loadAttrsMap } from './heat.js';
import type { DriverMarketProfile } from './value.js';

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

export async function buildDriverProfile(
	db: AppDb,
	driverId: number,
	divisionOverride?: number
): Promise<DriverMarketProfile> {
	const [d] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
	if (!d) throw new Error(`Driver ${driverId} not found`);
	const attrs = await loadAttrsMap(db, driverId);
	let division = divisionOverride ?? 1;
	if (d.teamId != null) {
		const [t] = await db.select().from(teams).where(eq(teams.id, d.teamId)).limit(1);
		if (t) division = t.division;
	}
	return {
		driverId: d.id,
		age: d.age,
		morale: d.morale,
		ego: undefined,
		loyalty: undefined,
		attrs,
		division
	};
}

export async function getScoutLeverage(db: AppDb, teamId: number): Promise<number> {
	const [scout] = await db
		.select()
		.from(staff)
		.where(and(eq(staff.teamId, teamId), eq(staff.role, 'scout')))
		.limit(1);
	if (!scout) return 40;
	const [lev] = await db
		.select()
		.from(attributes)
		.where(
			and(
				eq(attributes.entityId, scout.id),
				eq(attributes.entityType, 'staff'),
				eq(attributes.attrName, 'leverage')
			)
		)
		.limit(1);
	return lev?.currentValue ?? 45;
}

export type SignContractInput = {
	driverId: number;
	teamId: number;
	offer: ContractOfferTerms;
	/** If poaching, pay this buyout (cost-cap exempt). */
	buyoutPaid?: number;
	rng?: () => number;
	/** Skip accept check (AI already evaluated). */
	force?: boolean;
};

export type SignContractResult = {
	contractId: number;
	accepted: boolean;
	evaluation: AcceptResult;
	buyoutPaid: number;
};

/**
 * Evaluate offer; on accept, deactivate prior contract, optional buyout, sign new deal, assign team.
 */
export async function signDriverContract(
	db: AppDb,
	input: SignContractInput
): Promise<SignContractResult> {
	const [driver] = await db.select().from(drivers).where(eq(drivers.id, input.driverId)).limit(1);
	if (!driver) throw new Error(`Driver ${input.driverId} not found`);
	const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
	if (!team) throw new Error(`Team ${input.teamId} not found`);

	const profile = await buildDriverProfile(db, input.driverId, team.division);
	const leverage = await getScoutLeverage(db, input.teamId);

	const [prior] = await db
		.select()
		.from(contracts)
		.where(
			and(
				eq(contracts.entityId, input.driverId),
				eq(contracts.entityType, 'driver'),
				eq(contracts.isActive, true)
			)
		)
		.limit(1);

	const leavingTeam =
		prior != null && prior.teamId !== input.teamId && driver.teamId != null;

	const evaluation = evaluateOffer(input.offer, {
		driver: profile,
		teamReputation: team.reputation,
		teamStanding: team.constructorsStanding,
		scoutLeverage: leverage,
		currentSalary: prior?.salaryAnnual ?? null,
		leavingTeam,
		rng: input.rng
	});

	if (!input.force && !evaluation.accepted) {
		return { contractId: 0, accepted: false, evaluation, buyoutPaid: 0 };
	}

	let buyoutPaid = 0;
	if (leavingTeam && prior) {
		buyoutPaid = input.buyoutPaid ?? prior.buyoutFee;
		if (buyoutPaid > 0) {
			if (team.liquidCash < buyoutPaid) {
				throw new Error('Insufficient cash for buyout');
			}
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
		await db
			.update(contracts)
			.set({ isActive: false })
			.where(eq(contracts.id, prior.id));
	} else if (prior && prior.teamId === input.teamId) {
		await db.update(contracts).set({ isActive: false }).where(eq(contracts.id, prior.id));
	} else if (prior) {
		await db.update(contracts).set({ isActive: false }).where(eq(contracts.id, prior.id));
	}

	const contractId = await nextContractId(db);
	await db.insert(contracts).values({
		id: contractId,
		entityId: input.driverId,
		entityType: 'driver',
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
		.update(drivers)
		.set({ teamId: input.teamId })
		.where(eq(drivers.id, input.driverId));

	return { contractId, accepted: true, evaluation, buyoutPaid };
}

/**
 * Force free-agent via buyout without a new signing (opens seat / FA pool).
 */
export async function buyoutDriver(
	db: AppDb,
	args: { teamId: number; driverId: number; fee?: number }
): Promise<{ fee: number }> {
	const [driver] = await db.select().from(drivers).where(eq(drivers.id, args.driverId)).limit(1);
	if (!driver) throw new Error(`Driver ${args.driverId} not found`);
	const [team] = await db.select().from(teams).where(eq(teams.id, args.teamId)).limit(1);
	if (!team) throw new Error(`Team ${args.teamId} not found`);

	const [prior] = await db
		.select()
		.from(contracts)
		.where(
			and(
				eq(contracts.entityId, args.driverId),
				eq(contracts.entityType, 'driver'),
				eq(contracts.isActive, true)
			)
		)
		.limit(1);
	if (!prior) throw new Error('No active contract to buy out');

	const fee = args.fee ?? prior.buyoutFee;
	if (team.liquidCash < fee) throw new Error('Insufficient cash for buyout');

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
	await db.update(drivers).set({ teamId: null, carId: null }).where(eq(drivers.id, args.driverId));

	return { fee };
}

export type SeedContractRow = {
	driverId: number;
	teamId: number;
	salaryAnnual: number;
	yearsRemaining: number;
	buyoutFee?: number;
	isNumberOne?: boolean;
};

export async function seedDriverContracts(
	db: AppDb,
	rows: SeedContractRow[]
): Promise<number> {
	let id = await nextContractId(db);
	for (const r of rows) {
		await db.insert(contracts).values({
			id: id++,
			entityId: r.driverId,
			entityType: 'driver',
			teamId: r.teamId,
			salaryAnnual: r.salaryAnnual,
			yearsRemaining: r.yearsRemaining,
			buyoutFee: r.buyoutFee ?? r.salaryAnnual * 1.5,
			releaseClause: r.salaryAnnual * 2.2,
			performanceBonus: r.salaryAnnual * 0.05,
			isNumberOne: r.isNumberOne ?? true,
			isActive: true
		});
	}
	return rows.length;
}
