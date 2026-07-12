<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		buyoutDriver,
		buyoutStaff,
		previewDriverOffer,
		previewStaffOffer,
		signDriverOffer,
		signStaffOffer
	} from '$lib/electron';
	import type {
		MarketAcceptPreviewView,
		MarketContractOfferView,
		MarketHubSnapshot,
		MarketHotDriverView,
		MarketHotStaffView
	} from '$lib/types';

	type Props = {
		market: MarketHubSnapshot;
		busy: boolean;
		onMarket: (m: MarketHubSnapshot) => void;
		onError: (msg: string) => void;
		onBusy: (v: boolean) => void;
	};

	type SignResult = {
		accepted: boolean;
		evaluation?: { score: number; threshold: number };
	};

	let { market, busy, onMarket, onError, onBusy }: Props = $props();

	let selectedDriverId = $state<number | null>(null);
	let selectedStaffId = $state<number | null>(null);
	let offerSalary = $state(0);
	let offerYears = $state(2);
	let offerIsNumberOne = $state(false);
	let offerBuyoutPaid = $state(0);
	let preview = $state.raw<MarketAcceptPreviewView | null>(null);

	const hqHref = resolve('/hq');

	function money(n: number) {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
		return String(n);
	}

	function label(s: string) {
		return s.replaceAll('_', ' ');
	}

	const selectedDriver = $derived(
		selectedDriverId == null
			? null
			: (market.hotDrivers.find((d) => d.driverId === selectedDriverId) ?? null)
	);
	const selectedStaff = $derived(
		selectedStaffId == null
			? null
			: (market.hotStaff.find((s) => s.staffId === selectedStaffId) ?? null)
	);

	const missingRolesLabel = $derived(
		market.missingStaffRoles.length
			? market.missingStaffRoles.map(label).join(', ')
			: 'none'
	);

	function buildOffer(): MarketContractOfferView {
		return {
			salaryAnnual: offerSalary,
			years: offerYears,
			isNumberOne: offerIsNumberOne || undefined
		};
	}

	function selectDriver(d: MarketHotDriverView) {
		selectedDriverId = d.driverId;
		selectedStaffId = null;
		offerSalary = d.marketRate;
		offerYears = 2;
		offerIsNumberOne = false;
		offerBuyoutPaid = d.teamId == null ? 0 : (d.buyoutFee ?? 0);
		preview = null;
		onError('');
	}

	function selectStaff(s: MarketHotStaffView) {
		selectedStaffId = s.staffId;
		selectedDriverId = null;
		offerSalary = s.marketRate;
		offerYears = 2;
		offerIsNumberOne = false;
		offerBuyoutPaid = s.teamId == null ? 0 : (s.buyoutFee ?? 0);
		preview = null;
		onError('');
	}

	async function onBuyoutDriver(driverId: number, fee: number | null) {
		if (!confirm('Buy out this driver contract?')) return;
		onBusy(true);
		onError('');
		try {
			const res = await buyoutDriver({
				driverId,
				...(fee != null ? { fee } : {})
			});
			if (res) onMarket(res.market);
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onBuyoutStaff(staffId: number, fee: number | null) {
		if (!confirm('Buy out this staff contract?')) return;
		onBusy(true);
		onError('');
		try {
			const res = await buyoutStaff({
				staffId,
				...(fee != null ? { fee } : {})
			});
			if (res) onMarket(res.market);
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onPreviewDriver() {
		if (selectedDriverId == null) return;
		onBusy(true);
		onError('');
		try {
			preview = await previewDriverOffer({
				driverId: selectedDriverId,
				offer: buildOffer()
			});
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onPreviewStaff() {
		if (selectedStaffId == null) return;
		onBusy(true);
		onError('');
		try {
			preview = await previewStaffOffer({
				staffId: selectedStaffId,
				offer: buildOffer()
			});
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onSignDriver() {
		if (selectedDriverId == null) return;
		onBusy(true);
		onError('');
		try {
			const res = await signDriverOffer({
				driverId: selectedDriverId,
				offer: buildOffer(),
				buyoutPaid: offerBuyoutPaid
			});
			if (!res) return;
			const result = res.result as SignResult;
			if (!result.accepted) {
				const score = result.evaluation?.score ?? '?';
				const threshold = result.evaluation?.threshold ?? '?';
				onError(`Offer rejected (score ${score} / threshold ${threshold})`);
				onMarket(res.market);
				return;
			}
			onMarket(res.market);
			selectedDriverId = null;
			preview = null;
		} catch (e) {
			onError(e instanceof Error ? e.message : String(e));
		} finally {
			onBusy(false);
		}
	}

	async function onSignStaff() {
		if (selectedStaffId == null) return;
		onBusy(true);
		onError('');
		try {
			const res = await signStaffOffer({
				staffId: selectedStaffId,
				offer: buildOffer(),
				buyoutPaid: offerBuyoutPaid
			});
			if (!res) return;
			const result = res.result as SignResult;
			if (!result.accepted) {
				const score = result.evaluation?.score ?? '?';
				const threshold = result.evaluation?.threshold ?? '?';
				onError(`Offer rejected (score ${score} / threshold ${threshold})`);
				onMarket(res.market);
				return;
			}
			onMarket(res.market);
			selectedStaffId = null;
			preview = null;
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
			<p class="ops-eyebrow">Market · season {market.clock.seasonYear}</p>
			<h1 class="ops-brand">{market.team.name}</h1>
			<p class="hq-hero-subtitle">Week {market.clock.week} · Division {market.team.division}</p>
		</div>
		<div class="ops-row">
			<a class="ops-btn ghost" href={hqHref}>Team HQ</a>
		</div>
	</div>
</section>

<div class="hq-stat-grid">
	<article class="hq-stat-card">
		<span>Available cash</span>
		<strong>{money(market.team.cash)}</strong>
		<small>Operating balance</small>
	</article>
	<article class="hq-stat-card">
		<span>Reputation</span>
		<strong>{market.team.reputation.toFixed(0)}</strong>
		<small>Team standing</small>
	</article>
	<article class="hq-stat-card">
		<span>Open driver seats</span>
		<strong>{market.openDriverSeats}</strong>
		<small>Available seats</small>
	</article>
	<article class="hq-stat-card">
		<span>Missing staff roles</span>
		<strong>{missingRolesLabel}</strong>
		<small>Roster gaps</small>
	</article>
</div>

<section class="ops-panel">
	<p class="ops-eyebrow">Roster drivers</p>
	{#if market.rosterDrivers.length === 0}
		<p class="ops-muted">No drivers on roster.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Age</th>
					<th>Salary</th>
					<th>Years</th>
					<th>#1</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each market.rosterDrivers as d (d.driverId)}
					<tr>
						<td>{d.name}</td>
						<td class="ops-mono">{d.age}</td>
						<td class="ops-mono">{d.salaryAnnual != null ? money(d.salaryAnnual) : '—'}</td>
						<td class="ops-mono">{d.yearsRemaining ?? '—'}</td>
						<td>{d.isNumberOne ? 'yes' : 'no'}</td>
						<td>
							{#if d.contractId != null}
								<button
									class="ops-btn"
									disabled={busy}
									onclick={() => onBuyoutDriver(d.driverId, d.buyoutFee)}
								>
									Buyout
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Roster staff</p>
	{#if market.rosterStaff.length === 0}
		<p class="ops-muted">No staff on roster.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Role</th>
					<th>Salary</th>
					<th>Years</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each market.rosterStaff as s (s.staffId)}
					<tr>
						<td>{s.name}</td>
						<td>{label(s.role)}</td>
						<td class="ops-mono">{s.salaryAnnual != null ? money(s.salaryAnnual) : '—'}</td>
						<td class="ops-mono">{s.yearsRemaining ?? '—'}</td>
						<td>
							{#if s.contractId != null}
								<button
									class="ops-btn"
									disabled={busy}
									onclick={() => onBuyoutStaff(s.staffId, s.buyoutFee)}
								>
									Buyout
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Hot drivers</p>
	{#if market.hotDrivers.length === 0}
		<p class="ops-muted">No hot drivers.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Team</th>
					<th>Age</th>
					<th>Reasons</th>
					<th>Market rate</th>
					<th>Salary</th>
					<th>Buyout fee</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each market.hotDrivers as d (d.driverId)}
					<tr class:ops-selected={selectedDriverId === d.driverId}>
						<td>{d.name}</td>
						<td>{d.teamName ?? 'FA'}</td>
						<td class="ops-mono">{d.age}</td>
						<td>{d.reasons.map(label).join(', ') || '—'}</td>
						<td class="ops-mono">{money(d.marketRate)}</td>
						<td class="ops-mono">{d.salaryAnnual != null ? money(d.salaryAnnual) : '—'}</td>
						<td class="ops-mono">{d.buyoutFee != null ? money(d.buyoutFee) : '—'}</td>
						<td>
							<button class="ops-btn" disabled={busy} onclick={() => selectDriver(d)}>
								{selectedDriverId === d.driverId ? 'Selected' : 'Offer'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if selectedDriver}
	<section class="ops-panel">
		<p class="ops-eyebrow">Offer · {selectedDriver.name}</p>
		<div class="ops-row" style="flex-wrap: wrap; align-items: flex-end">
			<label class="ops-label">
				Salary
				<input class="ops-input" type="number" min="0" step="1000" bind:value={offerSalary} />
			</label>
			<label class="ops-label">
				Years
				<input class="ops-input" type="number" min="1" max="5" step="1" bind:value={offerYears} />
			</label>
			<label class="ops-label" style="flex-direction: row; align-items: center; gap: 0.35rem">
				<input type="checkbox" bind:checked={offerIsNumberOne} />
				#1 seat
			</label>
			<label class="ops-label">
				Buyout paid
				<input class="ops-input" type="number" min="0" step="1000" bind:value={offerBuyoutPaid} />
			</label>
			<button class="ops-btn" disabled={busy} onclick={onPreviewDriver}>Preview</button>
			<button class="ops-btn primary" disabled={busy} onclick={onSignDriver}>Sign</button>
		</div>
		{#if preview}
			<p class="ops-mono" style="margin-top: 0.75rem">
				score {preview.score.toFixed(2)} · threshold {preview.threshold.toFixed(2)} ·
				{preview.accepted ? 'accepted' : 'rejected'} · market rate {money(preview.marketRate)}
			</p>
		{/if}
	</section>
{/if}

<section class="ops-panel">
	<p class="ops-eyebrow">Hot staff</p>
	{#if market.hotStaff.length === 0}
		<p class="ops-muted">No hot staff.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Role</th>
					<th>Team</th>
					<th>Reasons</th>
					<th>Market rate</th>
					<th>Salary</th>
					<th>Buyout fee</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each market.hotStaff as s (s.staffId)}
					<tr class:ops-selected={selectedStaffId === s.staffId}>
						<td>{s.name}</td>
						<td>{label(s.role)}</td>
						<td>{s.teamName ?? 'FA'}</td>
						<td>{s.reasons.map(label).join(', ') || '—'}</td>
						<td class="ops-mono">{money(s.marketRate)}</td>
						<td class="ops-mono">{s.salaryAnnual != null ? money(s.salaryAnnual) : '—'}</td>
						<td class="ops-mono">{s.buyoutFee != null ? money(s.buyoutFee) : '—'}</td>
						<td>
							<button class="ops-btn" disabled={busy} onclick={() => selectStaff(s)}>
								{selectedStaffId === s.staffId ? 'Selected' : 'Offer'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if selectedStaff}
	<section class="ops-panel">
		<p class="ops-eyebrow">Offer · {selectedStaff.name} · {label(selectedStaff.role)}</p>
		<div class="ops-row" style="flex-wrap: wrap; align-items: flex-end">
			<label class="ops-label">
				Salary
				<input class="ops-input" type="number" min="0" step="1000" bind:value={offerSalary} />
			</label>
			<label class="ops-label">
				Years
				<input class="ops-input" type="number" min="1" max="5" step="1" bind:value={offerYears} />
			</label>
			<label class="ops-label">
				Buyout paid
				<input class="ops-input" type="number" min="0" step="1000" bind:value={offerBuyoutPaid} />
			</label>
			<button class="ops-btn" disabled={busy} onclick={onPreviewStaff}>Preview</button>
			<button class="ops-btn primary" disabled={busy} onclick={onSignStaff}>Sign</button>
		</div>
		{#if preview}
			<p class="ops-mono" style="margin-top: 0.75rem">
				score {preview.score.toFixed(2)} · threshold {preview.threshold.toFixed(2)} ·
				{preview.accepted ? 'accepted' : 'rejected'} · market rate {money(preview.marketRate)}
			</p>
		{/if}
	</section>
{/if}
