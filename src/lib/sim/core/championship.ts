export const CHAMPIONSHIP_CODES = ['apex', 'challenger', 'academy'] as const;

export type ChampionshipCode = (typeof CHAMPIONSHIP_CODES)[number];

export const CHAMPIONSHIP_DISPLAY_NAMES: Readonly<Record<ChampionshipCode, string>> = Object.freeze(
	{
		apex: 'World Formula Championship',
		challenger: 'International Formula Championship',
		academy: 'Formula Development Championship'
	}
);

export const CHAMPIONSHIP_SHORT_CODES: Readonly<Record<ChampionshipCode, string>> = Object.freeze({
	apex: 'WFC',
	challenger: 'IFC',
	academy: 'FDC'
});
