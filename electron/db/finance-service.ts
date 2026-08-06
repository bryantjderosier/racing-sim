import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { FinanceSummaryDto } from '../ipc-contract.js';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const FINANCE_SCHEMA_VERSION = 'finance-v1';
export const FINANCE_CURRENCY_CODE = 'USD';
export const DEFAULT_OPENING_BALANCE_MINOR = 100_000_000;
export const DEFAULT_BUDGET_CAP_MINOR = 135_000_000;

export type FinanceSourceType =
	| 'system'
	| 'development_stage'
	| 'development_completion'
	| 'driver_contract'
	| 'supply_contract'
	| 'sponsor_contract';

export interface FinanceAccountDto {
	id: string;
	teamSeasonEntryId: string;
	currencyCode: string;
	openingBalanceMinor: number;
	currentBalanceMinor: number;
	budgetCapMinor: number;
	createdAt: string;
	updatedAt: string;
}

export interface FinanceTransactionDto {
	id: string;
	accountId: string;
	worldDate: string;
	postedAt: string;
	transactionType: string;
	category: string;
	amountMinor: number;
	currencyCode: string;
	sourceType: string;
	sourceId: string | null;
	idempotencyKey: string;
	description: string;
	balanceAfterMinor: number;
}

export interface PostFinanceTransactionInput {
	accountId: string;
	worldDate: string;
	postedAt: string;
	transactionType: string;
	category: string;
	amountMinor: number;
	currencyCode?: string;
	sourceType: FinanceSourceType;
	sourceId?: string | null;
	idempotencyKey: string;
	description: string;
}

export interface PostFinanceTransactionResult {
	transaction: FinanceTransactionDto;
	idempotent: boolean;
}

export interface DailyFinanceResult {
	phase: 'finance';
	worldDate: string;
	transactionsPosted: number;
	incomeMinor: number;
	expenseMinor: number;
	completedSourceIds: string[];
}

export class FinanceError extends Error {
	readonly code:
		| 'FINANCE_ACCOUNT_MISSING'
		| 'INSUFFICIENT_FUNDS'
		| 'INVALID_COMMAND'
		| 'MIGRATION_FAILED'
		| 'CONFLICT';

	constructor(message: string, code: FinanceError['code'] = 'INVALID_COMMAND') {
		super(message);
		this.name = 'FinanceError';
		this.code = code;
	}
}

function accountId(teamSeasonEntryId: string): string {
	return `${teamSeasonEntryId}:finance`;
}

function assertMoney(value: number, label: string, allowZero = false): void {
	if (!Number.isSafeInteger(value) || (!allowZero && value === 0) || (allowZero && value < 0)) {
		throw new FinanceError(`${label} must be a valid safe integer.`);
	}
}

function dailyContractCharge(annualCostMinor: number): number {
	assertMoney(annualCostMinor, 'Annual contract cost', true);
	if (annualCostMinor === 0) return 0;
	return -Math.max(1, Math.round(annualCostMinor / 365));
}

function dailyContractIncome(annualIncomeMinor: number): number {
	assertMoney(annualIncomeMinor, 'Annual contract income', true);
	if (annualIncomeMinor === 0) return 0;
	return Math.max(1, Math.round(annualIncomeMinor / 365));
}

