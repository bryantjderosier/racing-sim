<script lang="ts">
	import { onMount } from 'svelte';
	import { advance, getClock, getTeams, isElectron, listSeedTeams, newGame, ping } from '$lib/electron';
	import type { GameClock, SeedTeam, Team } from '$lib/types';

	let teams = $state<Team[]>([]);
	let seedTeams = $state<SeedTeam[]>([]);
	let status = $state('Loading...');
	let runningInElectron = $state(false);
	let principalName = $state('Player');
	let selectedTeamId = $state(1);
	let generating = $state(false);
	let advancing = $state(false);
	let clock = $state<GameClock | null>(null);

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	async function refresh() {
		teams = await getTeams();
		clock = await getClock();
	}

	async function handleNewGame() {
		if (!principalName.trim() || generating) return;
		generating = true;
		status = 'Generating world…';
		try {
			await newGame({
				playerDisplayName: principalName.trim(),
				playerTeamId: selectedTeamId
			});
			status = 'World ready.';
			await refresh();
		} catch (error) {
			status = error instanceof Error ? error.message : String(error);
		} finally {
			generating = false;
		}
	}

	async function handleAdvance(singleDay = false) {
		if (advancing) return;
		advancing = true;
		try {
			const result = await advance(singleDay ? { singleDay: true } : undefined);
			if (result) {
				status = result.message;
				clock = {
					seasonYear: result.seasonYear,
					week: result.week,
					day: result.day,
					phase: result.phase,
					playerDisplayName: clock?.playerDisplayName ?? principalName,
					playerTeamId: clock?.playerTeamId ?? selectedTeamId,
					playerStatus: clock?.playerStatus ?? 'EMPLOYED'
				};
			}
		} catch (error) {
			status = error instanceof Error ? error.message : String(error);
		} finally {
			advancing = false;
		}
	}

	onMount(async () => {
		runningInElectron = isElectron();
		if (!runningInElectron) {
			status = 'Run `pnpm dev:electron` to use the desktop app with DuckDB.';
			return;
		}

		status = (await ping()) ?? 'No response';
		seedTeams = await listSeedTeams();
		if (seedTeams[0]) selectedTeamId = seedTeams[0].id;
		await refresh();
	});
</script>

<main>
	<h1>Racing Manager</h1>
	<p>{status}</p>

	{#if runningInElectron}
		{#if clock}
			<section>
				<h2>Calendar</h2>
				<p>
					{clock.seasonYear} · Week {clock.week} · {dayNames[clock.day - 1]} (day {clock.day}) · {clock.phase}
				</p>
				<div class="row">
					<button type="button" disabled={advancing} onclick={() => void handleAdvance(false)}>Advance</button>
					<button type="button" disabled={advancing} onclick={() => void handleAdvance(true)}>Advance 1 day</button>
				</div>
			</section>
		{/if}

		<section>
			<h2>New game</h2>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void handleNewGame();
				}}
			>
				<label>
					Principal name
					<input bind:value={principalName} required />
				</label>
				<label>
					Team
					<select bind:value={selectedTeamId}>
						{#each seedTeams as team (team.id)}
							<option value={team.id}>{team.name} (T{team.tierId})</option>
						{/each}
					</select>
				</label>
				<button type="submit" disabled={generating}>Generate world</button>
			</form>
		</section>

		<section>
			<h2>Teams in save</h2>
			{#if teams.length === 0}
				<p>No teams yet — generate a world.</p>
			{:else}
				<ul>
					{#each teams as team (team.id)}
						<li>{team.name} · tier {team.tierId} · {team.status}</li>
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
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.row {
		display: flex;
		gap: 0.5rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	input,
	select,
	button {
		padding: 0.5rem;
	}

	button:disabled {
		opacity: 0.6;
	}
</style>
