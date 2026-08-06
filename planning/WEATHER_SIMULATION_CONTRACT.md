# Weather Simulation Contract — Stage D1

**Status:** Accepted prototype expansion contract; launch boundary reconciled through D-543
**Scope:** Deterministic static-to-changing weather for the headless race engine; segment-level surface detail is not launch behavior
**Depends on:** Recalibrated `academy-dry-v5-ratings-0-100` baseline
**Persistence:** Session-scoped versioned runtime state persisted through the session input and
checkpoint boundary; hidden weather truth is never exposed to the renderer

---

## 1. Purpose

Add changing weather without destabilizing the accepted dry-race model. The module must provide:

- A hidden deterministic weather timeline.
- Circuit-wide precipitation.
- Future expansion: mini-sector racing-line and off-line surface wetness.
- Air and track temperature.
- Continuous slick, intermediate, and wet tyre suitability.
- Wet-driver and changing-condition performance.
- Weather-controlled DRS suspension.
- Probabilistic team forecasts that improve with staff and HQ capability.
- Deterministic checkpoint/resume and batch calibration.

The disabled weather module must preserve `academy-dry-v5-ratings-0-100` output exactly for the same
0–100 inputs.

---

## 2. Locked decisions

| Topic                    | Decision                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| Precipitation resolution | Circuit-wide in V1                                                    |
| Surface resolution       | Shared circuit-wide track state at launch; segment state deferred     |
| Surface channels         | Circuit-wide launch state; racing-line/off-line channels deferred     |
| Weather truth            | Hidden deterministic timeline resolved at session initialization      |
| Forecast presentation    | Rolling probability and intensity windows                             |
| Weather clock            | One shared clock based on leader elapsed time                         |
| Update cadence           | Shared session/weather clock at launch; mini-sector updates deferred  |
| Tyre crossover           | Continuous wetness curves, never discrete condition switches          |
| Temperature              | Air and track temperature; wind and humidity deferred                 |
| Driver ratings           | Wetness blends `pace` toward `wetPace`; `adaptability` handles change |
| DRS                      | Automatic weather suspension and hysteretic restoration               |
| Unsafe conditions        | Emit state/events; race-control actions remain deferred               |

The launch model uses one shared circuit-wide atmospheric and track state. The segment-surface,
mini-sector, racing-line/off-line, and localized-rain details in this document are future expansion
scope and must not be enabled by launch callers.

---

## 3. Module boundaries

### 3.1 Weather truth resolver

At session initialization, the resolver consumes the weather scenario specification and the
dedicated `weather` RNG stream. It produces the complete hidden truth timeline before the first
race step.

The resolver:

- Draws a fixed documented number of values per timeline control point.
- Processes control points in timestamp order.
- Stores the resolved timeline in `WeatherRuntimeState`.
- Does not consume pace, overtaking, incident, or reliability RNG streams.
- Is not rerun when restoring a checkpoint.

Identical scenario input, seed, and versions must resolve byte-identical truth.

### 3.2 Race engine

The engine consumes only actual atmospheric and surface state. Forecast quality must never affect
weather truth, grip, timing, or RNG advancement.

### 3.3 Forecast service

Forecast generation sits outside the race-state transition. It receives hidden truth through a
restricted internal boundary and emits team-visible forecast snapshots.

Forecast error uses stateless keyed deterministic draws derived from:

- Session seed
- Team ID
- Forecast issue time
- Forecast horizon
- Forecast model version

Requesting or refreshing a forecast must not advance the engine `weather` RNG stream.

### 3.4 Deferred race control

Weather may suspend DRS and emit unsafe-condition state. It does not deploy a safety car, VSC, or
red flag. The later race-control module consumes unsafe-condition events.

---

## 4. Input contract

Weather is optional on `RaceInput`:

```ts
type WeatherInput =
	| { enabled: false }
	| {
			enabled: true;
			scenario: WeatherScenarioSpec;
			forecastModelVersion: string;
	  };
```

When omitted or disabled:

