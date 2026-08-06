<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Cloud from '@lucide/svelte/icons/cloud';
	import CloudRain from '@lucide/svelte/icons/cloud-rain';
	import CloudSun from '@lucide/svelte/icons/cloud-sun';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Flag from '@lucide/svelte/icons/flag';
	import Inbox from '@lucide/svelte/icons/inbox';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';
	import Trophy from '@lucide/svelte/icons/trophy';
	import UsersRound from '@lucide/svelte/icons/users-round';
	import Wrench from '@lucide/svelte/icons/wrench';
	import type { Component } from 'svelte';

	type NavigationId =
		| 'dashboard'
		| 'inbox'
		| 'calendar'
		| 'development'
		| 'drivers'
		| 'staff'
		| 'scouting'
		| 'finances'
		| 'race-weekend'
		| 'standings';
	type Tone = 'positive' | 'negative' | 'warning' | 'info' | 'muted';

	type NavigationItem = {
		id: NavigationId;
		label: string;
		icon: Component;
		badge?: number;
	};

	type Session = {
		day: string;
		name: string;
		time: string;
	};

	type Forecast = {
		day: string;
		condition: string;
		temperature: string;
		rain: string;
		icon: Component;
	};

	type Driver = {
		number: string;
		name: string;
		form: string;
		status: string;
		rating: number;
		potential: string;
		finishes: string[];
	};

	const navigation: NavigationItem[] = [
		{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ id: 'inbox', label: 'Inbox', icon: Inbox, badge: 2 },
		{ id: 'calendar', label: 'Calendar', icon: CalendarDays },
		{ id: 'development', label: 'Development', icon: Wrench },
		{ id: 'drivers', label: 'Drivers', icon: UsersRound },
		{ id: 'staff', label: 'Staff', icon: UsersRound },
		{ id: 'scouting', label: 'Scouting', icon: Search },
		{ id: 'finances', label: 'Finances', icon: DollarSign },
		{ id: 'race-weekend', label: 'Race Weekend', icon: Flag },
		{ id: 'standings', label: 'Standings', icon: Trophy }
	];

	const sessions: Session[] = [
		{ day: 'FRI', name: 'Free Practice 1', time: '09:30' },
		{ day: 'FRI', name: 'Free Practice 2', time: '13:00' },
		{ day: 'SAT', name: 'Free Practice 3', time: '10:00' },
		{ day: 'SAT', name: 'Qualifying', time: '14:00' },
		{ day: 'SUN', name: 'Main Race', time: '13:00' }
	];

	const forecast: Forecast[] = [
		{
			day: 'Friday',
			condition: 'Sunny',
			temperature: '24° / 16°',
			rain: '0% rain',
			icon: CloudSun
		},
		{
			day: 'Saturday',
			condition: 'Partly Cloudy',
			temperature: '22° / 15°',
			rain: '15% rain',
			icon: Cloud
		},
		{
			day: 'Sunday',
			condition: 'Rain likely',
			temperature: '19° / 14°',
			rain: '65% rain',
			icon: CloudRain
		}
	];

	const standings = [
		{ position: 2, team: 'Scuderia Falcone', code: 'SCF', points: 342, movement: 'flat' },
		{ position: 3, team: 'Kestrel', code: 'KES', points: 342, movement: 'up' },
		{
			position: 4,
			team: 'Meridian Motorsports',
			code: 'MER',
			points: 186,
			movement: 'up',
			current: true
		},
		{ position: 5, team: 'Nordic Prime', code: 'NOR', points: 164, movement: 'down' },
		{ position: 6, team: 'Aurora', code: 'AUR', points: 142, movement: 'flat' }
	];

	const financialLines = [
		{ label: 'Sponsorship', amount: '+$6,800,000', value: 100, tone: 'positive' as Tone },
		{ label: 'Prize money', amount: '+$1,900,000', value: 42, tone: 'positive' as Tone },
		{ label: 'Payroll', amount: '-$3,100,000', value: 72, tone: 'negative' as Tone },
		{ label: 'Development burn', amount: '-$1,400,000', value: 28, tone: 'negative' as Tone }
	];

	const carCategories = [
		{ label: 'Aero', value: 84, change: '+2', tone: 'positive' as Tone },
		{ label: 'Chassis', value: 79, change: '0', tone: 'muted' as Tone },
		{ label: 'Powertrain', value: 76, change: '+1', tone: 'positive' as Tone },
		{ label: 'Reliability', value: 88, change: '-1', tone: 'negative' as Tone }
	];

	const drivers: Driver[] = [
		{
			number: '14',
			name: 'Mateo Salas',
			form: 'P5 · 112 pts',
			status: 'Confident',
			rating: 87,
			potential: 'A−',
			finishes: ['P8', 'P3', 'P5', 'P6', 'P10', 'P7', 'P5', 'P4']
		},
		{
			number: '27',
			name: 'Amara Okafor',
			form: 'P11 · 74 pts',
			status: 'Focused',
			rating: 82,
			potential: 'A',
			finishes: ['P12', 'P9', 'P11', 'P8', 'P9', 'P6', 'P9', 'P11']
		}
	];

	const objectives = [
		{
			label: 'Finish P4 in Constructors Championship',
			state: 'On track',
			value: 68,
			tone: 'positive' as Tone
		},
		{ label: 'Salas top-3 finish', state: 'Behind', value: 44, tone: 'warning' as Tone },
		{ label: 'Under budget cap', state: 'On track', value: 63, tone: 'positive' as Tone },
		{ label: 'Reliability > 90%', state: 'At risk', value: 57, tone: 'warning' as Tone }
	];

	const decisions = [
		{
			icon: AlertTriangle,
			tone: 'warning' as Tone,
			title: 'Wet setup for Estoril',
			detail: 'Sunday shows 65% rain probability. Marchetti recommends a compromised aero package.',
			action: 'Review'
		},
		{
			icon: Wrench,
			tone: 'positive' as Tone,
			title: 'Front Wing Concept B ready',
			detail: 'Manufacturing complete. Ship with car #14 only, or both drivers?',
			action: 'Assign'
		},
		{
			icon: CircleDot,
			tone: 'info' as Tone,
			title: 'Sponsor pitch: Halcyon Watches',
			detail: 'Mid-tier offer, 2 seasons, $4.5M/year + performance bonuses.',
			action: 'Open'
		},
		{
			icon: CheckCircle2,
			tone: 'positive' as Tone,
			title: 'Sahran GP debrief filed',
			detail: 'P5 / P9 · +18 points · No incidents · Reliability nominal.',
			action: 'Review'
		}
	];

	let active = $state<NavigationId>('dashboard');

	function selectNavigation(id: NavigationId) {
		active = id;
	}

	function titleFor(id: NavigationId) {
		return navigation.find((item) => item.id === id)?.label ?? 'Dashboard';
	}

	function finishClass(finish: string) {
		const position = Number.parseInt(finish.slice(1), 10);

		if (position === 1) return 'win';
		if (position <= 3) return 'podium';
		if (position <= 10) return 'points';
		return 'outside-points';
	}
