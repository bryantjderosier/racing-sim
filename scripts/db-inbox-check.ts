import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advanceCalendarDay } from '../electron/db/calendar-service.js';
import {
	applyInboxAction,
	listInboxActions,
	listInboxMessages
} from '../electron/db/inbox-service.js';
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

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-inbox-check-'));
const savePath = join(tempDir, 'inbox.sqlite');
const now = '2030-03-13T00:00:00.000Z';

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Inbox Check',
		gameVersion: '0.0.1',
		worldDate: '2030-03-13',
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
		const playerTeamSeasonEntryId = BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].id;
		const account = (
			await save.db
				.select()
				.from(schema.financeAccount)
				.where(eq(schema.financeAccount.teamSeasonEntryId, playerTeamSeasonEntryId))
				.limit(1)
		)[0];
		assert.ok(account);
		await save.db
			.update(schema.financeAccount)
			.set({ currentBalanceMinor: 1_000 })
			.where(eq(schema.financeAccount.teamSeasonEntryId, playerTeamSeasonEntryId));

		const first = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(first.status, 'advanced');
		assert.equal(first.dailyInbox?.messagesCreated, 5);
		assert.equal(first.dailyInbox?.severityCounts.urgent, 2);

		const messages = await listInboxMessages(save.db);
		assert.equal(messages.length, 5);
		assert.equal(messages.filter((message) => message.status === 'unread').length, 5);
		const financeMessage = messages.find((message) => message.category === 'finance');
		assert.equal(financeMessage?.priority, 85);
		const worldMessage = messages.find((message) => message.sourceType === 'ai_world');
		assert.equal(worldMessage?.severity, 'urgent');
		assert.ok(financeMessage);
		assert.ok(worldMessage);

		const readResult = await applyInboxAction(save.db, {
			messageId: financeMessage.id,
			actionType: 'read',
			idempotencyKey: 'inbox-check-read-finance',
			now
		});
		assert.equal(readResult.message.status, 'read');
		assert.equal(readResult.action?.nextStatus, 'read');
		const readReplay = await applyInboxAction(save.db, {
			messageId: financeMessage.id,
			actionType: 'read',
			idempotencyKey: 'inbox-check-read-finance',
			now
		});
		assert.equal(readReplay.idempotent, true);
		assert.equal(readReplay.action?.id, readResult.action?.id);

		const deferResult = await applyInboxAction(save.db, {
			messageId: worldMessage.id,
			actionType: 'defer',
			deferredUntilWorldDate: '2030-03-16',
			idempotencyKey: 'inbox-check-defer-world',
			now
		});
		assert.equal(deferResult.message.status, 'deferred');
		assert.equal(deferResult.message.deferredUntilWorldDate, '2030-03-16');

		await applyInboxAction(save.db, {
			messageId: financeMessage.id,
			actionType: 'resolve',
			idempotencyKey: 'inbox-check-resolve-finance',
			now
		});
		await applyInboxAction(save.db, {
			messageId: worldMessage.id,
			actionType: 'archive',
			idempotencyKey: 'inbox-check-archive-world',
			now
		});

		const blockingMessageId = 'inbox-check-blocking-message';
		await save.db.insert(schema.inboxMessage).values({
			id: blockingMessageId,
			worldDate: '2030-03-14',
			category: 'world',
			severity: 'blocking',
			status: 'unread',
			priority: 100,
			title: 'Required roster decision',
			body: 'A required roster decision must be resolved.',
			sourceType: 'inbox_check',
			sourceId: blockingMessageId,
			dedupeKey: blockingMessageId,
			requiresDecision: true,
			isBlocking: true,
			deadlineWorldDate: null,
			deferredUntilWorldDate: null,
			createdAt: now,
			readAt: null,
			resolvedAt: null
		});
		const blocked = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-14',
			now
		});
		assert.equal(blocked.status, 'blocked');
		assert.equal(blocked.blockCode, 'inbox_decision_required');
		const resolvedBlocking = await applyInboxAction(save.db, {
			messageId: blockingMessageId,
			actionType: 'resolve',
			idempotencyKey: 'inbox-check-resolve-blocking',
			now
		});
		assert.equal(resolvedBlocking.message.status, 'resolved');
		const released = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-14',
			now
		});
		assert.equal(released.status, 'advanced');
		assert.equal(released.toWorldDate, '2030-03-15');
		const weekendBlocked = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-15',
			now
		});
		assert.equal(weekendBlocked.status, 'blocked');
		assert.equal(weekendBlocked.blockCode, 'weekend_start_required');
		assert.equal(
			(await listInboxMessages(save.db, { unresolvedOnly: true, worldDate: '2030-03-14' })).length,
			3
		);
		assert.equal((await listInboxActions(save.db)).length, 5);

		const replay = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(replay.status, 'idempotent');
		assert.equal(replay.dailyInbox, null);
		assert.equal((await listInboxMessages(save.db)).length, 8);

		console.table(
			messages.map((message) => ({
				date: message.worldDate,
				category: message.category,
				severity: message.severity,
				priority: message.priority,
				status: message.status,
				title: message.title
			}))
		);
		console.log(
			'Inbox valid: prioritization, lifecycle actions, action history, decision blocking, and idempotent replay passed.'
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
