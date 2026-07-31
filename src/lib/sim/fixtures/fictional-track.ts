import type { OfficialSector, SimulationTrack, TrackSegment } from '../core/types';

type SegmentDefinition = [
	distanceM: number,
	baseTimeMs: number,
	officialSector: OfficialSector,
	weights: [number, number, number, number, number],
	overtakingDifficulty: number,
	dirtyAirSensitivity: number,
	tyreEnergyFactor: number,
	fuelBurnFactor: number
];

const DEFINITIONS: SegmentDefinition[] = [
	[320, 5800, 1, [0.1, 0.15, 0.35, 0.25, 0.15], 0.38, 0.15, 0.9, 1],
	[280, 5000, 1, [0.1, 0.45, 0.2, 0.05, 0.2], 0.82, 0.35, 1.15, 0.95],
	[360, 6500, 1, [0.5, 0.1, 0.15, 0.15, 0.1], 0.9, 0.8, 1.3, 1.02],
	[300, 5400, 1, [0.1, 0.2, 0.25, 0.3, 0.15], 0.55, 0.2, 0.9, 1.04],
	[340, 6100, 1, [0.05, 0.1, 0.25, 0.45, 0.15], 0.32, 0.05, 0.85, 1.08],
	[300, 5400, 2, [0.1, 0.5, 0.15, 0.05, 0.2], 0.86, 0.3, 1.2, 0.96],
	[380, 6800, 2, [0.55, 0.05, 0.15, 0.15, 0.1], 0.92, 0.9, 1.35, 1.04],
	[290, 5200, 2, [0.2, 0.35, 0.2, 0.05, 0.2], 0.76, 0.55, 1.15, 0.94],
	[350, 6300, 2, [0.15, 0.15, 0.25, 0.3, 0.15], 0.52, 0.2, 0.95, 1.05],
	[280, 5000, 2, [0.05, 0.1, 0.25, 0.45, 0.15], 0.28, 0.05, 0.8, 1.08],
	[340, 6100, 3, [0.45, 0.1, 0.15, 0.2, 0.1], 0.88, 0.8, 1.3, 1.02],
	[310, 5600, 3, [0.1, 0.45, 0.2, 0.05, 0.2], 0.8, 0.4, 1.2, 0.96],
	[370, 6700, 3, [0.5, 0.05, 0.15, 0.2, 0.1], 0.9, 0.85, 1.35, 1.04],
	[330, 6000, 3, [0.1, 0.25, 0.25, 0.2, 0.2], 0.62, 0.25, 1, 1],
	[450, 8100, 3, [0.05, 0.1, 0.25, 0.45, 0.15], 0.25, 0.05, 0.85, 1.12]
];

export const FICTIONAL_TRACK: Readonly<SimulationTrack> = Object.freeze({
	id: 'circuit-redwood',
	name: 'Redwood International Circuit',
	lapDistanceM: 5000,
	pitLaneLossMs: 18_500,
	segments: DEFINITIONS.map(
		(
			[
				distanceM,
				baseTimeMs,
				officialSector,
				[highSpeedWeight, lowSpeedWeight, powerWeight, topSpeedWeight, brakingWeight],
				overtakingDifficulty,
				dirtyAirSensitivity,
				tyreEnergyFactor,
				fuelBurnFactor
			],
			index
		): TrackSegment => ({
			id: `seg-${String(index + 1).padStart(2, '0')}`,
			sequence: index + 1,
			officialSector,
			distanceM,
			baseTimeMs,
			highSpeedWeight,
			lowSpeedWeight,
			powerWeight,
			topSpeedWeight,
			brakingWeight,
			overtakingDifficulty,
			dirtyAirSensitivity,
			tyreEnergyFactor,
			fuelBurnFactor,
			isDrsDetection: index === 3 || index === 8,
			isDrsActivation: index === 4 || index === 9,
			isPitEntry: index === 13,
			isPitExit: index === 14
		})
	)
});
