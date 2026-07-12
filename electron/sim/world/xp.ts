import {
	DRIVER_WEEKLY_XP_BASE,
	PACE_PHYSICAL_ATTRS,
	STAFF_WEEKLY_XP_BASE,
	XP_PER_LEVEL,
	XP_PER_MILEAGE_LAP
} from './constants.js';

export type AttrRow = {
	attrName: string;
	currentValue: number;
	ceiling: number;
	xp: number;
};

export type XpGainEvent = {
	entityId: number;
	entityType: 'driver' | 'staff';
	attrName: string;
	xpGained: number;
	leveledTo?: number;
};

function pickTrainable(attrs: AttrRow[], rng: () => number): AttrRow | null {
	const open = attrs.filter((a) => a.currentValue < a.ceiling);
	if (open.length === 0) return null;
	return open[Math.floor(rng() * open.length)] ?? null;
}

/**
 * Distribute weekly XP budget across attributes below ceiling.
 * Returns updated attr rows + gain events.
 */
export function applyWeeklyXp(args: {
	entityId: number;
	entityType: 'driver' | 'staff';
	attrs: AttrRow[];
	/** Simulator / staff academy efficiency mult (≥1). */
	facilityMult: number;
	/** Driver Development or staff growth proxy 0–99. */
	growthAttr: number;
	mileageLaps?: number;
	age?: number;
	longevity?: number;
	rng: () => number;
}): { attrs: AttrRow[]; events: XpGainEvent[] } {
	const base =
		args.entityType === 'driver' ? DRIVER_WEEKLY_XP_BASE : STAFF_WEEKLY_XP_BASE;
	const growth = 0.6 + (args.growthAttr / 99) * 0.8;
	const mileage = (args.mileageLaps ?? 0) * XP_PER_MILEAGE_LAP;
	let budget = (base * growth + mileage) * args.facilityMult;

	// Soft age decay pressure: reduce XP and slight drain on physical attrs yearly-ish via week
	const overAge =
		args.age != null && args.longevity != null && args.age > args.longevity
			? (args.age - args.longevity) * 0.15
			: 0;
	if (overAge > 0) budget *= Math.max(0.35, 1 - overAge * 0.08);

	const attrs = args.attrs.map((a) => ({ ...a }));
	const events: XpGainEvent[] = [];
	const chunks = 4;
	const per = budget / chunks;

	for (let i = 0; i < chunks; i++) {
		const target = pickTrainable(attrs, args.rng);
		if (!target) break;
		target.xp += per;
		const ev: XpGainEvent = {
			entityId: args.entityId,
			entityType: args.entityType,
			attrName: target.attrName,
			xpGained: per
		};
		while (target.xp >= XP_PER_LEVEL && target.currentValue < target.ceiling) {
			target.xp -= XP_PER_LEVEL;
			target.currentValue += 1;
			ev.leveledTo = target.currentValue;
		}
		events.push(ev);
	}

	// Longevity soft decay: rare physical -1 when over age
	if (overAge > 0 && args.rng() < Math.min(0.25, overAge * 0.05)) {
		const physical = attrs.filter((a) =>
			(PACE_PHYSICAL_ATTRS as readonly string[]).includes(a.attrName)
		);
		const victim = physical[Math.floor(args.rng() * physical.length)];
		if (victim && victim.currentValue > 40) {
			victim.currentValue -= 1;
			events.push({
				entityId: args.entityId,
				entityType: args.entityType,
				attrName: victim.attrName,
				xpGained: 0,
				leveledTo: victim.currentValue
			});
		}
	}

	return { attrs, events };
}
