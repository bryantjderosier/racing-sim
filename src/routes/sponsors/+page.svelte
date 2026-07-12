<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SponsorsDesk from '$lib/components/sponsors/SponsorsDesk.svelte';
	import { getCareerSummary, getSponsorsSnapshot, isElectron } from '$lib/electron';
	import type { SponsorsHubSnapshot } from '$lib/types';

	let sponsors = $state.raw<SponsorsHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');

	async function load() {
		if (!isElectron()) {
			error = 'Open in Electron to use Sponsors.';
			return;
		}
		const summary = await getCareerSummary();
		if (!summary) {
			await goto(resolve('/'));
			return;
		}
		sponsors = await getSponsorsSnapshot();
	}

	onMount(() => {
		void load();
	});
</script>

{#if sponsors}
	<SponsorsDesk
		{sponsors}
		{busy}
		onSponsors={(next) => {
			sponsors = next;
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
	<p class="ops-muted">Loading Sponsors…</p>
{/if}

{#if error && sponsors}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
