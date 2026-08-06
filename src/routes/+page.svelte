<script lang="ts">
	import Flag from '@lucide/svelte/icons/flag';
	import Folder from '@lucide/svelte/icons/folder';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Settings from '@lucide/svelte/icons/settings';
	import LogOut from '@lucide/svelte/icons/log-out';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import type { Component } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { quitApp } from '$lib/electron';

	type MenuId = 'new' | 'load' | 'delete' | 'settings' | 'dashboard' | 'exit';

	type MenuItem = {
		id: MenuId;
		label: string;
		subtitle: string;
		icon: Component;
	};

	const items: MenuItem[] = [
		{ id: 'new', label: 'NEW CAREER', subtitle: 'Start a fresh journey', icon: Flag },
		{ id: 'load', label: 'LOAD CAREER', subtitle: 'Continue a saved game', icon: Folder },
		{ id: 'delete', label: 'DELETE CAREER', subtitle: 'Remove a saved game', icon: Trash2 },
		{
			id: 'dashboard',
			label: 'VIEW GAME SHELL',
			subtitle: 'Preview the management layout',
			icon: LayoutDashboard
		},
		{ id: 'settings', label: 'SETTINGS', subtitle: 'Game & audio options', icon: Settings },
		{ id: 'exit', label: 'EXIT', subtitle: 'Quit to desktop', icon: LogOut }
	];

	let selected = $state<MenuId>('new');

	function select(id: MenuId) {
		selected = id;
	}

	function activate(id: MenuId) {
		selected = id;
		if (id === 'exit') {
			void quitApp();
			return;
		}
		if (id === 'dashboard') {
			void goto(resolve('/dashboard'));
			return;
		}
		console.log(`Selected: ${id}`);
	}

	function onkeydown(event: KeyboardEvent) {
		const index = items.findIndex((item) => item.id === selected);
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selected = items[(index + 1) % items.length].id;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selected = items[(index - 1 + items.length) % items.length].id;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			activate(selected);
		}
	}
</script>

<svelte:window {onkeydown} />

<main class="title-screen">
	<div class="bg" aria-hidden="true"></div>
	<div class="overlay" aria-hidden="true"></div>

	<div class="content">
		<header class="brand">
			<h1>GRAND PRIX MANAGER</h1>
			<p>
				Build your team. Develop your car. Sign the grid's finest talent. Chase championship glory.
			</p>
		</header>

		<nav class="menu" aria-label="Main menu">
			{#each items as item, i (item.id)}
				<button
					type="button"
					class="menu-item"
					class:active={selected === item.id}
					style="--i: {i}"
					onclick={() => activate(item.id)}
					onmouseenter={() => select(item.id)}
					aria-current={selected === item.id ? 'true' : undefined}
				>
					<span class="icon" aria-hidden="true">
						<item.icon strokeWidth={1.75} />
					</span>
					<span class="labels">
						<span class="label">{item.label}</span>
						<span class="sublabel">{item.subtitle}</span>
					</span>
				</button>
			{/each}
		</nav>

		<footer class="footer">
			<span class="version">v0.1.0 Pre-Season Build</span>
			<span class="copyright">© 2026 Layars Studios</span>
		</footer>
	</div>
</main>

<style>
	/* 1920×1080 design px → --u. Anchored top-left (no centered stage). */
	.title-screen {
		--u: var(--ui-scale);
		position: relative;
		width: 100vw;
		height: 100dvh;
		overflow: hidden;
		isolation: isolate;
		background: var(--background);
	}

	.bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		background: url('/title-screen-bg-image.png') center / cover no-repeat;
	}

	.overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background: linear-gradient(
			to right in oklab,
			var(--background) 0%,
			color-mix(in oklab, var(--background) 96%, transparent) 12%,
			color-mix(in oklab, var(--background) 88%, transparent) 24%,
			color-mix(in oklab, var(--background) 72%, transparent) 36%,
			color-mix(in oklab, var(--background) 52%, transparent) 48%,
			color-mix(in oklab, var(--background) 32%, transparent) 58%,
			color-mix(in oklab, var(--background) 16%, transparent) 68%,
			color-mix(in oklab, var(--background) 6%, transparent) 78%,
			transparent 88%
		);
	}

	/* Break 4K gradient banding */
	.overlay::after {
		content: '';
		position: absolute;
		inset: 0;
		opacity: 0.045;
		mix-blend-mode: soft-light;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-size: 180px 180px;
	}

	.content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: calc(118px * var(--u)) calc(106px * var(--u)) calc(54px * var(--u));
		max-width: calc(900px * var(--u));
	}

	.brand {
		margin-bottom: calc(48px * var(--u));
		animation: fade-slide-in 0.7s ease-out both;
	}

	.brand h1 {
		margin: 0 0 calc(14px * var(--u));
		font-family: var(--font-ui);
		font-size: calc(64px * var(--u));
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 0.98;
		text-transform: uppercase;
		color: var(--content-primary);
	}

	.brand p {
		margin: 0;
		max-width: calc(420px * var(--u));
		font-size: calc(16px * var(--u));
		font-weight: 400;
		line-height: 1.5;
		color: var(--content-secondary);
	}

	.menu {
		display: flex;
		flex-direction: column;
		gap: calc(10px * var(--u));
		width: calc(340px * var(--u));
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: calc(14px * var(--u));
		width: 100%;
		padding: calc(14px * var(--u)) calc(16px * var(--u)) calc(14px * var(--u)) calc(14px * var(--u));
		border: none;
		border-radius: calc(6px * var(--u));
		border-left: calc(2px * var(--u)) solid transparent;
		background: color-mix(in srgb, var(--surface) 78%, transparent);
		color: var(--content-primary);
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease;
		animation: fade-slide-in 0.55s ease-out both;
		animation-delay: calc(0.18s + var(--i) * 0.07s);
	}

	.menu-item:hover,
	.menu-item.active {
		background: var(--surface-hover);
		border-left-color: var(--content-primary);
	}

	.menu-item:focus-visible {
		outline: calc(2px * var(--u)) solid var(--content-primary);
		outline-offset: calc(2px * var(--u));
	}

	.icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: calc(24px * var(--u));
		height: calc(24px * var(--u));
		color: var(--content-primary);
	}

	.icon :global(svg) {
		width: calc(24px * var(--u));
		height: calc(24px * var(--u));
	}

	.labels {
		display: flex;
		flex-direction: column;
		gap: calc(2px * var(--u));
		min-width: 0;
	}

	.label {
		font-size: calc(15px * var(--u));
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--content-primary);
	}

	.sublabel {
		font-size: calc(12px * var(--u));
		font-weight: 400;
		line-height: 1.25;
		color: var(--content-secondary);
	}

	.footer {
		position: absolute;
		left: calc(106px * var(--u));
		bottom: calc(36px * var(--u));
		display: flex;
		align-items: center;
		gap: calc(14px * var(--u));
		font-size: calc(12px * var(--u));
		color: var(--content-disabled);
		animation: fade-slide-in 0.55s ease-out 0.65s both;
	}

	.version {
		padding: calc(5px * var(--u)) calc(12px * var(--u));
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--content-tertiary);
		white-space: nowrap;
	}

	.copyright {
		color: var(--content-disabled);
		white-space: nowrap;
	}

	@keyframes fade-slide-in {
		from {
			opacity: 0;
			transform: translateX(calc(-12px * var(--u)));
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.brand,
		.menu-item,
		.footer {
			animation: none;
		}

		.menu-item {
			transition: none;
		}
	}
</style>
