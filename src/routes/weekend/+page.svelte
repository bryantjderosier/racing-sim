<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PracticeDesk from '$lib/components/weekend/PracticeDesk.svelte';
	import PitWall from '$lib/components/weekend/PitWall.svelte';
	import {
		getCareerSummary,
		isElectron,
		raceCreate,
		raceFinish,
		weekendBegin,
		weekendClear,
		weekendCommit,
		weekendRunQualifying
	} from '$lib/electron';
	import type {
		QualifyingView,
		RaceTelemetry,
		WeekendBeginResult,
		WeekendCommitResult
	} from '$lib/types';

	type Phase = 'lobby' | 'practice' | 'quali' | 'race' | 'results';

	type ClassRow = {
		position: number;
		entrantId: number;
		name: string;
		status: string;
		totalMs: number;
		lapsCompleted: number;
	};

	let phase = $state<Phase>('lobby');
	let weekend = $state.raw<WeekendBeginResult | null>(null);
	let quali = $state.raw<QualifyingView | null>(null);
	let telemetry = $state.raw<RaceTelemetry | null>(null);
	let classification = $state.raw<ClassRow[]>([]);
	let commit = $state.raw<WeekendCommitResult | null>(null);
	let playerDriverId = $state(0);
	let busy = $state(false);
	let error = $state('');

	async function ensureCareer() {
		if (!isElectron()) {
			error = 'Electron required';
			return false;
		}
		const c = await getCareerSummary();
		if (!c) {
			error = 'Open a career from home first';
			return false;
		}
		return true;
	}

	async function begin() {
		busy = true;
		error = '';
		try {
			if (!(await ensureCareer())) return;
			weekend = await weekendBegin();
			if (!weekend) return;
			const c = await getCareerSummary();
			playerDriverId =
				weekend.entrants.find((e) => e.teamId === c?.playerTeamId)?.driverId ?? 0;
			phase = 'lobby';
			quali = null;
			telemetry = null;
			classification = [];
			commit = null;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		void begin();
	});

	async function runQuali() {
		busy = true;
		error = '';
		try {
			quali = await weekendRunQualifying({ format: 'div1_knockout' });
			phase = 'quali';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function startRace() {
		busy = true;
		error = '';
		try {
			const created = await raceCreate({ laps: 12, seed: 7 });
			if (created) {
				telemetry = created.telemetry;
				phase = 'race';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function finishRace() {
		busy = true;
		error = '';
		try {
			const result = (await raceFinish()) as {
				classification: ClassRow[];
			} | null;
			if (result) {
				classification = result.classification;
				phase = 'results';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function doCommit() {
		busy = true;
		error = '';
		try {
			commit = await weekendCommit({ weeksAfterRace: 0 });
			weekend = null;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function abort() {
		await weekendClear();
		void goto(resolve('/'));
	}
</script>

<div class="ops-row spread" style="margin-bottom: 1rem">
	<div>
		<p class="ops-eyebrow">Race weekend</p>
		<h1 class="ops-brand" style="font-size: 1.5rem">
			{weekend?.trackName ?? 'Loading…'}
		</h1>
	</div>
	<div class="ops-row">
		<span class="ops-phase">{phase}</span>
		<button class="ops-btn ghost" onclick={abort}>Abort / HQ</button>
	</div>
</div>

{#if phase === 'lobby' && weekend}
	<section class="ops-panel">
		<p class="ops-eyebrow">Lobby</p>
		<p class="ops-mono ops-muted">{weekend.entrants.length} cars on the grid</p>
		<div class="ops-row" style="margin-top: 0.75rem">
			<button class="ops-btn primary" disabled={busy} onclick={() => (phase = 'practice')}>
				Enter practice
			</button>
			<button class="ops-btn" disabled={busy} onclick={runQuali}>Skip to quali</button>
		</div>
	</section>
{/if}

{#if phase === 'practice'}
	<PracticeDesk
		onContinue={() => {
			void runQuali();
		}}
	/>
{/if}

{#if phase === 'quali' && quali}
	<section class="ops-panel">
		<div class="ops-row spread">
			<div>
				<p class="ops-eyebrow">Qualifying · {quali.format}</p>
				<h2 style="margin: 0; font-size: 1.25rem; text-transform: uppercase">
					Grid
					{#if quali.poleMs}
						<span class="ops-mono ops-muted">pole {quali.poleMs.toFixed(0)} ms</span>
					{/if}
				</h2>
			</div>
			<button class="ops-btn primary" disabled={busy} onclick={startRace}>Form up / race</button>
		</div>
		<table class="ops-table" style="margin-top: 0.75rem">
			<thead>
				<tr>
					<th>P</th>
					<th>Driver</th>
					<th>Best</th>
					<th>Sess</th>
				</tr>
			</thead>
			<tbody>
				{#each quali.grid as row (row.entrantId)}
					<tr class:player={row.entrantId === playerDriverId}>
						<td>{row.position}</td>
						<td>{row.name}</td>
						<td>{row.bestLapMs?.toFixed(0) ?? '—'}</td>
						<td>{row.session}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

{#if phase === 'race' && telemetry}
	<PitWall
		{playerDriverId}
		{telemetry}
		{busy}
		onTelemetry={(t) => {
			telemetry = t;
		}}
		onFinish={() => {
			void finishRace();
		}}
	/>
{/if}

{#if phase === 'results'}
	<section class="ops-panel">
		<div class="ops-row spread">
			<div>
				<p class="ops-eyebrow">Classification</p>
				<h2 style="margin: 0; font-size: 1.25rem; text-transform: uppercase">Results</h2>
			</div>
			{#if !commit}
				<button class="ops-btn primary" disabled={busy} onclick={doCommit}>Commit weekend</button>
			{:else}
				<button class="ops-btn primary" onclick={() => goto(resolve('/'))}>Back to HQ</button>
			{/if}
		</div>
		<table class="ops-table" style="margin-top: 0.75rem">
			<thead>
				<tr>
					<th>P</th>
					<th>Driver</th>
					<th>Status</th>
					<th>Laps</th>
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				{#each classification as row (row.entrantId)}
					<tr class:player={row.entrantId === playerDriverId}>
						<td>{row.position}</td>
						<td>{row.name}</td>
						<td>{row.status}</td>
						<td>{row.lapsCompleted}</td>
						<td>{row.totalMs.toFixed(0)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if commit}
			<p class="ops-mono" style="margin-top: 0.75rem">
				Committed event #{commit.raceEventId} · awards {commit.awards.length}
				{#if commit.nextRound}
					· next R{commit.nextRound.raceIndex} {commit.nextRound.trackName}
				{/if}
			</p>
		{/if}
	</section>
{/if}

{#if error}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
