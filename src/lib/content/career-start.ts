import {
	CONTINENTS,
	NATIONALITIES,
	type Continent,
	type ContinentCode,
	type NationalityRecord
} from './nationalities.generated.js';

export type { Continent, ContinentCode, NationalityRecord };

export interface NationalitySeed {
	id: string;
	code: string;
	displayName: string;
}

export interface TeamSeed {
	id: string;
	code: string;
	name: string;
	shortName: string;
	nationalityId: string;
	createdAt: string;
}

export interface CareerStartTeam {
	id: string;
	code: string;
	name: string;
	shortName: string;
	nationalityCode: string;
	nationalityIso2: string;
	nationalityDisplayName: string;
}

const TEAM_CREATED_AT = '2030-01-01T00:00:00.000Z';

export const ALL_NATIONALITIES = NATIONALITIES;

export const ALL_CONTINENTS = CONTINENTS;

/** The `nationality` table only stores these columns; extra keys would break the seed insert. */
export const FOUNDATION_NATIONALITIES: readonly NationalitySeed[] = Object.freeze(
	NATIONALITIES.map(({ id, code, displayName }) => ({ id, code, displayName }))
);

const nationalityById = new Map(NATIONALITIES.map((row) => [row.id, row]));

export function findNationality(id: string): NationalityRecord | undefined {
	return nationalityById.get(id);
}

export function nationalitiesInContinent(continent: ContinentCode): NationalityRecord[] {
	return NATIONALITIES.filter((row) => row.continent === continent);
}

export function nationalityFlagEmoji(iso2: string): string {
	if (iso2.length !== 2) return '🏁';
	return [...iso2.toUpperCase()]
		.map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)))
		.join('');
}

const FDC_TEAM_DEFS = [
	{ code: 'northstar', name: 'Northstar Racing', shortName: 'Northstar', nationalityCode: 'gbr' },
	{ code: 'vela', name: 'Vela Racing', shortName: 'Vela', nationalityCode: 'ita' },
	{ code: 'meridian', name: 'Meridian Racing', shortName: 'Meridian', nationalityCode: 'deu' },
	{ code: 'forge', name: 'Forge Racing', shortName: 'Forge', nationalityCode: 'fra' },
	{ code: 'kestrel', name: 'Kestrel Racing', shortName: 'Kestrel', nationalityCode: 'esp' },
	{ code: 'helix', name: 'Helix Racing', shortName: 'Helix', nationalityCode: 'jpn' },
	{ code: 'pioneer', name: 'Pioneer Racing', shortName: 'Pioneer', nationalityCode: 'bra' },
	{ code: 'atlas', name: 'Atlas Racing', shortName: 'Atlas', nationalityCode: 'usa' },
	{ code: 'ember', name: 'Ember Racing', shortName: 'Ember', nationalityCode: 'aus' },
	{ code: 'juniper', name: 'Juniper Racing', shortName: 'Juniper', nationalityCode: 'nld' }
] as const;

const nationalityByCode = new Map(
	FOUNDATION_NATIONALITIES.map((nationality) => [nationality.code, nationality])
);

export const FOUNDATION_FDC_TEAMS: readonly TeamSeed[] = Object.freeze(
	FDC_TEAM_DEFS.map((team, index) => {
		const nationality = nationalityByCode.get(team.nationalityCode);
		if (!nationality) throw new Error(`Missing nationality for team ${team.code}`);
		return {
			id: `00000000-0000-4000-8000-0000000002${String(index + 1).padStart(2, '0')}`,
			code: team.code,
			name: team.name,
			shortName: team.shortName,
			nationalityId: nationality.id,
			createdAt: TEAM_CREATED_AT
		};
	})
);

export const CAREER_START_TEAMS: readonly CareerStartTeam[] = Object.freeze(
	FOUNDATION_FDC_TEAMS.map((team) => {
		const nationality = findNationality(team.nationalityId);
		if (!nationality) throw new Error(`Missing nationality row for team ${team.code}`);
		return {
			id: team.id,
			code: team.code,
			name: team.name,
			shortName: team.shortName,
			nationalityCode: nationality.code,
			nationalityIso2: nationality.iso2,
			nationalityDisplayName: nationality.displayName
		};
	})
);

export const DEFAULT_CAREER_WORLD_DATE = '2030-03-01';

export const DEFAULT_NATIONALITY_ID =
	NATIONALITIES.find((row) => row.iso2 === 'GB')?.id ?? NATIONALITIES[0].id;

export function findCareerStartTeam(teamId: string): CareerStartTeam | undefined {
	return CAREER_START_TEAMS.find((team) => team.id === teamId);
}
