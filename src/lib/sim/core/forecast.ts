import { hashString } from './hash';
import { clamp, roundHalfEven } from './math';
import type {
	WeatherForecastCapability,
	WeatherForecastCapabilityInputs,
	WeatherForecastScore,
	WeatherForecastSnapshot,
	WeatherForecastSurfaceObservation,
	WeatherForecastWindow,
	WeatherTruthPoint
} from './types';
import { interpolateWeatherTruth } from './weather';

export const WEATHER_FORECAST_MODEL_VERSION = 'forecast-v2';

const BASIS_POINTS = 10_000;
const MINUTE_MS = 60_000;
const FORECAST_WINDOWS = [
	[0, 5 * MINUTE_MS],
	[5 * MINUTE_MS, 15 * MINUTE_MS],
	[15 * MINUTE_MS, 30 * MINUTE_MS],
	[30 * MINUTE_MS, 60 * MINUTE_MS]
] as const;

function unitHash(value: string): number {
	return Number.parseInt(hashString(value).slice(0, 8), 16) / 0xffffffff;
}

function signedHash(value: string): number {
	return unitHash(value) * 2 - 1;
}

function assertCapability(capability: WeatherForecastCapability): void {
	if (
		capability.teamId.length === 0 ||
		capability.refreshIntervalMs <= 0 ||
		capability.usefulHorizonMs <= 0 ||
		capability.onsetTimingErrorMs < 0 ||
		capability.intensityErrorBp < 0 ||
		capability.probabilityNoiseBp < 0 ||
		capability.confidenceCeilingBp <= 0 ||
		capability.confidenceCeilingBp >= BASIS_POINTS
	) {
		throw new Error('Invalid weather forecast capability');
	}
}

function sampleTimeline(
	timeline: WeatherTruthPoint[],
	issuedAtMs: number,
	startOffsetMs: number,
	endOffsetMs: number,
	onsetShiftMs: number
): WeatherTruthPoint[] {
	const durationMs = endOffsetMs - startOffsetMs;
	const sampleCount = Math.max(2, Math.ceil(durationMs / (5 * MINUTE_MS)));
	return Array.from({ length: sampleCount + 1 }, (_, index) => {
		const offset = startOffsetMs + roundHalfEven((durationMs * index) / sampleCount);
		return interpolateWeatherTruth(timeline, issuedAtMs + offset - onsetShiftMs);
	});
}

function onsetOffsetMs(
	intensities: number[],
	startOffsetMs: number,
	endOffsetMs: number
): number | null {
	const onsetIndex = intensities.findIndex((intensity) => intensity > 0);
	if (onsetIndex < 0) return null;
	if (onsetIndex === 0) return startOffsetMs;
	const previous = intensities[onsetIndex - 1];
	const current = intensities[onsetIndex];
	const crossingFraction =
		previous >= 0 && current > previous ? (0 - previous) / (current - previous) : 0;
	const samplePosition = onsetIndex - 1 + Math.max(0, Math.min(1, crossingFraction));
	return (
		startOffsetMs +
		roundHalfEven(
			((endOffsetMs - startOffsetMs) * samplePosition) / Math.max(1, intensities.length - 1)
		)
	);
}

function forecastWindow(
	timeline: WeatherTruthPoint[],
	capability: WeatherForecastCapability,
	seed: string,
	issuedAtMs: number,
	startOffsetMs: number,
	endOffsetMs: number
): WeatherForecastWindow {
	const latentKey = `${seed}:${issuedAtMs}:${startOffsetMs}:${endOffsetMs}:${WEATHER_FORECAST_MODEL_VERSION}`;
	const onsetShiftMs = roundHalfEven(
		signedHash(`${latentKey}:onset`) * capability.onsetTimingErrorMs
	);
	const samples = sampleTimeline(timeline, issuedAtMs, startOffsetMs, endOffsetMs, onsetShiftMs);
	const intensities = samples.map((sample) => sample.rainIntensityBp);
	const truthMinimum = Math.min(...intensities);
	const truthMaximum = Math.max(...intensities);
	const rainySamples = intensities.filter((intensity) => intensity > 0).length;
	const probabilityNoise = roundHalfEven(
		signedHash(`${latentKey}:probability`) * capability.probabilityNoiseBp
	);
	const intensityShift = roundHalfEven(
		signedHash(`${latentKey}:intensity`) * capability.intensityErrorBp
	);
	const maximumIntensityChange = intensities.reduce(
		(maximum, intensity, index) =>
			index === 0 ? maximum : Math.max(maximum, Math.abs(intensity - intensities[index - 1])),
		0
	);
	const intensityIntervalPadding =
		roundHalfEven((capability.intensityErrorBp * 3) / 4) +
		roundHalfEven(maximumIntensityChange / 8);
	const horizonPenalty = Math.max(0, endOffsetMs - capability.usefulHorizonMs);
	const confidencePenalty = roundHalfEven(
		(capability.confidenceCeilingBp * horizonPenalty) /
			Math.max(capability.usefulHorizonMs, endOffsetMs)
	);
	const confidenceBp = clamp(
		capability.confidenceCeilingBp - confidencePenalty,
		1_000,
		BASIS_POINTS - 1
	);
	const predictedOnsetOffsetMs = onsetOffsetMs(intensities, startOffsetMs, endOffsetMs);
	return {
		startOffsetMs,
		endOffsetMs,
		rainProbabilityBp: clamp(
			roundHalfEven((rainySamples * BASIS_POINTS) / samples.length) + probabilityNoise,
			0,
			BASIS_POINTS
		),
		rainIntensityMinBp: clamp(
			truthMinimum + intensityShift - intensityIntervalPadding,
			0,
			BASIS_POINTS
		),
		rainIntensityMaxBp: clamp(
			truthMaximum + intensityShift + intensityIntervalPadding,
			0,
			BASIS_POINTS
		),
		confidenceBp,
		predictedOnsetOffsetMs
	};
}

