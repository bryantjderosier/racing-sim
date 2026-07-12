<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import HqDesk from '$lib/components/hq/HqDesk.svelte';
	import {
		bootstrapCareer,
		closeCareer,
		getHqSnapshot,
		isElectron,
		listCareers,
		listTeamOptions,
		openCareer
	} from '$lib/electron';
	import type {
		CareerSummary,
		HqHubSnapshot,
		NewCareerTeamOption
	} from '$lib/types';

	let careers = $state.raw<CareerSummary[]>([]);
	let teams = $state.raw<NewCareerTeamOption[]>([]);
	let hq = $state.raw<HqHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');
	let displayName = $state('New Career');
	let teamId = $state(1);
	let electron = $state(false);

	const weekendHref = resolve('/weekend');

	async function refresh() {
		if (!isElectron()) return;
		careers = await listCareers();
		teams = await listTeamOptions();
		const active = careers.find((c) => c.active);
		if (active) {
			hq = await getHqSnapshot();
		} else {
			hq = null;
		}
	}

	onMount(() => {
		electron = isElectron();
		void refresh();
	});

	function goWeekend() {
		void goto(weekendHref);
	}

	async function onBootstrap() {
		busy = true;
		error = '';
		try {
			const res = await bootstrapCareer({
				displayName: displayName.trim() || 'New Career',
				playerTeamId: teamId,
				raceCount: 22
			});
			if (res) hq = res.hq;
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function onOpen(id: string) {
		busy = true;
		error = '';
		try {
			await openCareer(id);
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function onClose() {
		busy = true;
		try {
			await closeCareer();
			hq = null;
			await refresh();
		} finally {
			busy = false;
		}
	}
</script>

<p class="ops-eyebrow">Project Apex</p>
<h1 class="ops-brand">Racing Manager</h1>

<section class="ops-panel" style="margin-top: 1rem; border-color: var(--ops-accent)">
	<p class="ops-eyebrow">Race weekend</p>
	<p class="ops-muted" style="margin: 0.35rem 0 0.85rem">
		Practice → quali → pit wall → commit.
	</p>
	<div class="ops-row">
		<button type="button" class="ops-btn primary" onclick={goWeekend}>Enter weekend</button>
		<a class="ops-btn" href={weekendHref}>Open /weekend</a>
	</div>
</section>

{#if !electron}
	<p class="ops-muted" style="margin-top: 1rem">
		Open in the Electron shell to load careers and run weekends.
	</p>
{:else if hq}
	<div style="margin-top: 1rem">
		<HqDesk
			{hq}
			{busy}
			onHq={(next) => {
				hq = next;
			}}
			onClose={onClose}
			onError={(msg) => {
				error = msg;
			}}
			onBusy={(v) => {
				busy = v;
			}}
		/>
	</div>
{:else}
	<section class="ops-panel" style="margin-top: 1.25rem">
		<p class="ops-eyebrow">Careers</p>
		{#if careers.length === 0}
			<p class="ops-muted">No saves yet.</p>
		{:else}
			<table class="ops-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Team</th>
						<th>Week</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each careers as c (c.id)}
						<tr>
							<td>{c.displayName}</td>
							<td>{c.playerTeamName ?? c.playerTeamId}</td>
							<td class="ops-mono">{c.week ?? '—'}</td>
							<td>
								<button class="ops-btn" disabled={busy} onclick={() => onOpen(c.id)}>
									Open
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="ops-panel">
		<p class="ops-eyebrow">New career</p>
		<div class="ops-row" style="margin-top: 0.5rem">
			<label class="ops-label">
				Display name
				<input class="ops-input" bind:value={displayName} />
			</label>
			<label class="ops-label">
				Team
				<select class="ops-select" bind:value={teamId}>
					{#each teams as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</label>
			<button class="ops-btn primary" disabled={busy} onclick={onBootstrap}>Bootstrap</button>
		</div>
	</section>
{/if}

{#if error}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
