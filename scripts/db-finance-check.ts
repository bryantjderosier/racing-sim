import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	DEFAULT_OPENING_BALANCE_MINOR,
	FinanceError,
	getFinanceAccount,
	listFinanceTransactions,
	postFinanceTransaction,
	runDailyFinance
} from '../electron/db/finance-service.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-finance-check-'));
const savePath = join(tempDir, 'finance.sqlite');
const now = '2030-03-10T00:00:00.000Z';
const teamSeasonEntryId = BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].id;
const accountId = `${teamSeasonEntryId}:finance`;

try {
	const created = await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Finance Check',
		gameVersion: '0.0.1',
		worldDate: '2030-03-10',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK,
		now
	});

	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		const account = await getFinanceAccount(save.db, teamSeasonEntryId);
		assert.equal(account?.currentBalanceMinor, DEFAULT_OPENING_BALANCE_MINOR);

		await save.db.insert(schema.supplyContract).values({
			id: 'finance-check-supply',
			teamSeasonEntryId,
			supplierTeamId: FOUNDATION_FDC_TEAMS[1].id,
			partCategory: 'aero',
			contractTier: 'tier_3',
			startDate: '2030-03-10',
			endDate: '2030-03-20',
			annualCostMinor: 36_500,
			currencyCode: 'USD'
		});
		const driverSeat = BASE_CONTENT_PACK.foundation.seatAssignments.find(
			(seat) => seat.teamSeasonEntryId === teamSeasonEntryId
		);
		assert.ok(driverSeat);
		await save.db.insert(schema.driverContract).values({
			id: 'finance-check-driver',
			driverId: driverSeat.driverId,
			teamId: FOUNDATION_FDC_TEAMS[0].id,
			offScreenSeriesId: null,
			isVirtualOffScreen: false,
			wagePerYearMinor: 73_000,
			signingBonusMinor: 0,
			breakClauseFeeMinor: 0,
			currencyCode: 'USD',
			startDate: '2030-03-10',
			endDate: '2030-03-20',
			terminatedDate: null
		});

		const daily = await save.db.transaction((tx) =>
			runDailyFinance(tx, {
				saveId: created.saveId,
				worldDate: '2030-03-11',
				now: '2030-03-11T00:00:00.000Z'
			})
		);
		assert.equal(daily.transactionsPosted, 2);
		assert.equal(daily.expenseMinor, 300);
		const dailyReplay = await save.db.transaction((tx) =>
			runDailyFinance(tx, {
				saveId: created.saveId,
				worldDate: '2030-03-11',
				now: '2030-03-11T00:00:00.000Z'
			})
		);
		assert.deepEqual(dailyReplay, daily);

		await save.db.transaction((tx) =>
			postFinanceTransaction(tx, {
				accountId,
				worldDate: '2030-03-11',
				postedAt: '2030-03-11T01:00:00.000Z',
				transactionType: 'income',
				category: 'sponsorship',
				amountMinor: 2_500_000,
				sourceType: 'system',
				idempotencyKey: 'finance-check:sponsorship',
				description: 'Finance check sponsorship income'
			})
		);
		const debit = await save.db.transaction((tx) =>
			postFinanceTransaction(tx, {
				accountId,
				worldDate: '2030-03-11',
				postedAt: '2030-03-11T02:00:00.000Z',
				transactionType: 'expense',
				category: 'development',
				amountMinor: -125_000,
				sourceType: 'development_stage',
				idempotencyKey: 'finance-check:development',
				description: 'Finance check development expense'
			})
		);
		const debitReplay = await save.db.transaction((tx) =>
			postFinanceTransaction(tx, {
				accountId,
				worldDate: '2030-03-11',
				postedAt: '2030-03-11T02:00:00.000Z',
				transactionType: 'expense',
				category: 'development',
				amountMinor: -125_000,
				sourceType: 'development_stage',
				idempotencyKey: 'finance-check:development',
				description: 'Finance check development expense'
			})
		);
		assert.equal(debitReplay.idempotent, true);
		assert.equal(debitReplay.transaction.id, debit.transaction.id);

		await assert.rejects(
			() =>
				save.db.transaction((tx) =>
					postFinanceTransaction(tx, {
						accountId,
						worldDate: '2030-03-11',
						postedAt: '2030-03-11T03:00:00.000Z',
						transactionType: 'expense',
						category: 'invalid',
						amountMinor: -200_000_000,
						sourceType: 'system',
						idempotencyKey: 'finance-check:overdraft',
						description: 'Finance check overdraft'
					})
				),
			(error: unknown) => error instanceof FinanceError && error.code === 'INSUFFICIENT_FUNDS'
		);

		const finalAccount = await getFinanceAccount(save.db, teamSeasonEntryId);
		assert.equal(finalAccount?.currentBalanceMinor, 102_374_700);
		const transactions = await listFinanceTransactions(save.db, teamSeasonEntryId);
		assert.equal(transactions.length, 5);
		console.table(
			transactions.map((transaction) => ({
				date: transaction.worldDate,
				category: transaction.category,
				amountMinor: transaction.amountMinor,
				balanceMinor: transaction.balanceAfterMinor,
				description: transaction.description
			}))
		);
		console.log(
			`Finance valid: ${transactions.length} transactions, recurring charges, idempotency, and overdraft protection passed.`
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
