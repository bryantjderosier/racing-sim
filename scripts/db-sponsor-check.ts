import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acceptSponsorOffer, getSponsorDashboard } from '../electron/db/sponsor-service.js';
import { listFinanceTransactions, runDailyFinance } from '../electron/db/finance-service.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-sponsor-check-'));
const savePath = join(tempDir, 'sponsors.sqlite');
const now = '2030-03-01T00:00:00.000Z';
const teamSeasonEntryId = BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].id;

try {
	const created = await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Sponsor Check',
		gameVersion: '0.0.1',
		worldDate: '2030-03-01',
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
		const initial = await getSponsorDashboard(save.db);
		assert.equal(initial.teamSeasonEntryId, teamSeasonEntryId);
		assert.equal(initial.currentSponsors.length, 0);
		assert.equal(initial.offers.length, 8);
		console.table(
			initial.offers.map((offer) => ({
				sponsor: offer.sponsor.name,
				category: offer.sponsor.category,
				slot: offer.sponsor.slotType,
				fit: offer.fit.score,
				annualBaseMinor: offer.annualBasePaymentMinor,
				bonusMinor: offer.signingBonusMinor,
				termSeasons: offer.termSeasons
			}))
		);

		const offer = initial.offers.find(
			(candidate) =>
				candidate.sponsor.category === 'title' && candidate.sponsor.slotType === 'primary'
		);
		assert.ok(offer);
		const accepted = await acceptSponsorOffer(save.db, offer.id);
		assert.equal(accepted.idempotent, false);
		assert.equal(accepted.contract.sponsor.id, offer.sponsor.id);

		const replay = await acceptSponsorOffer(save.db, offer.id);
		assert.equal(replay.idempotent, true);
		assert.equal(replay.contract.id, accepted.contract.id);

		const daily = await save.db.transaction((tx) =>
			runDailyFinance(tx, {
				saveId: created.saveId,
				worldDate: '2030-03-02',
				now: '2030-03-02T00:00:00.000Z'
			})
		);
		assert.equal(daily.transactionsPosted, 1);
		const dailyReplay = await save.db.transaction((tx) =>
			runDailyFinance(tx, {
				saveId: created.saveId,
				worldDate: '2030-03-02',
				now: '2030-03-02T00:00:00.000Z'
			})
		);
		assert.deepEqual(dailyReplay, daily);

		const dashboard = await getSponsorDashboard(save.db);
		assert.equal(dashboard.currentSponsors.length, 1);
		assert.equal(
			dashboard.slots.find((slot) => slot.category === 'title')?.primaryAvailable,
			false
		);
		const transactions = await listFinanceTransactions(save.db, teamSeasonEntryId);
		assert.equal(transactions.length, 3);
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
			`Sponsor valid: ${dashboard.currentSponsors.length} contract, ${dashboard.offers.length} remaining offers, recurring income, and idempotent acceptance passed.`
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
