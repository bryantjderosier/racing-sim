import type { StaffRole } from './types.js';

/** Soft AI staff salary ceilings by division. */
export const DIVISION_STAFF_SALARY_CAP: Record<number, number> = {
	1: 4_000_000,
	2: 1_500_000,
	3: 500_000
};

export const DIVISION_STAFF_MARKET_BASE: Record<number, number> = {
	1: 1_200_000,
	2: 450_000,
	3: 150_000
};

/** Roles that count as a required department seat (1 per team). */
export const CORE_STAFF_ROLES: StaffRole[] = [
	'aero',
	'mechanical',
	'powertrain',
	'race_engineer',
	'scout'
];

export const STAFF_SKILL_ATTRS: Record<StaffRole, readonly string[]> = {
	aero: ['efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping'],
	mechanical: ['chassis', 'suspension', 'weight_optimization', 'reliability', 'damage_resistance'],
	powertrain: ['thermal_efficiency', 'harvesting', 'deployment', 'integration', 'reliability'],
	race_engineer: ['chemistry', 'setup', 'strategy', 'analysis', 'adaptability'],
	scout: ['detection', 'accuracy', 'appraisal', 'leverage', 'coverage'],
	pit_crew: ['speed', 'consistency', 'focus', 'stamina', 'composure']
};

/** Staff weigh engineering budget guarantees more than #1 seat. */
export const BUDGET_GUARANTEE_PTS = 8;

export const AI_STAFF_BUDGET_FRACTION = 0.045;
export const DEFAULT_STAFF_CONTRACT_YEARS = 2;