- No weather RNG draws occur.
- No weather state or events are emitted.
- Timing, telemetry, classification, and final state hash remain compatible with the dry baseline.

### 4.1 WeatherScenarioSpec

```ts
interface WeatherScenarioSpec {
	controlPointIntervalMs: number;
	initialAirTempDeciC: number;
	initialTrackTempDeciC: number;
	initialRainIntensityBp: number;
	initialRacingLineWetnessBp: number;
	initialOffLineWetnessBp: number;
	envelope: WeatherEnvelopePoint[];
}

interface WeatherEnvelopePoint {
	atMs: number;
	rainIntensityMinBp: number;
	rainIntensityMaxBp: number;
	airTempMinDeciC: number;
	airTempMaxDeciC: number;
	trackTempMinDeciC: number;
	trackTempMaxDeciC: number;
}
```

Envelope timestamps are immutable, strictly increasing, and aligned to `controlPointIntervalMs`.
The resolver consumes exactly three weather-stream draws per envelope point—rain, air temperature,
and track temperature—even when a range has equal bounds. Values are selected with integer
fixed-point scaling, and runtime state later interpolates between resolved points.

Calibration fixtures may set minimum and maximum values equal to create an exact truth timeline.

### 4.2 TrackSegment additions (deferred beyond launch)

Each segment adds:

| Field                   | Unit | Meaning                              |
| ----------------------- | ---: | ------------------------------------ |
| `drainagePpm`           |  ppm | Natural water-removal rate           |
| `evaporationPpm`        |  ppm | Track-temperature response           |
| `racingLineDryingPpm`   |  ppm | Water displaced by passing cars      |
| `offLineRetentionPpm`   |  ppm | Additional off-line water retention  |
| `wetGripSensitivityPpm` |  ppm | Segment sensitivity to surface water |

All factors are immutable track-version inputs.

### 4.3 Driver additions

Weather-enabled runs require:

- `wetPace`
- `adaptability`

`wetPace` affects sustained wet performance. `adaptability` affects only the temporary penalty from
rapidly changing wetness and temperature.

### 4.4 Tyre compound additions

`CompoundName` expands to:

```ts
type CompoundName = 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
```

Each `TyreCompoundSpec` adds:

| Field                       |  Unit | Meaning                              |
| --------------------------- | ----: | ------------------------------------ |
| `optimalWetnessMinBp`       |    bp | Lower edge of best wetness range     |
| `optimalWetnessMaxBp`       |    bp | Upper edge of best wetness range     |
| `underWetnessLossPpm`       |   ppm | Grip loss below the optimal range    |
| `overWetnessLossPpm`        |   ppm | Grip loss above the optimal range    |
| `waterClearingPpm`          |   ppm | Resistance to standing-water loss    |
| `dryTrackWearMultiplierPpm` |   ppm | Extra wet-tyre wear on a drying line |
| `operatingTempMinDeciC`     | 0.1°C | Lower thermal window                 |
| `operatingTempMaxDeciC`     | 0.1°C | Upper thermal window                 |

Slick specifications use an optimal range at or near zero wetness. Intermediate and wet
specifications overlap so crossover decisions are strategic rather than exact switches.

Initial `academy-weather-v1` compound specifications:

| Compound     | Optimal wetness |  Under loss |   Over loss | Water clearing |      Dry wear | Temperature |
| ------------ | --------------: | ----------: | ----------: | -------------: | ------------: | ----------: |
| Slicks       |        0–800 bp |       1 ppm | 500,000 ppm |    650,000 ppm | 1,000,000 ppm |    80–105°C |
| Intermediate |  1,800–6,000 bp | 260,000 ppm | 320,000 ppm |  1,000,000 ppm | 1,800,000 ppm |     65–85°C |
| Wet          | 5,000–10,000 bp | 400,000 ppm |       1 ppm |  1,500,000 ppm | 3,000,000 ppm |     50–75°C |

Soft, medium, and hard retain their accepted dry V4 grip and wear specifications. Intermediate and
wet use independent base grip, warm-up, wear, and wear-knee specifications. Weather fixtures issue
all five compound types without changing the Formula Development Championship dry fixture.