</script>

<svelte:head>
	<title>{titleFor(active)} | Grand Prix Manager</title>
</svelte:head>

<main class="game-shell" aria-label="Game dashboard">
	<aside class="sidebar">
		<div class="team-identity">
			<div class="team-mark" aria-hidden="true">MER</div>
			<div class="team-copy">
				<strong>Meridian Motorsports</strong>
				<span>Junior Formula Cup</span>
			</div>
		</div>

		<nav class="navigation" aria-label="Game navigation">
			{#each navigation as item (item.id)}
				<button
					type="button"
					class="nav-item"
					class:active={active === item.id}
					onclick={() => selectNavigation(item.id)}
					aria-current={active === item.id ? 'page' : undefined}
				>
					<item.icon class="nav-icon" strokeWidth={1.7} aria-hidden="true" />
					<span>{item.label}</span>
					{#if item.badge}
						<span class="notification-badge" aria-label={`${item.badge} unread messages`}
							>{item.badge}</span
						>
					{/if}
				</button>
			{/each}
		</nav>

		<div class="settings-dock">
			<button type="button" class="nav-item" onclick={() => selectNavigation('dashboard')}>
				<Settings class="nav-icon" strokeWidth={1.7} aria-hidden="true" />
				<span>Settings</span>
			</button>
		</div>
	</aside>

	<section class="game-content">
		<header class="top-bar">
			<div class="breadcrumb" aria-label="Current location">
				<span>Season 2027</span>
				<ChevronRight class="breadcrumb-icon" strokeWidth={1.7} aria-hidden="true" />
				<strong>{titleFor(active)}</strong>
			</div>

			<button type="button" class="advance-button">
				<span>Advance</span>
				<ArrowRight strokeWidth={2} aria-hidden="true" />
			</button>
		</header>

		<div class="workspace" aria-label="Dashboard workspace">
			<div class="dashboard-grid">
				<section class="command-header" aria-labelledby="command-center-title">
					<div class="headline">
						<div class="eyebrow">ROUND 9 OF 24 <span>·</span> SUNDAY BRIEF</div>
						<h1 id="command-center-title">Season 2027 - Command Center</h1>
						<p>
							Four days until lights out at Estoril. Practice sessions open Friday 09:30 local. Two
							decisions require your sign-off before then.
						</p>
					</div>
					<div class="stat-strip" aria-label="Team status">
						<div class="stat-tile">
							<span>Constructors</span>
							<strong>P4 <em class="positive">+1</em></strong>
						</div>
						<div class="stat-tile">
							<span>Points</span>
							<strong>186 <em class="positive">+18</em></strong>
						</div>
						<div class="stat-tile">
							<span>Car rating</span>
							<strong>82 <em class="positive">+3</em></strong>
						</div>
						<div class="stat-tile">
							<span>Morale</span>
							<strong>Good</strong>
						</div>
					</div>
				</section>

				<section class="card race-card" aria-labelledby="race-weekend-title">
					<div class="card-heading">
						<span>Next race weekend</span>
						<span class="heading-meta"><MapPin aria-hidden="true" /> Estoril <b>·</b> Portugal</span
						>
					</div>
					<div class="race-card-body">
						<div class="race-overview">
							<div class="race-round">ROUND 9</div>
							<div class="race-title-row">
								<h2 id="race-weekend-title">Portuguese Grand Prix</h2>
								<span class="track-badge">MEDIUM DOWNFORCE</span>
							</div>
							<p class="track-detail">
								Autodromo do Estoril <span>·</span> 4.182 km <span>·</span> 71 laps
							</p>

							<div class="session-grid">
								{#each sessions as session (session.name)}
									<div class="session-item">
										<div>
											<span>{session.day}</span>
											<strong>{session.name}</strong>
										</div>
										<time>{session.time}</time>
									</div>
								{/each}
							</div>

							<div class="track-metrics">
								<div><span>Track fit</span><strong class="positive">7.8</strong></div>
								<div><span>Tyre wear</span><strong class="warning">High</strong></div>
								<div><span>Overtaking</span><strong class="negative">Low</strong></div>
							</div>
						</div>

						<div class="forecast-panel">
							<div class="panel-label"><span>Weekend forecast</span><small>GMT +1</small></div>
							{#each forecast as day (day.day)}
								<div class="forecast-row">
									<div class="forecast-icon"><day.icon aria-hidden="true" /></div>
									<div class="forecast-copy">
										<strong>{day.day}</strong><span>{day.condition}</span>
									</div>
									<div class="forecast-values">
										<strong>{day.temperature}</strong><span>{day.rain}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</section>

				<section class="card inbox-card" aria-labelledby="inbox-title">
					<div class="card-heading">
						<span id="inbox-title">Inbox</span>
						<span class="heading-action"
							><b>2 urgent</b> Open <ChevronRight aria-hidden="true" /></span
						>
					</div>
					<div class="inbox-list">
						<div class="inbox-row">
							<div class="inbox-top"><strong>H. Marchetti</strong><time>2h</time></div>
							<div class="inbox-bottom">
								<span>Sign-off: Wet setup for Estoril</span><em class="tag tag-positive"
									>Engineering</em
								>
							</div>
						</div>
						<div class="inbox-row">
							<div class="inbox-top"><strong>FIA</strong><time>5h</time></div>
							<div class="inbox-bottom">
								<span>Notice: Floor scrutineering protocol update</span><em class="tag tag-negative"
									>Regulatory</em
								>
							</div>
						</div>
						<div class="inbox-row">
							<div class="inbox-top"><strong>Rossi Motors</strong><time>1d</time></div>
							<div class="inbox-bottom">
								<span>Podium bonus paid - Sahran GP</span><em class="tag tag-warning">Sponsor</em>
							</div>
						</div>
						<div class="inbox-row">
							<div class="inbox-top"><strong>Amara Okafor</strong><time>1d</time></div>
							<div class="inbox-bottom">
								<span>Contract extension - informal request</span><em class="tag tag-agent"
									>Drivers</em
								>
							</div>
						</div>
						<div class="inbox-row">
							<div class="inbox-top"><strong>P. Anand</strong><time>1d</time></div>
							<div class="inbox-bottom">
								<span>Engine pool projection revised</span><em class="tag tag-positive"
									>Engineering</em
								>
							</div>
						</div>
					</div>
				</section>

				<section class="card standings-card" aria-labelledby="championship-title">
					<div class="card-heading">
						<span id="championship-title">Championship</span><span class="heading-action"
							>Standings <ChevronRight aria-hidden="true" /></span
						>
					</div>
					<div class="standings-list">
						{#each standings as row (row.code)}
							<div class="standing-row" class:current={row.current}>
								<span class="standing-position">{row.position}</span>
								<span class="standing-code">{row.code}</span>
								<strong>{row.team}</strong>
								{#if row.movement === 'up'}<span class="movement positive" aria-label="Up"
										><ChevronUp aria-hidden="true" /></span
									>{:else if row.movement === 'down'}<span
										class="movement negative"
										aria-label="Down"><ChevronDown aria-hidden="true" /></span
									>{:else}<span class="movement muted">—</span>{/if}
								<span class="standing-points">{row.points}</span>
							</div>
						{/each}
					</div>
					<div class="gap-summary">
						<div><span>Gap to P3</span><strong class="warning">-34 pts</strong></div>
						<div><span>Gap to P5</span><strong class="positive">+22 pts</strong></div>
					</div>
				</section>

				<section class="card finances-card" aria-labelledby="finances-title">
					<div class="card-heading">
						<span id="finances-title">Finances</span><span class="heading-action"
							>Ledger <ChevronRight aria-hidden="true" /></span
						>
					</div>
					<div class="finances-body">
						<div class="funds-line">
							<div><strong>$84,500,000</strong><span>Operating funds</span></div>
							<span class="positive"><ChevronUp aria-hidden="true" /> $4,200,000 MTD</span>
						</div>
						{#each financialLines as line (line.label)}
							<div class="finance-line">
								<div><span>{line.label}</span><strong class={line.tone}>{line.amount}</strong></div>
								<div class="bar-track">
									<span class={`bar-fill ${line.tone}`} style={`width: ${line.value}%`}></span>
								</div>
							</div>
						{/each}
						<div class="cap-line">
							<span>Budget cap usage</span><strong>$41,200,000 / $135,000,000</strong>
							<div class="bar-track"><span class="bar-fill neutral" style="width: 31%"></span></div>
						</div>
					</div>
				</section>

				<section class="card development-card" aria-labelledby="development-title">
					<div class="card-heading">
						<span id="development-title">Car development</span><span class="heading-action"
							>Development <ChevronRight aria-hidden="true" /></span
						>
					</div>
					<div class="development-body">
						<div class="category-grid">
							{#each carCategories as category (category.label)}
								<div class="category-tile">
									<div>
										<span>{category.label}</span><strong class={category.tone}
											>{category.change}</strong
										>
									</div>
									<b>{category.value}</b>
									<div class="bar-track">
										<span class="bar-fill positive" style={`width: ${category.value}%`}></span>
									</div>
								</div>
							{/each}
						</div>
						<div class="shipping-label">Shipping this weekend</div>
						<div class="shipping-row">
							<div><strong>Front Wing Concept B</strong><span>Aero</span></div>
							<em class="positive">+0.12s</em>
						</div>
						<div class="shipping-row">
							<div><strong>Sidepod Cooling Rev.2</strong><span>Reliability</span></div>
							<em class="positive">-2% DNF</em>
						</div>
					</div>
				</section>

				<section class="card drivers-card" aria-labelledby="drivers-title">
					<div class="card-heading">
						<span id="drivers-title">Drivers &amp; form</span><span class="heading-action"
							>Drivers <ChevronRight aria-hidden="true" /></span
						>
					</div>
					<div class="drivers-grid">
						{#each drivers as driver (driver.number)}
							<div class="driver-tile">
								<div class="driver-heading">
									<span class="driver-number">{driver.number}</span>
									<div>
										<strong>{driver.name}</strong><span
											>{driver.form} · <em>{driver.status}</em></span
										>
									</div>
									<b>{driver.rating}<small>POT {driver.potential}</small></b>
								</div>
								<div class="form-label">Last 8 finishes</div>
								<div class="finish-list">
									{#each driver.finishes as finish, index (`${driver.number}-${index}`)}
										<button
											type="button"
											class={`finish-result ${finishClass(finish)}`}
											tabindex="-1"
										>
											{finish}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</section>

				<section class="card objectives-card" aria-labelledby="objectives-title">
					<div class="card-heading">
						<span id="objectives-title">Board objectives</span><span class="heading-action"
							>Season</span
						>
					</div>
					<div class="objectives-list">
						{#each objectives as objective (objective.label)}
							<div class="objective-row">
								<div>
									<span>{objective.label}</span><strong class={objective.tone}
										>{objective.state}</strong
									>
								</div>
								<div class="bar-track">
									<span class={`bar-fill ${objective.tone}`} style={`width: ${objective.value}%`}
									></span>
								</div>
							</div>
						{/each}
					</div>
				</section>

				<section class="card decisions-card" aria-labelledby="decisions-title">
					<div class="card-heading">
						<span id="decisions-title">Alerts &amp; decisions</span><span class="heading-action"
							>3 pending</span
						>
					</div>
					<div class="decision-list">
						{#each decisions as decision (decision.title)}
							<div class="decision-row">
								<div class={`decision-icon ${decision.tone}`}>
									<decision.icon aria-hidden="true" />
								</div>
								<div class="decision-copy">
									<strong>{decision.title}</strong><span>{decision.detail}</span>
								</div>
								<button type="button" class="row-action"
									>{decision.action}<ChevronRight aria-hidden="true" /></button
								>
							</div>
						{/each}
					</div>
				</section>
			</div>
		</div>
	</section>
</main>

<style>
	.game-shell {
		--u: var(--ui-scale);
		display: grid;
		grid-template-columns: calc(256px * var(--u)) minmax(0, 1fr);
		width: 100vw;
		height: 100dvh;
		min-width: calc(900px * var(--u));
		min-height: calc(600px * var(--u));
		overflow: hidden;
		background: var(--background);
		color: var(--content-primary);
		font-family: var(--font-ui);
	}

	.sidebar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		height: 100dvh;
		min-width: 0;
		overflow: hidden;
		background: var(--surface-dark);
		border-right: 1px solid var(--border);
	}

	.team-identity {
		display: flex;
		align-items: center;
		gap: calc(8px * var(--u));
		height: calc(72px * var(--u));
		padding: 0 calc(16px * var(--u));
		border-bottom: 1px solid var(--border);
	}

	.team-mark {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: calc(40px * var(--u));
		height: calc(40px * var(--u));
		border-radius: calc(4px * var(--u));
		background: var(--content-primary);
		color: var(--background);
		font-family: var(--font-mono);
		font-size: calc(13px * var(--u));
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.team-copy {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: calc(2px * var(--u));
	}

	.team-copy strong,
	.team-copy span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.team-copy strong {
		font-size: calc(14px * var(--u));
		font-weight: 600;
		line-height: 1.2;
	}

	.team-copy span {
		font-size: calc(12px * var(--u));
		line-height: 1.2;
		color: var(--content-secondary);
	}

	.navigation {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: calc(4px * var(--u));
		padding: calc(24px * var(--u)) calc(16px * var(--u));
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: calc(12px * var(--u));
		width: 100%;
		height: calc(36px * var(--u));
		padding: 0 calc(12px * var(--u));
		border: 0;
		border-radius: calc(7px * var(--u));
		background: transparent;
		color: var(--content-secondary);
		font-family: inherit;
		font-size: calc(14px * var(--u));
		font-weight: 500;
		line-height: 1;
		text-align: left;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.nav-item:hover,
	.nav-item.active {
		background: var(--surface-hover);
		color: var(--content-primary);
	}

	.nav-item:focus-visible,
	.advance-button:focus-visible,
	.row-action:focus-visible {
		outline: calc(2px * var(--u)) solid var(--info);
		outline-offset: calc(2px * var(--u));
	}

	:global(.nav-icon) {
		flex: 0 0 auto;
		width: calc(16px * var(--u));
		height: calc(16px * var(--u));
	}

	.notification-badge {
		display: grid;
		place-items: center;
		width: calc(20px * var(--u));
		height: calc(20px * var(--u));
		margin-left: auto;
		border-radius: 999px;
		background: var(--info);
		color: var(--background);
		font-size: calc(12px * var(--u));
		font-weight: 700;
	}

	.settings-dock {
		padding: calc(16px * var(--u)) calc(16px * var(--u)) calc(24px * var(--u));
		border-top: 1px solid var(--border);
	}

	.game-content {
		display: flex;
		min-height: 0;
		min-width: 0;
		flex-direction: column;
		overflow: hidden;
		background: var(--background);
	}

	.top-bar {
		position: sticky;
		top: 0;
		z-index: 9;
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: space-between;
		height: calc(72px * var(--u));
		padding: 0 calc(24px * var(--u));
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--background) 96%, transparent);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: calc(8px * var(--u));
		min-width: 0;
		font-size: calc(14px * var(--u));
		line-height: 1;
	}

	.breadcrumb > span {
		color: var(--content-secondary);
	}

	.breadcrumb strong {
		font-weight: 700;
	}

	:global(.breadcrumb-icon) {
		flex: 0 0 auto;
		width: calc(16px * var(--u));
		height: calc(16px * var(--u));
		color: var(--content-tertiary);
	}

	.advance-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: calc(8px * var(--u));
		width: calc(115px * var(--u));
		height: calc(40px * var(--u));
		padding: 0 calc(16px * var(--u));
		border: 0;
		border-radius: calc(5px * var(--u));
		background: var(--positive);
		color: #06120a;
		font-family: inherit;
		font-size: calc(14px * var(--u));
		font-weight: 700;
		cursor: pointer;
		transition:
			filter 150ms ease,
			transform 150ms ease;
	}

	.advance-button:hover {
		filter: brightness(1.08);
		transform: translateY(calc(-1px * var(--u)));
	}

	.advance-button :global(svg) {
		width: calc(16px * var(--u));
		height: calc(16px * var(--u));
	}

	.workspace {
		flex: 1 1 auto;
		height: 0;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		background: var(--background);
	}

	.workspace::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(12, calc(120px * var(--u)));
		gap: calc(16px * var(--u));
		padding: calc(24px * var(--u));
	}

	.command-header {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: calc(24px * var(--u));
		min-width: 0;
		padding-bottom: calc(2px * var(--u));
	}

	.eyebrow,
	.card-heading,
	.panel-label,
	.race-round,
	.form-label,
	.shipping-label,
	.standing-position,
	.standing-code,
	.stat-tile > span,
	.category-tile > div > span,
	.track-metrics span,
	.gap-summary span,
	.cap-line > span,
	.inbox-bottom span,
	.forecast-copy span,
	.driver-heading > div > span {
		font-size: calc(11px * var(--u));
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.eyebrow {
		color: var(--content-tertiary);
		font-weight: 700;
	}

	.eyebrow span,
	.track-detail span,
	.race-title-row span {
		color: var(--content-tertiary);
	}

	.headline h1 {
		margin: calc(6px * var(--u)) 0 calc(5px * var(--u));
		font-size: calc(25px * var(--u));
		font-weight: 600;
		letter-spacing: -0.035em;
		line-height: 1.1;
	}

	.headline p {
		max-width: calc(720px * var(--u));
		margin: 0;
		color: var(--content-tertiary);
		font-size: calc(13px * var(--u));
		line-height: 1.45;
	}

	.stat-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(calc(92px * var(--u)), 1fr));
		gap: calc(12px * var(--u));
	}

	.stat-tile {
		display: flex;
		min-width: calc(100px * var(--u));
		min-height: calc(70px * var(--u));
		flex-direction: column;
		justify-content: center;
		gap: calc(6px * var(--u));
		padding: calc(10px * var(--u)) calc(14px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(6px * var(--u));
		background: var(--surface);
	}

	.stat-tile > span {
		color: var(--content-tertiary);
	}

	.stat-tile strong {
		font-size: calc(21px * var(--u));
		font-weight: 600;
		line-height: 1;
	}

	.stat-tile em {
		margin-left: calc(3px * var(--u));
		font-family: var(--font-mono);
		font-size: calc(11px * var(--u));
		font-style: normal;
		font-weight: 500;
	}

	.card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: calc(7px * var(--u));
		background: var(--surface);
	}

	.race-card {
		grid-column: span 8;
		min-height: calc(332px * var(--u));
	}

	.inbox-card {
		grid-column: span 4;
		min-height: calc(332px * var(--u));
	}

	.standings-card,
	.finances-card,
	.development-card,
	.objectives-card {
		grid-column: span 4;
	}

	.standings-card,
	.finances-card,
	.development-card {
		min-height: calc(282px * var(--u));
	}

	.objectives-card,
	.drivers-card {
		min-height: calc(190px * var(--u));
	}

	.card-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: calc(38px * var(--u));
		padding: calc(9px * var(--u)) calc(16px * var(--u));
		border-bottom: 1px solid var(--border);
		color: var(--content-tertiary);
		font-weight: 500;
	}

	.heading-meta,
	.heading-action {
		display: inline-flex;
		align-items: center;
		gap: calc(6px * var(--u));
		color: var(--content-tertiary);
		font-size: calc(12px * var(--u));
		letter-spacing: normal;
		text-transform: none;
	}

	.heading-meta :global(svg),
	.heading-action :global(svg) {
		width: calc(14px * var(--u));
		height: calc(14px * var(--u));
	}

	.heading-meta b {
		color: var(--content-disabled);
		font-weight: 400;
	}

	.heading-action b {
		padding: calc(2px * var(--u)) calc(5px * var(--u));
		border-radius: calc(3px * var(--u));
		background: var(--positive-bg);
		color: var(--positive);
		font-size: calc(10px * var(--u));
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.race-card-body {
		display: grid;
		flex: 1;
		min-height: 0;
		grid-template-columns: minmax(0, 1.25fr) minmax(calc(280px * var(--u)), 1fr);
		gap: calc(16px * var(--u));
		padding: calc(16px * var(--u));
	}

	.race-overview {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.race-round {
		color: var(--content-tertiary);
		font-weight: 600;
	}

	.race-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: calc(12px * var(--u));
		margin-top: calc(3px * var(--u));
	}

	.race-title-row h2 {
		margin: 0;
		font-size: calc(21px * var(--u));
		font-weight: 600;
		letter-spacing: -0.025em;
		line-height: 1.15;
	}

	.track-badge {
		flex: 0 0 auto;
		padding: calc(3px * var(--u)) calc(6px * var(--u));
		border-radius: calc(3px * var(--u));
		background: var(--surface-light);
		color: var(--content-tertiary);
		font-size: calc(10px * var(--u));
		font-weight: 500;
		letter-spacing: 0.02em;
	}

	.track-detail {
		margin: calc(3px * var(--u)) 0 calc(14px * var(--u));
		color: var(--content-tertiary);
		font-size: calc(12px * var(--u));
	}

	.session-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: calc(8px * var(--u));
	}

	.session-item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		min-height: calc(52px * var(--u));
		gap: calc(5px * var(--u));
		padding: calc(9px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(5px * var(--u));
		background: var(--background);
	}

	.session-item div {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: calc(4px * var(--u));
	}

	.session-item span,
	.session-item time {
		color: var(--content-tertiary);
		font-family: var(--font-mono);
		font-size: calc(10px * var(--u));
		font-weight: 500;
	}

	.session-item strong {
		overflow: hidden;
		font-size: calc(12px * var(--u));
		font-weight: 600;
		line-height: 1.15;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.track-metrics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: calc(8px * var(--u));
		margin-top: auto;
		padding-top: calc(8px * var(--u));
	}

	.track-metrics > div {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: calc(5px * var(--u));
		padding: calc(8px * var(--u)) calc(9px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(5px * var(--u));
		background: var(--background);
	}

	.track-metrics span,
	.gap-summary span {
		color: var(--content-tertiary);
	}

	.track-metrics strong,
	.gap-summary strong {
		font-family: var(--font-mono);
		font-size: calc(13px * var(--u));
		font-weight: 600;
	}

	.forecast-panel {
		padding: calc(12px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(6px * var(--u));
		background: var(--background);
	}

	.panel-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: calc(8px * var(--u));
		color: var(--content-tertiary);
		font-weight: 500;
	}

	.panel-label small {
		font-size: calc(10px * var(--u));
		letter-spacing: normal;
		text-transform: none;
	}

	.forecast-row {
		display: grid;
		grid-template-columns: calc(32px * var(--u)) minmax(0, 1fr) auto;
		align-items: center;
		gap: calc(8px * var(--u));
		padding: calc(8px * var(--u)) 0;
		border-top: 1px solid var(--border);
	}

	.forecast-icon {
		display: grid;
		place-items: center;
		width: calc(32px * var(--u));
		height: calc(32px * var(--u));
		border-radius: calc(5px * var(--u));
		background: var(--surface-light);
		color: var(--content-tertiary);
	}

	.forecast-icon :global(svg) {
		width: calc(18px * var(--u));
		height: calc(18px * var(--u));
	}

	.forecast-copy,
	.forecast-values {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: calc(3px * var(--u));
	}

	.forecast-copy strong,
	.forecast-values strong {
		font-size: calc(12px * var(--u));
		font-weight: 600;
	}

	.forecast-copy span {
		font-size: calc(11px * var(--u));
		letter-spacing: normal;
		text-transform: none;
	}

	.forecast-values {
		align-items: flex-end;
	}

	.forecast-values span {
		color: var(--warning);
		font-family: var(--font-mono);
		font-size: calc(10px * var(--u));
	}

	.inbox-list,
	.standings-list,
	.decision-list {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
	}

	.standings-list {
		padding-top: calc(12px * var(--u));
	}

	.inbox-row {
		display: flex;
		flex: 1;
		min-height: calc(59px * var(--u));
		flex-direction: column;
		justify-content: center;
		gap: calc(5px * var(--u));
		padding: calc(8px * var(--u)) calc(16px * var(--u));
		border-bottom: 1px solid var(--border);
	}

	.inbox-row:last-child,
	.decision-row:last-child {
		border-bottom: 0;
	}

	.inbox-top,
	.inbox-bottom,
	.shipping-row,
	.driver-heading,
	.objective-row > div:first-child,
	.finance-line > div:first-child,
	.cap-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: calc(8px * var(--u));
	}

	.inbox-top strong {
		font-size: calc(13px * var(--u));
		font-weight: 600;
	}

	.inbox-top time {
		color: var(--content-tertiary);
		font-family: var(--font-mono);
		font-size: calc(11px * var(--u));
	}

	.inbox-bottom span {
		overflow: hidden;
		color: var(--content-tertiary);
		font-size: calc(11px * var(--u));
		letter-spacing: normal;
		text-overflow: ellipsis;
		text-transform: none;
		white-space: nowrap;
	}

	.tag {
		flex: 0 0 auto;
		padding: calc(2px * var(--u)) calc(5px * var(--u));
		border-radius: calc(2px * var(--u));
		font-family: var(--font-mono);
		font-size: calc(9px * var(--u));
		font-style: normal;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.tag-positive {
		background: var(--positive-bg);
		color: var(--positive);
	}
	.tag-negative {
		background: var(--negative-bg);
		color: var(--negative);
	}
	.tag-warning {
		background: var(--warning-bg);
		color: var(--warning);
	}
	.tag-agent {
		background: var(--agent-bg);
		color: var(--agent);
	}

	.standing-row {
		display: grid;
		grid-template-columns:
			calc(22px * var(--u)) calc(31px * var(--u)) minmax(0, 1fr) calc(20px * var(--u))
			calc(38px * var(--u));
		align-items: center;
		gap: calc(7px * var(--u));
		min-height: calc(31px * var(--u));
		padding: 0 calc(16px * var(--u));
	}

	.standing-row.current {
		background: var(--surface-hover);
	}

	.standing-position,
	.standing-code,
	.standing-points {
		font-family: var(--font-mono);
		font-size: calc(11px * var(--u));
	}

	.standing-position,
	.standing-code {
		color: var(--content-tertiary);
	}

	.standing-row strong {
		overflow: hidden;
		font-size: calc(12px * var(--u));
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.standing-points {
		color: var(--content-tertiary);
		text-align: right;
	}

	.movement {
		display: grid;
		place-items: center;
		width: calc(14px * var(--u));
		height: calc(14px * var(--u));
		color: inherit;
		font-size: calc(14px * var(--u));
		text-align: center;
	}

	.movement :global(svg) {
		width: calc(14px * var(--u));
		height: calc(14px * var(--u));
	}

	.gap-summary {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: calc(16px * var(--u));
		margin: calc(12px * var(--u)) calc(16px * var(--u)) calc(15px * var(--u));
		padding-top: calc(13px * var(--u));
		border-top: 1px solid var(--border);
	}

	.gap-summary > div {
		display: flex;
		flex-direction: column;
		gap: calc(5px * var(--u));
	}

	.finances-body,
	.development-body,
	.objectives-list {
		flex: 1;
		min-height: 0;
		padding: calc(14px * var(--u)) calc(16px * var(--u));
	}

	.finances-body,
	.development-body {
		display: flex;
		flex-direction: column;
	}

	.funds-line {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: calc(8px * var(--u));
		margin-bottom: calc(13px * var(--u));
	}

	.funds-line > div {
		display: flex;
		flex-direction: column;
		gap: calc(3px * var(--u));
	}

	.funds-line strong {
		font-family: var(--font-mono);
		font-size: calc(22px * var(--u));
		font-weight: 600;
		letter-spacing: -0.05em;
		line-height: 1;
	}

	.funds-line span,
	.finance-line span,
	.finance-line strong,
	.cap-line {
		font-size: calc(11px * var(--u));
	}

	.funds-line > span {
		display: inline-flex;
		align-items: center;
		gap: calc(4px * var(--u));
		font-family: var(--font-mono);
		font-size: calc(11px * var(--u));
		white-space: nowrap;
	}

	.funds-line :global(svg),
	.positive :global(svg) {
		width: calc(12px * var(--u));
		height: calc(12px * var(--u));
	}

	.finance-line {
		margin-top: calc(8px * var(--u));
	}

	.finance-line strong,
	.cap-line strong {
		font-family: var(--font-mono);
		font-weight: 500;
	}

	.bar-track {
		height: calc(5px * var(--u));
		margin-top: calc(5px * var(--u));
		overflow: hidden;
		border-radius: 999px;
		background: var(--surface-light);
	}

	.bar-fill {
		display: block;
		height: 100%;
		border-radius: inherit;
	}

	.bar-fill.positive {
		background: var(--positive);
	}
	.bar-fill.negative {
		background: var(--negative);
	}
	.bar-fill.warning {
		background: var(--warning);
	}
	.bar-fill.info {
		background: var(--info);
	}
	.bar-fill.neutral {
		background: var(--content-primary);
	}

	.cap-line {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		margin-top: auto;
		padding-top: calc(15px * var(--u));
		color: var(--content-tertiary);
	}

	.cap-line strong {
		color: var(--content-primary);
	}

	.cap-line .bar-track {
		grid-column: 1 / -1;
		width: 100%;
	}

	.category-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: calc(8px * var(--u));
	}

	.category-tile {
		padding: calc(9px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(5px * var(--u));
		background: var(--background);
	}

	.category-tile > div:first-child {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.category-tile > div > span {
		color: var(--content-tertiary);
	}

	.category-tile > div > strong {
		font-family: var(--font-mono);
		font-size: calc(10px * var(--u));
		font-weight: 500;
	}

	.category-tile > b {
		display: block;
		margin-top: calc(5px * var(--u));
		font-family: var(--font-mono);
		font-size: calc(15px * var(--u));
		font-weight: 600;
	}

	.shipping-label {
		margin: auto 0 calc(4px * var(--u));
		color: var(--content-tertiary);
		font-weight: 500;
	}

	.shipping-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: calc(8px * var(--u));
		padding: calc(6px * var(--u)) 0;
	}

	.shipping-row + .shipping-row {
		border-top: 1px solid var(--border);
	}

	.shipping-row > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 0;
		gap: calc(8px * var(--u));
	}

	.shipping-row strong {
		font-size: calc(12px * var(--u));
		font-weight: 600;
	}

	.shipping-row span,
	.shipping-row em {
		color: var(--content-tertiary);
		font-size: calc(10px * var(--u));
		font-style: normal;
	}

	.shipping-row em {
		font-family: var(--font-mono);
	}

	.drivers-card {
		grid-column: span 8;
	}

	.drivers-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		flex: 1;
		min-height: 0;
		gap: calc(16px * var(--u));
		padding: calc(12px * var(--u)) calc(16px * var(--u)) calc(14px * var(--u));
	}

	.driver-tile {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: calc(10px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(6px * var(--u));
		background: var(--background);
	}

	.driver-heading {
		align-items: flex-start;
	}

	.driver-heading > div {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: calc(4px * var(--u));
	}

	.driver-number {
		display: grid;
		place-items: center;
		width: calc(36px * var(--u));
		height: calc(36px * var(--u));
		border-radius: calc(4px * var(--u));
		background: var(--surface-light);
		font-family: var(--font-mono);
		font-size: calc(15px * var(--u));
		font-weight: 600;
	}

	.driver-heading strong {
		font-size: calc(14px * var(--u));
		font-weight: 600;
	}

	.driver-heading > div > span {
		letter-spacing: normal;
		text-transform: none;
	}

	.driver-heading > div > span em {
		padding: calc(2px * var(--u)) calc(4px * var(--u));
		border-radius: calc(3px * var(--u));
		background: var(--surface-light);
		color: var(--content-secondary);
		font-size: calc(10px * var(--u));
		font-style: normal;
	}

	.driver-heading > b {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-family: var(--font-mono);
		font-size: calc(18px * var(--u));
		font-weight: 600;
		line-height: 1;
	}

	.driver-heading > b small {
		margin-top: calc(4px * var(--u));
		color: var(--content-tertiary);
		font-size: calc(9px * var(--u));
		font-weight: 500;
	}

	.form-label {
		margin-top: auto;
		margin-bottom: calc(6px * var(--u));
		color: var(--content-tertiary);
	}

	.finish-list {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: calc(8px * var(--u));
	}

	.finish-result {
		appearance: none;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: calc(24px * var(--u));
		min-width: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(3px * var(--u));
		background: var(--surface-hover);
		color: var(--content-secondary);
		font-family: var(--font-mono);
		font-size: calc(10px * var(--u));
		font-weight: 500;
		line-height: 1;
		text-align: center;
		cursor: default;
	}

	.finish-result.win {
		background: var(--positive);
		color: var(--background);
	}

	.finish-result.podium {
		background: var(--warning);
		color: var(--background);
	}

	.finish-result.points {
		background: var(--surface-hover);
		color: var(--content-secondary);
	}

	.finish-result.outside-points {
		border-color: var(--border);
		background: transparent;
		color: var(--content-tertiary);
	}

	.objective-row {
		margin-bottom: 0;
	}

	.objectives-list {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.objective-row > div:first-child {
		min-width: 0;
	}

	.objective-row > div:first-child span {
		min-width: 0;
	}

	.objective-row .bar-track {
		margin-top: calc(6px * var(--u));
	}

	.objective-row > div:first-child span {
		overflow: hidden;
		color: var(--content-secondary);
		font-size: calc(11px * var(--u));
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.objective-row strong {
		flex: 0 0 auto;
		font-family: var(--font-mono);
		font-size: calc(10px * var(--u));
		font-weight: 500;
	}

	.decisions-card {
		grid-column: span 12;
		min-height: calc(257px * var(--u));
	}

	.decision-row {
		display: grid;
		grid-template-columns: calc(32px * var(--u)) minmax(0, 1fr) auto;
		align-items: center;
		gap: calc(8px * var(--u));
		flex: 1;
		min-height: calc(54px * var(--u));
		padding: calc(8px * var(--u)) calc(16px * var(--u));
		border-bottom: 1px solid var(--border);
	}

	.decision-icon {
		display: grid;
		place-items: center;
		width: calc(32px * var(--u));
		height: calc(32px * var(--u));
		border-radius: calc(5px * var(--u));
	}

	.decision-icon :global(svg) {
		width: calc(18px * var(--u));
		height: calc(18px * var(--u));
	}

	.decision-icon.warning {
		background: var(--warning-bg);
		color: var(--warning);
	}
	.decision-icon.positive {
		background: var(--positive-bg);
		color: var(--positive);
	}
	.decision-icon.info {
		background: var(--info-bg);
		color: var(--info);
	}

	.decision-copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: calc(3px * var(--u));
	}

	.decision-copy strong {
		font-size: calc(13px * var(--u));
		font-weight: 600;
	}

	.decision-copy span {
		overflow: hidden;
		color: var(--content-tertiary);
		font-size: calc(11px * var(--u));
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: calc(5px * var(--u));
		min-width: calc(74px * var(--u));
		height: calc(32px * var(--u));
		padding: 0 calc(10px * var(--u));
		border: 1px solid var(--border);
		border-radius: calc(5px * var(--u));
		background: var(--surface);
		color: var(--content-secondary);
		font-family: inherit;
		font-size: calc(12px * var(--u));
		font-weight: 500;
		line-height: 1;
		cursor: pointer;
	}

	.row-action:hover {
		background: var(--surface-hover);
		color: var(--content-primary);
	}

	.row-action :global(svg) {
		width: calc(13px * var(--u));
		height: calc(13px * var(--u));
	}

	.positive {
		color: var(--positive);
	}
	.negative {
		color: var(--negative);
	}
	.warning {
		color: var(--warning);
	}
	.info {
		color: var(--info);
	}
	.muted {
		color: var(--content-tertiary);
	}

	@media (max-width: 1260px) {
		.dashboard-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}

		.race-card,
		.drivers-card,
		.decisions-card {
			grid-column: 1 / -1;
		}

		.standings-card,
		.finances-card,
		.development-card,
		.objectives-card {
			grid-column: span 1;
		}

		.command-header {
			grid-template-columns: 1fr;
			align-items: start;
		}

		.stat-strip {
			max-width: none;
		}
	}

	@media (max-width: 900px) {
		.race-card-body,
		.drivers-grid {
			grid-template-columns: 1fr;
		}

		.session-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-item,
		.advance-button {
			transition: none;
		}
	}
</style>
