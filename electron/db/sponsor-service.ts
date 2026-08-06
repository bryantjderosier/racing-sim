import { and, asc, desc, eq, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type {
	SponsorAcceptOfferResult,
	SponsorCategory,
	SponsorContractDto,
	SponsorDashboardDto,
	SponsorFitFactorDto,
	SponsorOfferDto,
	SponsorSlotType
} from '../ipc-contract.js';
import * as schema from './schema.js';
import { postFinanceTransaction } from './finance-service.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const SPONSOR_CATEGORIES: readonly SponsorCategory[] = [
	'title',
	'technical',
	'regional',
	'lifestyle'
];
export const SPONSOR_SLOT_TYPES: readonly SponsorSlotType[] = ['primary', 'supporting'];
export const MAX_SUPPORTING_SPONSORS_PER_CATEGORY = 2;
export const SPONSOR_SCHEMA_VERSION = 'sponsor-v1';

type SponsorSeed = {
	id: string;
	code: string;
	name: string;
	category: SponsorCategory;
	slotType: SponsorSlotType;
	priorityTags: readonly string[];
	compatibleChampionshipCodes: readonly string[];
	preferredNationalityCodes: readonly string[];
	targetType: string;
	targetThreshold: number;
	termSeasons: number;
	baseMultiplier: number;
};

const SPONSOR_SEEDS: readonly SponsorSeed[] = [
	{
		id: 'sponsor-vertex-mobility',
		code: 'vertex-mobility',
		name: 'Vertex Mobility',
		category: 'title',
		slotType: 'primary',
		priorityTags: ['results', 'visibility'],
		compatibleChampionshipCodes: ['apex', 'challenger'],
		preferredNationalityCodes: ['deu', 'fra'],
		targetType: 'team_championship_finish',
		targetThreshold: 6,
		termSeasons: 1,
		baseMultiplier: 1.35
	},
	{
		id: 'sponsor-northline-energy',
		code: 'northline-energy',
		name: 'Northline Energy',
		category: 'title',
		slotType: 'primary',
		priorityTags: ['results', 'technology'],
		compatibleChampionshipCodes: ['apex', 'challenger', 'academy'],
		preferredNationalityCodes: ['gbr', 'usa'],
		targetType: 'team_championship_finish',
		targetThreshold: 8,
		termSeasons: 2,
		baseMultiplier: 1.1
	},
	{
		id: 'sponsor-vector-precision',
		code: 'vector-precision',
		name: 'Vector Precision',
		category: 'technical',
		slotType: 'primary',
		priorityTags: ['technology', 'development'],
		compatibleChampionshipCodes: ['apex', 'challenger', 'academy'],
		preferredNationalityCodes: ['deu', 'jpn'],
		targetType: 'development_milestone',
		targetThreshold: 3,
		termSeasons: 1,
		baseMultiplier: 0.9
	},
	{
		id: 'sponsor-apex-systems',
		code: 'apex-systems',
		name: 'Apex Systems',
		category: 'technical',
		slotType: 'supporting',
		priorityTags: ['technology', 'reliability'],
		compatibleChampionshipCodes: ['challenger', 'academy'],
		preferredNationalityCodes: ['usa', 'gbr'],
		targetType: 'reliability_finish_rate',
		targetThreshold: 85,
		termSeasons: 1,
		baseMultiplier: 0.45
	},
	{
		id: 'sponsor-orbit-finance',
		code: 'orbit-finance',
		name: 'Orbit Finance',
		category: 'regional',
		slotType: 'primary',
		priorityTags: ['visibility', 'commercial'],
		compatibleChampionshipCodes: ['apex', 'challenger', 'academy'],
		preferredNationalityCodes: ['gbr', 'nld'],
		targetType: 'race_visibility',
		targetThreshold: 70,
		termSeasons: 2,
		baseMultiplier: 0.75
	},
	{
		id: 'sponsor-summit-logistics',
		code: 'summit-logistics',
		name: 'Summit Logistics',
		category: 'regional',
		slotType: 'supporting',
		priorityTags: ['reliability', 'commercial'],
		compatibleChampionshipCodes: ['challenger', 'academy'],
		preferredNationalityCodes: ['fra', 'esp'],
		targetType: 'completed_events',
		targetThreshold: 90,
		termSeasons: 1,
		baseMultiplier: 0.3
	},
	{
		id: 'sponsor-pulse-athletics',
		code: 'pulse-athletics',
		name: 'Pulse Athletics',
		category: 'lifestyle',
		slotType: 'primary',
		priorityTags: ['driver_visibility', 'fan_engagement'],
		compatibleChampionshipCodes: ['apex', 'challenger', 'academy'],
		preferredNationalityCodes: ['usa', 'bra'],
		targetType: 'driver_visibility',
		targetThreshold: 8,
		termSeasons: 1,
		baseMultiplier: 0.65
	},
	{
		id: 'sponsor-lumen-hospitality',
		code: 'lumen-hospitality',
		name: 'Lumen Hospitality',
		category: 'lifestyle',
		slotType: 'supporting',
		priorityTags: ['fan_engagement', 'commercial'],
		compatibleChampionshipCodes: ['challenger', 'academy'],
		preferredNationalityCodes: ['ita', 'esp'],
		targetType: 'commercial_activation',
		targetThreshold: 2,
		termSeasons: 1,
		baseMultiplier: 0.25
	}
];