### 4.5 Rules additions

```ts
interface WeatherRaceRules {
	wetTyreWaivesDryCompoundRule: boolean;
	drsSuspendRainBp: number;
	drsRestoreRainBp: number;
	drsSuspendWetnessBp: number;
	drsRestoreWetnessBp: number;
	unsafeWetnessBp: number;
}
```

Every restore threshold must be lower than its corresponding suspend threshold.

---

## 5. Runtime state

```ts
interface WeatherRuntimeState {
	weatherClockMs: number;
	lastUpdateMs: number;
	resolvedTimeline: WeatherTruthPoint[];
	nextTruthPointIndex: number;
	rainIntensityBp: number;
	airTempDeciC: number;
	trackTempDeciC: number;
	previousRainIntensityBp: number;
	segments: SegmentSurfaceState[];
	drsWeatherSuspended: boolean;
	unsafeConditionsActive: boolean;
}

interface WeatherTruthPoint {
	atMs: number;
	rainIntensityBp: number;
	airTempDeciC: number;
	trackTempDeciC: number;
}

interface SegmentSurfaceState {
	segmentId: string;
	racingLineWetnessBp: number;
	offLineWetnessBp: number;
	previousRacingLineWetnessBp: number;
}
```

Wetness and rain intensity use basis points from `0–10_000`. Temperature uses integer tenths of a
degree Celsius.

`SimulationSnapshot` stores the complete `WeatherRuntimeState`. The persistent
`SessionCheckpoint.weatherStatePayload` later serializes the same evolution state, not only the
current sample.

Mounted tyre state adds `temperatureDeciC`. Tyre temperature is checkpointed with the tyre-set
state and contributes to grip and wear.

---

## 6. Weather and surface evolution (deferred segment-surface expansion)

The following surface-evolution rules are not enabled at launch. Launch weather consumes and updates
one shared circuit-wide track state; retain this section for a later granularity expansion.

### 6.1 Shared weather clock

Before every segment step:

```text
weatherClockMs = minimum elapsedMs among active entries
deltaMs = weatherClockMs - lastUpdateMs
```

All entries use the same atmospheric and surface sample for that step.

### 6.2 Atmospheric interpolation

Rain intensity, air temperature, and track temperature are interpolated between the surrounding
truth points. Interpolation uses integer fixed-point arithmetic and round-half-even, including
negative temperature deltas. The timeline cursor advances after the clock reaches a resolved point;
conditions hold at the final point after the timeline ends.

### 6.3 Surface update

Every segment updates in stable segment sequence:

```text
rainGain
  = rainIntensity
  × segment capture factor
  × delta time

naturalLoss
  = current wetness
  × drainage factor
  × delta time

evaporationLoss
  = current wetness
  × track-temperature response
  × evaporation factor
  × delta time

next wetness
  = clamp(current + rainGain - naturalLoss - evaporationLoss, 0, 10_000)
```

Off-line wetness applies `offLineRetentionPpm`, so it normally drains and dries more slowly.

After car timing and interactions resolve for the current segment, racing-line wetness receives the
car-passage drying reduction for the next visit. Off-line wetness receives no baseline car-passage
reduction.

Rain begins affecting grip immediately. Accumulated surface water changes more slowly according to
segment drainage and temperature.

Initial `academy-weather-v1` surface coefficients:

| Coefficient                             |          Value |
| --------------------------------------- | -------------: |
| Wetness gain at maximum rain            |   1,500 bp/min |
| Base proportional drainage              | 60,000 ppm/min |
| Evaporation reference track temperature |         15.0°C |
| Evaporation per 0.1°C above reference   |    300 ppm/min |
| Racing-line drying per passing car      |      1,000 ppm |

---

## 7. Pace, tyre, and driver effects

### 7.1 Continuous compound suitability

Compound wetness loss is zero inside its optimal range and increases continuously outside it:

