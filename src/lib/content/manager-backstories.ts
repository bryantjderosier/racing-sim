export type ManagerBackstoryCode = 'financial' | 'engineer' | 'ex_driver' | 'media' | 'scout';

export type ManagerBackstory = {
	code: ManagerBackstoryCode;
	name: string;
	description: string;
	bonusLabel: string;
};

export const MANAGER_BACKSTORIES: readonly ManagerBackstory[] = Object.freeze([
	{
		code: 'financial',
		name: 'Financial',
		description:
			'Your financial nous will help you make the best deals on every purchase you make.',
		bonusLabel: 'Payments: −5%'
	},
	{
		code: 'engineer',
		name: 'Engineer',
		description:
			'Years in the design office taught you how to squeeze performance from limited upgrade time.',
		bonusLabel: 'R&D progress: +8%'
	},
	{
		code: 'ex_driver',
		name: 'Ex-Driver',
		description:
			'You still speak the language of the cockpit, and drivers trust your race-day calls.',
		bonusLabel: 'Driver morale: +5'
	},
	{
		code: 'media',
		name: 'Media',
		description: 'You know how to spin a weekend and keep sponsors warm when results wobble.',
		bonusLabel: 'Sponsor income: +6%'
	},
	{
		code: 'scout',
		name: 'Scout',
		description: 'Your network in the junior ladder finds talent before the big teams notice.',
		bonusLabel: 'Scouting accuracy: +10%'
	}
]);

export function findManagerBackstory(code: string): ManagerBackstory | undefined {
	return MANAGER_BACKSTORIES.find((entry) => entry.code === code);
}

export const DEFAULT_MANAGER_BACKSTORY = MANAGER_BACKSTORIES[0];
