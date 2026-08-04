import {
	DRY_ENGINE_VERSION,
	FORMULA_CONFIG,
	WEATHER_ENGINE_VERSION,
	WEATHER_FORMULA_VERSION
} from './config';
import type { RaceInput, StrategyCommand, TrackSegment, WeatherScenarioSpec } from './types';

const MIN_RATING = 0;
const MAX_RATING = 100;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`Invalid race input: ${message}`);
}

function validateSegmentWeights(segment: TrackSegment): void {
	const total =
		segment.highSpeedWeight +
		segment.lowSpeedWeight +
		segment.powerWeight +
		segment.topSpeedWeight +
		segment.brakingWeight;
	assert(
		Math.abs(total - 1) < 0.000_001,
		`segment ${segment.id} performance weights must sum to 1`
	);
}

function commandKey(command: StrategyCommand): string {
	return `${command.triggerLap}:${command.triggerSegmentId}:${command.sequence}:${command.sessionEntryId}`;
}

function assertBasisPoints(value: unknown, label: string): asserts value is number {
	assert(Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10_000, label);
}

function assertTemperature(value: unknown, label: string): asserts value is number {
	assert(Number.isInteger(value) && Number(value) >= -500 && Number(value) <= 1_500, label);
}

function validateWeatherScenario(scenario: WeatherScenarioSpec): void {
	assert(
		Number.isInteger(scenario.controlPointIntervalMs) && scenario.controlPointIntervalMs > 0,
		'weather control-point interval must be positive'
	);
	assertTemperature(scenario.initialAirTempDeciC, 'initial air temperature out of range');
	assertTemperature(scenario.initialTrackTempDeciC, 'initial track temperature out of range');
	assertBasisPoints(scenario.initialRainIntensityBp, 'initial rain intensity out of range');
	assertBasisPoints(
		scenario.initialRacingLineWetnessBp,
		'initial racing-line wetness out of range'
	);
	assertBasisPoints(scenario.initialOffLineWetnessBp, 'initial off-line wetness out of range');
	assert(scenario.envelope.length > 0, 'weather envelope requires at least one point');
	let previousAtMs = 0;
	for (const point of scenario.envelope) {
		assert(
			Number.isInteger(point.atMs) && point.atMs > previousAtMs,
			'weather envelope timestamps must be strictly increasing'
		);
		assert(
			point.atMs % scenario.controlPointIntervalMs === 0,
			'weather envelope timestamps must align to the control-point interval'
		);
		previousAtMs = point.atMs;
		assertBasisPoints(point.rainIntensityMinBp, 'weather rain minimum out of range');
		assertBasisPoints(point.rainIntensityMaxBp, 'weather rain maximum out of range');
		assert(point.rainIntensityMinBp <= point.rainIntensityMaxBp, 'weather rain range is inverted');
		assertTemperature(point.airTempMinDeciC, 'weather air-temperature minimum out of range');
		assertTemperature(point.airTempMaxDeciC, 'weather air-temperature maximum out of range');
		assert(point.airTempMinDeciC <= point.airTempMaxDeciC, 'weather air range is inverted');
		assertTemperature(point.trackTempMinDeciC, 'weather track-temperature minimum out of range');
		assertTemperature(point.trackTempMaxDeciC, 'weather track-temperature maximum out of range');
		assert(
			point.trackTempMinDeciC <= point.trackTempMaxDeciC,
			'weather track-temperature range is inverted'
		);
	}
}

