import type { PaceDirective, SetupVector, TireCompound, TrackMoisture } from '../lap/types.js';
import type { StintResult } from '../lap/stint.js';

export type PracticePersonnel = {
	/** Driver Feedback 0–99. */
	driverFeedback: number;
	/** Race Engineer Setup 0–99. */
	engineerSetup: number;
	/** Race Engineer Analysis 0–99. */
	engineerAnalysis: number;
};

export type TrimKind = 'qualifying_trim' | 'race_trim' | 'compound_knowledge' | 'wet_weather_trim';

export type KnowledgeTrims = {
	qualifying: { xp: number; tier: number };
	race: { xp: number; tier: number };
	compound: Record<TireCompound, { xp: number; tier: number }>;
	wetWeather: { xp: number; tier: number };
	/** When true, slick (soft/medium/hard) compound XP does not accrue. */
	slicksFrozen: boolean;
};

export type BriefClarity = 'high' | 'mid' | 'low';

export type EngineeringBrief = {
	clarity: BriefClarity;
	qualityScore: number;
	/** Player-facing lines. */
	lines: string[];
	/** True deltas used to generate the brief (hidden from low-clarity UI if you filter). */
	trueFocusKeys: (keyof SetupVector)[];
};

export type StintDirective = {
	/** Explicit intent; if omitted, inferred from fuel/laps/pace/moisture. */
	intent?: TrimKind;
	lapCount: number;
	pace?: PaceDirective;
};

export type PracticeStintResult = {
	stint: StintResult;
	trimAwards: { kind: TrimKind; compound?: TireCompound; xpGained: number; tierAfter: number }[];
	trims: KnowledgeTrims;
	brief: EngineeringBrief;
	setupDistance: number;
};
