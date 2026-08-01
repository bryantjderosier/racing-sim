import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

export interface SaveCatalogEntry {
	saveId: string;
	path: string;
	displayName: string;
	schemaVersion: number;
	gameVersion: string;
	contentDataVersion: string;
	createdAt: string;
	lastOpenedAt: string | null;
}

export class SaveCatalogError extends Error {
	readonly code = 'MIGRATION_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'SaveCatalogError';
	}
}

export class SaveCatalog {
	constructor(private readonly catalogPath: string) {}

	async list(): Promise<SaveCatalogEntry[]> {
		const entries = await this.read();
		return entries.sort((left, right) =>
			(right.lastOpenedAt ?? right.createdAt).localeCompare(left.lastOpenedAt ?? left.createdAt)
		);
	}

	async find(saveId: string): Promise<SaveCatalogEntry | null> {
		return (await this.read()).find((entry) => entry.saveId === saveId) ?? null;
	}

	async upsert(entry: SaveCatalogEntry): Promise<void> {
		const entries = await this.read();
		const index = entries.findIndex((candidate) => candidate.saveId === entry.saveId);
		if (index === -1) entries.push(entry);
		else entries[index] = entry;
		await this.write(entries);
	}

	async remove(saveId: string): Promise<void> {
		const entries = await this.read();
		await this.write(entries.filter((entry) => entry.saveId !== saveId));
	}

	private async read(): Promise<SaveCatalogEntry[]> {
		try {
			const raw = await readFile(this.catalogPath, 'utf8');
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) throw new Error('catalog root must be an array');
			return parsed as SaveCatalogEntry[];
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw new SaveCatalogError(
				`Save catalog could not be read: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	private async write(entries: SaveCatalogEntry[]): Promise<void> {
		await mkdir(dirname(this.catalogPath), { recursive: true });
		const tempPath = `${dirname(this.catalogPath)}/.${basename(this.catalogPath)}.tmp-${randomUUID()}`;
		try {
			await writeFile(tempPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
			await rename(tempPath, this.catalogPath);
		} catch (error) {
			throw new SaveCatalogError(
				`Save catalog could not be written: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
