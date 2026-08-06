import { strict as assert } from 'node:assert';
import { asc, eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advanceCalendarDay } from '../electron/db/calendar-service.js';
import {
	DEVELOPMENT_STAGES,
	listDevelopmentProjects,
	startDevelopmentProject,
	type DevelopmentStagePlan
} from '../electron/db/development-service.js';
import { getFinanceAccount, listFinanceTransactions } from '../electron/db/finance-service.js';
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

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-development-check-'));
const savePath = join(tempDir, 'development.sqlite');
const now = '2030-03-10T00:00:00.000Z';
const stagePlans: DevelopmentStagePlan[] = DEVELOPMENT_STAGES.map((stage) => ({
	stage,
	durationDays: 1,
	costMinor:
		stage === 'concept_design' ? 100 : stage === 'cfd' ? 200 : stage === 'wind_tunnel' ? 300 : 400
}));

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Development Check',
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
		await save.db.update(schema.financeAccount).set({ currentBalanceMinor: 10_000_000 });
		const teamSeasonEntryId = BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].id;
		const baseChassis = BASE_CONTENT_PACK.foundation.partDesigns[0];
		const chassisProject = await startDevelopmentProject(save.db, {
			teamSeasonEntryId,
			partCategory: 'chassis',
			projectKind: 'upgrade',
			baseDesignVersionId: baseChassis.id,
			performanceDeltas: { 'aero.frontWing': 4, 'aero.rearWing': -1 },
			reliabilityDelta: 3,
			stagePlans,
			now
		});
		const aeroProject = await startDevelopmentProject(save.db, {
			teamSeasonEntryId,
			partCategory: 'aero',
			projectKind: 'new_design',
			performanceDeltas: { 'aero.frontWing': 6, 'aero.rearWing': 4 },
			reliabilityDelta: 2,
			stagePlans,
			now
		});
		assert.equal(chassisProject.status, 'active');
		assert.equal(chassisProject.currentStage, 'concept_design');
		assert.equal(aeroProject.totalCostMinor, 1000);

		for (const [fromWorldDate, toWorldDate] of [
			['2030-03-10', '2030-03-11'],
			['2030-03-11', '2030-03-12'],
			['2030-03-12', '2030-03-13'],
			['2030-03-13', '2030-03-14']
		] as const) {
			const result = await advanceCalendarDay(save.db, { expectedWorldDate: fromWorldDate, now });
			assert.equal(result.status, 'advanced');
			assert.equal(result.toWorldDate, toWorldDate);
			assert.equal(result.dailyResearchDevelopment?.projectsAdvanced, 2);
		}

		const replay = await advanceCalendarDay(save.db, {
			expectedWorldDate: '2030-03-13',
			now
		});
		assert.equal(replay.status, 'idempotent');
		assert.equal(replay.dailyResearchDevelopment, null);

		const projects = await listDevelopmentProjects(save.db);
		assert.equal(projects.length, 2);
		assert.ok(projects.every((project) => project.status === 'completed'));
		assert.ok(projects.every((project) => project.completedWorldDate === '2030-03-14'));
		assert.ok(projects.every((project) => project.spentCostMinor === project.totalCostMinor));
		assert.ok(
			projects.every((project) => project.stages.every((stage) => stage.status === 'completed'))
		);

		const designs = await save.db
			.select()
			.from(schema.partDesignVersion)
			.where(eq(schema.partDesignVersion.teamId, FOUNDATION_FDC_TEAMS[0].id))
			.orderBy(asc(schema.partDesignVersion.partCategory), asc(schema.partDesignVersion.version));
		const aeroDesign = designs.find(
			(design) => design.partCategory === 'aero' && design.version === 1
		);
		const chassisDesign = designs.find(
			(design) => design.partCategory === 'chassis' && design.version === 2
		);
		assert.ok(aeroDesign);
		assert.ok(chassisDesign);
		assert.deepEqual(JSON.parse(aeroDesign.performancePayload), {
			aero: { frontWing: 6, rearWing: 4 }
		});
		assert.equal(JSON.parse(aeroDesign.reliabilityPayload).overall, 52);
		assert.equal(JSON.parse(chassisDesign.performancePayload).aero.frontWing, 58);
		assert.equal(JSON.parse(chassisDesign.performancePayload).aero.rearWing, 54);
		assert.equal(JSON.parse(chassisDesign.reliabilityPayload).overall, 77);

		const results = await save.db.select().from(schema.developmentProjectResult);
		assert.equal(results.length, 2);
		assert.equal(results.filter((result) => result.partInstanceId !== null).length, 1);
		assert.equal(results.filter((result) => result.chassisInstanceId !== null).length, 1);
		assert.equal((await save.db.select().from(schema.partInstance)).length, 1);
		assert.equal((await save.db.select().from(schema.chassisInstance)).length, 21);
		const financeAccount = await getFinanceAccount(save.db, teamSeasonEntryId);
		assert.equal(financeAccount?.currentBalanceMinor, 9_998_000);
		assert.equal((await listFinanceTransactions(save.db, teamSeasonEntryId)).length, 9);

		console.table(
			projects.map((project) => ({
				category: project.partCategory,
				status: project.status,
				stages: project.stages.map((stage) => stage.stage).join(' → '),
				cost: project.spentCostMinor,
				asset: project.result?.partInstanceId ? 'part' : 'chassis'
			}))
		);
	} finally {
		closeSaveDatabase(save);
	}
	console.log(
		'Development valid: staged progression, tradeoff output, manufacturing, and idempotency passed.'
	);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
