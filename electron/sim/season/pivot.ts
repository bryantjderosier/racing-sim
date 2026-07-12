import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { aiTeamProfiles, seasons, teams } from '../../db/schema.js';

/**
 * After the pivot race gate: set current-car fraction (1 = 100% current, 0 = 100% next-year).
 * Locks the season pivot once any team confirms (v1: one confirm for the field when AI applies).
 */
export async function setTeamRdPivot(
	db: AppDb,
	args: {
		teamId: number;
		seasonYear: number;
		division: number;
		currentFraction: number;
		lockSeason?: boolean;
	}
): Promise<void> {
	const season = await db
		.select()
		.from(seasons)
		.where(and(eq(seasons.seasonYear, args.seasonYear), eq(seasons.division, args.division)))
		.limit(1)
		.then((r) => r[0]);
	if (!season) throw new Error('Season not found');
	if (season.rdPivotLocked) throw new Error('R&D pivot already locked for this season');

	const frac = Math.max(0, Math.min(1, args.currentFraction));
	await db.update(teams).set({ rdPivotCurrent: frac }).where(eq(teams.id, args.teamId));

	if (args.lockSeason) {
		await db
			.update(seasons)
			.set({ rdPivotLocked: true })
			.where(and(eq(seasons.seasonYear, args.seasonYear), eq(seasons.division, args.division)));
	}
}

/** AI archetype bias → current-car fraction at pivot gate. */
export function aiPivotFraction(archetype: string, focusBias: number): number {
	// focusBias high → stay on current car
	if (archetype === 'pragmatic_pivot') return Math.max(0.15, Math.min(0.45, 0.35 - focusBias * 0.1));
	if (archetype === 'long_term_builder') return Math.max(0.25, Math.min(0.55, 0.4));
	if (archetype === 'aggressive_spender') return Math.max(0.55, Math.min(0.9, 0.7 + focusBias * 0.1));
	return 0.5;
}

/**
 * Open pivot gate: apply AI pivots; leave player team unlocked until setTeamRdPivot.
 */
export async function applyPivotGate(
	db: AppDb,
	args: {
		seasonYear: number;
		division: number;
		playerTeamId?: number;
		playerCurrentFraction?: number;
	}
): Promise<{ teamsUpdated: number; locked: boolean }> {
	const season = await db
		.select()
		.from(seasons)
		.where(and(eq(seasons.seasonYear, args.seasonYear), eq(seasons.division, args.division)))
		.limit(1)
		.then((r) => r[0]);
	if (!season) throw new Error('Season not found');
	if (season.rdPivotLocked) return { teamsUpdated: 0, locked: true };

	const teamRows = await db.select().from(teams).where(eq(teams.division, args.division));
	const profiles = await db.select().from(aiTeamProfiles);
	const profileByTeam = new Map(profiles.map((p) => [p.teamId, p]));

	let updated = 0;
	for (const t of teamRows) {
		if (args.playerTeamId != null && t.id === args.playerTeamId) {
			const frac = args.playerCurrentFraction ?? 0.5;
			await db.update(teams).set({ rdPivotCurrent: frac }).where(eq(teams.id, t.id));
			updated++;
			continue;
		}
		const profile = profileByTeam.get(t.id);
		const frac = profile
			? aiPivotFraction(profile.archetype, profile.rAndDFocusBias)
			: 0.55;
		await db.update(teams).set({ rdPivotCurrent: frac }).where(eq(teams.id, t.id));
		updated++;
	}

	await db
		.update(seasons)
		.set({ rdPivotLocked: true })
		.where(and(eq(seasons.seasonYear, args.seasonYear), eq(seasons.division, args.division)));

	return { teamsUpdated: updated, locked: true };
}
