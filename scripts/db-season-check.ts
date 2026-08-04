import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCurrentWeekend } from '../electron/db/read-models.js';
import { resolveCurrentSeason } from '../electron/db/season-service.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import { FOUNDATION_FDC_TEAMS, FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';
import * as schema from '../electron/db/schema.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-season-check-'));
const savePath = join(tempDir, 'season.sqlite');

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Season Check',
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
		pack: BASE_CONTENT_PACK,
		now: '2030-01-01T00:00:00.000Z'
	});
	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		const foundation = BASE_CONTENT_PACK.foundation;
		const ruleset = (await save.db.select().from(schema.championshipSeasonRuleset))[0];
		assert.ok(ruleset);
		assert.equal(ruleset.id, foundation.ruleset.id);
		assert.equal(ruleset.refuelingEnabled, true);
		assert.equal(ruleset.ersEnabled, false);
		assert.equal(ruleset.gridPolicySchemaVersion, 'grid-policy-v1');
		assert.equal(JSON.parse(ruleset.gridPolicyPayload).qualifying, 'none');

		assert.equal((await save.db.select().from(schema.championshipSeason)).length, 1);
		assert.equal((await save.db.select().from(schema.championshipEvent)).length, 10);
		assert.equal((await save.db.select().from(schema.eventSessionDefinition)).length, 50);
		assert.equal((await save.db.select().from(schema.weekendSession)).length, 50);
		assert.equal((await save.db.select().from(schema.teamSeasonEntry)).length, 10);
		assert.equal((await save.db.select().from(schema.driver)).length, 20);
		assert.equal((await save.db.select().from(schema.driverHealth)).length, 20);
		assert.equal((await save.db.select().from(schema.seatAssignment)).length, 20);
		assert.equal((await save.db.select().from(schema.chassisInstance)).length, 20);
		assert.equal((await save.db.select().from(schema.eventEntry)).length, 200);
		assert.equal((await save.db.select().from(schema.circuit)).length, 10);
		assert.equal((await save.db.select().from(schema.circuitLayoutVersion)).length, 10);
		assert.equal((await save.db.select().from(schema.pointsSystemPlacePoint)).length, 20);

		const currentWeekend = await getCurrentWeekend(save.db);
		assert.ok(currentWeekend);
		assert.equal(currentWeekend.roundNumber, 1);
		assert.equal(currentWeekend.session.kind, 'fp1');
		assert.equal(currentWeekend.status, 'scheduled');

		const currentSeason = await resolveCurrentSeason(save.db);
		assert.ok(currentSeason);
		assert.equal(currentSeason.season.id, foundation.season.id);
		assert.equal(currentSeason.season.championshipCode, 'academy');
		assert.equal(currentSeason.nextEvent?.roundNumber, 1);
		assert.equal(currentSeason.nextEvent?.circuit.shortName, foundation.circuits[0].shortName);
	} finally {
		closeSaveDatabase(save);
	}

	console.log(
		'Tier 3 season valid: ruleset, calendar, roster, cars, and next-event resolution passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
