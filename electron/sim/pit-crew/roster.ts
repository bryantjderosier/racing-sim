import { and, eq, sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { attributes, staff } from '../../db/schema.js';
import { FATIGUE_PER_STOP, PIT_LINEUP_SIZE } from './constants.js';
import { averageSquad, type PitCrewMemberStats, type PitCrewSquadStats } from './stop.js';

async function loadMemberStats(db: AppDb, staffId: number): Promise<PitCrewMemberStats> {
	const [row] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
	if (!row) throw new Error(`Staff ${staffId} not found`);
	const attrs = await db
		.select()
		.from(attributes)
		.where(and(eq(attributes.entityId, staffId), eq(attributes.entityType, 'staff')));
	const map: Record<string, number> = {};
	for (const a of attrs) map[a.attrName] = a.currentValue;
	return {
		staffId,
		speed: map.speed ?? 55,
		consistency: map.consistency ?? 55,
		focus: map.focus ?? map.focus_under_pressure ?? 55,
		fatiguePct: row.fatiguePct
	};
}

export type PitCrewRoster = {
	teamId: number;
	starters: PitCrewMemberStats[];
	bench: PitCrewMemberStats[];
	squad: PitCrewSquadStats;
};

/**
 * Load pit crew: assigned starter slots, else auto-pick least-fatigued / highest speed.
 */
export async function loadPitCrewRoster(db: AppDb, teamId: number): Promise<PitCrewRoster> {
	const crew = await db
		.select()
		.from(staff)
		.where(and(eq(staff.teamId, teamId), eq(staff.role, 'pit_crew')));

	const withStats: (PitCrewMemberStats & { slot: number | null })[] = [];
	for (const c of crew) {
		const stats = await loadMemberStats(db, c.id);
		withStats.push({ ...stats, slot: c.pitCrewSlot });
	}

	const slotted = withStats
		.filter((m) => m.slot != null && m.slot >= 0 && m.slot < PIT_LINEUP_SIZE)
		.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

	let starters: PitCrewMemberStats[];
	let bench: PitCrewMemberStats[];

	if (slotted.length > 0) {
		starters = slotted.slice(0, PIT_LINEUP_SIZE).map(({ slot: _s, ...m }) => m);
		const starterIds = new Set(starters.map((s) => s.staffId));
		bench = withStats.filter((m) => !starterIds.has(m.staffId)).map(({ slot: _s, ...m }) => m);
		// Fill short lineup from bench
		if (starters.length < PIT_LINEUP_SIZE) {
			const fill = [...bench].sort(
				(a, b) => a.fatiguePct - b.fatiguePct || b.speed - a.speed
			);
			while (starters.length < PIT_LINEUP_SIZE && fill.length) {
				starters.push(fill.shift()!);
			}
			const ids = new Set(starters.map((s) => s.staffId));
			bench = withStats.filter((m) => !ids.has(m.staffId)).map(({ slot: _s, ...m }) => m);
		}
	} else {
		const ranked = [...withStats].sort(
			(a, b) => a.fatiguePct - b.fatiguePct || b.speed - a.speed
		);
		starters = ranked.slice(0, PIT_LINEUP_SIZE).map(({ slot: _s, ...m }) => m);
		bench = ranked.slice(PIT_LINEUP_SIZE).map(({ slot: _s, ...m }) => m);
	}

	return {
		teamId,
		starters,
		bench,
		squad: averageSquad(starters)
	};
}

/**
 * Set starter lineup (slot order). Others on team become bench (null slot).
 */
export async function setPitCrewLineup(
	db: AppDb,
	teamId: number,
	starterIds: number[]
): Promise<void> {
	const ids = starterIds.slice(0, PIT_LINEUP_SIZE);
	const crew = await db
		.select()
		.from(staff)
		.where(and(eq(staff.teamId, teamId), eq(staff.role, 'pit_crew')));

	for (const c of crew) {
		const idx = ids.indexOf(c.id);
		await db
			.update(staff)
			.set({ pitCrewSlot: idx >= 0 ? idx : null })
			.where(eq(staff.id, c.id));
	}
}

/** Rotate: move fatigued starters to bench; promote freshest bench. */
export async function autoRotatePitCrew(
	db: AppDb,
	teamId: number,
	fatigueThreshold = 55
): Promise<{ demoted: number[]; promoted: number[] }> {
	const roster = await loadPitCrewRoster(db, teamId);
	const demoted: number[] = [];
	const keep = roster.starters.filter((s) => {
		if (s.fatiguePct >= fatigueThreshold) {
			demoted.push(s.staffId);
			return false;
		}
		return true;
	});
	const benchSorted = [...roster.bench].sort(
		(a, b) => a.fatiguePct - b.fatiguePct || b.speed - a.speed
	);
	const promoted: number[] = [];
	while (keep.length < PIT_LINEUP_SIZE && benchSorted.length) {
		const next = benchSorted.shift()!;
		keep.push(next);
		promoted.push(next.staffId);
	}
	await setPitCrewLineup(
		db,
		teamId,
		keep.map((k) => k.staffId)
	);
	return { demoted, promoted };
}

export async function applyPitStopFatigue(
	db: AppDb,
	memberIds: number[],
	amount = FATIGUE_PER_STOP
): Promise<void> {
	for (const id of memberIds) {
		if (id <= 0) continue;
		const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
		if (!row) continue;
		await db
			.update(staff)
			.set({ fatiguePct: Math.min(100, row.fatiguePct + amount) })
			.where(eq(staff.id, id));
	}
}

export async function seedDefaultPitCrew(
	db: AppDb,
	teamId: number,
	options: { count?: number; idBase?: number } = {}
): Promise<number[]> {
	const count = options.count ?? PIT_LINEUP_SIZE + 4;
	const [maxRow] = await db
		.select({ m: sql<number>`coalesce(max(${staff.id}), 0)` })
		.from(staff);
	let id = options.idBase ?? Number(maxRow?.m ?? 0) + 1;
	const [attrMax] = await db
		.select({ m: sql<number>`coalesce(max(${attributes.id}), 0)` })
		.from(attributes);
	let aid = Number(attrMax?.m ?? 0) + 1;
	const ids: number[] = [];

	for (let i = 0; i < count; i++) {
		const sid = id++;
		ids.push(sid);
		const speed = 58 + Math.round((i % 5) * 4 + (i % 3));
		await db.insert(staff).values({
			id: sid,
			name: `Crew ${teamId}-${i + 1}`,
			nationalityCode: 'GBR',
			birthplace: 'Factory',
			role: 'pit_crew',
			teamId,
			isScouted: true,
			morale: 60,
			ego: 40,
			loyalty: 55,
			fatiguePct: i >= PIT_LINEUP_SIZE ? 10 : 5,
			pitCrewSlot: i < PIT_LINEUP_SIZE ? i : null
		});
		for (const [attrName, currentValue] of [
			['speed', speed],
			['consistency', 60 + (i % 7) * 3],
			['focus', 55 + (i % 6) * 4]
		] as const) {
			await db.insert(attributes).values({
				id: aid++,
				entityId: sid,
				entityType: 'staff',
				attrName,
				currentValue,
				ceiling: Math.min(99, currentValue + 12)
			});
		}
	}
	return ids;
}
