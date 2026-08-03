/**
 * Manager portraits are described as a set of DiceBear `avataaars` options.
 *
 * The variant and colour lists below are pinned here rather than read from the
 * style definition: they are part of the save format, so they must stay stable
 * even if the upstream art package adds or removes pieces.
 */
export const MANAGER_AVATAR_SCHEMA_VERSION = 'manager-avatar-v2';

export const MANAGER_AVATAR_STYLE = 'avataaars';

export type AvatarOption = {
	value: string;
	label: string;
};

function option(value: string, label: string): AvatarOption {
	return { value, label };
}

export const HAIR_TOPS: readonly AvatarOption[] = Object.freeze([
	option('shortFlat', 'Short Flat'),
	option('shortRound', 'Short Round'),
	option('shortWaved', 'Short Waved'),
	option('shortCurly', 'Short Curly'),
	option('theCaesar', 'Caesar'),
	option('theCaesarAndSidePart', 'Caesar Side Part'),
	option('shavedSides', 'Shaved Sides'),
	option('sides', 'Sides'),
	option('frizzle', 'Frizzle'),
	option('fro', 'Afro'),
	option('froBand', 'Afro Band'),
	option('curly', 'Curly'),
	option('curvy', 'Curvy'),
	option('bigHair', 'Big Hair'),
	option('bob', 'Bob'),
	option('bun', 'Bun'),
	option('dreads', 'Dreads'),
	option('dreads01', 'Dreads Short'),
	option('dreads02', 'Dreads Long'),
	option('frida', 'Frida'),
	option('longButNotTooLong', 'Long'),
	option('miaWallace', 'Blunt Bob'),
	option('shaggy', 'Shaggy'),
	option('shaggyMullet', 'Shaggy Mullet'),
	option('straight01', 'Straight'),
	option('straight02', 'Straight Long'),
	option('straightAndStrand', 'Straight & Strand')
]);

export const HEADWEAR_TOPS: readonly AvatarOption[] = Object.freeze([
	option('hat', 'Cap'),
	option('turban', 'Turban'),
	option('hijab', 'Hijab'),
	option('winterHat1', 'Beanie'),
	option('winterHat02', 'Bobble Hat'),
	option('winterHat03', 'Knit Hat'),
	option('winterHat04', 'Earflap Hat')
]);

export const FACIAL_HAIR_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('beardLight', 'Stubble'),
	option('beardMedium', 'Short Beard'),
	option('beardMajestic', 'Full Beard'),
	option('moustacheFancy', 'Moustache'),
	option('moustacheMagnum', 'Magnum')
]);

export const GLASSES_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('prescription01', 'Rimless'),
	option('prescription02', 'Rounded'),
	option('round', 'Round'),
	option('wayfarers', 'Wayfarers'),
	option('sunglasses', 'Sunglasses'),
	option('kurt', 'Tinted'),
	option('eyepatch', 'Eyepatch')
]);

export const CLOTHES_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('blazerAndShirt', 'Blazer & Shirt'),
	option('blazerAndSweater', 'Blazer & Sweater'),
	option('collarAndSweater', 'Collar & Sweater'),
	option('shirtCrewNeck', 'Team Polo'),
	option('shirtVNeck', 'V-Neck'),
	option('shirtScoopNeck', 'Scoop Neck'),
	option('hoodie', 'Hoodie'),
	option('overall', 'Overalls'),
	option('graphicShirt', 'Graphic Tee')
]);

export const EYES_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('default', 'Neutral'),
	option('squint', 'Squint'),
	option('happy', 'Happy'),
	option('side', 'Side Eye'),
	option('wink', 'Wink'),
	option('surprised', 'Surprised'),
	option('closed', 'Closed'),
	option('eyeRoll', 'Eye Roll')
]);

export const EYEBROWS_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('default', 'Neutral'),
	option('defaultNatural', 'Natural'),
	option('flatNatural', 'Flat'),
	option('raisedExcited', 'Raised'),
	option('raisedExcitedNatural', 'Raised Natural'),
	option('angry', 'Angry'),
	option('angryNatural', 'Angry Natural'),
	option('sadConcerned', 'Concerned'),
	option('upDown', 'Quizzical'),
	option('unibrowNatural', 'Unibrow')
]);

export const MOUTH_OPTIONS: readonly AvatarOption[] = Object.freeze([
	option('serious', 'Serious'),
	option('default', 'Neutral'),
	option('smile', 'Smile'),
	option('twinkle', 'Twinkle'),
	option('grimace', 'Grimace'),
	option('concerned', 'Concerned'),
	option('disbelief', 'Disbelief'),
	option('sad', 'Sad')
]);

export const SKIN_TONES: readonly AvatarOption[] = Object.freeze([
	option('#ffdbb4', 'Porcelain'),
	option('#edb98a', 'Light'),
	option('#d08b5b', 'Tan'),
	option('#ae5d29', 'Brown'),
	option('#614335', 'Deep')
]);

export const HAIR_COLORS: readonly AvatarOption[] = Object.freeze([
	option('#2c1b18', 'Black'),
	option('#4a312c', 'Dark Brown'),
	option('#724133', 'Brown'),
	option('#a55728', 'Auburn'),
	option('#b58143', 'Light Brown'),
	option('#d6b370', 'Blonde'),
	option('#ecdcbf', 'Platinum'),
	option('#c93305', 'Red'),
	option('#e8e1e1', 'Silver'),
	option('#f59797', 'Rose')
]);