const TIER_BASE_PAYMENT_MINOR: Record<string, number> = {
	academy: 4_000_000,
	challenger: 8_000_000,
	apex: 16_000_000
};

export class SponsorError extends Error {
	readonly code: 'INVALID_COMMAND' | 'MIGRATION_FAILED' | 'CONFLICT';

	constructor(
		message: string,
		code: 'INVALID_COMMAND' | 'MIGRATION_FAILED' | 'CONFLICT' = 'INVALID_COMMAND'
	) {
		super(message);
		this.name = 'SponsorError';
		this.code = code;
	}
}

interface PlayerSponsorContext {
	saveId: string;
	worldDate: string;
	teamSeasonEntryId: string;
	teamId: string;
	teamName: string;
	teamShortName: string;
	nationalityCode: string | null;
	championshipCode: string;
	championshipName: string;
	seasonYear: number;
}

function parseObject(payload: string, label: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new SponsorError(
			`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}.`,
			'MIGRATION_FAILED'
		);
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new SponsorError(`${label} must be a JSON object.`, 'MIGRATION_FAILED');
	}
	return parsed as Record<string, unknown>;
}

function parseStringArray(payload: string, label: string): string[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new SponsorError(
			`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}.`,
			'MIGRATION_FAILED'
		);
	}
	if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
		throw new SponsorError(`${label} must be an array of strings.`, 'MIGRATION_FAILED');
	}
	return [...parsed];
}

function parseDate(value: string, label: string): Date {
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) throw new SponsorError(`${label} is not a valid date.`);
	return date;
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
	const date = parseDate(value, 'Sponsor date');
	date.setUTCDate(date.getUTCDate() + days);
	return formatDate(date);
}

function addContractYears(startDate: string, termSeasons: number): string {
	const date = parseDate(startDate, 'Sponsor contract start date');
	date.setUTCFullYear(date.getUTCFullYear() + termSeasons);
	date.setUTCDate(date.getUTCDate() - 1);
	return formatDate(date);
}

function subtractDays(value: string, days: number, minimum: string): string {
	const date = parseDate(value, 'Sponsor contract end date');
	date.setUTCDate(date.getUTCDate() - days);
	const result = formatDate(date);
	return result < minimum ? minimum : result;
}

