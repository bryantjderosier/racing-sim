<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScoutingDesk from '$lib/components/scouting/ScoutingDesk.svelte';
	import { getCareerSummary, getScoutingSnapshot, isElectron } from '$lib/electron';
	import type { ScoutingHubSnapshot } from '$lib/types';

	let scouting = $state.raw<ScoutingHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');

	async function load() {
		if (!isElectron()) {
			error = 'Open in Electron to use Scouting.';
			return;
		}
		const summary = await getCareerSummary();
		if (!summary) {
			await goto(resolve('/'));
			return;
		}
		scouting = await getScoutingSnapshot();
	}

	onMount(() => {
		void load();
	});
</script>

{#if scouting}
	<ScoutingDesk
		{scouting}
		{busy}
		onScouting={(next) => {
			scouting = next;
		}}
		onError={(msg) => {
			error = msg;
		}}
		onBusy={(v) => {
			busy = v;
		}}
	/>
{:else if error}
	<p class="ops-error">{error}</p>
{:else}
	<p class="ops-muted">Loading Scouting…</p>
{/if}

{#if error && scouting}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
