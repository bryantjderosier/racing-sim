import type { Team } from '$lib/types';

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
			createTeam: (name: string) => Promise<Team>;
		};
	}
}

export {};
