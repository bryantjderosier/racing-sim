<script lang="ts">
	import { resolve } from '$app/paths';
	import { signSponsorDeal } from '$lib/electron';
	import type {
		SponsorCatalogView,
		SponsorsHubSnapshot
	} from '$lib/types';

	type Props = {
		sponsors: SponsorsHubSnapshot;
		busy: boolean;
		onSponsors: (s: SponsorsHubSnapshot) => void;
		onError: (msg: string) => void;
		onBusy: (v: boolean) => void;
	};

	type SignResult = {
		signed: boolean;
		blockReasons: string[];
	};

	type SlotType = 'title' | 'major' | 'minor';

	const SLOT_TYPES: SlotType[] = ['title', 'major', 'minor'];

	let { sponsors, busy, onSponsors, onError, onBusy }: Props = $props();

	const hqHref = resolve('/hq');

	function money(n: number) {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
		return String(n);
	}

	function label(s: string) {
		return s.replaceAll('_', ' ');
	}

	function streamsSummary(streams: { payoutType: string; amount: number }[]) {
		if (!streams.length) return '—';
		return streams.map((s) => `${label(s.payoutType)} ${money(s.amount)}`).join(', ');
	}

	function termLabel(yearsRemaining: number | null, remainingRaces: number | null) {
		const parts: string[] = [];
		if (yearsRemaining != null) parts.push(`${yearsRemaining}y`);
		if (remainingRaces != null) parts.push(`${remainingRaces} races`);
		return parts.length ? parts.join(' / ') : '—';
	}

	function requirements(c: SponsorCatalogView) {
		const parts = [`mkt ≥ ${c.minMarketability}`];
		if (c.minTeamStanding != null) parts.push(`standing ≥ ${c.minTeamStanding}`);
		return parts.join(', ');
	}

	function blockLabel(c: SponsorCatalogView, slot: SlotType) {
		const el = c.eligibility[slot];
		if (!el) return 'unavailable';
		if (c.alreadySigned) return 'already signed';
		return el.blockReasons.map(label).join(', ') || 'blocked';
	}

	async function onSign(sponsorId: number, slotType: SlotType) {
		onBusy(true);
		onError('');
		try {
			const res = await signSponsorDeal({ sponsorId, slotType });
			if (!res) return;
			const result = res.result as SignResult;
			if (!result.signed) {
				onError(result.blockReasons.map(label).join(', ') || 'Sign failed');
				onSponsors(res.sponsors);
				return;
			}
			onSponsors(res.sponsors);
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
			<p class="ops-eyebrow">Sponsors · season {sponsors.clock.seasonYear}</p>
			<h1 class="ops-brand">{sponsors.team.name}</h1>
			<p class="hq-hero-subtitle">Week {sponsors.clock.week}</p>
		</div>
		<div class="ops-row">
			<a class="ops-btn ghost" href={hqHref}>Team HQ</a>
		</div>
	</div>
</section>

<div class="hq-stat-grid">
	<article class="hq-stat-card">
		<span>Cash</span>
		<strong>{money(sponsors.team.cash)}</strong>
		<small>Operating balance</small>
	</article>
	<article class="hq-stat-card">
		<span>Reputation</span>
		<strong>{sponsors.profile.reputation.toFixed(0)}</strong>
		<small>Team reputation</small>
	</article>
	<article class="hq-stat-card">
		<span>Standing</span>
		<strong
			>{sponsors.profile.standing != null
				? sponsors.profile.standing.toFixed(0)
				: '—'}</strong
		>
		<small>Championship standing</small>
	</article>
	<article class="hq-stat-card">
		<span>Marketability</span>
		<strong>{sponsors.profile.driverMarketability.toFixed(0)}</strong>
		<small>Driver marketability</small>
	</article>
</div>

<section class="ops-panel">
	<p class="ops-eyebrow">Slot inventory</p>
	{#if sponsors.slots.length === 0}
		<p class="ops-muted">No slots.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Slot</th>
					<th>Used</th>
					<th>Cap</th>
				</tr>
			</thead>
			<tbody>
				{#each sponsors.slots as s (s.slotType)}
					<tr>
						<td>{label(s.slotType)}</td>
						<td class="ops-mono">{s.used}</td>
						<td class="ops-mono">{s.cap}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Active deals</p>
	{#if sponsors.deals.length === 0}
		<p class="ops-muted">No active deals.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Sponsor</th>
					<th>Slot</th>
					<th>Term</th>
					<th>Streams</th>
				</tr>
			</thead>
			<tbody>
				{#each sponsors.deals as d (`${d.sponsorId}:${d.slotType}`)}
					<tr>
						<td>{d.sponsorName}</td>
						<td>{label(d.slotType)}</td>
						<td class="ops-mono">{termLabel(d.yearsRemaining, d.remainingRaces)}</td>
						<td class="ops-mono">{streamsSummary(d.streams)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="ops-panel">
	<p class="ops-eyebrow">Catalog</p>
	{#if sponsors.catalog.length === 0}
		<p class="ops-muted">No sponsors in catalog.</p>
	{:else}
		<table class="ops-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Nationality</th>
					<th>Requirements</th>
					<th>Title</th>
					<th>Major</th>
					<th>Minor</th>
				</tr>
			</thead>
			<tbody>
				{#each sponsors.catalog as c (c.sponsorId)}
					<tr>
						<td>{c.name}</td>
						<td>{c.nationalityCode ?? '—'}</td>
						<td>{requirements(c)}</td>
						{#each SLOT_TYPES as slot (slot)}
							<td>
								{#if !c.alreadySigned && c.eligibility[slot]?.eligible}
									<button
										class="ops-btn primary"
										disabled={busy}
										onclick={() => onSign(c.sponsorId, slot)}
									>
										Sign {label(slot)}
									</button>
								{:else}
									<span class="ops-muted">{blockLabel(c, slot)}</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
