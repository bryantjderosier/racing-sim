import type {
	AIWorldActionDto,
	AIWorldActionListRequest,
	CalendarAdvanceDto,
	CalendarAdvanceRequest,
	CareerIdentityDto,
	DevelopmentProjectDto,
	DevelopmentStartRequest,
	InboxActionDto,
	InboxActionRequest,
	InboxActionResult,
	InboxListRequest,
	InboxMessageDto,
	SaveCreateRequest,
	SaveIdRequest,
	SaveSummary,
	SponsorAcceptOfferRequest,
	SponsorAcceptOfferResult,
	SponsorDashboardDto
} from '../../electron/ipc-contract';

export type {
	AIWorldActionDto,
	AIWorldActionListRequest,
	CalendarAdvanceDto,
	CalendarAdvanceRequest,
	CareerIdentityDto,
	DevelopmentProjectDto,
	DevelopmentStartRequest,
	InboxActionDto,
	InboxActionRequest,
	InboxActionResult,
	InboxListRequest,
	InboxMessageDto,
	SaveSummary,
	SponsorAcceptOfferRequest,
	SponsorAcceptOfferResult,
	SponsorDashboardDto
};
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

export async function startDevelopmentProject(
	request: DevelopmentStartRequest
): Promise<DevelopmentProjectDto> {
	if (!isElectron()) throw new Error('Starting development requires the Electron app.');
	return window.electronAPI.development.start(request);
}

export async function listDevelopmentProjects(): Promise<DevelopmentProjectDto[]> {
	if (!isElectron()) throw new Error('Development projects require the Electron app.');
	return window.electronAPI.development.list();
}

export async function listInboxMessages(
	request: InboxListRequest = {}
): Promise<InboxMessageDto[]> {
	if (!isElectron()) throw new Error('Inbox messages require the Electron app.');
	return window.electronAPI.inbox.list(request);
}

export async function applyInboxAction(request: InboxActionRequest): Promise<InboxActionResult> {
	if (!isElectron()) throw new Error('Inbox actions require the Electron app.');
	return window.electronAPI.inbox.action(request);
}

export async function listInboxActions(messageId?: string): Promise<InboxActionDto[]> {
	if (!isElectron()) throw new Error('Inbox action history requires the Electron app.');
	return window.electronAPI.inbox.listActions(messageId);
}

export async function listAIWorldActions(
	request: AIWorldActionListRequest = {}
): Promise<AIWorldActionDto[]> {
	if (!isElectron()) throw new Error('AI world actions require the Electron app.');
	return window.electronAPI.aiWorld.listActions(request);
}

export async function getSponsorDashboard(): Promise<SponsorDashboardDto> {
	if (!isElectron()) throw new Error('Sponsor data requires the Electron app.');
	return window.electronAPI.sponsors.getDashboard();
}

export async function acceptSponsorOffer(
	request: SponsorAcceptOfferRequest
): Promise<SponsorAcceptOfferResult> {
	if (!isElectron()) throw new Error('Accepting a sponsor offer requires the Electron app.');
	return window.electronAPI.sponsors.acceptOffer(request);
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
