import type {
	CalendarAdvanceDto,
	CalendarAdvanceRequest,
	CareerIdentityDto,
	SaveCreateRequest,
	SaveIdRequest,
	SaveSummary
} from '../../electron/ipc-contract';

export type { CalendarAdvanceDto, CalendarAdvanceRequest, CareerIdentityDto, SaveSummary };
export function isElectron(): boolean {
	return typeof window !== 'undefined' && 'electronAPI' in window;
}

export async function ping(): Promise<string | null> {
	if (!isElectron()) return null;
	return window.electronAPI.ping();
}

export async function quitApp(): Promise<void> {
	if (!isElectron()) return;
	await window.electronAPI.quit();
}

export async function listSaves(): Promise<SaveSummary[]> {
	if (!isElectron()) throw new Error('Save catalog requires the Electron app.');
	return window.electronAPI.save.list();
}

export async function createSave(request: SaveCreateRequest): Promise<SaveSummary> {
	if (!isElectron()) throw new Error('Creating a career requires the Electron app.');
	return window.electronAPI.save.create(request);
}

export async function openSave(request: SaveIdRequest): Promise<SaveSummary> {
	if (!isElectron()) throw new Error('Opening a career requires the Electron app.');
	return window.electronAPI.save.open(request);
}

export async function closeSave(): Promise<void> {
	if (!isElectron()) return;
	await window.electronAPI.save.close();
}

export async function deleteSave(request: SaveIdRequest): Promise<void> {
	if (!isElectron()) throw new Error('Deleting a career requires the Electron app.');
	return window.electronAPI.save.delete(request);
}

export async function getCareerIdentity(): Promise<CareerIdentityDto> {
	if (!isElectron()) throw new Error('Career identity requires the Electron app.');
	return window.electronAPI.save.getIdentity();
}

export async function advanceCalendarDay(
	request: CalendarAdvanceRequest = {}
): Promise<CalendarAdvanceDto> {
	if (!isElectron()) throw new Error('Advancing the calendar requires the Electron app.');
	return window.electronAPI.calendar.advanceDay(request);
}

export function formatSaveTimestamp(value: string | null): string {
	if (!value) return 'Never opened';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
