// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

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
			getTeams: () => Promise<
				{
					id: number;
					name: string;
					createdAt: Date;
				}[]
			>;
			createTeam: (name: string) => Promise<{
				id: number;
				name: string;
				createdAt: Date;
			}>;
		};
	}
}

export {};
