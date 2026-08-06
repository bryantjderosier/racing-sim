import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advanceCalendarDay } from '../electron/db/calendar-service.js';
import {
	DEVELOPMENT_STAGES,
	listDevelopmentProjects,
	startDevelopmentProject
} from '../electron/db/development-service.js';
import {
	listAIWorldActions,
	listAIWorldDecisions,
	listAITeamProfiles
} from '../electron/db/ai-world-service.js';
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

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-ai-world-check-'));
const savePath = join(tempDir, 'ai-world.sqlite');
const now = '2030-03-13T00:00:00.000Z';
const teamSeasonEntryId = BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].id;

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'AI World Check',
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
		const profiles = await listAITeamProfiles(save.db);
		assert.equal(profiles.length, 10);
		assert.ok(
			profiles.every((profile) => profile.riskTolerance >= 0 && profile.riskTolerance <= 100)
		);

		await startDevelopmentProject(save.db, {
			teamSeasonEntryId,
			partCategory: 'aero',
			projectKind: 'new_design',
			performanceDeltas: { 'aero.frontWing': 2 },
			reliabilityDelta: 0,
			stagePlans: DEVELOPMENT_STAGES.map((stage) => ({
				stage,
				durationDays: 2,
				costMinor: 0
			})),
			now
		});

		const first = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(first.status, 'advanced');
		assert.equal(first.dailyAIWorld?.teamsEvaluated, 10);
		assert.equal(first.dailyAIWorld?.decisionsCreated, 10);
		assert.equal(first.dailyAIWorld?.decisionTypes.continue_development, 1);
		assert.equal(first.dailyAIWorld?.actionsCreated, 9);
		assert.equal(first.dailyAIWorld?.actionsApplied, 3);
		assert.equal(first.dailyAIWorld?.actionsDeferred, 6);
		assert.equal((await listDevelopmentProjects(save.db)).length, 4);

		const replay = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(replay.status, 'idempotent');
		assert.equal(replay.dailyAIWorld, null);

		const decisions = await listAIWorldDecisions(save.db, { worldDate: '2030-03-14' });
		assert.equal(decisions.length, 10);
		const actions = await listAIWorldActions(save.db, { worldDate: '2030-03-14' });
		assert.equal(actions.length, 9);
		assert.equal(actions.filter((action) => action.status === 'applied').length, 3);
		assert.ok(
			actions.every((action) => action.developmentProjectId || action.status === 'deferred')
		);
		assert.equal(
			decisions.find((decision) => decision.teamSeasonEntryId === teamSeasonEntryId)?.decisionType,
			'continue_development'
		);
		assert.ok(decisions.every((decision) => decision.priority >= 0 && decision.priority <= 100));

		console.table(
			profiles.map((profile) => ({
				teamSeasonEntryId: profile.teamSeasonEntryId,
				archetype: profile.archetype,
				development: profile.developmentPriority,
				driverStrategy: profile.driverStrategy,
				supplierStrategy: profile.supplierStrategy,
				risk: profile.riskTolerance
			}))
		);
		console.table(
			decisions.map((decision) => ({
				teamSeasonEntryId: decision.teamSeasonEntryId,
				decision: decision.decisionType,
				priority: decision.priority,
				reason: decision.reasonCode
			}))
		);
		console.log(
			`AI world valid: ${profiles.length} persistent profiles, ${decisions.length} daily decisions, ${actions.length} rival actions, and idempotent replay passed.`
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