export function resolveWeatherForecastCapability(
	teamId: string,
	inputs: WeatherForecastCapabilityInputs
): WeatherForecastCapability {
	if (
		teamId.length === 0 ||
		Object.values(inputs).some((value) => !Number.isInteger(value) || value < 1 || value > 20)
	) {
		throw new Error('Invalid weather forecast capability inputs');
	}
	const quality =
		(inputs.hqWeatherStationLevel * 0.5 +
			inputs.weatherAnalystSkill * 0.3 +
			inputs.tracksideToolsLevel * 0.2 -
			1) /
		19;
	return {
		teamId,
		refreshIntervalMs: roundHalfEven(300_000 - quality * 180_000),
		usefulHorizonMs: roundHalfEven(600_000 + quality * 1_200_000),
		onsetTimingErrorMs: roundHalfEven(120_000 - quality * 80_000),
		intensityErrorBp: roundHalfEven(3_500 - quality * 2_500),
		probabilityNoiseBp: roundHalfEven(2_500 - quality * 1_800),
		confidenceCeilingBp: roundHalfEven(6_000 + quality * 3_000)
	};
}

export function buildWeatherForecastSnapshot(
	timeline: WeatherTruthPoint[],
	capability: WeatherForecastCapability,
	seed: string,
	issuedAtMs: number,
	sessionDurationMs: number,
	observedSegments: WeatherForecastSurfaceObservation[] = []
): WeatherForecastSnapshot {
	if (timeline.length === 0 || issuedAtMs < 0 || sessionDurationMs <= issuedAtMs) {
		throw new Error('Invalid weather forecast request');
	}
	assertCapability(capability);
	const windows = FORECAST_WINDOWS.filter(
		([, endOffsetMs], index) => index === 0 || issuedAtMs + endOffsetMs <= sessionDurationMs
	).map(([startOffsetMs, endOffsetMs]) =>
		forecastWindow(timeline, capability, seed, issuedAtMs, startOffsetMs, endOffsetMs)
	);
	return {
		forecastModelVersion: WEATHER_FORECAST_MODEL_VERSION,
		teamId: capability.teamId,
		issuedAtMs,
		validUntilMs: issuedAtMs + capability.refreshIntervalMs,
		observed: {
			...interpolateWeatherTruth(timeline, issuedAtMs),
			segments: structuredClone(observedSegments)
		},
		windows
	};
}

export function scoreWeatherForecast(
	snapshot: WeatherForecastSnapshot,
	timeline: WeatherTruthPoint[]
): WeatherForecastScore {
	if (snapshot.windows.length === 0) {
		return {
			windowCount: 0,
			brierScore: 0,
			meanOnsetTimingErrorMs: 0,
			intensityIntervalCoverageBp: 0,
			meanIntensityIntervalWidthBp: 0
		};
	}
	let brierScore = 0;
	let onsetTimingErrorMs = 0;
	let coveredIntervals = 0;
	let intensityIntervalWidthBp = 0;
	for (const window of snapshot.windows) {
		const samples = sampleTimeline(
			timeline,
			snapshot.issuedAtMs,
			window.startOffsetMs,
			window.endOffsetMs,
			0
		);
		const intensities = samples.map((sample) => sample.rainIntensityBp);
		const actualProbabilityBp = roundHalfEven(
			(intensities.filter((intensity) => intensity > 0).length * BASIS_POINTS) / samples.length
		);
		brierScore += ((window.rainProbabilityBp - actualProbabilityBp) / BASIS_POINTS) ** 2;
		const actualOnsetOffsetMs = onsetOffsetMs(
			intensities,
			window.startOffsetMs,
			window.endOffsetMs
		);
		if (actualOnsetOffsetMs === null && window.predictedOnsetOffsetMs === null) {
			// Both forecasts correctly predict no onset in this window.
		} else if (actualOnsetOffsetMs === null || window.predictedOnsetOffsetMs === null) {
			onsetTimingErrorMs += window.endOffsetMs - window.startOffsetMs;
		} else {
			onsetTimingErrorMs += Math.abs(window.predictedOnsetOffsetMs - actualOnsetOffsetMs);
		}
		const actualMinimum = Math.min(...intensities);
		const actualMaximum = Math.max(...intensities);
		if (window.rainIntensityMinBp <= actualMinimum && window.rainIntensityMaxBp >= actualMaximum) {
			coveredIntervals += 1;
		}
		intensityIntervalWidthBp += window.rainIntensityMaxBp - window.rainIntensityMinBp;
	}
	return {
		windowCount: snapshot.windows.length,
		brierScore: brierScore / snapshot.windows.length,
		meanOnsetTimingErrorMs: onsetTimingErrorMs / snapshot.windows.length,
		intensityIntervalCoverageBp: roundHalfEven(
			(coveredIntervals * BASIS_POINTS) / snapshot.windows.length
		),
		meanIntensityIntervalWidthBp: roundHalfEven(intensityIntervalWidthBp / snapshot.windows.length)
	};
}
