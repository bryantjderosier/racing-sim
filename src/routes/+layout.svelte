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
	<div class="ops-shell">
		<nav class="ops-nav" aria-label="Primary">
			<a class="ops-nav-brand" href={resolve('/')}>Apex</a>
			<div class="ops-nav-links">
				<a class="ops-nav-link" class:active={path === '/'} href={resolve('/')}>Home</a>
				<a
					class="ops-nav-link"
					class:active={path.startsWith('/hq')}
					href={resolve('/hq')}
				>
					HQ
				</a>
				<a
					class="ops-nav-link"
					class:active={path.startsWith('/weekend')}
					href={resolve('/weekend')}
				>
					Weekend
				</a>
			</div>
		</nav>
		{@render children()}
	</div>
{/if}
