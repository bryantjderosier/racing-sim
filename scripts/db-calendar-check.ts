import { strict as assert } from 'node:assert';
import { asc, eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advanceCalendarDay } from '../electron/db/calendar-service.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import * as schema from '../electron/db/schema.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-calendar-check-'));
const savePath = join(tempDir, 'calendar.sqlite');
const now = '2030-03-13T00:00:00.000Z';

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Calendar Check',
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
		const firstDriver = (
			await save.db
				.select()
				.from(schema.driverHealth)
				.orderBy(asc(schema.driverHealth.driverId))
				.limit(1)
		)[0];
		assert.ok(firstDriver);
		await save.db
			.update(schema.driverHealth)
			.set({ injurySeverity: 'minor', injuryDaysRemaining: 2, fatigue: 10 })
			.where(eq(schema.driverHealth.driverId, firstDriver.driverId));

		const first = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(first.status, 'advanced');
		assert.equal(first.toWorldDate, '2030-03-14');
		assert.equal(first.requiresWeekendStart, false);
		assert.equal(first.dailyMaintenance?.driversRecovered, 1);
		assert.equal(first.dailyMaintenance?.injuriesResolved, 0);

		const replay = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(replay.status, 'idempotent');
		assert.equal(replay.transitionId, first.transitionId);

		const eventDate = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-14',
			now
		});
		assert.equal(eventDate.status, 'advanced');
		assert.equal(eventDate.toWorldDate, '2030-03-15');
		assert.equal(eventDate.requiresWeekendStart, true);
		assert.equal(eventDate.weekendSessionId, 'fdc-event-2030-01-fp1-runtime');
		assert.equal(eventDate.dailyMaintenance?.injuriesResolved, 1);
		const recoveredDriver = (
			await save.db
				.select()
				.from(schema.driverHealth)
				.where(eq(schema.driverHealth.driverId, firstDriver.driverId))
		)[0];
		assert.equal(recoveredDriver?.fatigue, 8);
		assert.equal(recoveredDriver?.injuryDaysRemaining, 0);
		assert.equal(recoveredDriver?.injurySeverity, 'healthy');

		const blocked = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-15',
			now
		});
		assert.equal(blocked.status, 'blocked');
		assert.equal(blocked.blockCode, 'weekend_start_required');
		assert.equal(blocked.savedWorldDate, '2030-03-15');

		await save.db
			.update(schema.weekendSession)
			.set({ status: 'live' })
			.where(eq(schema.weekendSession.id, 'fdc-event-2030-01-fp1-runtime'));
		const activeBlocked = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-15',
			now
		});
		assert.equal(activeBlocked.status, 'blocked');
		assert.equal(activeBlocked.blockCode, 'weekend_active');

		const transitions = await save.db
			.select({
				from: schema.calendarTransition.fromWorldDate,
				to: schema.calendarTransition.toWorldDate,
				status: schema.calendarTransition.status,
				blockCode: schema.calendarTransition.blockCode
			})
			.from(schema.calendarTransition)
			.orderBy(asc(schema.calendarTransition.fromWorldDate));
		assert.equal(transitions.length, 3);
		console.table(transitions);
		assert.equal((await save.db.select().from(schema.dailyPhaseExecution)).length, 2);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Calendar valid: daily advancement, weekend gates, idempotency, and blockers passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
