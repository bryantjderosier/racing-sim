import type { AdvanceResult, GameClock, NewGameOptions, SeedTeam, Team } from '$lib/types';

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

export async function listSeedTeams(): Promise<SeedTeam[]> {
	if (!isElectron()) return [];
	return window.electronAPI.listSeedTeams();
}

export async function newGame(options: NewGameOptions): Promise<{ ok: true } | null> {
	if (!isElectron()) return null;
	return window.electronAPI.newGame(options);
}

export async function getClock(): Promise<GameClock | null> {
	if (!isElectron()) return null;
	return window.electronAPI.getClock();
}

export async function advance(options?: {
	maxDays?: number;
	singleDay?: boolean;
}): Promise<AdvanceResult | null> {
	if (!isElectron()) return null;
	return window.electronAPI.advance(options);
}