export function validateRaceInput(input: RaceInput): void {
	const weatherEnabled = input.weather?.enabled === true;
	const expectedFormulaVersion = weatherEnabled ? WEATHER_FORMULA_VERSION : FORMULA_CONFIG.version;
	const expectedEngineVersion = weatherEnabled ? WEATHER_ENGINE_VERSION : DRY_ENGINE_VERSION;
	assert(input.formulaVersion.length > 0, 'formulaVersion is required');
	assert(
		input.formulaVersion === expectedFormulaVersion,
		`formulaVersion must be ${expectedFormulaVersion}`
	);
	assert(
		input.engineVersion === expectedEngineVersion,
		`engineVersion must be ${expectedEngineVersion}`
	);
	assert(input.seed.length > 0, 'seed is required');
	assert(input.rules.lapCount > 0, 'lapCount must be positive');
	assert(!input.rules.refuelingEnabled, 'refueling is not implemented');
	assert(!input.rules.ersEnabled, 'ERS is not implemented');
	if (input.weather?.enabled === true) {
		assert(input.weather.forecastModelVersion.length > 0, 'forecastModelVersion is required');
		validateWeatherScenario(input.weather.scenario);
		const weatherRules = input.rules.weather;
		assert(weatherRules, 'weather rules are required');
		assertBasisPoints(weatherRules.drsSuspendRainBp, 'DRS rain suspend threshold out of range');
		assertBasisPoints(weatherRules.drsRestoreRainBp, 'DRS rain restore threshold out of range');
		assert(
			weatherRules.drsRestoreRainBp < weatherRules.drsSuspendRainBp,
			'DRS rain restore threshold must be below suspend threshold'
		);
		assertBasisPoints(
			weatherRules.drsSuspendWetnessBp,
			'DRS wetness suspend threshold out of range'
		);
		assertBasisPoints(
			weatherRules.drsRestoreWetnessBp,
			'DRS wetness restore threshold out of range'
		);
		assert(
			weatherRules.drsRestoreWetnessBp < weatherRules.drsSuspendWetnessBp,
			'DRS wetness restore threshold must be below suspend threshold'
		);
		assertBasisPoints(weatherRules.unsafeWetnessBp, 'unsafe wetness threshold out of range');
	} else {
		assert(input.rules.weather === undefined, 'weather rules require enabled weather');
	}
	assert(
		input.track.segments.length >= 12 && input.track.segments.length <= 20,
		'track requires 12–20 segments'
	);

	let distance = 0;
	let previousSector = 1;
	let pitEntrySequence = -1;
	let pitExitSequence = -1;
	let detectionSeen = false;
	const segmentIds = new Set<string>();
	for (const [index, segment] of input.track.segments.entries()) {
		assert(segment.sequence === index + 1, 'segment sequences must be contiguous from 1');
		assert(!segmentIds.has(segment.id), `duplicate segment ID ${segment.id}`);
		segmentIds.add(segment.id);
		assert(
			segment.distanceM > 0 && segment.baseTimeMs > 0,
			`segment ${segment.id} has invalid distance/time`
		);
		assert(segment.officialSector >= previousSector, 'official sectors must be contiguous');
		assert(segment.officialSector <= previousSector + 1, 'official sectors cannot be skipped');
		previousSector = segment.officialSector;
		distance += segment.distanceM;
		validateSegmentWeights(segment);
		if (weatherEnabled) {
			for (const [name, value] of Object.entries({
				drainagePpm: segment.drainagePpm,
				evaporationPpm: segment.evaporationPpm,
				racingLineDryingPpm: segment.racingLineDryingPpm,
				offLineRetentionPpm: segment.offLineRetentionPpm,
				wetGripSensitivityPpm: segment.wetGripSensitivityPpm
			})) {
				assert(
					Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2_000_000,
					`segment ${segment.id} ${name} out of range`
				);
			}
			assert(
				segment.offLineRetentionPpm! > 0,
				`segment ${segment.id} offLineRetentionPpm must be positive`
			);
		}
		if (segment.isPitEntry) pitEntrySequence = segment.sequence;
		if (segment.isPitExit) pitExitSequence = segment.sequence;
		if (segment.isDrsDetection) detectionSeen = true;
		if (segment.isDrsActivation)
			assert(detectionSeen, 'DRS activation requires a preceding detection');
	}
	assert(distance === input.track.lapDistanceM, 'segment distances must equal lap distance');
	assert(previousSector === 3, 'track must contain all three official sectors');
	assert(
		pitEntrySequence > 0 && pitExitSequence > pitEntrySequence,
		'pit entry must precede pit exit'
	);

	const entryIds = new Set<string>();
	const gridPositions = new Set<number>();
	for (const entry of input.entries) {
		assert(!entryIds.has(entry.sessionEntryId), `duplicate entry ID ${entry.sessionEntryId}`);
		assert(!gridPositions.has(entry.gridPosition), `duplicate grid position ${entry.gridPosition}`);
		entryIds.add(entry.sessionEntryId);
		gridPositions.add(entry.gridPosition);
		assert(entry.startingFuelGrams > 0, `${entry.sessionEntryId} requires starting fuel`);
		assert(
			entry.setupFactorPpm >= 950_000 && entry.setupFactorPpm <= 1_050_000,
			'setup factor out of range'
		);
		assert(
			entry.tyreWearSetupPpm >= 900_000 && entry.tyreWearSetupPpm <= 1_100_000,
			'tyre wear setup factor out of range'
		);
		for (const [name, rating] of Object.entries(entry.driver)) {
			assert(
				Number.isInteger(rating) && rating >= MIN_RATING && rating <= MAX_RATING,
				`${entry.sessionEntryId} ${name} rating invalid`
			);
		}
		if (weatherEnabled) {
			assert(
				Number.isInteger(entry.driver.wetPace) &&
					Number(entry.driver.wetPace) >= MIN_RATING &&
					Number(entry.driver.wetPace) <= MAX_RATING,
				`${entry.sessionEntryId} wetPace rating invalid`
			);
			assert(
				Number.isInteger(entry.driver.adaptability) &&
					Number(entry.driver.adaptability) >= MIN_RATING &&
					Number(entry.driver.adaptability) <= MAX_RATING,
				`${entry.sessionEntryId} adaptability rating invalid`
			);
		}
		const tyreIds = new Set(entry.tyreSets.map((tyreSet) => tyreSet.id));
		assert(
			tyreIds.size === entry.tyreSets.length,
			`${entry.sessionEntryId} has duplicate tyre set IDs`
		);
		assert(
			tyreIds.has(entry.startingTyreSetId),
			`${entry.sessionEntryId} starting tyre was not issued`
		);
		for (const tyreSet of entry.tyreSets) {
			assert(
				tyreSet.compound.wearKneeBp >= 0 && tyreSet.compound.wearKneeBp < 10_000,
				`${tyreSet.id} has an invalid wear knee`
			);
			assert(
				tyreSet.compound.postKneeTimeLossMsPerLap >= 0,
				`${tyreSet.id} has an invalid post-knee loss`
			);
			if (weatherEnabled) {
				assertBasisPoints(
					tyreSet.compound.optimalWetnessMinBp,
					`${tyreSet.id} wetness minimum out of range`
				);
				assertBasisPoints(
					tyreSet.compound.optimalWetnessMaxBp,
					`${tyreSet.id} wetness maximum out of range`
				);
				assert(
					tyreSet.compound.optimalWetnessMinBp <= tyreSet.compound.optimalWetnessMaxBp,
					`${tyreSet.id} wetness range is inverted`
				);
				for (const [name, value] of Object.entries({
					underWetnessLossPpm: tyreSet.compound.underWetnessLossPpm,
					overWetnessLossPpm: tyreSet.compound.overWetnessLossPpm,
					waterClearingPpm: tyreSet.compound.waterClearingPpm,
					dryTrackWearMultiplierPpm: tyreSet.compound.dryTrackWearMultiplierPpm
				})) {
					assert(
						Number.isInteger(value) && Number(value) > 0 && Number(value) <= 5_000_000,
						`${tyreSet.id} ${name} out of range`
					);
				}
				assert(
					tyreSet.compound.dryTrackWearMultiplierPpm! >= 1_000_000,
					`${tyreSet.id} dryTrackWearMultiplierPpm must not reduce wear`
				);
				assertTemperature(
					tyreSet.compound.operatingTempMinDeciC,
					`${tyreSet.id} operating-temperature minimum out of range`
				);
				assertTemperature(
					tyreSet.compound.operatingTempMaxDeciC,
					`${tyreSet.id} operating-temperature maximum out of range`
				);
				assert(
					tyreSet.compound.operatingTempMinDeciC <= tyreSet.compound.operatingTempMaxDeciC,
					`${tyreSet.id} operating-temperature range is inverted`
				);
			}
		}
		const conservativeFuelNeed = Math.ceil(
			(FORMULA_CONFIG.baseFuelBurnGramsPerLap *
				input.rules.lapCount *
				FORMULA_CONFIG.conservativeFuelFactor) /
				entry.car.fuelEfficiency
		);
		assert(
			entry.startingFuelGrams >= conservativeFuelNeed,
			`${entry.sessionEntryId} starting fuel cannot complete the strategy`
		);
	}
	assert(input.entries.length > 0, 'at least one entry is required');

	const commandKeys = new Set<string>();
	for (const command of input.commands) {
		assert(
			entryIds.has(command.sessionEntryId),
			`command references unknown entry ${command.sessionEntryId}`
		);
		assert(
			command.triggerLap >= 1 && command.triggerLap <= input.rules.lapCount,
			'command lap out of range'
		);
		assert(segmentIds.has(command.triggerSegmentId), 'command segment is unknown');
		const key = commandKey(command);
		assert(!commandKeys.has(key), `duplicate/conflicting command ${key}`);
		commandKeys.add(key);
		if (command.action.type === 'pit') {
			const entry = input.entries.find(
				(candidate) => candidate.sessionEntryId === command.sessionEntryId
			)!;
			const tyreSetId = command.action.tyreSetId;
			assert(
				entry.tyreSets.some((tyreSet) => tyreSet.id === tyreSetId),
				`pit command tyre ${tyreSetId} was not issued`
			);
		}
	}
	for (const entry of input.entries) {
		const pitCommands = input.commands.filter(
			(command) => command.sessionEntryId === entry.sessionEntryId && command.action.type === 'pit'
		).length;
		assert(
			pitCommands >= input.rules.mandatoryPitStops,
			`${entry.sessionEntryId} does not meet the mandatory pit-stop rule`
		);
	}
}