function toAccountDto(row: typeof schema.financeAccount.$inferSelect): FinanceAccountDto {
	return {
		id: row.id,
		teamSeasonEntryId: row.teamSeasonEntryId,
		currencyCode: row.currencyCode,
		openingBalanceMinor: row.openingBalanceMinor,
		currentBalanceMinor: row.currentBalanceMinor,
		budgetCapMinor: row.budgetCapMinor,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function toTransactionDto(
	row: typeof schema.financeTransaction.$inferSelect
): FinanceTransactionDto {
	return {
		id: row.id,
		accountId: row.accountId,
		worldDate: row.worldDate,
		postedAt: row.postedAt,
		transactionType: row.transactionType,
		category: row.category,
		amountMinor: row.amountMinor,
		currencyCode: row.currencyCode,
		sourceType: row.sourceType,
		sourceId: row.sourceId,
		idempotencyKey: row.idempotencyKey,
		description: row.description,
		balanceAfterMinor: row.balanceAfterMinor
	};
}

export async function ensureFinanceAccounts(
	tx: Transaction,
	options: {
		now: string;
		worldDate?: string;
		currencyCode?: string;
		openingBalanceMinor?: number;
		budgetCapMinor?: number;
	}
): Promise<number> {
	const currencyCode = options.currencyCode ?? FINANCE_CURRENCY_CODE;
	const openingBalanceMinor = options.openingBalanceMinor ?? DEFAULT_OPENING_BALANCE_MINOR;
	const budgetCapMinor = options.budgetCapMinor ?? DEFAULT_BUDGET_CAP_MINOR;
	const worldDate = options.worldDate ?? options.now.slice(0, 10);
	assertMoney(openingBalanceMinor, 'Opening balance', true);
	assertMoney(budgetCapMinor, 'Budget cap', true);

	const entries = await tx
		.select({ id: schema.teamSeasonEntry.id })
		.from(schema.teamSeasonEntry)
		.orderBy(asc(schema.teamSeasonEntry.id));
	let created = 0;
	for (const entry of entries) {
		const id = accountId(entry.id);
		const existing = await tx
			.select({ id: schema.financeAccount.id })
			.from(schema.financeAccount)
			.where(eq(schema.financeAccount.id, id))
			.limit(1);
		if (existing[0]) continue;

		await tx.insert(schema.financeAccount).values({
			id,
			teamSeasonEntryId: entry.id,
			currencyCode,
			openingBalanceMinor,
			currentBalanceMinor: openingBalanceMinor,
			budgetCapMinor,
			createdAt: options.now,
			updatedAt: options.now
		});
		await tx.insert(schema.financeTransaction).values({
			id: `${id}:opening`,
			accountId: id,
			worldDate,
			postedAt: options.now,
			transactionType: 'opening_balance',
			category: 'capital',
			amountMinor: openingBalanceMinor,
			currencyCode,
			sourceType: 'system',
			sourceId: null,
			idempotencyKey: `${id}:opening`,
			description: 'Season opening balance',
			balanceAfterMinor: openingBalanceMinor
		});
		created += 1;
	}
	return created;
}

async function readAccount(
	tx: Transaction,
	accountIdValue: string
): Promise<typeof schema.financeAccount.$inferSelect> {
	const rows = await tx
		.select()
		.from(schema.financeAccount)
		.where(eq(schema.financeAccount.id, accountIdValue))
		.limit(1);
	const account = rows[0];
	if (!account)
		throw new FinanceError(
			`Finance account is missing: ${accountIdValue}.`,
			'FINANCE_ACCOUNT_MISSING'
		);
	return account;
}

export async function postFinanceTransaction(
	tx: Transaction,
	input: PostFinanceTransactionInput
): Promise<PostFinanceTransactionResult> {
	assertMoney(input.amountMinor, 'Transaction amount');
	if (!input.idempotencyKey.trim()) throw new FinanceError('Idempotency key is required.');
	if (!input.description.trim()) throw new FinanceError('Transaction description is required.');

	const existing = await tx
		.select()
		.from(schema.financeTransaction)
		.where(eq(schema.financeTransaction.idempotencyKey, input.idempotencyKey))
		.limit(1);
	if (existing[0]) {
		if (
			existing[0].accountId !== input.accountId ||
			existing[0].amountMinor !== input.amountMinor ||
			existing[0].currencyCode !== (input.currencyCode ?? FINANCE_CURRENCY_CODE)
		) {
			throw new FinanceError(
				`Finance idempotency key was reused with different transaction values: ${input.idempotencyKey}.`,
				'CONFLICT'
			);
		}
		return { transaction: toTransactionDto(existing[0]), idempotent: true };
	}

	const currencyCode = input.currencyCode ?? FINANCE_CURRENCY_CODE;
	const account = await readAccount(tx, input.accountId);
	if (account.currencyCode !== currencyCode) {
		throw new FinanceError(`Currency mismatch for finance account ${input.accountId}.`, 'CONFLICT');
	}
	const nextBalance = account.currentBalanceMinor + input.amountMinor;
	if (nextBalance < 0) {
		throw new FinanceError(
			`Transaction would overdraw finance account ${input.accountId}.`,
			'INSUFFICIENT_FUNDS'
		);
	}

	const row = {
		id: `finance:${input.idempotencyKey}`,
		accountId: input.accountId,
		worldDate: input.worldDate,
		postedAt: input.postedAt,
		transactionType: input.transactionType,
		category: input.category,
		amountMinor: input.amountMinor,
		currencyCode,
		sourceType: input.sourceType,
		sourceId: input.sourceId ?? null,
		idempotencyKey: input.idempotencyKey,
		description: input.description,
		balanceAfterMinor: nextBalance
	};
	await tx.insert(schema.financeTransaction).values(row);
	await tx
		.update(schema.financeAccount)
		.set({ currentBalanceMinor: nextBalance, updatedAt: input.postedAt })
		.where(eq(schema.financeAccount.id, input.accountId));
	return { transaction: toTransactionDto(row), idempotent: false };
}

export async function getFinanceAccount(
	db: Database,
	teamSeasonEntryId: string
): Promise<FinanceAccountDto | null> {
	const rows = await db
		.select()
		.from(schema.financeAccount)
		.where(eq(schema.financeAccount.teamSeasonEntryId, teamSeasonEntryId))
		.limit(1);
	return rows[0] ? toAccountDto(rows[0]) : null;
}

export async function listFinanceTransactions(
	db: Database,
	teamSeasonEntryId: string
): Promise<FinanceTransactionDto[]> {
	const rows = await db
		.select({ transaction: schema.financeTransaction })
		.from(schema.financeTransaction)
		.innerJoin(
			schema.financeAccount,
			eq(schema.financeTransaction.accountId, schema.financeAccount.id)
		)
		.where(eq(schema.financeAccount.teamSeasonEntryId, teamSeasonEntryId))
		.orderBy(
			asc(schema.financeTransaction.worldDate),
			asc(schema.financeTransaction.postedAt),
			asc(schema.financeTransaction.id)
		);
	return rows.map((row) => toTransactionDto(row.transaction));
}

export async function getPlayerFinanceSummary(db: Database): Promise<FinanceSummaryDto> {
	const playerRows = await db
		.select({ teamSeasonEntryId: schema.teamSeasonEntry.id })
		.from(schema.saveGame)
		.innerJoin(schema.team, eq(schema.saveGame.playerTeamId, schema.team.id))
		.innerJoin(schema.teamSeasonEntry, eq(schema.teamSeasonEntry.teamId, schema.team.id))
		.innerJoin(
			schema.championshipSeason,
			eq(schema.teamSeasonEntry.championshipSeasonId, schema.championshipSeason.id)
		)
		.orderBy(desc(schema.championshipSeason.seasonYear), asc(schema.teamSeasonEntry.id))
		.limit(1);
	const teamSeasonEntryId = playerRows[0]?.teamSeasonEntryId;
	if (!teamSeasonEntryId) {
		throw new FinanceError('Player finance account is missing.', 'FINANCE_ACCOUNT_MISSING');
	}
	const account = await getFinanceAccount(db, teamSeasonEntryId);
	if (!account) {
		throw new FinanceError(
			`Finance account is missing: ${teamSeasonEntryId}.`,
			'FINANCE_ACCOUNT_MISSING'
		);
	}
	return { account, transactions: await listFinanceTransactions(db, teamSeasonEntryId) };
}

function parseDailyResult(payload: string): DailyFinanceResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new FinanceError(
			`Daily finance result is invalid JSON: ${error instanceof Error ? error.message : String(error)}.`,
			'MIGRATION_FAILED'
		);
	}
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		(parsed as { phase?: unknown }).phase !== 'finance'
	) {
		throw new FinanceError('Daily finance result has an invalid shape.', 'MIGRATION_FAILED');
	}
	return parsed as DailyFinanceResult;
}

