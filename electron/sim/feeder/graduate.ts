import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, drivers, teams } from '../../db/schema.js';
import {
	GRADUATION_AGE,
	GRADUATION_ATTR_THRESHOLD,
	PACE_ATTRS_FOR_GRAD,
	type PotentialTier
} from './constants.js';

export type GraduationCandidate = {
	driverId: number;
	name: string;
	age: number;
	potentialTier: PotentialTier | null;
	paceAggregate: number;
	eligible: boolean;
	blockReason?: string;
};

export type GraduationResult = {
	driverId: number;
	name: string;
	destination: 'div3_free_agency' | 'academy';
	academyTeamId: number | null;
	paceAggregate: number;
};

async function paceAggregate(db: AppDb, driverId: number): Promise<number> {
	const rows = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, driverId), eq(attributes.entityType, 'driver')));
	let sum = 0;
	let n = 0;
	for (const a of rows) {
		if ((PACE_ATTRS_FOR_GRAD as readonly string[]).includes(a.attrName)) {
			sum += a.currentValue;
			n++;
		}
	}
	return n ? sum / n : 0;
}

export async function evaluateGraduation(
	db: AppDb,
	driverId: number
): Promise<GraduationCandidate> {
	const [d] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
	if (!d) throw new Error(`Driver ${driverId} not found`);
	const agg = await paceAggregate(db, driverId);
	const tier = (d.potentialTier as PotentialTier | null) ?? null;

	if (!d.isKarting) {
		return {
			driverId,
			name: d.name,
			age: d.age,
			potentialTier: tier,
			paceAggregate: agg,
			eligible: false,
			blockReason: 'not_karting'
		};
	}
	if (d.age < GRADUATION_AGE) {
		return {
			driverId,
			name: d.name,
			age: d.age,
			potentialTier: tier,
			paceAggregate: agg,
			eligible: false,
			blockReason: 'too_young'
		};
	}
	if (agg < GRADUATION_ATTR_THRESHOLD) {
		return {
			driverId,
			name: d.name,
			age: d.age,
			potentialTier: tier,
			paceAggregate: agg,
			eligible: false,
			blockReason: 'attrs_below_threshold'
		};
	}

	return {
		driverId,
		name: d.name,
		age: d.age,
		potentialTier: tier,
		paceAggregate: agg,
		eligible: true
	};
}

export type GraduateOptions = {
	/** Prefer junior academy team ids (Div 3 teams); else free agency. */
	academyTeamIds?: number[];
	rng?: () => number;
};

/**
 * Graduate eligible karting prospects into Div 3 free agency or a junior academy seat.
 */
export async function graduateEligibleProspects(
	db: AppDb,
	options: GraduateOptions = {}
): Promise<GraduationResult[]> {
	const rng = options.rng ?? Math.random;
	const pool = await db.select().from(drivers).where(eq(drivers.isKarting, true));
	const results: GraduationResult[] = [];

	let academies = options.academyTeamIds;
	if (!academies) {
		const d3 = await db.select().from(teams).where(eq(teams.division, 3));
		academies = d3.map((t) => t.id);
	}

	for (const d of pool) {
		const ev = await evaluateGraduation(db, d.id);
		if (!ev.eligible) continue;

		let destination: GraduationResult['destination'] = 'div3_free_agency';
		let academyTeamId: number | null = null;

		// Elite/gold with open academy preference
		if (
			academies.length > 0 &&
			(ev.potentialTier === 'elite' || ev.potentialTier === 'gold') &&
			rng() < 0.55
		) {
			academyTeamId = academies[Math.floor(rng() * academies.length)]!;
			destination = 'academy';
		}

		await db
			.update(drivers)
			.set({
				isKarting: false,
				teamId: academyTeamId,
				carId: null
			})
			.where(eq(drivers.id, d.id));

		results.push({
			driverId: d.id,
			name: d.name,
			destination,
			academyTeamId,
			paceAggregate: ev.paceAggregate
		});
	}

	return results;
}
