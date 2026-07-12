<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import HqDesk from '$lib/components/hq/HqDesk.svelte';
	import { closeCareer, getCareerSummary, getHqSnapshot, isElectron } from '$lib/electron';
	import type { HqHubSnapshot } from '$lib/types';

	let hq = $state.raw<HqHubSnapshot | null>(null);
	let busy = $state(false);
	let error = $state('');

	async function load() {
		if (!isElectron()) {
			error = 'Open in Electron to use HQ.';
			return;
		}
		const summary = await getCareerSummary();
		if (!summary) {
			await goto(resolve('/'));
			return;
		}
		hq = await getHqSnapshot();
	}

	onMount(() => {
		void load();
	});

	async function onClose() {
		busy = true;
		try {
			await closeCareer();
			await goto(resolve('/'));
		} finally {
			busy = false;
		}
	}
</script>

{#if hq}
	<HqDesk
		{hq}
		{busy}
		onHq={(next) => {
			hq = next;
		}}
		{onClose}
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
	<p class="ops-muted">Loading HQ…</p>
{/if}

{#if error && hq}
	<p class="ops-error" style="margin-top: 1rem">{error}</p>
{/if}
