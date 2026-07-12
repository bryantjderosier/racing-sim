<script lang="ts">
	import { resolve } from '$app/paths';
	import { setRdPivot, tickHqWeek, upgradeFacility } from '$lib/electron';
	import type { HqHubSnapshot } from '$lib/types';

	type Props = {
		hq: HqHubSnapshot;
		busy: boolean;
		onHq: (hq: HqHubSnapshot) => void;
		onClose: () => void;
		onError: (msg: string) => void;
		onBusy: (v: boolean) => void;
	};

	let { hq, busy, onHq, onClose, onError, onBusy }: Props = $props();

	let pivotDraft = $state<number | null>(null);
	let maintain = $state(true);

	const pivotPct = $derived(pivotDraft ?? Math.round(hq.pivot.currentFraction * 100));
	const utilPct = $derived(Math.min(100, Math.round(hq.costCap.utilization * 100)));
	const remainingPct = $derived(Math.max(0, 100 - utilPct));
	const completedRounds = $derived(hq.calendar.filter((round) => round.isCompleted).length);
	const weekendHref = resolve('/weekend');
	const rdHref = resolve('/rd');

	function money(n: number) {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
		return String(n);
	}

	function labelFacility(t: string) {
		return t.replaceAll('_', ' ');
	}

	async function onTick() {
		onBusy(true);
		onError('');
		try {
			const res = await tickHqWeek({ maintainFacilities: maintain });
			if (res) onHq(res.hq);
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onUpgrade(facilityType: string) {
		onBusy(true);
		onError('');
		try {
			const res = await upgradeFacility({ facilityType });
			if (res) onHq(res.hq);
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onConfirmPivot() {
		onBusy(true);
		onError('');
		try {
			const res = await setRdPivot({ currentFraction: pivotPct / 100, lockSeason: true });
			if (res) {
				pivotDraft = null;
				onHq(res.hq);
			}
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}
</script>

<section class="hq-hero">
	<div class="ops-row spread">
		<div>
			<p class="ops-eyebrow">Team HQ · season {hq.clock.seasonYear}</p>
			<h1 class="ops-brand">{hq.team.name}</h1>
			<p class="hq-hero-subtitle">Week {hq.clock.week} · Division {hq.team.division} · {completedRounds}/{hq.calendar.length} rounds complete</p>
		</div>
		<div class="ops-row">
			<label class="ops-label" style="flex-direction: row; align-items: center; gap: 0.4rem"><input type="checkbox" bind:checked={maintain} /> Maintain</label>
			<button class="ops-btn ghost" disabled={busy} onclick={onClose}>Close</button>
			<a class="ops-btn ghost" href={rdHref}>Engineering</a>
			<button class="ops-btn" disabled={busy} onclick={onTick}>Tick week</button>
			<a class="ops-btn primary" href={weekendHref}>{hq.nextRound ? 'Next race' : 'Weekend'}</a>
		</div>
	</div>
</section>

<div class="hq-stat-grid">
	<article class="hq-stat-card"><span>Available cash</span><strong>{money(hq.team.cash)}</strong><small>Operating balance</small></article>
	<article class="hq-stat-card" class:warning={utilPct >= 85}><span>Cost cap</span><strong>{remainingPct}%</strong><small>{money(hq.costCap.remaining)} headroom · {hq.costCap.breach}</small></article>
	<article class="hq-stat-card"><span>Wind tunnel</span><strong>{hq.team.wtHours.toFixed(0)}h</strong><small>of {hq.team.wtHoursCap.toFixed(0)}h remaining</small></article>
	<article class="hq-stat-card"><span>Next event</span><strong>{hq.nextRound ? `R${hq.nextRound.raceIndex}` : 'Season complete'}</strong><small>{hq.nextRound?.trackName ?? 'Review results and plan ahead'}</small></article>
</div>

<section class="ops-panel">
	<p class="ops-eyebrow">R&amp;D pivot</p>
	{#if hq.pivot.locked}
		<p class="ops-mono">
			Locked at {(hq.pivot.currentFraction * 100).toFixed(0)}% current car (gate R{hq.pivot
				.raceIndex})
		</p>
	{:else}
		<p class="ops-muted" style="margin: 0.25rem 0 0.75rem">
			Gate opens at race {hq.pivot.raceIndex}. Set current vs next-year split before lock.
			{#if hq.pivot.gateOpen}
				<span style="color: var(--ops-accent)"> Gate is open.</span>
			{/if}
		</p>
		<div class="ops-row">
			<label class="ops-label" style="min-width: 14rem">
				Current car {pivotPct}%
				<input
					class="ops-input"
					type="range"
					min="0"
					max="100"
					step="5"
					value={pivotPct}
					oninput={(e) => {
						pivotDraft = Number(e.currentTarget.value);
					}}
				/>
			</label>
			<button class="ops-btn primary" disabled={busy} onclick={onConfirmPivot}>
				Confirm &amp; lock
			</button>
		</div>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Facilities</p>
	<table class="ops-table">
		<thead>
			<tr>
				<th>Facility</th>
				<th>Tier</th>
				<th>Cond</th>
				<th>Status</th>
				<th>Upgrade</th>
			</tr>
		</thead>
		<tbody>
			{#each hq.facilities as f (f.id)}
				<tr>
					<td>{labelFacility(f.facilityType)}</td>
					<td>T{f.tier}</td>
					<td>{f.conditionPct.toFixed(0)}%</td>
					<td>
						{#if f.isUnderConstruction}
							building → tick {f.constructionFinishDate ?? '—'}
						{:else}
							ready
						{/if}
					</td>
					<td>
						{#if f.isUnderConstruction || !f.upgradeQuote}
							—
						{:else}
							<button
								class="ops-btn"
								disabled={busy || hq.team.cash < f.upgradeQuote.cash}
								onclick={() => onUpgrade(f.facilityType)}
							>
								T{f.upgradeQuote.toTier} · {money(f.upgradeQuote.cash)} · {f.upgradeQuote.weeks}w
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<div class="ops-grid-2">
	<section class="ops-panel">
		<p class="ops-eyebrow">Calendar</p>
		<table class="ops-table">
			<thead>
				<tr>
					<th>R</th>
					<th>Track</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each hq.calendar as round (round.calendarId)}
					<tr class:player={!round.isCompleted && hq.nextRound?.calendarId === round.calendarId}>
						<td>{round.raceIndex}</td>
						<td>{round.trackName}</td>
						<td>{round.isCompleted ? 'done' : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="ops-panel">
		<p class="ops-eyebrow">Standings</p>
		<table class="ops-table">
			<thead>
				<tr>
					<th>Pos</th>
					<th>Driver</th>
					<th>Pts</th>
				</tr>
			</thead>
			<tbody>
				{#each hq.standingsDrivers.slice(0, 8) as row (row.entityId)}
					<tr>
						<td>{row.position ?? '—'}</td>
						<td>{row.name}</td>
						<td>{row.points}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
