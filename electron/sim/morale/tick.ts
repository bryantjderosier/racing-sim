import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, contracts, drivers, staff, teams } from '../../db/schema.js';
import {
	DIVISION_PAY_BASELINE,
	ORDER_OBEYED_MORALE,
	ORDER_REFUSED_LOYALTY,
	ORDER_SACRIFICED_MORALE,
	RACE_BACKMARKER_MORALE,
	RACE_PODIUM_MORALE,
	RACE_POINTS_MORALE,
	TOXIC_EGO_THRESHOLD,
	TOXIC_LOYALTY_HIT,
	TOXIC_MORALE_HIT,
	WEEKLY_DRIFT
} from './constants.js';
import { clampMood, driftTowardNeutral } from './effects.js';

export type RaceMoraleResult = {
	position: number;
	/** Grid size for relative standing; default 20. */
	gridSize?: number;
};

export type TeamOrderEvent = 'obeyed' | 'refused' | 'sacrificed';

export type MoraleTickOptions = {
	/** Last weekend finishes: driverId → result. */
	raceResultsByDriverId?: Record<number, RaceMoraleResult>;
	/** Explicit team-order outcomes this week. */
	teamOrdersByDriverId?: Record<number, TeamOrderEvent>;
};

export type MoraleEntityUpdate = {
	entityId: number;
	entityType: 'driver' | 'staff';
	moraleBefore: number;
	moraleAfter: number;
	egoBefore?: number;
	egoAfter?: number;
	loyaltyBefore?: number;
	loyaltyAfter?: number;
	reasons: string[];
};

export type MoraleTickResult = {
	updates: MoraleEntityUpdate[];
};

function raceMoraleDelta(position: number, gridSize: number, resilience: number): number {
	let raw = 0;
	if (position <= 3) raw = RACE_PODIUM_MORALE;
	else if (position <= 10) raw = RACE_POINTS_MORALE;
	else if (position > Math.ceil(gridSize * 0.7)) raw = RACE_BACKMARKER_MORALE;
	else raw = -1;
	// morale_balance / resilience dampens swings
	const damp = 0.65 + (resilience / 99) * 0.5;
	return raw * damp;
}

async function driverResilience(db: AppDb, driverId: number): Promise<number> {
	const [row] = await db
		.select()
		.from(attributes)
		.where(
			and(
				eq(attributes.entityId, driverId),
				eq(attributes.entityType, 'driver'),
				eq(attributes.attrName, 'morale_balance')
			)
		)
		.limit(1);
	return row?.currentValue ?? 50;
}

async function payFairnessDelta(
	db: AppDb,
	entityId: number,
	entityType: 'driver' | 'staff',
	teamId: number
): Promise<{ delta: number; reason?: string }> {
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
	if (!team) return { delta: 0 };
	const [c] = await db
		.select()
		.from(contracts)
		.where(
			and(
				eq(contracts.entityId, entityId),
				eq(contracts.entityType, entityType),
				eq(contracts.isActive, true)
			)
		)
		.limit(1);
	if (!c) return { delta: -1.5, reason: 'no_contract' };
	const baseline = DIVISION_PAY_BASELINE[team.division] ?? DIVISION_PAY_BASELINE[1]!;
	const ratio = c.salaryAnnual / baseline;
	if (ratio >= 1.15) return { delta: 1.8, reason: 'well_paid' };
	if (ratio <= 0.7) return { delta: -2.5, reason: 'underpaid' };
	return { delta: 0.3, reason: 'fair_pay' };
}

/**
 * Weekly morale / ego / loyalty tick for all contracted personnel.
 */