```text
belowRange = max(0, optimalWetnessMin - racingLineWetness)
aboveRange = max(0, racingLineWetness - optimalWetnessMax)

wetnessPenalty
  = belowRange × underWetnessLoss ÷ 10_000
  + aboveRange × overWetnessLoss ÷ 10_000 × 1_000_000 ÷ waterClearing
```

The final penalty is segment-weighted by `wetGripSensitivityPpm`.

No compound receives an instantaneous cliff solely because a condition label changed.

### 7.2 Racing line and overtaking

Normal clean-air timing uses racing-line wetness. During an overtake attempt:

- The attacker blends toward off-line wetness according to the segment passing path.
- The defender remains primarily on racing-line wetness.
- Excess off-line water reduces opportunity and success probability.
- A failed wet pass may add time, but contact remains deferred to the incident module.

### 7.3 Tyre temperature

Mounted tyre temperature moves toward a deterministic target derived from:

- Track temperature
- Compound specification
- Segment tyre energy
- Engine and tyre-conservation modes
- Surface water cooling

Temperature outside the compound operating window adds continuous grip loss and wear. Intermediate
and wet tyres on a drying, warm racing line therefore overheat and wear faster without a discrete
rule.

Weather-enabled sets begin at their compound’s minimum operating temperature, representing tyre
blanket preparation. Only the mounted set evolves. Its per-segment target uses:

```text
target temperature
  = track temperature
  + friction heat
  + segment-energy heat
  + engine-mode heat
  + conservation heat
  - racing-line water cooling
  - compound wetness cooling

next temperature
  = current temperature
  + (target temperature - current temperature) × response
```

Initial `academy-weather-v1` thermal coefficients:

| Coefficient                                   |         Value |
| --------------------------------------------- | ------------: |
| Friction heat                                 |        60.0°C |
| Segment-energy heat at ±1.0 factor            |        12.0°C |
| Water cooling at 10,000 bp wetness            |        45.0°C |
| Compound wetness cooling at 10,000 bp minimum |         5.0°C |
| Attack / conserve engine-mode heat            | +3.5 / -2.5°C |
| Push / save conservation heat                 | +3.0 / -2.5°C |
| Per-segment temperature response              |   120,000 ppm |
| Thermal grip loss per 0.1°C outside window    |       300 ppm |
| Maximum thermal grip loss                     |   180,000 ppm |
| Thermal wear per 0.1°C outside window         |     1,000 ppm |
| Maximum thermal wear                          |   500,000 ppm |

Below the optimal wetness range, `dryTrackWearMultiplierPpm` blends linearly from neutral at the
range edge to the compound maximum on a fully dry line. Thermal wear then multiplies that adjusted
increment. All temperature, grip, and wear transitions are continuous.

### 7.4 Driver wet pace

The driver contribution blends continuously:

```text
wetBlendBp = wetness-derived blend from 0–10_000
effectivePace
  = (
      dry pace × (10_000 - wetBlendBp)
      + wetPace × wetBlendBp
    ) ÷ 10_000
```

Rapid changes in racing-line wetness or track temperature create a temporary transition penalty.
Higher `adaptability` reduces that penalty. Stable dry and stable wet conditions do not receive an
adaptability bonus.

The engine blends the dry and wet driver factors using racing-line wetness directly. The temporary
penalty uses the change since the previous shared-weather update:

```text
rawTransitionPenaltyPpm
  = min(
      60_000,
      abs(wetness change bp) × 25
      + abs(track-temperature change 0.1°C) × 500
    )

adaptabilityScalePpm
  = 50_000
  + (100 - adaptability) × (1_000_000 - 50_000) ÷ 99

transitionPenaltyPpm
  = rawTransitionPenaltyPpm × adaptabilityScalePpm ÷ 1_000_000
```

Rating 100 retains 5% of the raw transition loss rather than eliminating it. Rating 0 receives the
full raw loss. `wetPace` never changes dry timing, and `adaptability` never changes timing when
wetness and track temperature are stable.

---

## 8. DRS and unsafe conditions

DRS weather suspension activates when either:

- Rain intensity reaches `drsSuspendRainBp`.
- Any DRS activation segment reaches `drsSuspendWetnessBp` on the racing line.

It restores only when rain intensity and every DRS activation segment are below their lower restore
thresholds. State changes emit:

- `drs_weather_suspended`
- `drs_weather_restored`

Unsafe conditions activate when either wetness channel on any segment reaches `unsafeWetnessBp`.
Crossing the threshold emits:

- `unsafe_conditions_detected`
- `unsafe_conditions_cleared`

Repeated events are not emitted while the state remains unchanged.

---

## 9. Forecast contract

Team-visible forecasts use rolling windows:

- Now–5 minutes
- 5–15 minutes
- 15–30 minutes
- 30–60 minutes when session duration permits

```ts
interface WeatherForecastWindow {
	startOffsetMs: number;
	endOffsetMs: number;
	rainProbabilityBp: number;
	rainIntensityMinBp: number;
	rainIntensityMaxBp: number;
	confidenceBp: number;
	predictedOnsetOffsetMs: number | null;
}

interface WeatherForecastSnapshot {
	forecastModelVersion: string;
	teamId: string;
	issuedAtMs: number;
	validUntilMs: number;
	observed: WeatherForecastObservation;
	windows: WeatherForecastWindow[];
}

interface WeatherForecastObservation extends WeatherTruthPoint {
	segments: Array<{
		segmentId: string;
		racingLineWetnessBp: number;
		offLineWetnessBp: number;
	}>;
}
```

The forecast service consumes pre-resolved team capability:

```ts
interface WeatherForecastCapability {
	teamId: string;
	refreshIntervalMs: number;
	usefulHorizonMs: number;
	onsetTimingErrorMs: number;
	intensityErrorBp: number;
	probabilityNoiseBp: number;
	confidenceCeilingBp: number;
}
```

The management layer later resolves this capability from the HQ weather-station level, relevant
staff skill, and trackside tools. Weather fixtures provide the resolved capability directly.
`confidenceCeilingBp` must remain below `10_000`.

Current observed rain, temperature, and surface state are available without future-forecast error
in V1. HQ weather-station quality and staff analysis improve:

- Refresh interval
- Onset timing error
- Intensity-range width
- Probability calibration
- Useful forecast horizon

The prototype resolves capability from three 0–100 ratings using weights of 50% HQ weather station,
30% weather analyst, and 20% trackside tools. At the minimum and maximum combined quality, the
resolved bands are:

| Capability         | Low quality | High quality |
| ------------------ | ----------: | -----------: |
| Refresh interval   |  300,000 ms |   120,000 ms |
| Useful horizon     |  600,000 ms | 1,800,000 ms |
| Onset timing error |  120,000 ms |    40,000 ms |
| Intensity error    |    3,500 bp |     1,000 bp |
| Probability noise  |    2,500 bp |       700 bp |
| Confidence ceiling |    6,000 bp |     9,000 bp |

Forecast windows use stateless keyed deterministic error derived from session seed, issue time,
horizon, and forecast model version. Capability levels share the latent draw while scaling its
magnitude, so higher capability is evaluated as a paired improvement. The service samples the hidden timeline only through its
restricted forecast boundary; it never advances the engine weather RNG or mutates weather state.
Forecast scoring reports:

- Brier score for the window rain-probability estimate.
- Mean onset timing error in milliseconds.
- Intensity interval coverage in basis points.

No quality level reaches perfect certainty. Sudden timeline changes remain harder to predict.

---

## 10. Segment update order

Weather-enabled segment transitions use:

1. Advance the shared weather clock.
2. Interpolate atmospheric truth.
3. Update every segment’s racing-line and off-line wetness.
4. Update DRS-weather and unsafe-condition state.
5. Apply commands triggered at the current lap and segment.
6. Resolve pit-entry and pit-lane transitions.
7. Capture DRS eligibility when DRS is available.
8. Update mounted tyre temperatures.
9. Calculate car, driver, setup, fuel, tyre, weather, and variance effects.
10. Build traffic groups and resolve overtaking using racing-line/off-line conditions.
11. Burn fuel and accumulate temperature- and wetness-adjusted tyre wear.
12. Apply current-segment car-passage drying.
13. Advance lap and sector clocks.
14. Emit weather, timing, tyre, pit, pass, and command events.
15. Check finish and future race-control trigger state.

