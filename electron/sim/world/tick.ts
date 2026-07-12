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
import { completeFacilityBuilds, type CompletedFacility } from '../facilities/index.js';
import { payAllTeamsWeeklyPayroll, spendCash } from '../finance/index.js';
import { tickAllTeamsScouting, type ScoutTickResult } from '../scouting/index.js';
import {
	moraleXpMult,
	tickMorale,
	type MoraleTickOptions,
	type MoraleTickResult
} from '../morale/index.js';
import { tickAllAiManagers, type AiManagersTickResult } from '../ai/index.js';
import { completeDueManufactures } from '../rd/index.js';

export type WorldTickOptions = {
	/** Optional mileage from last race weekend: driverId → laps. */
	mileageByDriverId?: Record<number, number>;
	/** Optional maintenance: teamId → true spends cash to restore facilities to 100%. */
	maintainTeamIds?: number[];
	/** Maintenance cash per facility restored (liquid cash). */
	maintenanceCostPerFacility?: number;
	/** Skip weekly salary payroll (default false). */
	skipPayroll?: boolean;
	/** Skip personnel scouting assignment progress (default false). */
	skipScouting?: boolean;
	/** Skip morale / ego / loyalty tick (default false). */
	skipMorale?: boolean;
	/** Skip AI manager weekly decisions (default false). */
	skipAi?: boolean;
	/** Race results feeding morale this week. */
	raceResultsByDriverId?: MoraleTickOptions['raceResultsByDriverId'];
	/** Team-order outcomes feeding morale this week. */
	teamOrdersByDriverId?: MoraleTickOptions['teamOrdersByDriverId'];
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
	facilitiesCompleted: CompletedFacility[];
	scoutingTicks: ScoutTickResult[];
	morale: MoraleTickResult | null;
	ai: AiManagersTickResult | null;
	manufacturesCompleted: number;
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

	const allFacilitiesEarly = await db.select().from(facilities);
	const facsByTeamEarly = new Map<number, typeof allFacilitiesEarly>();
	for (const f of allFacilitiesEarly) {
		const list = facsByTeamEarly.get(f.teamId) ?? [];
		list.push(f);
		facsByTeamEarly.set(f.teamId, list);
	}

	for (const team of teamRows) {
		const wtBase = WEEKLY_WT_CAP[team.division] ?? WEEKLY_WT_CAP[1];
		const cfdCap = WEEKLY_CFD_CAP[team.division] ?? WEEKLY_CFD_CAP[1];
		const wtCap = wtBase * (team.wtHoursCapMult ?? 1);
		await db
			.update(teams)
			.set({
				wtHoursRemaining: wtCap,
				cfdHoursRemaining: cfdCap
			})
			.where(eq(teams.id, team.id));

		const facs = facsByTeamEarly.get(team.id) ?? [];
		for (const f of facs) {
			if (f.isUnderConstruction) continue;
			if (maintain.has(team.id)) {
				const next = 100;
				f.conditionPct = next;
				await db
					.update(facilities)
					.set({ conditionPct: next })
					.where(eq(facilities.id, f.id));
				facilitiesMaintained += 1;
				await spendCash(db, {
					teamId: team.id,
					amount: maintCost,
					transactionType: 'freight_travel',
					isCostCapApplicable: false
				});
			} else if (f.tier > 0) {
				const next = applyFacilityDecay(f.conditionPct, FACILITY_WEEKLY_DECAY);
				f.conditionPct = next;
				await db
					.update(facilities)
					.set({ conditionPct: next })
					.where(eq(facilities.id, f.id));
				facilitiesDecayed += 1;
			}
		}
	}

	if (!options.skipPayroll) {
		await payAllTeamsWeeklyPayroll(db);
	}

	const scoutingTicks = options.skipScouting
		? []
		: await tickAllTeamsScouting(db);

	const morale = options.skipMorale
		? null
		: await tickMorale(db, {
				raceResultsByDriverId: options.raceResultsByDriverId,
				teamOrdersByDriverId: options.teamOrdersByDriverId
			});

	const facilitiesCompleted = await completeFacilityBuilds(db);
	const dueMfg = await completeDueManufactures(db);

	const ai = options.skipAi ? null : await tickAllAiManagers(db, { rng });

	const progressMap = await loadProgressMap(db);
	const xpEvents: XpGainEvent[] = [];
	let levelsGained = 0;
	let nextProgressId =
		(await db.select({ m: sql<number>`coalesce(max(${attributeProgress.id}), 0)` }).from(attributeProgress))[0]
			?.m ?? 0;

	// Reuse facilities loaded/updated at start of tick.
	const facsByTeam = facsByTeamEarly;

	const allAttrs = await db.select().from(attributes);
	const attrsByKey = new Map<string, typeof allAttrs>();
	for (const a of allAttrs) {
		const key = `${a.entityType}:${a.entityId}`;
		const list = attrsByKey.get(key) ?? [];
		list.push(a);
		attrsByKey.set(key, list);
	}

	const attrValueUpdates: { id: number; currentValue: number }[] = [];
	const progressUpdates: { id: number; xp: number }[] = [];
	const progressInserts: {
		id: number;
		entityId: number;
		entityType: 'driver' | 'staff';
		attrName: string;
		xp: number;
	}[] = [];

	const driverRows = await db.select().from(drivers).where(sql`${drivers.teamId} is not null`);
	for (const d of driverRows) {
		if (d.teamId == null) continue;
		const facs = facsByTeam.get(d.teamId) ?? [];
		const sim = facs.find((f) => f.facilityType === 'simulator');
		const simMult = sim ? facilityEfficiencyMult(sim.tier, sim.conditionPct) : 1;

		const attrs = attrsByKey.get(`driver:${d.id}`) ?? [];
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
			moraleMult: moraleXpMult(d.morale),
			rng
		});

		for (const ev of events) {
			xpEvents.push(ev);
			if (ev.leveledTo != null) levelsGained += 1;
		}

		for (const a of updated) {
			const orig = attrs.find((x) => x.attrName === a.attrName);
			if (orig && orig.currentValue !== a.currentValue) {
				attrValueUpdates.push({ id: orig.id, currentValue: a.currentValue });
			}
			const key = `driver:${d.id}:${a.attrName}`;
			const existing = progressMap.get(key);
			if (existing) {
				if (existing.xp !== a.xp) progressUpdates.push({ id: existing.id, xp: a.xp });
			} else if (a.xp > 0) {
				nextProgressId += 1;
				progressInserts.push({
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
	const fatigueUpdates: { id: number; fatiguePct: number }[] = [];
	for (const s of staffRows) {
		if (s.teamId == null) continue;

		const nextFatigue = Math.max(0, s.fatiguePct - FATIGUE_RECOVERY_PCT);
		if (nextFatigue !== s.fatiguePct) {
			fatigueUpdates.push({ id: s.id, fatiguePct: nextFatigue });
		}

		const facs = facsByTeam.get(s.teamId) ?? [];
		const academy = facs.find((f) => f.facilityType === 'staff_academy');
		const academyMult = academy
			? facilityEfficiencyMult(academy.tier, academy.conditionPct)
			: 1;

		const attrs = attrsByKey.get(`staff:${s.id}`) ?? [];
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
			moraleMult: moraleXpMult(s.morale),
			rng
		});

		for (const ev of events) {
			xpEvents.push(ev);
			if (ev.leveledTo != null) levelsGained += 1;
		}

		for (const a of updated) {
			const orig = attrs.find((x) => x.attrName === a.attrName);
			if (orig && orig.currentValue !== a.currentValue) {
				attrValueUpdates.push({ id: orig.id, currentValue: a.currentValue });
			}
			const key = `staff:${s.id}:${a.attrName}`;
			const existing = progressMap.get(key);
			if (existing) {
				if (existing.xp !== a.xp) progressUpdates.push({ id: existing.id, xp: a.xp });
			} else if (a.xp > 0) {
				nextProgressId += 1;
				progressInserts.push({
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

	const CHUNK = 40;
	async function flush<T>(items: T[], fn: (item: T) => Promise<unknown>) {
		for (let i = 0; i < items.length; i += CHUNK) {
			await Promise.all(items.slice(i, i + CHUNK).map(fn));
		}
	}

	await flush(fatigueUpdates, (u) =>
		db.update(staff).set({ fatiguePct: u.fatiguePct }).where(eq(staff.id, u.id))
	);
	await flush(attrValueUpdates, (u) =>
		db.update(attributes).set({ currentValue: u.currentValue }).where(eq(attributes.id, u.id))
	);
	await flush(progressUpdates, (u) =>
		db.update(attributeProgress).set({ xp: u.xp }).where(eq(attributeProgress.id, u.id))
	);
	if (progressInserts.length > 0) {
		for (let i = 0; i < progressInserts.length; i += CHUNK) {
			await db.insert(attributeProgress).values(progressInserts.slice(i, i + CHUNK));
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
		facilitiesCompleted,
		scoutingTicks,
		morale,
		ai,
		manufacturesCompleted: dueMfg.length,
		xpEvents,
		levelsGained
	};
}
