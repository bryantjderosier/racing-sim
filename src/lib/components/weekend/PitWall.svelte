<script lang="ts">
	import { raceCommand, raceStepLap } from '$lib/electron';
	import type { RaceTelemetry } from '$lib/types';

	type Props = {
		playerDriverId: number;
		telemetry: RaceTelemetry;
		busy: boolean;
		onTelemetry: (t: RaceTelemetry) => void;
		onFinish: () => void;
	};

	let { playerDriverId, telemetry, busy, onTelemetry, onFinish }: Props = $props();

	let localBusy = $state(false);
	let error = $state('');

	const locked = $derived(busy || localBusy);

	async function setPace(pace: string) {
		localBusy = true;
		error = '';
		try {
			await raceCommand({ type: 'setPace', entrantId: playerDriverId, pace });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			localBusy = false;
		}
	}

	async function setEnergy(energy: string) {
		localBusy = true;
		error = '';
		try {
			await raceCommand({ type: 'setEnergy', entrantId: playerDriverId, energy });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			localBusy = false;
		}
	}

	async function box() {
		localBusy = true;
		error = '';
		try {
			await raceCommand({
				type: 'boxThisLap',
				entrantId: playerDriverId,
				compound: 'soft',
				fuelKg: 25,
				afterCurrentLap: true
			});
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			localBusy = false;
		}
	}

	async function combat(order: string) {
		localBusy = true;
		error = '';
		try {
			await raceCommand({ type: 'combat', entrantId: playerDriverId, order, laps: 2 });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			localBusy = false;
		}
	}

	async function step(n: number) {
		localBusy = true;
		error = '';
		try {
			const res = await raceStepLap({ n });
			if (res) {
				onTelemetry(res.telemetry);
				if (res.complete) onFinish();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			localBusy = false;
		}
	}
</script>

<section class="ops-panel">
	<div class="ops-row spread">
		<div>
			<p class="ops-eyebrow">Pit wall</p>
			<h2 style="margin: 0; font-size: 1.25rem; text-transform: uppercase">
				Lap {telemetry.lap} / {telemetry.totalLaps}
				<span class="ops-muted">· {telemetry.safety}</span>
			</h2>
		</div>
		<div class="ops-row">
			<button class="ops-btn" disabled={locked} onclick={() => step(1)}>Step lap</button>
			<button class="ops-btn" disabled={locked} onclick={() => step(5)}>Step 5</button>
			<button class="ops-btn primary" disabled={locked} onclick={onFinish}>Finish</button>
		</div>
	</div>

	<div class="ops-row" style="margin: 0.85rem 0">
		<button class="ops-btn ghost" disabled={locked} onclick={() => setPace('conserve')}>Conserve</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => setPace('balanced')}>Balanced</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => setPace('push')}>Push</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => setEnergy('harvest')}>Harvest</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => setEnergy('overtake')}>Overtake</button>
		<button class="ops-btn ghost" disabled={locked} onclick={box}>Box</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => combat('attack')}>Attack</button>
		<button class="ops-btn ghost" disabled={locked} onclick={() => combat('defend')}>Defend</button>
	</div>

	<table class="ops-table">
		<thead>
			<tr>
				<th>P</th>
				<th>Driver</th>
				<th>Gap</th>
				<th>Tire</th>
				<th>Fuel</th>
				<th>Pace</th>
				<th>Energy</th>
			</tr>
		</thead>
		<tbody>
			{#each telemetry.cars as car (car.entrantId)}
				<tr class:player={car.entrantId === playerDriverId}>
					<td>{car.position}</td>
					<td>{car.name}</td>
					<td>{car.gapToLeaderMs.toFixed(0)}</td>
					<td>{(car.tireLife * 100).toFixed(0)}%</td>
					<td>{car.fuelKg.toFixed(1)}</td>
					<td>{car.pace}</td>
					<td>{car.energy}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if error}
		<p class="ops-error">{error}</p>
	{/if}
</section>
