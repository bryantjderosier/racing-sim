import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { contracts, drivers, staff, teams } from '../../db/schema.js';
import type { CareerSummary } from '../career/store.js';
import {
	buildDriverProfile,
	buildStaffProfile,
	buyoutDriver,
	buyoutStaff,
	marketRateAnnual,
	previewDriverOffer,
	previewStaffOffer,
	scanMarketHeat,
	scanStaffMarketHeat,
	signDriverContract,
	signStaffContract,
	staffMarketRateAnnual,
	teamsMissingStaffRoles,
	type AcceptResult,
	type ContractOfferTerms,
	type SignContractResult,
	type SignStaffContractResult
} from '../market/index.js';
import { ensureClock } from '../world/tick.js';
import { getSeasonCaps } from './desk.js';
import type {
	BuyoutDriverArgs,
	BuyoutStaffArgs,
	MarketAcceptPreviewView,
	MarketContractOfferView,
	MarketHotDriverView,
	MarketHotStaffView,
	MarketHubSnapshot,
	MarketRosterDriverView,
	MarketRosterStaffView,
	PreviewDriverOfferArgs,
	PreviewStaffOfferArgs,
	SignDriverOfferArgs,
	SignStaffOfferArgs
} from './types.js';

const DRIVER_SEAT_TARGET = 2;

function asOffer(raw: MarketContractOfferView): ContractOfferTerms {
	if (!(raw.salaryAnnual > 0)) throw new Error('Salary must be positive');
	if (!(raw.years >= 1)) throw new Error('Years must be at least 1');
	return {
		salaryAnnual: Math.round(raw.salaryAnnual),
		years: Math.round(raw.years),
		isNumberOne: raw.isNumberOne,
		buyoutFee: raw.buyoutFee,
		releaseClause: raw.releaseClause,
		performanceBonus: raw.performanceBonus
	};
}

function toPreview(r: AcceptResult): MarketAcceptPreviewView {
	return {
		score: r.score,
		threshold: r.threshold,
		accepted: r.accepted,
		marketRate: r.marketRate
	};
}

export async function getMarketSnapshot(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>
): Promise<MarketHubSnapshot> {
	const playerTeamId = career.playerTeamId;
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const caps = await getSeasonCaps(db, clock.seasonYear, team.division);
	const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams);
	const teamNameById = new Map(teamRows.map((t) => [t.id, t.name]));

	const rosterDriverRows = await db
		.select()
		.from(drivers)
		.where(and(eq(drivers.teamId, playerTeamId), eq(drivers.isKarting, false)));
	const rosterStaffRows = await db.select().from(staff).where(eq(staff.teamId, playerTeamId));

	const driverContracts = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.entityType, 'driver'), eq(contracts.isActive, true)));
	const staffContracts = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.entityType, 'staff'), eq(contracts.isActive, true)));
	const driverContractBy = new Map(driverContracts.map((c) => [c.entityId, c]));
	const staffContractBy = new Map(staffContracts.map((c) => [c.entityId, c]));

	const rosterDrivers: MarketRosterDriverView[] = rosterDriverRows.map((d) => {
		const c = driverContractBy.get(d.id);
		return {
			driverId: d.id,
			name: d.name,
			age: d.age,
			salaryAnnual: c?.salaryAnnual ?? null,
			yearsRemaining: c?.yearsRemaining ?? null,
			buyoutFee: c?.buyoutFee ?? null,
			isNumberOne: c?.isNumberOne ?? false,
			contractId: c?.id ?? null
		};
	});

	const rosterStaff: MarketRosterStaffView[] = rosterStaffRows.map((s) => {
		const c = staffContractBy.get(s.id);
		return {
			staffId: s.id,
			name: s.name,
			role: s.role,
			salaryAnnual: c?.salaryAnnual ?? null,
			yearsRemaining: c?.yearsRemaining ?? null,
			buyoutFee: c?.buyoutFee ?? null,
			contractId: c?.id ?? null
		};
	});

	const hotDriverRows = await scanMarketHeat(db);
	const hotDrivers: MarketHotDriverView[] = [];
	for (const h of hotDriverRows) {
		if (h.teamId === playerTeamId) continue;
		const profile = await buildDriverProfile(db, h.driverId, team.division);
		hotDrivers.push({
			driverId: h.driverId,
			name: h.name,
			teamId: h.teamId,
			teamName: h.teamId != null ? (teamNameById.get(h.teamId) ?? null) : null,
			age: h.age,
			reasons: h.reasons,
			yearsRemaining: h.yearsRemaining,
			salaryAnnual: h.salaryAnnual,
			buyoutFee: h.buyoutFee,
			releaseClause: h.releaseClause,
			marketRate: marketRateAnnual(profile),
			onPlayerTeam: false
		});
	}

	const hotStaffRows = await scanStaffMarketHeat(db);
	const hotStaff: MarketHotStaffView[] = [];
	for (const h of hotStaffRows) {
		if (h.teamId === playerTeamId) continue;
		const profile = await buildStaffProfile(db, h.staffId, team.division);
		hotStaff.push({
			staffId: h.staffId,
			name: h.name,
			role: h.role,
			teamId: h.teamId,
			teamName: h.teamId != null ? (teamNameById.get(h.teamId) ?? null) : null,
			reasons: h.reasons,
			yearsRemaining: h.yearsRemaining,
			salaryAnnual: h.salaryAnnual,
			buyoutFee: h.buyoutFee,
			marketRate: staffMarketRateAnnual(profile),
			onPlayerTeam: false
		});
	}

	const missing = await teamsMissingStaffRoles(db);
	const missingStaffRoles = missing
		.filter((m) => m.teamId === playerTeamId)
		.flatMap((m) => m.missingRoles);

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
		rosterDrivers,
		rosterStaff,
		hotDrivers,
		hotStaff,
		openDriverSeats: Math.max(0, DRIVER_SEAT_TARGET - rosterDrivers.length),
		missingStaffRoles
	};
}