export async function runDailyFinance(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string }
): Promise<DailyFinanceResult> {
	const executionId = `${options.saveId}:daily:${options.worldDate}:finance`;
	const existing = await tx
		.select()
		.from(schema.dailyPhaseExecution)
		.where(eq(schema.dailyPhaseExecution.id, executionId))
		.limit(1);
	if (existing[0]?.status === 'completed') {
		if (existing[0].resultSchemaVersion !== FINANCE_SCHEMA_VERSION) {
			throw new FinanceError('Unsupported daily finance result version.', 'MIGRATION_FAILED');
		}
		return parseDailyResult(existing[0].resultPayload);
	}

	let transactionsPosted = 0;
	let incomeMinor = 0;
	let expenseMinor = 0;
	const completedSourceIds: string[] = [];
	const record = (result: PostFinanceTransactionResult, sourceId: string) => {
		if (!result.idempotent) transactionsPosted += 1;
		if (result.transaction.amountMinor > 0) incomeMinor += result.transaction.amountMinor;
		else expenseMinor += Math.abs(result.transaction.amountMinor);
		completedSourceIds.push(sourceId);
	};

	const supplyContracts = await tx
		.select({
			id: schema.supplyContract.id,
			teamSeasonEntryId: schema.supplyContract.teamSeasonEntryId,
			annualCostMinor: schema.supplyContract.annualCostMinor,
			currencyCode: schema.supplyContract.currencyCode
		})
		.from(schema.supplyContract)
		.where(
			and(
				lte(schema.supplyContract.startDate, options.worldDate),
				gte(schema.supplyContract.endDate, options.worldDate)
			)
		);
	for (const contract of supplyContracts) {
		const amountMinor = dailyContractCharge(contract.annualCostMinor);
		if (amountMinor === 0) continue;
		const result = await postFinanceTransaction(tx, {
			accountId: accountId(contract.teamSeasonEntryId),
			worldDate: options.worldDate,
			postedAt: options.now,
			transactionType: 'expense',
			category: 'supplier_contract',
			amountMinor,
			currencyCode: contract.currencyCode,
			sourceType: 'supply_contract',
			sourceId: contract.id,
			idempotencyKey: `${executionId}:supply:${contract.id}`,
			description: 'Daily supplier contract charge'
		});
		record(result, contract.id);
	}

	const driverContracts = await tx
		.select({
			id: schema.driverContract.id,
			driverId: schema.driverContract.driverId,
			teamSeasonEntryId: schema.seatAssignment.teamSeasonEntryId,
			wagePerYearMinor: schema.driverContract.wagePerYearMinor,
			currencyCode: schema.driverContract.currencyCode
		})
		.from(schema.driverContract)
		.innerJoin(
			schema.seatAssignment,
			and(
				eq(schema.seatAssignment.driverId, schema.driverContract.driverId),
				lte(schema.seatAssignment.startDate, options.worldDate),
				gte(schema.seatAssignment.endDate, options.worldDate)
			)
		)
		.where(
			and(
				lte(schema.driverContract.startDate, options.worldDate),
				gte(schema.driverContract.endDate, options.worldDate),
				isNull(schema.driverContract.terminatedDate)
			)
		);
	const chargedDriverContracts = new Set<string>();
	for (const contract of driverContracts) {
		if (!contract.teamSeasonEntryId) continue;
		const chargeKey = `${contract.id}:${contract.teamSeasonEntryId}`;
		if (chargedDriverContracts.has(chargeKey)) continue;
		chargedDriverContracts.add(chargeKey);
		const amountMinor = dailyContractCharge(contract.wagePerYearMinor);
		if (amountMinor === 0) continue;
		const result = await postFinanceTransaction(tx, {
			accountId: accountId(contract.teamSeasonEntryId),
			worldDate: options.worldDate,
			postedAt: options.now,
			transactionType: 'expense',
			category: 'driver_payroll',
			amountMinor,
			currencyCode: contract.currencyCode,
			sourceType: 'driver_contract',
			sourceId: contract.id,
			idempotencyKey: `${executionId}:driver:${chargeKey}`,
			description: `Daily driver payroll: ${contract.driverId}`
		});
		record(result, contract.id);
	}

	const sponsorContracts = await tx
		.select({
			id: schema.sponsorContract.id,
			teamSeasonEntryId: schema.sponsorContract.teamSeasonEntryId,
			sponsorId: schema.sponsorContract.sponsorId,
			annualBasePaymentMinor: schema.sponsorContract.annualBasePaymentMinor
		})
		.from(schema.sponsorContract)
		.where(
			and(
				eq(schema.sponsorContract.status, 'active'),
				lte(schema.sponsorContract.startDate, options.worldDate),
				gte(schema.sponsorContract.endDate, options.worldDate)
			)
		);
	for (const contract of sponsorContracts) {
		const amountMinor = dailyContractIncome(contract.annualBasePaymentMinor);
		if (amountMinor === 0) continue;
		const result = await postFinanceTransaction(tx, {
			accountId: accountId(contract.teamSeasonEntryId),
			worldDate: options.worldDate,
			postedAt: options.now,
			transactionType: 'income',
			category: 'sponsorship',
			amountMinor,
			currencyCode: FINANCE_CURRENCY_CODE,
			sourceType: 'sponsor_contract',
			sourceId: contract.id,
			idempotencyKey: `${executionId}:sponsor:${contract.id}`,
			description: `Daily sponsor income: ${contract.sponsorId}`
		});
		record(result, contract.id);
	}

	const result: DailyFinanceResult = {
		phase: 'finance',
		worldDate: options.worldDate,
		transactionsPosted,
		incomeMinor,
		expenseMinor,
		completedSourceIds
	};
	const stored = {
		status: 'completed',
		resultPayload: JSON.stringify(result),
		resultSchemaVersion: FINANCE_SCHEMA_VERSION,
		completedAt: options.now
	};
	if (existing[0]) {
		await tx
			.update(schema.dailyPhaseExecution)
			.set(stored)
			.where(eq(schema.dailyPhaseExecution.id, executionId));
	} else {
		await tx.insert(schema.dailyPhaseExecution).values({
			id: executionId,
			worldDate: options.worldDate,
			phase: 'finance',
			...stored,
			createdAt: options.now
		});
	}
	return result;
}
