<script lang="ts">
	import { onMount } from 'svelte';
	import { createTeam, getTeams, isElectron, ping } from '$lib/electron';
	import type { Team } from '$lib/types';

	let teams = $state<Team[]>([]);
	let newTeamName = $state('');
	let status = $state('Loading...');
	let runningInElectron = $state(false);

	async function refresh() {
		teams = await getTeams();
	}

	async function handleCreateTeam() {
		const name = newTeamName.trim();
		if (!name) return;

		await createTeam(name);
		newTeamName = '';
		await refresh();
	}

	onMount(async () => {
		runningInElectron = isElectron();
		if (!runningInElectron) {
			status = 'Run `npm run dev:electron` to use the desktop app with DuckDB.';
			return;
		}

		status = (await ping()) ?? 'No response';
		await refresh();
	});
</script>

<main>
	<h1>Racing Manager</h1>
	<p>{status}</p>

	{#if runningInElectron}
		<section>
			<h2>Teams</h2>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void handleCreateTeam();
				}}
			>
				<input bind:value={newTeamName} placeholder="Team name" />
				<button type="submit">Add team</button>
			</form>

			{#if teams.length === 0}
				<p>No teams yet.</p>
			{:else}
				<ul>
					{#each teams as team (team.id)}
						<li>{team.name}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>

<style>
	main {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		max-width: 40rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	section {
		margin-top: 2rem;
	}

	form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	input {
		flex: 1;
		padding: 0.5rem;
	}

	button {
		padding: 0.5rem 1rem;
	}
</style>
