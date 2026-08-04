import { createHash } from 'node:crypto';
import {
	FOUNDATION_FDC_TEAMS,
	FOUNDATION_NATIONALITIES,
	type NationalitySeed,
	type TeamSeed
} from '../../src/lib/content/career-start.js';
import { FDC_FOUNDATION_CONTENT } from '../../src/lib/content/fdc-foundation.js';

export interface ContentPackManifest {
	contentDataVersion: string;
	packSchemaVersion: string;
	requiredGameVersion: string;
	contentHash: string;
}

export interface ChampionshipSeed {
	id: string;
	code: 'apex' | 'challenger' | 'academy';
	displayName: string;
	shortCode: string;
	ladderRank: number;
}

export interface ContentPack {
	manifest: ContentPackManifest;
	championships: readonly ChampionshipSeed[];
	nationalities: readonly NationalitySeed[];
	teams: readonly TeamSeed[];
	foundation: typeof FDC_FOUNDATION_CONTENT;
}

const FOUNDATION_CHAMPIONSHIPS: readonly ChampionshipSeed[] = [
	{
		id: '00000000-0000-4000-8000-000000000001',
		code: 'apex',
		displayName: 'World Formula Championship',
		shortCode: 'WFC',
		ladderRank: 1
	},
	{
		id: '00000000-0000-4000-8000-000000000002',
		code: 'challenger',
		displayName: 'International Formula Championship',
		shortCode: 'IFC',
		ladderRank: 2
	},
	{
		id: '00000000-0000-4000-8000-000000000003',
		code: 'academy',
		displayName: 'Formula Development Championship',
		shortCode: 'FDC',
		ladderRank: 3
	}
];

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value
			.map(canonicalize)
			.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
	}

	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)])
		);
	}

	return value;
}

function hashPackRows(pack: {
	championships: readonly ChampionshipSeed[];
	nationalities: readonly NationalitySeed[];
	teams: readonly TeamSeed[];
	foundation: typeof FDC_FOUNDATION_CONTENT;
}) {
	return createHash('sha256')
		.update(
			JSON.stringify(
				canonicalize({
					championships: pack.championships,
					nationalities: pack.nationalities,
					teams: pack.teams,
					foundation: pack.foundation
				})
			)
		)
		.digest('hex');
}

const foundationRows = {
	championships: FOUNDATION_CHAMPIONSHIPS,
	nationalities: FOUNDATION_NATIONALITIES,
	teams: FOUNDATION_FDC_TEAMS,
	foundation: FDC_FOUNDATION_CONTENT
};

export const BASE_CONTENT_PACK: ContentPack = Object.freeze({
	manifest: Object.freeze({
		contentDataVersion: 'foundation-v4-tier3-season',
		packSchemaVersion: 'content-pack-v2',
		requiredGameVersion: '0.0.1',
		contentHash: hashPackRows(foundationRows)
	}),
	championships: FOUNDATION_CHAMPIONSHIPS,
	nationalities: FOUNDATION_NATIONALITIES,
	teams: FOUNDATION_FDC_TEAMS,
	foundation: FDC_FOUNDATION_CONTENT
});

export class ContentPackHashMismatchError extends Error {
	readonly code = 'CONTENT_HASH_MISMATCH' as const;

	constructor() {
		super('Content pack hash does not match its deterministic seed rows.');
		this.name = 'ContentPackHashMismatchError';
	}
}

export class ContentPackValidationError extends Error {
	readonly code = 'INVALID_CONTENT_PACK' as const;

	constructor(message: string) {
		super(message);
		this.name = 'ContentPackValidationError';
	}
}

export function validateContentPack(pack: ContentPack) {
	const { manifest, championships, nationalities, teams, foundation } = pack;
	if (
		!manifest.contentDataVersion ||
		!manifest.packSchemaVersion ||
		!manifest.requiredGameVersion ||
		!manifest.contentHash
	) {
		throw new ContentPackValidationError('Content pack manifest is incomplete.');
	}

	const championshipIds = new Set<string>();
	const codes = new Set<string>();
	const shortCodes = new Set<string>();
	const ladderRanks = new Set<number>();
	for (const championship of championships) {
		if (championshipIds.has(championship.id)) {
			throw new ContentPackValidationError('Duplicate championship ID.');
		}
		if (codes.has(championship.code)) {
			throw new ContentPackValidationError('Duplicate championship code.');
		}
		if (shortCodes.has(championship.shortCode)) {
			throw new ContentPackValidationError('Duplicate championship short code.');
		}
		if (ladderRanks.has(championship.ladderRank)) {
			throw new ContentPackValidationError('Duplicate championship ladder rank.');
		}
		championshipIds.add(championship.id);
		codes.add(championship.code);
		shortCodes.add(championship.shortCode);
		ladderRanks.add(championship.ladderRank);
	}

	const nationalityIds = new Set<string>();
	const nationalityCodes = new Set<string>();
	for (const nationality of nationalities) {
		if (nationalityIds.has(nationality.id)) {
			throw new ContentPackValidationError('Duplicate nationality ID.');
		}
		if (nationalityCodes.has(nationality.code)) {
			throw new ContentPackValidationError('Duplicate nationality code.');
		}
		nationalityIds.add(nationality.id);
		nationalityCodes.add(nationality.code);
	}

	const teamIds = new Set<string>();
	const teamCodes = new Set<string>();
	for (const team of teams) {
		if (teamIds.has(team.id)) throw new ContentPackValidationError('Duplicate team ID.');
		if (teamCodes.has(team.code)) throw new ContentPackValidationError('Duplicate team code.');
		if (!nationalityIds.has(team.nationalityId)) {
			throw new ContentPackValidationError(`Team ${team.code} references unknown nationality.`);
		}
		teamIds.add(team.id);
		teamCodes.add(team.code);
	}

	if (
		foundation.season.championshipId !== championships.find((row) => row.code === 'academy')?.id
	) {
		throw new ContentPackValidationError(
			'Foundation season is not attached to the academy championship.'
		);
	}
	if (foundation.season.rulesetId !== foundation.ruleset.id) {
		throw new ContentPackValidationError('Foundation season references an unknown ruleset.');
	}
	if (foundation.ruleset.weekendFormatTemplateId !== foundation.weekendFormat.id) {
		throw new ContentPackValidationError(
			'Foundation ruleset references an unknown weekend format.'
		);
	}
	if (foundation.events.length !== 10 || foundation.eventSessionDefinitions.length !== 50) {
		throw new ContentPackValidationError(
			'Foundation calendar must contain 10 events and 50 sessions.'
		);
	}
	const sessionKinds = foundation.eventSessionDefinitions.map((session) => session.sessionKind);
	if (
		sessionKinds.includes('qualifying') ||
		sessionKinds.filter((kind) => kind === 'sprint').length !== 10
	) {
		throw new ContentPackValidationError(
			'Foundation Tier 3 sessions do not match the launch format.'
		);
	}
	if (foundation.drivers.length !== 20 || foundation.eventEntries.length !== 200) {
		throw new ContentPackValidationError(
			'Foundation roster must contain 20 drivers and 200 event entries.'
		);
	}

	if (hashPackRows({ championships, nationalities, teams, foundation }) !== manifest.contentHash) {
		throw new ContentPackHashMismatchError();
	}
}

export function isPackTeamId(pack: ContentPack, teamId: string): boolean {
	return pack.teams.some((team) => team.id === teamId);
}
