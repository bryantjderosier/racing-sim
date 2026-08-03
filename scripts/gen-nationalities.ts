import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { continents, getCountryDataList } from 'countries-list';

const OUTPUT = fileURLToPath(
	new URL('../src/lib/content/nationalities.generated.ts', import.meta.url)
);

/**
 * Derived from the alpha-3 code rather than list position so that adding or
 * removing a country never renumbers the rest of the seed rows.
 */
function nationalityId(iso3: string): string {
	const digest = createHash('sha256').update(`nationality:${iso3.toLowerCase()}`).digest('hex');
	return `00000000-0000-4000-8000-01${digest.slice(0, 10)}`;
}

const rows = getCountryDataList()
	.filter((country) => country.iso2 && country.iso3)
	.map((country) => ({
		id: nationalityId(country.iso3),
		code: country.iso3.toLowerCase(),
		displayName: country.name,
		iso2: country.iso2.toUpperCase(),
		continent: country.continent
	}))
	.sort((left, right) => left.displayName.localeCompare(right.displayName, 'en'));

for (const key of ['id', 'code', 'iso2'] as const) {
	const seen = new Set<string>();
	for (const row of rows) {
		if (seen.has(row[key])) throw new Error(`Duplicate nationality ${key}: ${row[key]}`);
		seen.add(row[key]);
	}
}

const usedContinents = [...new Set(rows.map((row) => row.continent))].sort();
const continentUnion = usedContinents.map((code) => `'${code}'`).join(' | ');

const continentLines = usedContinents
	.map((code) => `\t{ code: '${code}', name: ${JSON.stringify(continents[code])} }`)
	.join(',\n');

const nationalityLines = rows
	.map(
		(row) =>
			`\t{ id: '${row.id}', code: '${row.code}', displayName: ${JSON.stringify(row.displayName)}, iso2: '${row.iso2}', continent: '${row.continent}' }`
	)
	.join(',\n');

const contents = `// GENERATED FILE — do not edit by hand.
// Source: countries-list (MIT). Regenerate with \`pnpm run content:nationalities\`.

export type ContinentCode = ${continentUnion};

export interface Continent {
	code: ContinentCode;
	name: string;
}

export interface NationalityRecord {
	id: string;
	code: string;
	displayName: string;
	iso2: string;
	continent: ContinentCode;
}

export const CONTINENTS: readonly Continent[] = Object.freeze([
${continentLines}
]);

export const NATIONALITIES: readonly NationalityRecord[] = Object.freeze([
${nationalityLines}
]);
`;

writeFileSync(OUTPUT, contents, 'utf8');
console.log(`Wrote ${rows.length} nationalities across ${usedContinents.length} continents.`);