function assertCategory(value: string): SponsorCategory {
	if (!SPONSOR_CATEGORIES.includes(value as SponsorCategory)) {
		throw new SponsorError(`Unknown sponsor category: ${value}.`, 'MIGRATION_FAILED');
	}
	return value as SponsorCategory;
}

function assertSlotType(value: string): SponsorSlotType {
	if (!SPONSOR_SLOT_TYPES.includes(value as SponsorSlotType)) {
		throw new SponsorError(`Unknown sponsor slot type: ${value}.`, 'MIGRATION_FAILED');
	}
	return value as SponsorSlotType;
}

function toFitFactors(value: unknown): SponsorFitFactorDto[] {
	if (!Array.isArray(value))
		throw new SponsorError('Sponsor fit factors are invalid.', 'MIGRATION_FAILED');
	return value.map((factor) => {
		if (!factor || typeof factor !== 'object' || Array.isArray(factor)) {
			throw new SponsorError('Sponsor fit factor is invalid.', 'MIGRATION_FAILED');
		}
		const row = factor as Record<string, unknown>;
		if (
			typeof row.code !== 'string' ||
			typeof row.label !== 'string' ||
			typeof row.value !== 'number' ||
			typeof row.available !== 'boolean'
		) {
			throw new SponsorError('Sponsor fit factor has an invalid shape.', 'MIGRATION_FAILED');
		}
		return {
			code: row.code,
			label: row.label,
			value: row.value,
			available: row.available
		};
	});
}

function sponsorPriorityTags(row: typeof schema.sponsor.$inferSelect): string[] {
	return parseStringArray(row.priorityPayload, 'Sponsor priority payload');
}