export async function previewPlayerDriverOffer(
	db: AppDb,
	playerTeamId: number,
	args: PreviewDriverOfferArgs
): Promise<MarketAcceptPreviewView> {
	const result = await previewDriverOffer(db, {
		driverId: args.driverId,
		teamId: playerTeamId,
		offer: asOffer(args.offer)
	});
	return toPreview(result);
}

export async function previewPlayerStaffOffer(
	db: AppDb,
	playerTeamId: number,
	args: PreviewStaffOfferArgs
): Promise<MarketAcceptPreviewView> {
	const result = await previewStaffOffer(db, {
		staffId: args.staffId,
		teamId: playerTeamId,
		offer: asOffer(args.offer)
	});
	return toPreview(result);
}

export async function signPlayerDriverOffer(
	db: AppDb,
	playerTeamId: number,
	args: SignDriverOfferArgs
): Promise<SignContractResult> {
	return signDriverContract(db, {
		driverId: args.driverId,
		teamId: playerTeamId,
		offer: asOffer(args.offer),
		buyoutPaid: args.buyoutPaid
	});
}

export async function signPlayerStaffOffer(
	db: AppDb,
	playerTeamId: number,
	args: SignStaffOfferArgs
): Promise<SignStaffContractResult> {
	return signStaffContract(db, {
		staffId: args.staffId,
		teamId: playerTeamId,
		offer: asOffer(args.offer),
		buyoutPaid: args.buyoutPaid
	});
}

export async function buyoutPlayerDriver(
	db: AppDb,
	playerTeamId: number,
	args: BuyoutDriverArgs
): Promise<{ fee: number }> {
	const [driver] = await db.select().from(drivers).where(eq(drivers.id, args.driverId)).limit(1);
	if (!driver) throw new Error(`Driver ${args.driverId} not found`);
	if (driver.teamId !== playerTeamId) throw new Error('Driver not on player team');
	return buyoutDriver(db, { teamId: playerTeamId, driverId: args.driverId, fee: args.fee });
}

export async function buyoutPlayerStaff(
	db: AppDb,
	playerTeamId: number,
	args: BuyoutStaffArgs
): Promise<{ fee: number }> {
	const [member] = await db.select().from(staff).where(eq(staff.id, args.staffId)).limit(1);
	if (!member) throw new Error(`Staff ${args.staffId} not found`);
	if (member.teamId !== playerTeamId) throw new Error('Staff not on player team');
	return buyoutStaff(db, { teamId: playerTeamId, staffId: args.staffId, fee: args.fee });
}
