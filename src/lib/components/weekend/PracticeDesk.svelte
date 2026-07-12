<script lang="ts">
	import { onMount } from 'svelte';
	import {
		practiceCreate,
		practiceRunStint,
		practiceTweakSetup
	} from '$lib/electron';
	import type { PracticeCreateResult, PracticeStintView } from '$lib/types';

	type Props = {
		onContinue: () => void;
	};

	let { onContinue }: Props = $props();

	let setup = $state.raw<PracticeCreateResult | null>(null);
	let lastStint = $state.raw<PracticeStintView | null>(null);
	let busy = $state(false);
	let error = $state('');
	let wing = $state(5);

	onMount(() => {
		void (async () => {
			busy = true;
			error = '';
			try {
				setup = await practiceCreate();
				if (setup) wing = setup.setup.frontWingAngle ?? 5;
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			} finally {
				busy = false;
			}
		})();
	});

	async function applyWing() {
		busy = true;
		error = '';
		try {
			setup = await practiceTweakSetup({ frontWingAngle: wing });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function runStint() {
		busy = true;
		error = '';
		try {
			lastStint = await practiceRunStint({
				intent: 'qualifying_trim',
				lapCount: 4,
				pace: 'push'
			});
			if (lastStint && setup) {
				setup = {
					...setup,
					trimTiers: lastStint.trimTiers
				};
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<section class="ops-panel">
	<div class="ops-row spread">
		<div>
			<p class="ops-eyebrow">Practice desk</p>
			<h2 style="margin: 0; font-size: 1.25rem; text-transform: uppercase">Setup &amp; stints</h2>
		</div>
		<button class="ops-btn primary" disabled={busy} onclick={onContinue}>To qualifying</button>
	</div>

	{#if setup}
		<div class="ops-grid-2" style="margin-top: 1rem">
			<div class="ops-stack">
				<label class="ops-label">
					Front wing
					<input
						class="ops-input"
						type="number"
						min="1"
						max="15"
						step="0.5"
						bind:value={wing}
					/>
				</label>
				<div class="ops-row">
					<button class="ops-btn" disabled={busy} onclick={applyWing}>Apply tweak</button>
					<button class="ops-btn" disabled={busy} onclick={runStint}>Run stint</button>
				</div>
				<p class="ops-mono ops-muted">
					Trim Q{setup.trimTiers.qualifying} / R{setup.trimTiers.race} / W{setup.trimTiers
						.wetWeather}
				</p>
			</div>
			<div>
				{#if lastStint}
					<p class="ops-mono">
						Best {lastStint.bestLapMs.toFixed(0)} ms · avg {lastStint.averageLapMs.toFixed(0)} ms
						· dist {lastStint.setupDistance.toFixed(2)}
					</p>
					<ul class="ops-mono" style="padding-left: 1.1rem; margin: 0.5rem 0 0">
						{#each lastStint.briefLines as line, i (i)}
							<li>{line}</li>
						{/each}
					</ul>
				{:else}
					<p class="ops-muted">Run a stint for engineering notes.</p>
				{/if}
			</div>
		</div>
	{:else}
		<p class="ops-muted">Loading practice session…</p>
	{/if}

	{#if error}
		<p class="ops-error">{error}</p>
	{/if}
</section>
