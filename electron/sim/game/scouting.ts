import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { drivers, scoutingReports, staff, teams } from '../../db/schema.js';
import type { CareerSummary } from '../career/store.js';
import { scanMarketHeat, scanStaffMarketHeat } from '../market/index.js';
import {
	assignScoutTarget,
	getFoggedProfile,
	getScoutNetworkStats,
	parallelScoutSlots,
	unassignScoutTarget,
	weeklyConfidenceGain,
	type AssignScoutResult,
	type FoggedPersonnelProfile
} from '../scouting/index.js';
import { ensureClock } from '../world/tick.js';
import { getSeasonCaps } from './desk.js';
import type {
	ScoutAssignArgs,
	ScoutCandidateView,
	ScoutFoggedProfileArgs,
	ScoutFoggedProfileView,
	ScoutUnassignArgs,
	ScoutingHubSnapshot
} from './types.js';

export async function getScoutingSnapshot(
	db: AppDb,
	career: Pick<CareerSummary, 'id' | 'displayName' | 'playerTeamId'>
): Promise<ScoutingHubSnapshot> {
	const playerTeamId = career.playerTeamId;
	const clock = await ensureClock(db);
	const [team] = await db.select().from(teams).where(eq(teams.id, playerTeamId)).limit(1);
	if (!team) throw new Error(`Player team ${playerTeamId} not found`);

	const caps = await getSeasonCaps(db, clock.seasonYear, team.division);
	const stats = await getScoutNetworkStats(db, playerTeamId);
	const slotsMax = parallelScoutSlots(stats.coverage, stats.hqTier);

	const reports = await db
		.select()
		.from(scoutingReports)
		.where(eq(scoutingReports.teamId, playerTeamId));
	const assignedReports = reports.filter((r) => r.isAssigned);
	const reportKey = (type: string, id: number) => `${type}:${id}`;
	const reportByKey = new Map(reports.map((r) => [reportKey(r.entityType, r.entityId), r]));

	const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams);
	const teamNameById = new Map(teamRows.map((t) => [t.id, t.name]));

	const driverRows = await db.select().from(drivers).where(eq(drivers.isKarting, false));
	const staffRows = await db.select().from(staff);
	const driverById = new Map(driverRows.map((d) => [d.id, d]));
	const staffById = new Map(staffRows.map((s) => [s.id, s]));

	const assignments = assignedReports.map((r) => {
		if (r.entityType === 'driver') {
			const d = driverById.get(r.entityId);
			return {
				entityId: r.entityId,
				entityType: 'driver' as const,
				name: d?.name ?? `Driver ${r.entityId}`,
				teamId: d?.teamId ?? null,
				teamName: d?.teamId != null ? (teamNameById.get(d.teamId) ?? null) : null,
				role: null,
				confidenceLevel: r.confidenceLevel,
				isAssigned: true
			};
		}
		const s = staffById.get(r.entityId);
		return {
			entityId: r.entityId,
			entityType: 'staff' as const,
			name: s?.name ?? `Staff ${r.entityId}`,
			teamId: s?.teamId ?? null,
			teamName: s?.teamId != null ? (teamNameById.get(s.teamId) ?? null) : null,
			role: s?.role ?? null,
			confidenceLevel: r.confidenceLevel,
			isAssigned: true
		};
	});

	const hotDrivers = await scanMarketHeat(db);
	const hotStaff = await scanStaffMarketHeat(db);
	const candidateMap = new Map<string, ScoutCandidateView>();

	for (const h of hotDrivers) {
		if (h.teamId === playerTeamId) continue;
		const key = reportKey('driver', h.driverId);
		const report = reportByKey.get(key);
		candidateMap.set(key, {
			entityId: h.driverId,
			entityType: 'driver',
			name: h.name,
			teamId: h.teamId,
			teamName: h.teamId != null ? (teamNameById.get(h.teamId) ?? null) : null,
			role: null,
			confidenceLevel: report?.confidenceLevel ?? 0,
			isAssigned: report?.isAssigned ?? false,
			reasons: h.reasons
		});
	}

	for (const h of hotStaff) {
		if (h.teamId === playerTeamId) continue;
		const key = reportKey('staff', h.staffId);
		const report = reportByKey.get(key);
		candidateMap.set(key, {
			entityId: h.staffId,
			entityType: 'staff',
			name: h.name,
			teamId: h.teamId,
			teamName: h.teamId != null ? (teamNameById.get(h.teamId) ?? null) : null,
			role: h.role,
			confidenceLevel: report?.confidenceLevel ?? 0,
			isAssigned: report?.isAssigned ?? false,
			reasons: h.reasons
		});
	}

	for (const r of reports) {
		const key = reportKey(r.entityType, r.entityId);
		if (candidateMap.has(key)) continue;
		if (r.entityType === 'driver') {
			const d = driverById.get(r.entityId);
			if (!d || d.teamId === playerTeamId) continue;
			candidateMap.set(key, {
				entityId: r.entityId,
				entityType: 'driver',
				name: d.name,
				teamId: d.teamId,
				teamName: d.teamId != null ? (teamNameById.get(d.teamId) ?? null) : null,
				role: null,
				confidenceLevel: r.confidenceLevel,
				isAssigned: r.isAssigned,
				reasons: []
			});
		} else if (r.entityType === 'staff') {
			const s = staffById.get(r.entityId);
			if (!s || s.teamId === playerTeamId) continue;
			candidateMap.set(key, {
				entityId: r.entityId,
				entityType: 'staff',
				name: s.name,
				teamId: s.teamId,
				teamName: s.teamId != null ? (teamNameById.get(s.teamId) ?? null) : null,
				role: s.role,
				confidenceLevel: r.confidenceLevel,
				isAssigned: r.isAssigned,
				reasons: []
			});
		}
	}

	const weeklyGainEstimate = weeklyConfidenceGain({
		detection: stats.detection,
		accuracy: stats.accuracy,
		hqEfficiencyMult: stats.hqEfficiencyMult
	});

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
		network: {
			slotsUsed: assignedReports.length,
			slotsMax,
			detection: stats.detection,
			accuracy: stats.accuracy,
			appraisal: stats.appraisal,
			coverage: stats.coverage,
			leverage: stats.leverage,
			hqTier: stats.hqTier,
			weeklyGainEstimate
		},
		assignments,
		candidates: [...candidateMap.values()].sort(
			(a, b) => Number(b.isAssigned) - Number(a.isAssigned) || b.confidenceLevel - a.confidenceLevel
		)
	};
}

