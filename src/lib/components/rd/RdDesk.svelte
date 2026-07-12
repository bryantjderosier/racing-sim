<script lang="ts">
	import { resolve } from '$app/paths';
	import { allocateRdHours, queueManufacture, startRdProject } from '$lib/electron';
	import type { RdHubSnapshot } from '$lib/types';

	type Props = {
		rd: RdHubSnapshot;
		busy: boolean;
		onRd: (rd: RdHubSnapshot) => void;
		onError: (msg: string) => void;
		onBusy: (v: boolean) => void;
	};

	let { rd, busy, onRd, onError, onBusy }: Props = $props();

	const SLOT_ROLE: Record<string, string> = {
		front_wing: 'aero',
		rear_wing: 'aero',
		underfloor: 'aero',
		sidepods: 'aero',
		suspension: 'mechanical',
		power_unit: 'powertrain'
	};

	let startSlot = $state('');
	let startFocus = $state<'current_car' | 'next_year'>('current_car');
	let leadDesignerId = $state<number | ''>('');
	let allocWt = $state<Record<number, number>>({});
	let allocCfd = $state<Record<number, number>>({});
	let lightweight = $state<Record<number, boolean>>({});

	const hqHref = resolve('/hq');
	const pivotPct = $derived(Math.round(rd.pivot.currentFraction * 100));

	const effectiveSlot = $derived(startSlot || rd.openSlots[0] || '');
	const matchingDesigners = $derived.by(() => {
		const role = SLOT_ROLE[effectiveSlot];
		if (!role) return rd.designers;
		return rd.designers.filter((d) => d.role === role);
	});

	function money(n: number) {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
		return String(n);
	}

	function label(s: string) {
		return s.replaceAll('_', ' ');
	}

	function ppBand(min: number | null, max: number | null) {
		if (min == null && max == null) return '—';
		return `${min ?? '?'}–${max ?? '?'}`;
	}

	async function onStart() {
		if (!effectiveSlot) return;
		onBusy(true);
		onError('');
		try {
			const res = await startRdProject({
				slot: effectiveSlot,
				focus: startFocus,
				...(leadDesignerId !== ''
					? { leadDesignerId: Number(leadDesignerId) }
					: {})
			});
			if (res) {
				onRd(res.rd);
				startSlot = '';
				leadDesignerId = '';
			}
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onAllocate(projectId: number) {
		onBusy(true);
		onError('');
		try {
			const res = await allocateRdHours({
				projectId,
				wtHours: allocWt[projectId] || undefined,
				cfdHours: allocCfd[projectId] || undefined
			});
			if (res) {
				onRd(res.rd);
				allocWt = { ...allocWt, [projectId]: 0 };
				allocCfd = { ...allocCfd, [projectId]: 0 };
			}
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onQueue(blueprintId: number) {
		onBusy(true);
		onError('');
		try {
			const res = await queueManufacture({
				blueprintId,
				isLightweight: lightweight[blueprintId] ?? false
			});
			if (res) onRd(res.rd);
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
			<p class="ops-eyebrow">Engineering · season {rd.clock.seasonYear}</p>
			<h1 class="ops-brand">{rd.team.name}</h1>
			<p class="hq-hero-subtitle">Week {rd.clock.week} · Division {rd.team.division}</p>
		</div>
		<div class="ops-row">
			<a class="ops-btn ghost" href={hqHref}>Team HQ</a>
		</div>
	</div>
</section>

<div class="hq-stat-grid">
	<article class="hq-stat-card">
		<span>Available cash</span>
		<strong>{money(rd.team.cash)}</strong>
		<small>Operating balance</small>
	</article>
	<article class="hq-stat-card">
		<span>Wind tunnel</span>
		<strong>{rd.team.wtHours.toFixed(0)}h</strong>
		<small>of {rd.team.wtHoursCap.toFixed(0)}h remaining</small>
	</article>
	<article class="hq-stat-card">
		<span>CFD</span>
		<strong>{rd.team.cfdHours.toFixed(0)}h</strong>
		<small>of {rd.team.cfdHoursCap.toFixed(0)}h remaining</small>
	</article>
	<article class="hq-stat-card">
		<span>R&amp;D pivot</span>
		<strong>{pivotPct}%</strong>
		<small>
			{#if rd.pivot.locked}
				Locked · set at HQ
			{:else}
				Current car · lock at HQ
			{/if}
		</small>
	</article>
</div>

{#if rd.openSlots.length}
	<section class="ops-panel">
		<p class="ops-eyebrow">Start project</p>
		<div class="ops-row" style="flex-wrap: wrap; align-items: flex-end">
			<label class="ops-label">
				Slot
				<select
					class="ops-input"
					value={effectiveSlot}
					onchange={(e) => {
						startSlot = e.currentTarget.value;
						leadDesignerId = '';
					}}
				>
					{#each rd.openSlots as slot (slot)}
						<option value={slot}>{label(slot)}</option>
					{/each}
				</select>
			</label>
			<label class="ops-label">
				Focus
				<select class="ops-input" bind:value={startFocus}>
					<option value="current_car">current car</option>
					<option value="next_year">next year</option>
				</select>
			</label>
			<label class="ops-label">
				Lead designer
				<select class="ops-input" bind:value={leadDesignerId}>
					<option value="">Optional</option>
					{#each matchingDesigners as d (d.id)}
						<option value={d.id}>{d.name} · {label(d.role)}</option>
					{/each}
				</select>
			</label>
			<button class="ops-btn primary" disabled={busy || !effectiveSlot} onclick={onStart}>
				Start
			</button>
		</div>
	</section>
{/if}

<section class="ops-panel">
	<p class="ops-eyebrow">Active projects</p>
	{#if rd.projects.length === 0}
		<p class="ops-muted">No active projects.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Slot</th>
					<th>Focus</th>
					<th>Progress</th>
					<th>WT</th>
					<th>CFD</th>
					<th>Status</th>
					<th>Allocate</th>
				</tr>
			</thead>
			<tbody>
				{#each rd.projects as p (p.id)}
					<tr>
						<td>{label(p.slot)}</td>
						<td>{label(p.focus)}</td>
						<td class="ops-mono">{p.progress.toFixed(0)}%</td>
						<td class="ops-mono">{p.allocatedWtHours.toFixed(0)}</td>
						<td class="ops-mono">{p.allocatedCfdHours.toFixed(0)}</td>
						<td>{label(p.status)}</td>
						<td>
							{#if p.status === 'fabricating'}
								<div class="ops-row" style="flex-wrap: wrap; gap: 0.35rem">
									<input
										class="ops-input"
										type="number"
										min="0"
										step="1"
										placeholder="WT"
										style="width: 4.5rem"
										value={allocWt[p.id] ?? ''}
										oninput={(e) => {
											allocWt = { ...allocWt, [p.id]: Number(e.currentTarget.value) || 0 };
										}}
									/>
									<input
										class="ops-input"
										type="number"
										min="0"
										step="1"
										placeholder="CFD"
										style="width: 4.5rem"
										value={allocCfd[p.id] ?? ''}
										oninput={(e) => {
											allocCfd = { ...allocCfd, [p.id]: Number(e.currentTarget.value) || 0 };
										}}
									/>
									<button class="ops-btn" disabled={busy} onclick={() => onAllocate(p.id)}>
										Allocate
									</button>
								</div>
							{:else}
								—
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Blueprints</p>
	{#if rd.blueprints.length === 0}
		<p class="ops-muted">No blueprints yet.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Slot</th>
					<th>PP band</th>
					<th>Confidence</th>
					<th>Reliability</th>
					<th>Flaws</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each rd.blueprints as bp (bp.id)}
					<tr>
						<td>{bp.name}</td>
						<td>{label(bp.slot)}</td>
						<td class="ops-mono">{ppBand(bp.knownMin, bp.knownMax)}</td>
						<td class="ops-mono">{bp.scoutConfidence.toFixed(0)}%</td>
						<td class="ops-mono">{bp.baseReliability.toFixed(0)}%</td>
						<td>
							{#if bp.revealedFlaws.length === 0}
								<span class="ops-muted">—</span>
							{:else}
								{bp.revealedFlaws.map((f) => label(f.flawType)).join(', ')}
							{/if}
						</td>
						<td>
							<div class="ops-row" style="flex-wrap: wrap; gap: 0.35rem">
								<label class="ops-label" style="flex-direction: row; align-items: center; gap: 0.35rem">
									<input
										type="checkbox"
										checked={lightweight[bp.id] ?? false}
										onchange={(e) => {
											lightweight = { ...lightweight, [bp.id]: e.currentTarget.checked };
										}}
									/>
									LW
								</label>
								<button
									class="ops-btn"
									disabled={busy || bp.isInvalidated || bp.queued}
									onclick={() => onQueue(bp.id)}
								>
									Queue
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Manufacturing queue</p>
	{#if rd.queue.length === 0}
		<p class="ops-muted">Queue empty.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Blueprint</th>
					<th>Slot</th>
					<th>Lightweight</th>
					<th>Completion tick</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each rd.queue as job (job.id)}
					<tr>
						<td>{job.blueprintName}</td>
						<td>{label(job.slot)}</td>
						<td>{job.isLightweight ? 'yes' : 'no'}</td>
						<td class="ops-mono">{job.completionDate}</td>
						<td>{label(job.status)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
