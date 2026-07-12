<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MarketDesk from '$lib/components/market/MarketDesk.svelte';
	import { getCareerSummary, getMarketSnapshot, isElectron } from '$lib/electron';
	import type { MarketHubSnapshot } from '$lib/types';

	let market = $state.raw<MarketHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');

	async function load() {
		if (!isElectron()) {
			error = 'Open in Electron to use Market.';
			return;
		}
		const summary = await getCareerSummary();
		if (!summary) {
			await goto(resolve('/'));
			return;
		}
		market = await getMarketSnapshot();
	}

	onMount(() => {
		void load();
	});
</script>

{#if market}
	<MarketDesk
		{market}
		{busy}
		onMarket={(next) => {
			market = next;
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
	<p class="ops-muted">Loading Market…</p>
{/if}

{#if error && market}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
