// See https://svelte.dev/docs/kit/types#app.d.ts
import type { AdvanceResult, GameClock, NewGameOptions, SeedTeam, Team } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		electronAPI: {
			ping: () => Promise<string>;
			getTeams: () => Promise<Team[]>;
			listSeedTeams: () => Promise<SeedTeam[]>;
			newGame: (options: NewGameOptions) => Promise<{ ok: true }>;
			getClock: () => Promise<GameClock>;
			advance: (options?: { maxDays?: number; singleDay?: boolean }) => Promise<AdvanceResult>;
		};
	}
}

export {};
