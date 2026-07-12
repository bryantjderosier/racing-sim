import { sql } from 'drizzle-orm';
import type { AppDb } from '../../db/node.js';
import { sponsors } from '../../db/schema.js';

export type SponsorSeed = {
	id?: number;
	name: string;
	nationalityCode: string;
	minMarketability: number;
	minTeamStanding: number | null;
	ethicsSensitivity: number;
};

export const DEFAULT_SPONSOR_CATALOG: SponsorSeed[] = [
	{
		name: 'Aether Energy',
		nationalityCode: 'ARE',
		minMarketability: 78,
		minTeamStanding: 6,
		ethicsSensitivity: 0.25
	},
	{
		name: 'Nordic Volt',
		nationalityCode: 'FIN',
		minMarketability: 70,
		minTeamStanding: 8,
		ethicsSensitivity: 0.15
	},
	{
		name: 'Helix Telecom',
		nationalityCode: 'GBR',
		minMarketability: 55,
		minTeamStanding: 12,
		ethicsSensitivity: 0.2
	},
	{
		name: 'Sakura Bank',
		nationalityCode: 'JPN',
		minMarketability: 62,
		minTeamStanding: 10,
		ethicsSensitivity: 0.35
	},
	{
		name: 'Rio Coffee Co',
		nationalityCode: 'BRA',
		minMarketability: 40,
		minTeamStanding: null,
		ethicsSensitivity: 0.1
	},
	{
		name: 'Alpine Tools',
		nationalityCode: 'DEU',
		minMarketability: 35,
		minTeamStanding: null,
		ethicsSensitivity: 0.05
	},
	{
		name: 'CleanStream NGO',
		nationalityCode: 'CHE',
		minMarketability: 50,
		minTeamStanding: 15,
		ethicsSensitivity: 0.85
	},
	{
		name: 'Thunder Bet',
		nationalityCode: 'MLT',
		minMarketability: 45,
		minTeamStanding: null,
		ethicsSensitivity: 0.55
	},
	{
		name: 'Lumina Cosmetics',
		nationalityCode: 'FRA',
		minMarketability: 68,
		minTeamStanding: 10,
		ethicsSensitivity: 0.3
	},
	{
		name: 'GridGuard Insurance',
		nationalityCode: 'USA',
		minMarketability: 48,
		minTeamStanding: null,
		ethicsSensitivity: 0.4
	}
];

export async function seedSponsorCatalog(
	db: AppDb,
	catalog: SponsorSeed[] = DEFAULT_SPONSOR_CATALOG
): Promise<number> {
	const existing = await db.select().from(sponsors).limit(1);
	if (existing.length > 0) return 0;

	const [maxRow] = await db
		.select({ m: sql<number>`coalesce(max(${sponsors.id}), 0)` })
		.from(sponsors);
	let id = Number(maxRow?.m ?? 0) + 1;
	for (const s of catalog) {
		await db.insert(sponsors).values({
			id: s.id ?? id++,
			name: s.name,
			nationalityCode: s.nationalityCode,
			minMarketability: s.minMarketability,
			minTeamStanding: s.minTeamStanding,
			ethicsSensitivity: s.ethicsSensitivity
		});
	}
	return catalog.length;
}