Weather state may not mutate while it is being used to calculate entry timing.

---

## 11. Outputs

`RaceRunResult` adds:

```ts
interface WeatherTelemetry {
	step: number;
	weatherClockMs: number;
	rainIntensityBp: number;
	airTempDeciC: number;
	trackTempDeciC: number;
	drsWeatherSuspended: boolean;
	unsafeConditionsActive: boolean;
	segments: SegmentSurfaceState[];
}
```

Weather telemetry is diagnostic prototype output. Long-term persistence follows the existing
telemetry archive/purge policy.

Required weather events:

- `weather_state_changed` at resolved truth control-point boundaries
- `rain_started`
- `rain_stopped`
- `drs_weather_suspended`
- `drs_weather_restored`
- `unsafe_conditions_detected`
- `unsafe_conditions_cleared`

Lap telemetry adds mounted tyre temperature and racing-line wetness at lap completion.

---

## 12. Determinism and versioning

Acceptance requires:

- Identical input and seed produce byte-identical truth, telemetry, events, and results.
- Checkpoint/resume matches an uninterrupted weather-enabled run.
- Reordered track or entry input normalizes to the same result.
- Disabled weather does not advance its RNG stream.
- Forecast requests never alter engine state or output.
- Strategy A/B comparisons share identical resolved weather truth.

Adding weather state, events, tyre temperature, driver fields, and telemetry requires a new
`engineVersion`. Weather timing and grip formulas require a new `formulaVersion`.

Weather-enabled inputs use `academy-weather-v3-ratings-0-100` with `headless-segment-v3`. Omitted or
disabled weather stays on `academy-dry-v5-ratings-0-100` with `headless-segment-v1`.

---

## 13. Calibration fixtures

### W0 — Disabled dry regression

- Weather omitted or disabled.
- Must reproduce the recalibrated `academy-dry-v5-ratings-0-100` output exactly.

### W1 — Static dry enabled

- Zero rain and zero starting wetness.
- Stable air and track temperature.
- Confirms that enabling the module without water introduces no unintended wet-pace effect.

### W2 — Dry to damp to wet

- Dry start.
- Increasing rain crosses slick-to-intermediate and intermediate-to-wet ranges.
- Includes predefined stay-out, early-switch, and correctly timed strategies.

### W3 — Sustained wet

- Wet start and stable heavy rain.
- Confirms wet compounds, `wetPace`, DRS suspension, and stable surface equilibrium.

### W4 — Wet to drying

- Wet start followed by stopped rain and increasing track temperature.
- Racing line dries faster than off-line.
- Intermediate and wet tyres overheat and wear as the crossover moves toward slicks.

### W5 — Brief shower

- Short rain phase that may not justify two tyre changes.
- Tests the value of forecast quality and strategic tolerance for a temporary mismatch.

### W6 — Drainage contrast

- Circuit-wide rain with high- and low-drainage segments.
- Confirms segment wetness diverges despite shared precipitation.

### W7 — DRS hysteresis

- Rain and wetness oscillate around suspension thresholds.
- DRS must not toggle repeatedly without crossing the lower restore thresholds.

### W8 — Unsafe-condition boundary

- Wetness crosses the unsafe threshold.
- Emits one detection and one clear event without deploying race control.

### W9 — Forecast quality

- Identical hidden truth for several team capability levels.
- Higher HQ/staff capability must improve aggregate forecast scoring without becoming perfect.

### W10 — Weather checkpoint

- Checkpoint before rain, during accumulation, and during drying.
- Every resumed result must match uninterrupted output.

### W11 — Gradual rain onset