export async function tickMorale(
	db: AppDb,
	options: MoraleTickOptions = {}
): Promise<MoraleTickResult> {
	const updates: MoraleEntityUpdate[] = [];
	const race = options.raceResultsByDriverId ?? {};
	const orders = options.teamOrdersByDriverId ?? {};

	const driverRows = await db.select().from(drivers).where(sql`${drivers.teamId} is not null`);
	for (const d of driverRows) {
		if (d.teamId == null) continue;
		const reasons: string[] = [];
		let morale = d.morale;
		const before = morale;

		morale = driftTowardNeutral(morale, WEEKLY_DRIFT);
		reasons.push('drift');

		const result = race[d.id];
		if (result) {
			const res = await driverResilience(db, d.id);
			const delta = raceMoraleDelta(result.position, result.gridSize ?? 20, res);
			morale = clampMood(morale + delta);
			reasons.push(`race_p${result.position}`);
		}

		const order = orders[d.id];
		if (order === 'obeyed') {
			morale = clampMood(morale + ORDER_OBEYED_MORALE);
			reasons.push('order_obeyed');
		} else if (order === 'sacrificed') {
			morale = clampMood(morale + ORDER_SACRIFICED_MORALE);
			reasons.push('order_sacrificed');
		}

		const pay = await payFairnessDelta(db, d.id, 'driver', d.teamId);
		if (pay.delta !== 0) {
			morale = clampMood(morale + pay.delta);
			if (pay.reason) reasons.push(pay.reason);
		}

		// Toxic RE: assigned high-ego engineer
		const [re] = await db
			.select()
			.from(staff)
			.where(
				and(eq(staff.assignedDriverId, d.id), eq(staff.role, 'race_engineer'))
			)
			.limit(1);
		if (re && re.ego >= TOXIC_EGO_THRESHOLD) {
			const teamwork =
				(
					await db
						.select()
						.from(attributes)
						.where(
							and(
								eq(attributes.entityId, d.id),
								eq(attributes.entityType, 'driver'),
								eq(attributes.attrName, 'teamwork')
							)
						)
						.limit(1)
				)[0]?.currentValue ?? 50;
			if (teamwork < 60 || re.ego > 85) {
				morale = clampMood(morale + TOXIC_MORALE_HIT);
				reasons.push('toxic_pairing');
			}
		}

		if (Math.abs(morale - before) > 0.01 || reasons.length > 1) {
			await db.update(drivers).set({ morale }).where(eq(drivers.id, d.id));
			updates.push({
				entityId: d.id,
				entityType: 'driver',
				moraleBefore: before,
				moraleAfter: morale,
				reasons
			});
		}
	}

	const staffRows = await db.select().from(staff).where(sql`${staff.teamId} is not null`);
	const byTeam = new Map<number, typeof staffRows>();
	for (const s of staffRows) {
		if (s.teamId == null) continue;
		const list = byTeam.get(s.teamId) ?? [];
		list.push(s);
		byTeam.set(s.teamId, list);
	}

	for (const s of staffRows) {
		if (s.teamId == null) continue;
		const reasons: string[] = [];
		let morale = s.morale;
		let ego = s.ego;
		let loyalty = s.loyalty;
		const m0 = morale;
		const e0 = ego;
		const l0 = loyalty;

		morale = driftTowardNeutral(morale, WEEKLY_DRIFT * 0.8);
		ego = driftTowardNeutral(ego, WEEKLY_DRIFT * 0.4);
		loyalty = driftTowardNeutral(loyalty, WEEKLY_DRIFT * 0.5);
		reasons.push('drift');

		const pay = await payFairnessDelta(db, s.id, 'staff', s.teamId);
		if (pay.delta !== 0) {
			morale = clampMood(morale + pay.delta * 0.8);
			loyalty = clampMood(loyalty + pay.delta * 1.1);
			if (pay.reason) reasons.push(pay.reason);
		}

		const peers = byTeam.get(s.teamId) ?? [];
		const toxicPeer = peers.find(
			(p) => p.id !== s.id && p.ego >= TOXIC_EGO_THRESHOLD && s.ego >= TOXIC_EGO_THRESHOLD
		);
		if (toxicPeer) {
			morale = clampMood(morale + TOXIC_MORALE_HIT);
			loyalty = clampMood(loyalty + TOXIC_LOYALTY_HIT);
			ego = clampMood(ego + 0.8);
			reasons.push('toxic_staff');
		}

		// Drivers who refused orders hurt staff loyalty slightly if RE
		if (s.role === 'race_engineer' && s.assignedDriverId != null) {
			const ord = orders[s.assignedDriverId];
			if (ord === 'refused') {
				loyalty = clampMood(loyalty + ORDER_REFUSED_LOYALTY);
				morale = clampMood(morale - 2);
				reasons.push('driver_refused');
			}
		}

		await db
			.update(staff)
			.set({ morale, ego, loyalty })
			.where(eq(staff.id, s.id));
		updates.push({
			entityId: s.id,
			entityType: 'staff',
			moraleBefore: m0,
			moraleAfter: morale,
			egoBefore: e0,
			egoAfter: ego,
			loyaltyBefore: l0,
			loyaltyAfter: loyalty,
			reasons
		});
	}

	return { updates };
}
