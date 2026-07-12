import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import {
	attributeProgress,
	attributes,
	drivers,
	facilities,
	staff,
	teams,
	worldClock
} from '../../db/schema.js';
import {
	FACILITY_WEEKLY_DECAY,
	FATIGUE_RECOVERY_PCT,
	WEEKLY_CFD_CAP,
	WEEKLY_WT_CAP
} from './constants.js';
import { applyFacilityDecay, facilityEfficiencyMult } from './facilities.js';
import { applyWeeklyXp, type XpGainEvent } from './xp.js';

export type WorldTickOptions = {
	/** Optional mileage from last race weekend: driverId → laps. */
	mileageByDriverId?: Record<number, number>;
	/** Optional maintenance: teamId → true spends cash to restore facilities to 100%. */
	maintainTeamIds?: number[];
	/** Maintenance cash per facility restored (liquid cash). */
	maintenanceCostPerFacility?: number;
	rng?: () => number;
};

export type WorldTickResult = {
	seasonYear: number;
	week: number;
	day: number;
	tickIndex: number;
	teamsUpdated: number;
	facilitiesDecayed: number;
	facilitiesMaintained: number;
	xpEvents: XpGainEvent[];
	levelsGained: number;
};

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export async function ensureClock(db: AppDb): Promise<typeof worldClock.$inferSelect> {
	const [row] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	if (row) return row;
	await db.insert(worldClock).values({
		id: 1,
		seasonYear: 2026,
		week: 1,
		day: 1,
		tickIndex: 0
	});
	const [created] = await db.select().from(worldClock).where(eq(worldClock.id, 1)).limit(1);
	return created!;
}

async function loadProgressMap(db: AppDb) {
	const rows = await db.select().from(attributeProgress);
	const map = new Map<string, { id: number; xp: number }>();
	for (const r of rows) {
		map.set(`${r.entityType}:${r.entityId}:${r.attrName}`, { id: r.id, xp: r.xp });
	}
	return map;
}

/**
 * Advance one career week: calendar, WT/CFD refresh, facility decay/maintenance,
 * driver/staff XP, pit-crew fatigue recovery.
 */