export const CLOTHES_COLORS: readonly AvatarOption[] = Object.freeze([
	option('#262e33', 'Charcoal'),
	option('#3c4f5c', 'Slate'),
	option('#25557c', 'Navy'),
	option('#5199e4', 'Blue'),
	option('#65c9ff', 'Sky'),
	option('#929598', 'Grey'),
	option('#e6e6e6', 'Light Grey'),
	option('#ffffff', 'White'),
	option('#ff5c5c', 'Red'),
	option('#ff488e', 'Magenta'),
	option('#a7ffc4', 'Mint'),
	option('#ffffb1', 'Butter')
]);

export const ACCESSORY_COLORS: readonly AvatarOption[] = Object.freeze([
	option('#262e33', 'Black'),
	option('#3c4f5c', 'Gunmetal'),
	option('#25557c', 'Navy'),
	option('#929598', 'Silver'),
	option('#e6e6e6', 'Clear'),
	option('#ff5c5c', 'Red')
]);

export type ManagerAvatar = {
	top: string | null;
	hairColor: string;
	hatColor: string;
	facialHair: string | null;
	facialHairColor: string;
	glasses: string | null;
	glassesColor: string;
	clothes: string;
	clothesColor: string;
	eyes: string;
	eyebrows: string;
	mouth: string;
	skinColor: string;
};

export const ALL_TOPS: readonly AvatarOption[] = Object.freeze([...HAIR_TOPS, ...HEADWEAR_TOPS]);

export const DEFAULT_MANAGER_AVATAR: ManagerAvatar = Object.freeze({
	top: 'shortFlat',
	hairColor: '#2c1b18',
	hatColor: '#262e33',
	facialHair: null,
	facialHairColor: '#2c1b18',
	glasses: null,
	glassesColor: '#262e33',
	clothes: 'blazerAndShirt',
	clothesColor: '#3c4f5c',
	eyes: 'default',
	eyebrows: 'default',
	mouth: 'serious',
	skinColor: '#edb98a'
});

export function isHeadwear(top: string | null): boolean {
	return top !== null && HEADWEAR_TOPS.some((entry) => entry.value === top);
}

function coerce(value: unknown, allowed: readonly AvatarOption[], fallback: string): string {
	return typeof value === 'string' && allowed.some((entry) => entry.value === value)
		? value
		: fallback;
}

function coerceNullable(value: unknown, allowed: readonly AvatarOption[]): string | null {
	return typeof value === 'string' && allowed.some((entry) => entry.value === value) ? value : null;
}

export function normalizeManagerAvatar(input: Partial<ManagerAvatar>): ManagerAvatar {
	return {
		top: coerceNullable(input.top, ALL_TOPS),
		hairColor: coerce(input.hairColor, HAIR_COLORS, DEFAULT_MANAGER_AVATAR.hairColor),
		hatColor: coerce(input.hatColor, CLOTHES_COLORS, DEFAULT_MANAGER_AVATAR.hatColor),
		facialHair: coerceNullable(input.facialHair, FACIAL_HAIR_OPTIONS),
		facialHairColor: coerce(
			input.facialHairColor,
			HAIR_COLORS,
			DEFAULT_MANAGER_AVATAR.facialHairColor
		),
		glasses: coerceNullable(input.glasses, GLASSES_OPTIONS),
		glassesColor: coerce(input.glassesColor, ACCESSORY_COLORS, DEFAULT_MANAGER_AVATAR.glassesColor),
		clothes: coerce(input.clothes, CLOTHES_OPTIONS, DEFAULT_MANAGER_AVATAR.clothes),
		clothesColor: coerce(input.clothesColor, CLOTHES_COLORS, DEFAULT_MANAGER_AVATAR.clothesColor),
		eyes: coerce(input.eyes, EYES_OPTIONS, DEFAULT_MANAGER_AVATAR.eyes),
		eyebrows: coerce(input.eyebrows, EYEBROWS_OPTIONS, DEFAULT_MANAGER_AVATAR.eyebrows),
		mouth: coerce(input.mouth, MOUTH_OPTIONS, DEFAULT_MANAGER_AVATAR.mouth),
		skinColor: coerce(input.skinColor, SKIN_TONES, DEFAULT_MANAGER_AVATAR.skinColor)
	};
}

export function randomManagerAvatar(seed = Date.now()): ManagerAvatar {
	let state = seed >>> 0 || 1;
	const next = () => {
		state = (Math.imul(1664525, state) + 1013904223) >>> 0;
		return state;
	};
	const pick = (list: readonly AvatarOption[]) => list[next() % list.length].value;
	const chance = (percent: number) => next() % 100 < percent;

	return normalizeManagerAvatar({
		top: chance(95) ? pick(ALL_TOPS) : null,
		hairColor: pick(HAIR_COLORS),
		hatColor: pick(CLOTHES_COLORS),
		facialHair: chance(40) ? pick(FACIAL_HAIR_OPTIONS) : null,
		facialHairColor: pick(HAIR_COLORS),
		glasses: chance(30) ? pick(GLASSES_OPTIONS) : null,
		glassesColor: pick(ACCESSORY_COLORS),
		clothes: pick(CLOTHES_OPTIONS),
		clothesColor: pick(CLOTHES_COLORS),
		eyes: pick(EYES_OPTIONS),
		eyebrows: pick(EYEBROWS_OPTIONS),
		mouth: pick(MOUTH_OPTIONS),
		skinColor: pick(SKIN_TONES)
	});
}

export function serializeManagerAvatar(avatar: ManagerAvatar): string {
	return JSON.stringify(normalizeManagerAvatar(avatar));
}

export function parseManagerAvatar(payload: string | null | undefined): ManagerAvatar | null {
	if (!payload) return null;
	try {
		const parsed: unknown = JSON.parse(payload);
		if (!parsed || typeof parsed !== 'object') return null;
		return normalizeManagerAvatar(parsed as Partial<ManagerAvatar>);
	} catch {
		return null;
	}
}