export async function assignPlayerScoutTarget(
	db: AppDb,
	playerTeamId: number,
	args: ScoutAssignArgs
): Promise<AssignScoutResult> {
	return assignScoutTarget(db, {
		teamId: playerTeamId,
		entityId: args.entityId,
		entityType: args.entityType
	});
}

export async function unassignPlayerScoutTarget(
	db: AppDb,
	playerTeamId: number,
	args: ScoutUnassignArgs
): Promise<boolean> {
	return unassignScoutTarget(db, {
		teamId: playerTeamId,
		entityId: args.entityId,
		entityType: args.entityType
	});
}

export async function getPlayerFoggedProfile(
	db: AppDb,
	playerTeamId: number,
	args: ScoutFoggedProfileArgs
): Promise<ScoutFoggedProfileView> {
	const profile: FoggedPersonnelProfile = await getFoggedProfile(db, {
		viewingTeamId: playerTeamId,
		entityId: args.entityId,
		entityType: args.entityType
	});
	return {
		entityId: profile.entityId,
		entityType: profile.entityType,
		name: profile.name,
		confidenceLevel: profile.confidenceLevel,
		fullyRevealed: profile.fullyRevealed,
		attrs: profile.attrs.map((a) => ({
			attrName: a.attrName,
			knownMin: a.knownMin,
			knownMax: a.knownMax,
			...(a.trueValue != null ? { trueValue: a.trueValue } : {})
		})),
		meta: profile.meta.map((m) => ({
			attrName: m.key,
			knownMin: m.knownMin,
			knownMax: m.knownMax,
			...(m.trueValue != null ? { trueValue: m.trueValue } : {})
		}))
	};
}