export async function advanceWorldWeek(
	db: AppDb,
	options: WorldTickOptions = {}
): Promise<WorldTickResult> {
	const rng = options.rng ?? mulberry32(Date.now() % 1_000_000);
	const clock = await ensureClock(db);

	let week = clock.week + 1;
	let seasonYear = clock.seasonYear;
	let day = 1;
	if (week > 52) {
		week = 1;
		seasonYear += 1;
	}
	const tickIndex = clock.tickIndex + 1;

	await db
		.update(worldClock)
		.set({ seasonYear, week, day, tickIndex })
		.where(eq(worldClock.id, 1));

	const teamRows = await db.select().from(teams);
	let facilitiesDecayed = 0;
	let facilitiesMaintained = 0;
	const maintain = new Set(options.maintainTeamIds ?? []);
	const maintCost = options.maintenanceCostPerFacility ?? 250_000;

	for (const team of teamRows) {
		const wtCap = WEEKLY_WT_CAP[team.division] ?? WEEKLY_WT_CAP[1];
		const cfdCap = WEEKLY_CFD_CAP[team.division] ?? WEEKLY_CFD_CAP[1];
		await db
			.update(teams)
			.set({
				wtHoursRemaining: wtCap,
				cfdHoursRemaining: cfdCap
			})
			.where(eq(teams.id, team.id));

		const facs = await db.select().from(facilities).where(eq(facilities.teamId, team.id));
		for (const f of facs) {
			if (maintain.has(team.id)) {
				const next = 100;
				await db
					.update(facilities)
					.set({ conditionPct: next })
					.where(eq(facilities.id, f.id));
				facilitiesMaintained += 1;
				await db
					.update(teams)
					.set({ liquidCash: sql`${teams.liquidCash} - ${maintCost}` })
					.where(eq(teams.id, team.id));
			} else if (f.tier > 0) {
				const next = applyFacilityDecay(f.conditionPct, FACILITY_WEEKLY_DECAY);
				await db
					.update(facilities)
					.set({ conditionPct: next })
					.where(eq(facilities.id, f.id));
				facilitiesDecayed += 1;
			}
		}
	}

	const progressMap = await loadProgressMap(db);
	const xpEvents: XpGainEvent[] = [];
	let levelsGained = 0;
	let nextProgressId =
		(await db.select({ m: sql<number>`coalesce(max(${attributeProgress.id}), 0)` }).from(attributeProgress))[0]
			?.m ?? 0;

	const driverRows = await db.select().from(drivers).where(sql`${drivers.teamId} is not null`);
	for (const d of driverRows) {
		if (d.teamId == null) continue;
		const facs = await db.select().from(facilities).where(eq(facilities.teamId, d.teamId));
		const sim = facs.find((f) => f.facilityType === 'simulator');
		const simMult = sim
			? facilityEfficiencyMult(sim.tier, sim.conditionPct)
			: 1;

		const attrs = await db
			.select()
			.from(attributes)
			.where(and(eq(attributes.entityId, d.id), eq(attributes.entityType, 'driver')));

		const growth = attrs.find((a) => a.attrName === 'development')?.currentValue ?? 50;
		const withXp = attrs.map((a) => {
			const key = `driver:${d.id}:${a.attrName}`;
			return {
				attrName: a.attrName,
				currentValue: a.currentValue,
				ceiling: a.ceiling,
				xp: progressMap.get(key)?.xp ?? 0
			};
		});

		const { attrs: updated, events } = applyWeeklyXp({
			entityId: d.id,
			entityType: 'driver',
			attrs: withXp,
			facilityMult: simMult,
			growthAttr: growth,
			mileageLaps: options.mileageByDriverId?.[d.id] ?? 0,
			age: d.age,
			longevity: d.longevity,
			rng
		});

		for (const ev of events) {
			xpEvents.push(ev);
			if (ev.leveledTo != null) levelsGained += 1;
		}

		for (const a of updated) {
			const orig = attrs.find((x) => x.attrName === a.attrName);
			if (orig && orig.currentValue !== a.currentValue) {
				await db
					.update(attributes)
					.set({ currentValue: a.currentValue })
					.where(eq(attributes.id, orig.id));
			}
			const key = `driver:${d.id}:${a.attrName}`;
			const existing = progressMap.get(key);
			if (existing) {
				await db
					.update(attributeProgress)
					.set({ xp: a.xp })
					.where(eq(attributeProgress.id, existing.id));
			} else if (a.xp > 0) {
				nextProgressId += 1;
				await db.insert(attributeProgress).values({
					id: nextProgressId,
					entityId: d.id,
					entityType: 'driver',
					attrName: a.attrName,
					xp: a.xp
				});
				progressMap.set(key, { id: nextProgressId, xp: a.xp });
			}
		}
	}

	const staffRows = await db.select().from(staff).where(sql`${staff.teamId} is not null`);
	for (const s of staffRows) {
		if (s.teamId == null) continue;

		// Fatigue recovery for pit crew (and mild for all staff)
		const nextFatigue = Math.max(0, s.fatiguePct - FATIGUE_RECOVERY_PCT);
		if (nextFatigue !== s.fatiguePct) {
			await db.update(staff).set({ fatiguePct: nextFatigue }).where(eq(staff.id, s.id));
		}

		const facs = await db.select().from(facilities).where(eq(facilities.teamId, s.teamId));
		const academy = facs.find((f) => f.facilityType === 'staff_academy');
		const academyMult = academy
			? facilityEfficiencyMult(academy.tier, academy.conditionPct)
			: 1;

		const attrs = await db
			.select()
			.from(attributes)
			.where(and(eq(attributes.entityId, s.id), eq(attributes.entityType, 'staff')));
		if (attrs.length === 0) continue;

		const growth =
			attrs.find((a) => a.attrName === 'analysis' || a.attrName === 'setup')?.currentValue ??
			60;
		const withXp = attrs.map((a) => {
			const key = `staff:${s.id}:${a.attrName}`;
			return {
				attrName: a.attrName,
				currentValue: a.currentValue,
				ceiling: a.ceiling,
				xp: progressMap.get(key)?.xp ?? 0
			};
		});

		const { attrs: updated, events } = applyWeeklyXp({
			entityId: s.id,
			entityType: 'staff',
			attrs: withXp,
			facilityMult: academyMult,
			growthAttr: growth,
			rng
		});

		for (const ev of events) {
			xpEvents.push(ev);
			if (ev.leveledTo != null) levelsGained += 1;
		}

		for (const a of updated) {
			const orig = attrs.find((x) => x.attrName === a.attrName);
			if (orig && orig.currentValue !== a.currentValue) {
				await db
					.update(attributes)
					.set({ currentValue: a.currentValue })
					.where(eq(attributes.id, orig.id));
			}
			const key = `staff:${s.id}:${a.attrName}`;
			const existing = progressMap.get(key);
			if (existing) {
				await db
					.update(attributeProgress)
					.set({ xp: a.xp })
					.where(eq(attributeProgress.id, existing.id));
			} else if (a.xp > 0) {
				nextProgressId += 1;
				await db.insert(attributeProgress).values({
					id: nextProgressId,
					entityId: s.id,
					entityType: 'staff',
					attrName: a.attrName,
					xp: a.xp
				});
				progressMap.set(key, { id: nextProgressId, xp: a.xp });
			}
		}
	}

	return {
		seasonYear,
		week,
		day,
		tickIndex,
		teamsUpdated: teamRows.length,
		facilitiesDecayed,
		facilitiesMaintained,
		xpEvents,
		levelsGained
	};
}
