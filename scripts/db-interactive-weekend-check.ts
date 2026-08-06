import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	getInteractiveWeekendResults,
	issueInteractiveStrategyCommand,
	pauseInteractiveSession,
	resumeInteractiveSession,
	runInteractiveWeekend,
	startInteractiveSession
} from '../electron/db/interactive-weekend-service.js';
import type { RaceInput } from '../src/lib/sim/core/types.js';
import {
	closeSaveDatabase,
	createSaveDatabase,
	openSaveDatabase
} from '../electron/db/save-service.js';
import {
	getDriverChampionshipStandings,
	getTeamChampionshipStandings
} from '../electron/db/settlement-service.js';
import * as schema from '../electron/db/schema.js';
import { BASE_CONTENT_PACK } from '../electron/db/content-pack.js';
import { FOUNDATION_NATIONALITIES } from '../src/lib/content/career-start.js';
import { DEFAULT_MANAGER_BACKSTORY } from '../src/lib/content/manager-backstories.js';
import {
	DEFAULT_MANAGER_AVATAR,
	serializeManagerAvatar
} from '../src/lib/content/manager-avatar.js';

const tempDir = await mkdtemp(join(tmpdir(), 'racing-manager-interactive-weekend-check-'));
const savePath = join(tempDir, 'interactive-weekend.sqlite');
const now = '2030-03-20T00:00:00.000Z';
const event = BASE_CONTENT_PACK.foundation.events[0];

function prepareInteractiveInput(input: RaceInput): RaceInput {
	if (input.rules.mandatoryPitStops === 0) return input;
	const pitEntry = input.track.segments.find((segment) => segment.isPitEntry);
	if (!pitEntry) throw new Error('Interactive check input has no pit-entry segment.');
	const commands = [...input.commands];
	for (const entry of input.entries) {
		const tyreChoices = entry.tyreSets.filter((tyreSet) => tyreSet.id !== entry.startingTyreSetId);
		for (let stop = 0; stop < input.rules.mandatoryPitStops; stop += 1) {
			const triggerLap = Math.max(
				1,
				Math.floor(((stop + 1) * input.rules.lapCount) / (input.rules.mandatoryPitStops + 1))
			);
			commands.push({
				sequence: commands.length + 1,
				sessionEntryId: entry.sessionEntryId,
				triggerLap,
				triggerSegmentId: pitEntry.id,
				action: { type: 'pit', tyreSetId: tyreChoices[stop % tyreChoices.length].id }
			});
		}
	}
	return { ...input, commands };
}

try {
	await createSaveDatabase({
		targetPath: savePath,
		displayName: 'Interactive Weekend Check',
		gameVersion: '0.0.1',
		worldDate: event.startDate,
		managerFirstName: 'Test',
		managerLastName: 'Manager',
		managerNationalityId: FOUNDATION_NATIONALITIES[0].id,
		managerBackstoryCode: DEFAULT_MANAGER_BACKSTORY.code,
		managerAvatarPayload: serializeManagerAvatar(DEFAULT_MANAGER_AVATAR),
		playerTeamId: BASE_CONTENT_PACK.foundation.teamSeasonEntries[0].teamId,
		rngAlgorithm: 'xoshiro128ss',
		rngState: new Uint8Array([1, 2, 3, 4]),
		pack: BASE_CONTENT_PACK,
		now: '2030-01-01T00:00:00.000Z'
	});

	const save = await openSaveDatabase({ targetPath: savePath });
	try {
		await save.db
			.update(schema.championshipSeasonRuleset)
			.set({ refuelingEnabled: false })
			.where(eq(schema.championshipSeasonRuleset.id, BASE_CONTENT_PACK.foundation.ruleset.id));

		const started = await startInteractiveSession(save.db, event.id, { now });
		assert.equal(started.sessions[0].status, 'live');
		assert(started.currentSessionId);
		const inputRow = (
			await save.db
				.select({ input: schema.weekendSession.simulationInputPayload })
				.from(schema.weekendSession)
				.where(eq(schema.weekendSession.id, started.currentSessionId))
				.limit(1)
		)[0];
		assert(inputRow);
		const input = JSON.parse(inputRow.input) as {
			entries: Array<{ sessionEntryId: string }>;
			track: { segments: Array<{ id: string }> };
		};
		const strategy = await issueInteractiveStrategyCommand(
			save.db,
			event.id,
			{
				sequence: 1,
				sessionEntryId: input.entries[0].sessionEntryId,
				triggerLap: 1,
				triggerSegmentId: input.track.segments[0].id,
				action: { type: 'set_mode', mode: 'attack' }
			},
			{ now }
		);
		assert.equal(strategy.accepted, true);
		const paused = await pauseInteractiveSession(save.db, event.id, { now });
		assert.equal(paused.sessions[0].status, 'paused');
		const resumed = await resumeInteractiveSession(save.db, event.id, { now });
		assert.equal(resumed.sessions[0].status, 'live');

		const run = await runInteractiveWeekend(save.db, event.id, {
			now,
			inputTransform: prepareInteractiveInput
		});
		assert.equal(run.state.complete, true);
		assert.equal(run.state.settled, true);
		assert.equal(run.sessions.length, 5);
		assert.equal(run.settlement?.idempotent, false);

		console.log(`${run.state.eventName} — interactive weekend`);
		console.table(
			run.state.sessions.map((session) => ({
				sequence: session.sequence,
				session: session.sessionKind,
				status: session.status,
				results: session.resultCount,
				steps: run.sessions.find(
					(runSession) => runSession.weekendSessionId === session.weekendSessionId
				)?.steps
			}))
		);

		const results = await getInteractiveWeekendResults(save.db, event.id);
		const finalSession = results.at(-1);
		assert(finalSession);
		console.log(`\n${finalSession.session.sessionKind} classification`);
		console.table(
			finalSession.results.slice(0, 10).map((result) => ({
				pos: result.position,
				driver: result.driver.name,
				team: result.team.shortName,
				status: result.status,
				points: result.points,
				pitStops: result.pitStops
			}))
		);

		const [drivers, teams] = await Promise.all([
			getDriverChampionshipStandings(save.db, BASE_CONTENT_PACK.foundation.season.id),
			getTeamChampionshipStandings(save.db, BASE_CONTENT_PACK.foundation.season.id)
		]);
		console.log('\nDriver standings');
		console.table(
			drivers.slice(0, 10).map((standing, index) => ({
				pos: index + 1,
				driver: standing.driverName,
				points: standing.points,
				wins: standing.wins
			}))
		);
		console.log('\nConstructor standings');
		console.table(
			teams.map((standing, index) => ({
				pos: index + 1,
				constructor: standing.teamName,
				points: standing.points,
				wins: standing.wins
			}))
		);

		console.log(
			`\nInteractive weekend valid: ${run.sessions.length} sessions completed, official result ` +
				`settled, and tables loaded.`
		);
	} finally {
		closeSaveDatabase(save);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
