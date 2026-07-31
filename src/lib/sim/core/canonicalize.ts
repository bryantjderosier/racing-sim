function canonicalValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalValue);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, canonicalValue(child)])
		);
	}
	return value;
}

export function canonicalStringify(value: unknown): string {
	return JSON.stringify(canonicalValue(value));
}

export function normalizeForHash<T extends { entries: unknown[]; commands: unknown[] }>(
	input: T
): T {
	const copy = structuredClone(input);
	if (
		'weather' in copy &&
		(copy as { weather?: { enabled: boolean } }).weather?.enabled === false
	) {
		delete (copy as { weather?: { enabled: boolean } }).weather;
	}
	copy.entries.sort((left, right) =>
		String((left as { sessionEntryId: string }).sessionEntryId).localeCompare(
			String((right as { sessionEntryId: string }).sessionEntryId)
		)
	);
	copy.commands.sort((left, right) => {
		const a = left as {
			triggerLap: number;
			triggerSegmentId: string;
			sequence: number;
			sessionEntryId: string;
		};
		const b = right as {
			triggerLap: number;
			triggerSegmentId: string;
			sequence: number;
			sessionEntryId: string;
		};
		return (
			a.triggerLap - b.triggerLap ||
			a.triggerSegmentId.localeCompare(b.triggerSegmentId) ||
			a.sequence - b.sequence ||
			a.sessionEntryId.localeCompare(b.sessionEntryId)
		);
	});
	return copy;
}
