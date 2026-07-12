<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		bootstrapCareer,
		deleteCareer,
		getCareerSummary,
		isElectron,
		listCareers,
		listTeamOptions,
		openCareer
	} from '$lib/electron';
	import type { CareerSummary, NewCareerTeamOption } from '$lib/types';
	import '$lib/styles/landing.css';

	type Mode = 'menu' | 'new' | 'load' | 'delete';

	let mode = $state<Mode>('menu');
	let careers = $state.raw<CareerSummary[]>([]);
	let teams = $state.raw<NewCareerTeamOption[]>([]);
	let activeId = $state<string | null>(null);
	let busy = $state(false);
	let error = $state('');
	let electron = $state(false);
	let displayName = $state('New Career');
	let teamId = $state(1);
	let confirmDeleteId = $state<string | null>(null);

	const hqHref = resolve('/hq');

	async function refresh() {
		if (!isElectron()) return;
		careers = await listCareers();
		teams = await listTeamOptions();
		if (teams[0] && !teams.some((t) => t.id === teamId)) teamId = teams[0].id;
		const summary = await getCareerSummary();
		activeId = summary?.id ?? null;
	}

	onMount(() => {
		electron = isElectron();
		void refresh();
	});

	function setMode(next: Mode) {
		mode = next;
		error = '';
		confirmDeleteId = null;
	}

	async function goHq() {
		await goto(hqHref);
	}

	async function onStart() {
		if (!electron) return;
		busy = true;
		error = '';
		try {
			await bootstrapCareer({
				displayName: displayName.trim() || 'New Career',
				playerTeamId: teamId,
				raceCount: 22
			});
			await goHq();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function onLoad(id: string) {
		busy = true;
		error = '';
		try {
			await openCareer(id);
			await goHq();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function onDelete(id: string) {
		if (confirmDeleteId !== id) {
			confirmDeleteId = id;
			return;
		}
		busy = true;
		error = '';
		try {
			await deleteCareer(id);
			confirmDeleteId = null;
			await refresh();
			if (careers.length === 0) mode = 'menu';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<div class="landing">
	<div class="landing-bg" aria-hidden="true"></div>
	<div class="landing-glow" aria-hidden="true"></div>

	<div class="landing-inner">
		<p
			class="landing-tag"
			style="margin: 0 0 0.35rem; letter-spacing: 0.22em; text-transform: uppercase"
		>
			Project Apex
		</p>
		<h1 class="landing-brand">Apex</h1>
		<p class="landing-tag">Manage the garage. Own the weekend.</p>

		{#if mode === 'menu'}
			<div class="landing-ctas">
				{#if activeId}
					<button class="landing-btn primary" disabled={busy} onclick={goHq}>Continue</button>
				{/if}
				<button
					class="landing-btn"
					class:primary={!activeId}
					disabled={busy || !electron}
					onclick={() => setMode('new')}
				>
					New career
				</button>
				<button
					class="landing-btn ghost"
					disabled={busy || !electron || careers.length === 0}
					onclick={() => setMode('load')}
				>
					Load career
				</button>
				<button
					class="landing-btn ghost"
					disabled={busy || !electron || careers.length === 0}
					onclick={() => setMode('delete')}
				>
					Delete
				</button>
			</div>
		{/if}

		{#if mode === 'new'}
			<div class="landing-panel">
				<h2>New career</h2>
				<div class="ops-row">
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
				</div>
				<div class="ops-row" style="margin-top: 1rem">
					<button class="landing-btn primary" disabled={busy} onclick={onStart}>Start</button>
					<button class="landing-btn ghost" disabled={busy} onclick={() => setMode('menu')}
						>Back</button
					>
				</div>
			</div>
		{/if}

		{#if mode === 'load'}
			<div class="landing-panel">
				<h2>Load career</h2>
				{#if careers.length === 0}
					<p class="landing-note">No saves yet.</p>
				{:else}
					<ul class="landing-list">
						{#each careers as c (c.id)}
							<li class="landing-item">
								<div>
									<div class="landing-item-name">{c.displayName}</div>
									<div class="landing-item-meta">
										{c.playerTeamName ?? `Team ${c.playerTeamId}`} · W{c.week ?? '—'} · {c.seasonYear ??
											'—'}
									</div>
								</div>
								<button class="landing-btn primary" disabled={busy} onclick={() => onLoad(c.id)}>
									Open
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="ops-row" style="margin-top: 1rem">
					<button class="landing-btn ghost" disabled={busy} onclick={() => setMode('menu')}
						>Back</button
					>
				</div>
			</div>
		{/if}

		{#if mode === 'delete'}
			<div class="landing-panel">
				<h2>Delete career</h2>
				<p class="landing-note" style="margin-top: 0">Click twice to confirm permanent delete.</p>
				<ul class="landing-list" style="margin-top: 0.85rem">
					{#each careers as c (c.id)}
						<li class="landing-item">
							<div>
								<div class="landing-item-name">{c.displayName}</div>
								<div class="landing-item-meta">
									{c.playerTeamName ?? `Team ${c.playerTeamId}`} · W{c.week ?? '—'}
								</div>
							</div>
							<button class="landing-btn danger" disabled={busy} onclick={() => onDelete(c.id)}>
								{confirmDeleteId === c.id ? 'Confirm delete' : 'Delete'}
							</button>
						</li>
					{/each}
				</ul>
				<div class="ops-row" style="margin-top: 1rem">
					<button class="landing-btn ghost" disabled={busy} onclick={() => setMode('menu')}
						>Back</button
					>
				</div>
			</div>
		{/if}

		{#if !electron}
			<p class="landing-note">Run `pnpm dev:electron` to manage careers.</p>
		{/if}
		{#if error}
			<p class="landing-error">{error}</p>
		{/if}
	</div>
</div>
