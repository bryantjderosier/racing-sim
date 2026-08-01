import { createHash } from 'node:crypto';

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

function hashRows(championships: readonly ChampionshipSeed[]) {
	return createHash('sha256')
		.update(JSON.stringify(canonicalize({ championships })))
		.digest('hex');
}

export const BASE_CONTENT_PACK: ContentPack = Object.freeze({
	manifest: Object.freeze({
		contentDataVersion: 'foundation-v1',
		packSchemaVersion: 'content-pack-v1',
		requiredGameVersion: '0.0.1',
		contentHash: hashRows(FOUNDATION_CHAMPIONSHIPS)
	}),
	championships: FOUNDATION_CHAMPIONSHIPS
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
	const { manifest, championships } = pack;
	if (
		!manifest.contentDataVersion ||
		!manifest.packSchemaVersion ||
		!manifest.requiredGameVersion ||
		!manifest.contentHash
	) {
		throw new ContentPackValidationError('Content pack manifest is incomplete.');
	}

	const ids = new Set<string>();
	const codes = new Set<string>();
	const shortCodes = new Set<string>();
	const ladderRanks = new Set<number>();
	for (const championship of championships) {
		if (ids.has(championship.id))
			throw new ContentPackValidationError('Duplicate championship ID.');
		if (codes.has(championship.code))
			throw new ContentPackValidationError('Duplicate championship code.');
		if (shortCodes.has(championship.shortCode)) {
			throw new ContentPackValidationError('Duplicate championship short code.');
		}
		if (ladderRanks.has(championship.ladderRank)) {
			throw new ContentPackValidationError('Duplicate championship ladder rank.');
		}
		ids.add(championship.id);
		codes.add(championship.code);
		shortCodes.add(championship.shortCode);
		ladderRanks.add(championship.ladderRank);
	}

	if (hashRows(championships) !== manifest.contentHash) throw new ContentPackHashMismatchError();
}