async function getPlayerSponsorContext(tx: Transaction): Promise<PlayerSponsorContext> {
	const rows = await tx
		.select({
			saveId: schema.saveGame.id,
			worldDate: schema.saveGame.worldDate,
			teamSeasonEntryId: schema.teamSeasonEntry.id,
			teamId: schema.team.id,
			teamName: schema.team.name,
			teamShortName: schema.team.shortName,
			nationalityCode: schema.nationality.code,
			championshipCode: schema.championship.code,
			championshipName: schema.championship.displayName,
			seasonYear: schema.championshipSeason.seasonYear
		})
		.from(schema.saveGame)
		.innerJoin(schema.team, eq(schema.saveGame.playerTeamId, schema.team.id))
		.leftJoin(schema.nationality, eq(schema.team.nationalityId, schema.nationality.id))
		.innerJoin(schema.teamSeasonEntry, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.innerJoin(
			schema.championshipSeason,
			eq(schema.teamSeasonEntry.championshipSeasonId, schema.championshipSeason.id)
		)
		.innerJoin(
			schema.championship,
			eq(schema.championshipSeason.championshipId, schema.championship.id)
		)
		.orderBy(desc(schema.championshipSeason.seasonYear), asc(schema.teamSeasonEntry.id))
		.limit(1);
	const context = rows[0];
	if (!context) throw new SponsorError('Player team season is missing.', 'MIGRATION_FAILED');
	return context;
}

export async function ensureSponsorCatalog(tx: Transaction, now: string): Promise<number> {
	const existing = await tx.select({ id: schema.sponsor.id }).from(schema.sponsor);
	const existingIds = new Set(existing.map((row) => row.id));
	const missing = SPONSOR_SEEDS.filter((seed) => !existingIds.has(seed.id));
	if (missing.length === 0) return 0;
	await tx.insert(schema.sponsor).values(
		missing.map((seed) => ({
			id: seed.id,
			code: seed.code,
			name: seed.name,
			category: seed.category,
			slotType: seed.slotType,
			priorityPayload: JSON.stringify(seed.priorityTags),
			compatibleChampionshipCodesPayload: JSON.stringify(seed.compatibleChampionshipCodes),
			createdAt: now
		}))
	);
	return missing.length;
}

function buildFit(seed: SponsorSeed, context: PlayerSponsorContext) {
	const tierValue = seed.compatibleChampionshipCodes.includes(context.championshipCode) ? 92 : 55;
	const identityValue =
		context.nationalityCode && seed.preferredNationalityCodes.includes(context.nationalityCode)
			? 88
			: 62;
	const factors: SponsorFitFactorDto[] = [
		{ code: 'tier', label: 'Championship fit', value: tierValue, available: true },
		{ code: 'identity', label: 'Team identity fit', value: identityValue, available: true },
		{ code: 'reputation', label: 'Team reputation', value: 0, available: false },
		{ code: 'results', label: 'Recent results', value: 0, available: false }
	];
	return {
		score: Math.round((tierValue + identityValue) / 2),
		factors,
		deferredFactors: [
			'team_reputation',
			'driver_visibility',
			'development_strategy',
			'season_results'
		]
	};
}

function paymentFor(seed: SponsorSeed, championshipCode: string) {
	const tierBase = TIER_BASE_PAYMENT_MINOR[championshipCode] ?? TIER_BASE_PAYMENT_MINOR.academy;
	const annualBasePaymentMinor = Math.round(
		tierBase * seed.baseMultiplier * (seed.slotType === 'primary' ? 1 : 0.35)
	);
	return {
		annualBasePaymentMinor,
		signingBonusMinor: Math.round(annualBasePaymentMinor * 0.1),
		performanceBonusMinor: Math.round(annualBasePaymentMinor * 0.2)
	};
}

async function ensureSponsorOffers(
	tx: Transaction,
	context: PlayerSponsorContext,
	now: string
): Promise<number> {
	const existing = await tx
		.select({ sponsorId: schema.sponsorOffer.sponsorId })
		.from(schema.sponsorOffer)
		.where(eq(schema.sponsorOffer.teamSeasonEntryId, context.teamSeasonEntryId));
	const existingIds = new Set(existing.map((row) => row.sponsorId));
	const missing = SPONSOR_SEEDS.filter((seed) => !existingIds.has(seed.id));
	if (missing.length === 0) return 0;
	const expiresAt = addDays(context.worldDate, 60);
	await tx.insert(schema.sponsorOffer).values(
		missing.map((seed) => {
			const fit = buildFit(seed, context);
			const payment = paymentFor(seed, context.championshipCode);
			return {
				id: `${context.teamSeasonEntryId}:sponsor:${context.seasonYear}:${seed.id}`,
				teamSeasonEntryId: context.teamSeasonEntryId,
				sponsorId: seed.id,
				status: 'available',
				availableFrom: context.worldDate,
				expiresAt,
				termSeasons: seed.termSeasons,
				...payment,
				targetPayload: JSON.stringify({
					schemaVersion: 'sponsor-target-v1',
					type: seed.targetType,
					threshold: seed.targetThreshold,
					tracking: 'automatic'
				}),
				obligationPayload: JSON.stringify({
					schemaVersion: 'sponsor-obligation-v1',
					type: 'season_visibility',
					priorityTags: seed.priorityTags,
					playerDecisionRequired: false
				}),
				fitPayload: JSON.stringify({ schemaVersion: 'sponsor-fit-v1', ...fit }),
				createdAt: now,
				updatedAt: now
			};
		})
	);
	return missing.length;
}

export async function ensureSponsorMarket(
	tx: Transaction,
	options: { now: string }
): Promise<{ sponsorsCreated: number; offersCreated: number }> {
	const context = await getPlayerSponsorContext(tx);
	const sponsorsCreated = await ensureSponsorCatalog(tx, options.now);
	const offersCreated = await ensureSponsorOffers(tx, context, options.now);
	await tx
		.update(schema.sponsorOffer)
		.set({ status: 'expired', updatedAt: options.now })
		.where(
			and(
				eq(schema.sponsorOffer.teamSeasonEntryId, context.teamSeasonEntryId),
				eq(schema.sponsorOffer.status, 'available'),
				lt(schema.sponsorOffer.expiresAt, context.worldDate)
			)
		);
	return { sponsorsCreated, offersCreated };
}

function toOfferDto(
	row: typeof schema.sponsorOffer.$inferSelect,
	sponsorRow: typeof schema.sponsor.$inferSelect
): SponsorOfferDto {
	const category = assertCategory(sponsorRow.category);
	const slotType = assertSlotType(sponsorRow.slotType);
	const fit = parseObject(row.fitPayload, 'Sponsor fit payload');
	const score = fit.score;
	if (typeof score !== 'number')
		throw new SponsorError('Sponsor fit score is invalid.', 'MIGRATION_FAILED');
	if (!['available', 'accepted', 'declined', 'expired'].includes(row.status)) {
		throw new SponsorError(`Unknown sponsor offer status: ${row.status}.`, 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		sponsor: {
			id: sponsorRow.id,
			code: sponsorRow.code,
			name: sponsorRow.name,
			category,
			slotType,
			priorityTags: sponsorPriorityTags(sponsorRow)
		},
		status: row.status as SponsorOfferDto['status'],
		availableFrom: row.availableFrom,
		expiresAt: row.expiresAt,
		termSeasons: row.termSeasons,
		annualBasePaymentMinor: row.annualBasePaymentMinor,
		signingBonusMinor: row.signingBonusMinor,
		performanceBonusMinor: row.performanceBonusMinor,
		target: parseObject(row.targetPayload, 'Sponsor target payload'),
		obligation: parseObject(row.obligationPayload, 'Sponsor obligation payload'),
		fit: {
			score,
			factors: toFitFactors(fit.factors),
			deferredFactors: Array.isArray(fit.deferredFactors)
				? fit.deferredFactors.filter((value): value is string => typeof value === 'string')
				: []
		}
	};
}

function toContractDto(
	row: typeof schema.sponsorContract.$inferSelect,
	sponsorRow: typeof schema.sponsor.$inferSelect
): SponsorContractDto {
	const status = row.status === 'active' || row.status === 'expired' ? row.status : null;
	if (!status)
		throw new SponsorError(`Unknown sponsor contract status: ${row.status}.`, 'MIGRATION_FAILED');
	const fit = parseObject(row.fitPayload, 'Sponsor fit payload');
	if (typeof fit.score !== 'number') {
		throw new SponsorError('Sponsor contract fit score is invalid.', 'MIGRATION_FAILED');
	}
	return {
		id: row.id,
		offerId: row.offerId,
		sponsor: {
			id: sponsorRow.id,
			code: sponsorRow.code,
			name: sponsorRow.name,
			category: assertCategory(row.category),
			slotType: assertSlotType(row.slotType)
		},
		status,
		startDate: row.startDate,
		endDate: row.endDate,
		renewalWindowStartDate: row.renewalWindowStartDate,
		termSeasons: row.termSeasons,
		annualBasePaymentMinor: row.annualBasePaymentMinor,
		signingBonusMinor: row.signingBonusMinor,
		performanceBonusMinor: row.performanceBonusMinor,
		target: parseObject(row.targetPayload, 'Sponsor target payload'),
		obligation: parseObject(row.obligationPayload, 'Sponsor obligation payload'),
		fitScore: fit.score,
		signedAt: row.signedAt
	};
}

async function buildDashboard(
	tx: Transaction,
	context: PlayerSponsorContext
): Promise<SponsorDashboardDto> {
	const offerRows = await tx
		.select({ offer: schema.sponsorOffer, sponsor: schema.sponsor })
		.from(schema.sponsorOffer)
		.innerJoin(schema.sponsor, eq(schema.sponsorOffer.sponsorId, schema.sponsor.id))
		.where(
			and(
				eq(schema.sponsorOffer.teamSeasonEntryId, context.teamSeasonEntryId),
				eq(schema.sponsorOffer.status, 'available')
			)
		)
		.orderBy(asc(schema.sponsor.category), asc(schema.sponsor.slotType), asc(schema.sponsor.name));
	const contractRows = await tx
		.select({ contract: schema.sponsorContract, sponsor: schema.sponsor })
		.from(schema.sponsorContract)
		.innerJoin(schema.sponsor, eq(schema.sponsorContract.sponsorId, schema.sponsor.id))
		.where(eq(schema.sponsorContract.teamSeasonEntryId, context.teamSeasonEntryId))
		.orderBy(asc(schema.sponsorContract.category), asc(schema.sponsorContract.slotType));
	const currentSponsors = contractRows.map((row) => toContractDto(row.contract, row.sponsor));
	const activeContracts = currentSponsors.filter((contract) => contract.status === 'active');
	return {
		worldDate: context.worldDate,
		teamSeasonEntryId: context.teamSeasonEntryId,
		team: { id: context.teamId, name: context.teamName, shortName: context.teamShortName },
		championship: {
			code: context.championshipCode,
			name: context.championshipName,
			seasonYear: context.seasonYear
		},
		currentSponsors,
		offers: offerRows.map((row) => toOfferDto(row.offer, row.sponsor)),
		slots: SPONSOR_CATEGORIES.map((category) => ({
			category,
			primaryAvailable: !activeContracts.some(
				(contract) =>
					contract.sponsor.category === category && contract.sponsor.slotType === 'primary'
			),
			supportingSlotsRemaining: Math.max(
				0,
				MAX_SUPPORTING_SPONSORS_PER_CATEGORY -
					activeContracts.filter(
						(contract) =>
							contract.sponsor.category === category && contract.sponsor.slotType === 'supporting'
					).length
			)
		}))
	};
}

export async function getSponsorDashboard(db: Database): Promise<SponsorDashboardDto> {
	return db.transaction(async (tx) => {
		const context = await getPlayerSponsorContext(tx);
		await ensureSponsorMarket(tx, { now: new Date().toISOString() });
		await tx
			.update(schema.sponsorContract)
			.set({ status: 'expired', updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(schema.sponsorContract.teamSeasonEntryId, context.teamSeasonEntryId),
					eq(schema.sponsorContract.status, 'active'),
					lt(schema.sponsorContract.endDate, context.worldDate)
				)
			);
		return buildDashboard(tx, context);
	});
}

export async function acceptSponsorOffer(
	db: Database,
	offerId: string
): Promise<SponsorAcceptOfferResult> {
	if (!offerId.trim()) throw new SponsorError('offerId is required.');
	const result = await db.transaction(async (tx) => {
		const context = await getPlayerSponsorContext(tx);
		const now = new Date().toISOString();
		await ensureSponsorMarket(tx, { now });
		await tx
			.update(schema.sponsorContract)
			.set({ status: 'expired', updatedAt: now })
			.where(
				and(
					eq(schema.sponsorContract.teamSeasonEntryId, context.teamSeasonEntryId),
					eq(schema.sponsorContract.status, 'active'),
					lt(schema.sponsorContract.endDate, context.worldDate)
				)
			);
		const rows = await tx
			.select({ offer: schema.sponsorOffer, sponsor: schema.sponsor })
			.from(schema.sponsorOffer)
			.innerJoin(schema.sponsor, eq(schema.sponsorOffer.sponsorId, schema.sponsor.id))
			.where(eq(schema.sponsorOffer.id, offerId))
			.limit(1);
		const row = rows[0];
		if (!row) throw new SponsorError('Sponsor offer was not found.', 'CONFLICT');
		if (row.offer.teamSeasonEntryId !== context.teamSeasonEntryId) {
			throw new SponsorError('Sponsor offer does not belong to the player team.', 'CONFLICT');
		}
		if (row.offer.status === 'accepted') {
			const contracts = await tx
				.select()
				.from(schema.sponsorContract)
				.where(eq(schema.sponsorContract.offerId, offerId))
				.limit(1);
			if (!contracts[0])
				throw new SponsorError('Accepted sponsor offer has no contract.', 'MIGRATION_FAILED');
			return { contractId: contracts[0].id, idempotent: true };
		}
		if (row.offer.status !== 'available') {
			throw new SponsorError(`Sponsor offer is not available: ${row.offer.status}.`, 'CONFLICT');
		}
		if (row.offer.expiresAt < context.worldDate) {
			await tx
				.update(schema.sponsorOffer)
				.set({ status: 'expired', updatedAt: now })
				.where(eq(schema.sponsorOffer.id, offerId));
			throw new SponsorError('Sponsor offer has expired.', 'CONFLICT');
		}
		const category = assertCategory(row.sponsor.category);
		const slotType = assertSlotType(row.sponsor.slotType);
		const activeContracts = await tx
			.select({
				category: schema.sponsorContract.category,
				slotType: schema.sponsorContract.slotType
			})
			.from(schema.sponsorContract)
			.where(
				and(
					eq(schema.sponsorContract.teamSeasonEntryId, context.teamSeasonEntryId),
					eq(schema.sponsorContract.status, 'active')
				)
			);
		if (
			slotType === 'primary' &&
			activeContracts.some(
				(contract) => contract.category === category && contract.slotType === slotType
			)
		) {
			throw new SponsorError(
				`The ${category} primary sponsor slot is already occupied.`,
				'CONFLICT'
			);
		}
		if (
			slotType === 'supporting' &&
			activeContracts.filter(
				(contract) => contract.category === category && contract.slotType === slotType
			).length >= MAX_SUPPORTING_SPONSORS_PER_CATEGORY
		) {
			throw new SponsorError(`The ${category} supporting sponsor slots are full.`, 'CONFLICT');
		}
		const startDate = context.worldDate;
		const endDate = addContractYears(startDate, row.offer.termSeasons);
		const contractId = `${offerId}:contract`;
		await tx.insert(schema.sponsorContract).values({
			id: contractId,
			offerId,
			teamSeasonEntryId: context.teamSeasonEntryId,
			sponsorId: row.offer.sponsorId,
			category,
			slotType,
			status: 'active',
			startDate,
			endDate,
			renewalWindowStartDate: subtractDays(endDate, 60, startDate),
			termSeasons: row.offer.termSeasons,
			annualBasePaymentMinor: row.offer.annualBasePaymentMinor,
			signingBonusMinor: row.offer.signingBonusMinor,
			performanceBonusMinor: row.offer.performanceBonusMinor,
			targetPayload: row.offer.targetPayload,
			obligationPayload: row.offer.obligationPayload,
			fitPayload: row.offer.fitPayload,
			signedAt: now,
			createdAt: now,
			updatedAt: now
		});
		await postFinanceTransaction(tx, {
			accountId: `${context.teamSeasonEntryId}:finance`,
			worldDate: context.worldDate,
			postedAt: now,
			transactionType: 'income',
			category: 'sponsorship',
			amountMinor: row.offer.signingBonusMinor,
			currencyCode: 'USD',
			sourceType: 'sponsor_contract',
			sourceId: contractId,
			idempotencyKey: `${contractId}:signing-bonus`,
			description: `Sponsor signing bonus: ${row.sponsor.name}`
		});
		await tx
			.update(schema.sponsorOffer)
			.set({ status: 'accepted', updatedAt: now })
			.where(eq(schema.sponsorOffer.id, offerId));
		return { contractId, idempotent: false };
	});
	const dashboard = await getSponsorDashboard(db);
	const contract = dashboard.currentSponsors.find(
		(candidate) => candidate.id === result.contractId
	);
	if (!contract)
		throw new SponsorError('Accepted sponsor contract was not found.', 'MIGRATION_FAILED');
	return { contract, dashboard, idempotent: result.idempotent };
}
