import { strict as assert } from 'node:assert';
import { asc, eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { materializeCurrentSession } from '../electron/db/race-input-materializer.js';
import {
	getDriverChampionshipStandings,
	getTeamChampionshipStandings,
	settleChampionshipEvent
} from '../electron/db/settlement-service.js';
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

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-settlement-check-'));
const savePath = join(tempDir, 'settlement.sqlite');
const settledAt = '2030-03-20T00:00:00.000Z';
const printDemo = process.argv.includes('--demo');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Settlement Check',
		gameVersion: '0.0.1',
		worldDate: '2030-01-01',
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: FOUNDATION_FDC_TEAMS[0].id,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		now: '2030-01-01T00:00:00.000Z'
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		const materialized = await materializeCurrentSession(save.db);
		const firstEvent = BASE_CONTENT_PACK.foundation.events[0];
		const sessions = await save.db
			.select({
				definitionId: schema.eventSessionDefinition.id,
				weekendSessionId: schema.weekendSession.id,
				pointsSystemId: schema.eventSessionDefinition.pointsSystemId
			})
			.from(schema.eventSessionDefinition)
			.innerJoin(
				schema.weekendSession,
				eq(schema.weekendSession.eventSessionDefinitionId, schema.eventSessionDefinition.id)
			)
			.where(eq(schema.eventSessionDefinition.championshipEventId, firstEvent.id))
			.orderBy(asc(schema.eventSessionDefinition.sequence));
		assert.equal(sessions.length, 5);

		const fp1Entries = await save.db
			.select({
				eventEntryId: schema.sessionEntry.eventEntryId,
				driverId: schema.sessionEntry.driverId,
				snapshotId: schema.sessionEntry.resolvedPerformanceSnapshotId
			})
			.from(schema.sessionEntry)
			.where(eq(schema.sessionEntry.weekendSessionId, materialized.weekendSessionId))
			.orderBy(asc(schema.sessionEntry.gridSlot));
		assert.equal(fp1Entries.length, 20);

		for (const session of sessions) {
			if (session.weekendSessionId !== materialized.weekendSessionId) {
				await save.db.insert(schema.sessionEntry).values(
					fp1Entries.map((entry, index) => ({
						id: `${session.weekendSessionId}:${entry.eventEntryId}`,
						weekendSessionId: session.weekendSessionId,
						eventEntryId: entry.eventEntryId,
						driverId: entry.driverId,
						gridSlot: index + 1,
						startStatus: 'started',
						resolvedPerformanceSnapshotId: entry.snapshotId
					}))
				);
			}
			const sessionEntries = await save.db
				.select({ id: schema.sessionEntry.id, driverId: schema.sessionEntry.driverId })
				.from(schema.sessionEntry)
				.where(eq(schema.sessionEntry.weekendSessionId, session.weekendSessionId))
				.orderBy(asc(schema.sessionEntry.gridSlot));
			const results = sessionEntries.map((entry, index) => ({
				id: `${session.weekendSessionId}:result:${index + 1}`,
				sessionEntryId: entry.id,
				weekendSessionId: session.weekendSessionId,
				classificationPosition: index + 1,
				classificationStatus: 'finished',
				lapsCompleted: 20,
				bestLapMs: 80_000 + index,
				bestLapNumber: 10,
				totalTimeMs: 1_600_000 + index,
				gapToLeaderMs: index,
				lapsBehind: 0,
				finalizedAt: settledAt
			}));
			await save.db.insert(schema.sessionResult).values(results);
			await save.db.insert(schema.raceResultDetail).values(
				results.map((result) => ({
					sessionResultId: result.id,
					pitStops: 0,
					lapsLed: result.classificationPosition === 1 ? 20 : 0,
					retirementReason: null,
					positionsGained: 0
				}))
			);
			if (session.pointsSystemId) {
				const points = await save.db
					.select({
						position: schema.pointsSystemPlacePoint.position,
						points: schema.pointsSystemPlacePoint.points
					})
					.from(schema.pointsSystemPlacePoint)
					.where(eq(schema.pointsSystemPlacePoint.pointsSystemId, session.pointsSystemId));
				const pointsByPosition = new Map(points.map((row) => [row.position, row.points]));
				const awards = results
					.filter((result) => (pointsByPosition.get(result.classificationPosition) ?? 0) > 0)
					.map((result) => ({
						id: `${result.id}:position`,
						sessionResultId: result.id,
						pointsSystemId: session.pointsSystemId!,
						awardKind: 'position',
						points: pointsByPosition.get(result.classificationPosition)!
					}));
				if (awards.length > 0) await save.db.insert(schema.sessionPointAward).values(awards);
			}
			await save.db
				.update(schema.weekendSession)
				.set({ status: 'finished', activeCheckpointId: null })
				.where(eq(schema.weekendSession.id, session.weekendSessionId));
		}

		const first = await settleChampionshipEvent(save.db, firstEvent.id, { settledAt });
		assert.equal(first.idempotent, false);
		assert.equal(first.advancedToWorldDate, '2030-04-05');
		assert.equal(first.driverPointsApplied, 151.5);
		assert.equal(first.teamPointsApplied, 151.5);
		assert.equal(first.nextWeekendSessionId, 'fdc-event-2030-02-fp1-runtime');

		const second = await settleChampionshipEvent(save.db, firstEvent.id, { settledAt });
		assert.equal(second.idempotent, true);
		assert.equal(second.settlementId, first.settlementId);
		assert.equal(second.driverPointsApplied, 0);

		const driverStandings = await getDriverChampionshipStandings(
			save.db,
			BASE_CONTENT_PACK.foundation.season.id
		);
		assert.equal(driverStandings.length, 20);
		assert.equal(driverStandings[0]?.driverId, fp1Entries[0]?.driverId);
		assert.equal(driverStandings[0]?.points, 37.5);
		assert.equal(driverStandings[0]?.wins, 2);
		assert.equal(driverStandings[0]?.finishCounts[1], 2);

		const teamStandings = await getTeamChampionshipStandings(
			save.db,
			BASE_CONTENT_PACK.foundation.season.id
		);
		assert.equal(teamStandings.length, 10);
		assert.equal(teamStandings[0]?.teamSeasonEntryId, 'fdc-entry-northstar-2030');
		assert.equal(teamStandings[0]?.points, 64.5);
		assert.equal(teamStandings[0]?.wins, 2);
		assert.equal((await save.db.select().from(schema.championshipWeekendSettlement)).length, 1);
		assert.equal(
			(await save.db.select().from(schema.championshipWeekendSettlementAward)).length,
			20
		);
		if (printDemo) {
			console.log('\nDemo standings');
			console.log('\nDrivers');
			console.table(
				driverStandings.map((standing, index) => ({
					pos: index + 1,
					driver: standing.driverName,
					points: standing.points,
					wins: standing.wins,
					p2: standing.secondPlaces,
					p3: standing.thirdPlaces
				}))
			);
			console.log('\nConstructors');
			console.table(
				teamStandings.map((standing, index) => ({
					pos: index + 1,
					constructor: standing.teamName,
					points: standing.points,
					wins: standing.wins,
					p2: standing.secondPlaces,
					p3: standing.thirdPlaces
				}))
			);
		}
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Weekend settlement valid: standings, countback, calendar advancement, and idempotency passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
