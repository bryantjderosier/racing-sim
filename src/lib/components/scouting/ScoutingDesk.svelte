<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		assignScoutTarget,
		getFoggedProfile,
		unassignScoutTarget
	} from '$lib/electron';
	import type {
		ScoutCandidateView,
		ScoutFoggedProfileView,
		ScoutingHubSnapshot
	} from '$lib/types';

	type Props = {
		scouting: ScoutingHubSnapshot;
		busy: boolean;
		onScouting: (s: ScoutingHubSnapshot) => void;
		onError: (msg: string) => void;
		onBusy: (v: boolean) => void;
	};

	type AssignResult = {
		assigned: boolean;
		reason?: string;
	};

	let { scouting, busy, onScouting, onError, onBusy }: Props = $props();

	let profile = $state.raw<ScoutFoggedProfileView | null>(null);

	const hqHref = resolve('/hq');
	const slotsFree = $derived(scouting.network.slotsUsed < scouting.network.slotsMax);

	function label(s: string) {
		return s.replaceAll('_', ' ');
	}

	function entityKey(entityId: number, entityType: string) {
		return `${entityType}:${entityId}`;
	}

	async function onAssign(c: ScoutCandidateView) {
		onBusy(true);
		onError('');
		try {
			const res = await assignScoutTarget({
				entityId: c.entityId,
				entityType: c.entityType
			});
			if (!res) return;
			const result = res.result as AssignResult;
			if (!result.assigned) {
				onError(result.reason ? label(result.reason) : 'Assign failed');
				onScouting(res.scouting);
				return;
			}
			onScouting(res.scouting);
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onUnassign(entityId: number, entityType: 'driver' | 'staff') {
		onBusy(true);
		onError('');
		try {
			const res = await unassignScoutTarget({ entityId, entityType });
			if (res) onScouting(res.scouting);
			if (
				profile &&
				profile.entityId === entityId &&
				profile.entityType === entityType
			) {
				profile = null;
			}
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onViewProfile(entityId: number, entityType: 'driver' | 'staff') {
		onBusy(true);
		onError('');
		try {
			profile = await getFoggedProfile({ entityId, entityType });
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	function attrLine(a: { attrName: string; knownMin: number; knownMax: number; trueValue?: number }) {
		const band = `${a.knownMin}–${a.knownMax}`;
		const truth = a.trueValue != null ? ` (${a.trueValue})` : '';
		return `${label(a.attrName)}: ${band}${truth}`;
	}
</script>

<section class="hq-hero">
	<div class="ops-row spread">
		<div>
			<p class="ops-eyebrow">Scouting · season {scouting.clock.seasonYear}</p>
			<h1 class="ops-brand">{scouting.team.name}</h1>
			<p class="hq-hero-subtitle">Week {scouting.clock.week}</p>
		</div>
		<div class="ops-row">
			<a class="ops-btn ghost" href={hqHref}>Team HQ</a>
		</div>
	</div>
</section>

<div class="hq-stat-grid">
	<article class="hq-stat-card">
		<span>Slots</span>
		<strong class="ops-mono"
			>{scouting.network.slotsUsed}/{scouting.network.slotsMax}</strong
		>
		<small>Assigned / max</small>
	</article>
	<article class="hq-stat-card">
		<span>Weekly gain</span>
		<strong class="ops-mono">{scouting.network.weeklyGainEstimate.toFixed(1)}</strong>
		<small>Confidence estimate</small>
	</article>
	<article class="hq-stat-card">
		<span>HQ tier</span>
		<strong class="ops-mono">{scouting.network.hqTier}</strong>
		<small>Facility level</small>
	</article>
	<article class="hq-stat-card">
		<span>Leverage</span>
		<strong class="ops-mono">{scouting.network.leverage.toFixed(1)}</strong>
		<small>Network leverage</small>
	</article>
</div>

<section class="ops-panel">
	<p class="ops-eyebrow">Assignments</p>
	{#if scouting.assignments.length === 0}
		<p class="ops-muted">No active assignments.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Team</th>
					<th>Confidence</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each scouting.assignments as a (entityKey(a.entityId, a.entityType))}
					<tr>
						<td>{a.name}</td>
						<td>{a.entityType}</td>
						<td>{a.teamName ?? 'FA'}</td>
						<td class="ops-mono">{a.confidenceLevel.toFixed(0)}</td>
						<td>
							<button
								class="ops-btn"
								disabled={busy}
								onclick={() => onUnassign(a.entityId, a.entityType)}
							>
								Unassign
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Candidates</p>
	{#if scouting.candidates.length === 0}
		<p class="ops-muted">No candidates.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Role / team</th>
					<th>Reasons</th>
					<th>Confidence</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each scouting.candidates as c (entityKey(c.entityId, c.entityType))}
					<tr>
						<td>{c.name}</td>
						<td>{c.entityType}</td>
						<td>
							{#if c.role}{label(c.role)} · {/if}{c.teamName ?? 'FA'}
						</td>
						<td>{c.reasons.map(label).join(', ') || '—'}</td>
						<td class="ops-mono">{c.confidenceLevel.toFixed(0)}</td>
						<td>
							<div class="ops-row">
								{#if c.isAssigned}
									<button
										class="ops-btn"
										disabled={busy}
										onclick={() => onUnassign(c.entityId, c.entityType)}
									>
										Unassign
									</button>
								{:else if slotsFree}
									<button
										class="ops-btn primary"
										disabled={busy}
										onclick={() => onAssign(c)}
									>
										Assign
									</button>
								{/if}
								<button
									class="ops-btn"
									disabled={busy}
									onclick={() => onViewProfile(c.entityId, c.entityType)}
								>
									View profile
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if profile}
	<section class="ops-panel">
		<p class="ops-eyebrow">Profile · {profile.name}</p>
		<p class="ops-mono">
			confidence {profile.confidenceLevel.toFixed(0)}
			{#if profile.fullyRevealed} · fully revealed{/if}
		</p>
		{#if profile.attrs.length}
			<p class="ops-eyebrow" style="margin-top: 0.75rem">Attributes</p>
			<ul>
				{#each profile.attrs as a (a.attrName)}
					<li class="ops-mono">{attrLine(a)}</li>
				{/each}
			</ul>
		{/if}
		{#if profile.meta.length}
			<p class="ops-eyebrow" style="margin-top: 0.75rem">Meta</p>
			<ul>
				{#each profile.meta as m (m.attrName)}
					<li class="ops-mono">{attrLine(m)}</li>
				{/each}
			</ul>
		{/if}
		<button class="ops-btn" style="margin-top: 0.75rem" onclick={() => (profile = null)}>
			Close
		</button>
	</section>
{/if}
