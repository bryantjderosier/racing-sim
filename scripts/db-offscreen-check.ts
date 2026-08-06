import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOffscreenChampionshipEvent } from '../electron/db/offscreen-race-service.js';
import { advanceCalendarDay } from '../electron/db/calendar-service.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import * as schema from '../electron/db/schema.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-offscreen-check-'));
const savePath = join(tempDir, 'offscreen.sqlite');
const now = '2030-03-20T00:00:00.000Z';
const playerTeamId = 'offscreen-check-player-team';

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Off-screen Check',
		gameVersion: '0.0.1',
		worldDate: '2030-03-15',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK,
		now: '2030-01-01T00:00:00.000Z'
	});

	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		await save.db.insert(schema.team).values({
			id: playerTeamId,
			code: 'OFFSCREEN',
			name: 'Off-screen Check Team',
			shortName: 'OFF',
			nationalityId: FOUNDATION_NATIONALITIES[0].id,
			createdAt: now
		});
		await save.db.update(schema.saveGame).set({ playerTeamId });
		await save.db
			.update(schema.championshipSeasonRuleset)
			.set({ refuelingEnabled: false })
			.where(eq(schema.championshipSeasonRuleset.id, BASE_CONTENT_PACK.foundation.ruleset.id));

		const eventId = BASE_CONTENT_PACK.foundation.events[0].id;
		const calendar = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-15',
			now
		});
		assert.equal(calendar.status, 'advanced');
		assert.equal(calendar.offscreenWeekendsResolved, 1);
		assert.equal(calendar.toWorldDate, '2030-03-16');
		assert.equal((await save.db.select().from(schema.sessionResult)).length, 100);
		assert.equal((await save.db.select().from(schema.officialWeekendResultPackage)).length, 1);

		const replay = await runOffscreenChampionshipEvent(save.db, eventId, { now });
		assert.equal(replay.sessionsResolved, 0);
		assert.equal(replay.sessionsReplayed, 5);
		assert.equal(replay.settlement.idempotent, true);
		assert.equal((await save.db.select().from(schema.sessionResult)).length, 100);

		console.log(
			`Off-screen race valid: ${calendar.offscreenWeekendsResolved} weekend resolved through the calendar, official package settled, and idempotent replay passed.`
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
