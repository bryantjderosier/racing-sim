import { eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, drivers } from '../../db/schema.js';
import {
	DRIVER_ATTR_NAMES,
	NAT_POOL,
	TIER_CEILING,
	type PotentialTier
} from './constants.js';

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const FIRST = [
	'Luca',
	'Mila',
	'Noah',
	'Sofia',
	'Kai',
	'Aya',
	'Leo',
	'Iris',
	'Mateo',
	'Noa',
	'Yuki',
	'Elia'
];
const LAST = [
	'Rossi',
	'Hart',
	'Weber',
	'Dubois',
	'Silva',
	'Tanaka',
	'Costa',
	'Niemi',
	'Park',
	'Alves',
	'Moreau',
	'Brennan'
];

async function nextDriverId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${drivers.id}), 0)` })
		.from(drivers);
	return Number(row?.m ?? 0) + 1;
}

async function nextAttrId(db: AppDb): Promise<number> {
	const [row] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	return Number(row?.m ?? 0) + 1;
}

export function rollPotentialTier(rng: () => number): PotentialTier {
	const r = rng();
	if (r < 0.45) return 'bronze';
	if (r < 0.75) return 'silver';
	if (r < 0.92) return 'gold';
	return 'elite';
}

export type SeedKartingOptions = {
	count: number;
	/** Age range inclusive. */
	minAge?: number;
	maxAge?: number;
	rng?: () => number;
	idStart?: number;
};

export type SeededProspect = {
	driverId: number;
	name: string;
	age: number;
	potentialTier: PotentialTier;
};

/**
 * Spawn karting prospects (is_karting=true) with tier-banded ceilings and low starts.
 */
export async function seedKartingPool(
	db: AppDb,
	options: SeedKartingOptions
): Promise<SeededProspect[]> {
	const rng = options.rng ?? mulberry32(42_042);
	const minAge = options.minAge ?? 12;
	const maxAge = options.maxAge ?? 15;
	let driverId = options.idStart ?? (await nextDriverId(db));
	let attrId = await nextAttrId(db);
	const out: SeededProspect[] = [];

	for (let i = 0; i < options.count; i++) {
		const tier = rollPotentialTier(rng);
		const band = TIER_CEILING[tier];
		const age = minAge + Math.floor(rng() * (maxAge - minAge + 1));
		const nat = NAT_POOL[Math.floor(rng() * NAT_POOL.length)]!;
		const name = `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;

		await db.insert(drivers).values({
			id: driverId,
			name,
			nationalityCode: nat,
			birthplace: nat,
			age,
			teamId: null,
			carId: null,
			isKarting: true,
			potentialTier: tier,
			injuryProneness: 0.25 + rng() * 0.35,
			longevity: 34 + Math.floor(rng() * 5),
			morale: 55 + Math.round(rng() * 20)
		});

		const attrRows = DRIVER_ATTR_NAMES.map((attrName, k) => {
			const ceil = Math.round(
				Math.max(
					45,
					Math.min(99, band.mid + (rng() - 0.5) * 2 * band.spread + (k % 3) - 1)
				)
			);
			const start = Math.round(
				Math.max(
					18,
					Math.min(
						ceil - 5,
						band.startMid + (rng() - 0.5) * 10 - (age - 12) * 0.5
					)
				)
			);
			return {
				id: attrId++,
				entityId: driverId,
				entityType: 'driver' as const,
				attrName,
				currentValue: start,
				ceiling: ceil
			};
		});
		await db.insert(attributes).values(attrRows);

		out.push({ driverId, name, age, potentialTier: tier });
		driverId++;
	}

	return out;
}

export async function listKartingPool(db: AppDb) {
	return db.select().from(drivers).where(eq(drivers.isKarting, true));
}
