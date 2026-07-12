<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RdDesk from '$lib/components/rd/RdDesk.svelte';
	import { getCareerSummary, getRdSnapshot, isElectron } from '$lib/electron';
	import type { RdHubSnapshot } from '$lib/types';

	let rd = $state.raw<RdHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');

	async function load() {
		if (!isElectron()) {
			error = 'Open in Electron to use Engineering.';
			return;
		}
		const summary = await getCareerSummary();
		if (!summary) {
			await goto(resolve('/'));
			return;
		}
		rd = await getRdSnapshot();
	}

	onMount(() => {
		void load();
	});
</script>

{#if rd}
	<RdDesk
		{rd}
		{busy}
		onRd={(next) => {
			rd = next;
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
	<p class="ops-muted">Loading Engineering…</p>
{/if}

{#if error && rd}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
