import type { Team } from '$lib/types';

export function isElectron(): boolean {
	return typeof window !== 'undefined' && 'electronAPI' in window;
}

export async function ping(): Promise<string | null> {
	if (!isElectron()) return null;
	return window.electronAPI.ping();
}

export async function getTeams(): Promise<Team[]> {
	if (!isElectron()) return [];
	return window.electronAPI.getTeams();
}

export async function createTeam(name: string): Promise<Team | null> {
	if (!isElectron()) return null;
	return window.electronAPI.createTeam(name);
}
