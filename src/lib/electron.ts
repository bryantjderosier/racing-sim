export function isElectron(): boolean {
	return typeof window !== 'undefined' && 'electronAPI' in window;
}

export async function ping(): Promise<string | null> {
	if (!isElectron()) return null;
	return window.electronAPI.ping();
}
