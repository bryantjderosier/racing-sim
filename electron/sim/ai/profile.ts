import { eq } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { aiTeamProfiles, teams } from '../../db/schema.js';
import {
	ARCHETYPE_CAP_BUFFER,
	ARCHETYPE_HOUR_SPEND,
	AI_FACILITY_PRIORITY,
	FACILITY_CASH_RESERVE_MULT
} from './constants.js';

export type AiArchetype = 'aggressive_spender' | 'long_term_builder' | 'pragmatic_pivot';

export type AiProfile = {
	teamId: number;
	archetype: AiArchetype;
	rAndDFocusBias: number;
	facilityInvestmentRate: number;
	costCapRiskTolerance: number;
};

const DEFAULTS: Omit<AiProfile, 'teamId'> = {
	archetype: 'pragmatic_pivot',
	rAndDFocusBias: 0.5,
	facilityInvestmentRate: 0.45,
	costCapRiskTolerance: 0.85
};

export async function loadAiProfile(db: AppDb, teamId: number): Promise<AiProfile> {
	const [row] = await db
		.select()
		.from(aiTeamProfiles)
		.where(eq(aiTeamProfiles.teamId, teamId))
		.limit(1);
	if (!row) return { teamId, ...DEFAULTS };
	return {
		teamId,
		archetype: row.archetype as AiArchetype,
		rAndDFocusBias: row.rAndDFocusBias,
		facilityInvestmentRate: row.facilityInvestmentRate,
		costCapRiskTolerance: row.costCapRiskTolerance
	};
}

export function capSpendCeiling(limit: number, profile: AiProfile): number {
	const buf = ARCHETYPE_CAP_BUFFER[profile.archetype] ?? 0.95;
	const risk = Math.max(0.5, Math.min(1.05, profile.costCapRiskTolerance));
	return limit * Math.min(buf, risk);
}

export function hourSpendFraction(profile: AiProfile): number {
	return ARCHETYPE_HOUR_SPEND[profile.archetype] ?? 0.6;
}

export function facilityPriority(profile: AiProfile): string[] {
	return AI_FACILITY_PRIORITY[profile.archetype] ?? AI_FACILITY_PRIORITY.pragmatic_pivot!;
}

export function facilityCashReserveNeeded(profile: AiProfile, cheapUpgradeCash: number): number {
	const mult = FACILITY_CASH_RESERVE_MULT[profile.archetype] ?? 2;
	return cheapUpgradeCash * mult;
}

export async function listAiTeams(db: AppDb): Promise<number[]> {
	const rows = await db.select().from(teams).where(eq(teams.status, 'UNMANAGED_AI'));
	return rows.map((t) => t.id);
}
