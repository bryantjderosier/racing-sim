<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '$lib/styles/ops.css';

	let { children } = $props();

	const path = $derived(page.url.pathname);
	const isLanding = $derived(path === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if isLanding}
	{@render children()}
{:else}
	<div class="ops-app">
		<header class="ops-topbar">
			<a class="ops-topbar-brand" href={resolve('/')}><span class="brand-mark">A</span> Apex Racing</a>
			<div class="ops-topbar-status"><span class="status-dot"></span> Team principal</div>
		</header>
		<div class="ops-workspace">
			<aside class="ops-sidebar">
				<p class="ops-sidebar-label">Command centre</p>
				<nav class="ops-side-links" aria-label="Primary">
					<a class="ops-side-link" class:active={path === '/'} href={resolve('/')}><span>01</span> Career</a>
					<a class="ops-side-link" class:active={path.startsWith('/hq')} href={resolve('/hq')}><span>02</span> Team HQ</a>
					<a class="ops-side-link" class:active={path.startsWith('/rd')} href={resolve('/rd')}><span>03</span> Engineering</a>
					<a class="ops-side-link" class:active={path.startsWith('/market')} href={resolve('/market')}><span>04</span> Market</a>
					<a class="ops-side-link" class:active={path.startsWith('/scouting')} href={resolve('/scouting')}><span>05</span> Scouting</a>
					<a class="ops-side-link" class:active={path.startsWith('/sponsors')} href={resolve('/sponsors')}><span>06</span> Sponsors</a>
					<a class="ops-side-link" class:active={path.startsWith('/weekend')} href={resolve('/weekend')}><span>07</span> Race weekend</a>
				</nav>
				<div class="ops-sidebar-foot"><span class="status-dot"></span> Operations online</div>
			</aside>
			<main class="ops-main">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