- Rain intensity ramps through the forecast windows instead of changing at one abrupt boundary.
- Separates low- and high-capability onset timing quality from probability and interval scoring.

---

## 14. Calibration report

The weather batch report must include:

- Truth timeline and forecast snapshots.
- Rain intensity and temperatures by race time.
- Racing-line/off-line wetness by segment and time.
- Compound pace and wear by wetness band.
- Compound crossover times.
- Time lost by early, late, and missed tyre changes.
- DRS suspension/restoration time.
- Unsafe-condition event counts.
- `pace`/`wetPace`/`adaptability` sensitivity.
- Forecast Brier score, continuous onset error, intensity interval coverage, and mean interval width by capability level, aggregated across every calibration run.
- Controlled all-compound fresh, post-warmup, long-run, late-run, degradation, and final-wear sweeps at fixed wetness and track-temperature points.
- Strategy timing sweeps preserve spacing between multiple pit stops and identify the least-cost pit window before strategy penalties are locked.
- Weather-aware strategy decisions select slicks, intermediates, or wets from observed wetness plus the
  current forecast window, with confidence and urgency exposed to the management layer.
- Strategy traces record the decision at each capability-scheduled forecast refresh, including the observed racing-line
  wetness and compound before and after the recommendation. Heavy-rain forecasts keep a car on wets rather
  than downgrading it solely because the current line is temporarily dry.
- Worsening-condition upgrades are immediate. Downgrades require two consecutive refresh recommendations and
  cannot occur until the current compound has been held for at least three refreshes. Reports retain both the
  raw candidate and the hysteresis-adjusted decision.
- Replay validation applies raw and hysteresis-adjusted recommendations as explicit pit commands and compares
  total time, executed pit stops, trigger laps, and compound stints. This replay is generated from the reference
  run's forecast trace; it does not yet close the loop by refreshing strategy from the replayed race state.
- Closed-loop strategy validation refreshes forecasts at safe segment boundaries, injects accepted pit commands
  into the running simulation, persists controller state through checkpoints, and reports raw-versus-hysteresis
  outcomes separately from the reference trace.
- Closed-loop validation runs across every calibration seed and reports aggregate time/pit deltas alongside
  per-seed stints, trigger spacing, refresh counts, rejected-command counts, completion, and checkpoint-parity gates.
- Strategy-policy sweeps vary downgrade confirmations and minimum-stint refreshes over the same seeded W2/W5/W9/W11
  runs. Sweep reports retain the default policy, dimensions, per-policy outcomes, and explicitly identify that
  checkpoint parity is covered by the baseline validation rather than repeated for every multi-policy candidate.
  A single-policy sweep uses the requested checkpoint step and validates checkpoint parity for that candidate.
- Checkpoint and disabled-module determinism results.

Initial acceptance gates:

- Dry-disabled regression is byte-identical to V4.
- Wetness and tyre penalties are continuous at every crossover.
- The correct compound is fastest on average in its intended range.
- A mistimed tyre change creates a meaningful but normally recoverable loss.
- Higher `wetPace` improves sustained-wet timing without changing dry timing.
- Higher `adaptability` improves transitions without changing stable-condition timing.
- Racing-line wetness falls faster than off-line wetness after rain stops.
- DRS hysteresis produces no threshold chatter.
- Better forecast capability improves aggregate scoring while retaining uncertainty.

Exact coefficient bands are established by the W0–W10 calibration outputs.

---

## 15. Implementation order

1. Add weather input, state, validation, snapshot, and version types.
2. Add hidden truth resolution and fixed-point atmospheric interpolation.
3. Add segment surface accumulation, drainage, evaporation, and car drying.
4. Add intermediate/wet compounds, tyre temperature, and continuous crossover formulas.
5. Add `wetPace` and `adaptability` effects.
6. Add DRS weather hysteresis and unsafe-condition events.
7. Add forecast snapshots and HQ/staff quality inputs outside the engine.
8. Add W0–W10 fixtures, report metrics, and deterministic tests.

Stop for calibration review before implementing incidents, failures, or race-control actions.
