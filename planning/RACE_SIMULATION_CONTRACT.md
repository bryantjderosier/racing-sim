# Race Simulation Contract — Headless Prototype

**Status:** Draft implementation contract; reconciled design inputs\
**Scope:** Deterministic, headless, dry-race prototype\
**Language:** TypeScript\
**Primary fixture:** Formula Development Championship (`academy` internal code)\
**Tier naming:** Persisted codes remain `apex`, `challenger`, and `academy`; player-facing names are World Formula Championship, International Formula Championship, and Formula Development Championship.

---

## 1. Purpose

Prove the mathematical and architectural core of the race engine before connecting it to SQLite, Electron, Svelte, finances, R&D, or long-term career simulation.

The prototype must:

- Consume immutable race inputs compatible with `DATA_SCHEMA.md`.
- Simulate a race segment by segment.
- Produce deterministic timing, telemetry, events, and final session results.
- Demonstrate meaningful effects from cars, drivers, fuel, tyres, traffic, overtaking, pit strategy, and setup.
- Establish the versioned formula contract that later management systems must target.

## 2. Explicit non-goals

- Svelte or Electron UI
- SQLite persistence or migrations
- Live CLI command entry
- Changing weather in the first baseline
- Refueling in the first baseline
- ERS in the first baseline
- Safety cars, VSC, red flags, mechanical failures, and crashes in the first baseline
- Final game balance
- Licensed teams, drivers, championships, or circuits

These systems must fit the interfaces below but are added only after the dry baseline is stable.

---

## 3. Locked prototype decisions

| Topic                 | Decision                                                            |
| --------------------- | ------------------------------------------------------------------- |
| Resolution            | Fixed `TrackSegment` steps                                          |
| Track structure       | 12–20 segments grouped into three official timing sectors           |
| Baseline layout       | 15 segments; five per official sector                               |
| Baseline championship | Formula Development Championship (`academy`)                        |
| Baseline field        | 10 teams × 3 cars = 30 entries                                      |
| Baseline distance     | 50 laps                                                             |
| Conditions            | Dry and static                                                      |
| Refueling             | Disabled; full-race fuel load and consumption still simulated       |
| Strategy input        | Predefined deterministic command schedule                           |
| Calibration           | Real-world-shaped statistical ranges using wholly fictional content |
| Persistence           | In-memory only; emit schema-compatible outputs                      |

---

## 4. Simulation boundary

The race engine is a pure deterministic state transition:

```text
RaceInput + StrategyCommand[] + Seed
    -> Segment transitions
    -> RaceEvent[]
    -> Telemetry samples
    -> SessionResult[] + RaceResultDetail[] + SessionPointAward[]
```

The engine must not:

- Read system time.
- Call `Math.random()`.
- Read from SQLite or application stores.
- Mutate input fixtures.
- Depend on Svelte, Electron, or browser globals.
- Resolve team finances, contracts, development, or morale.

### Official result boundary

Every player-controlled or off-screen weekend uses the same official result contract. The engine
owns sporting and physical outcomes and emits session results, race details, point-award inputs,
penalties, retirements, reliability, and major incidents. Off-screen execution may use lower detail,
but it must preserve the same official outcome semantics.

The management layer aggregates the completed weekend sessions into one immutable, idempotent
weekend-result package and applies downstream career consequences exactly once. The engine never
directly mutates standings, finances, personnel, contracts, board state, news, or narrative state.

## 5. Version contract

Every completed run records:

| Field            | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `formulaVersion` | Identifies calculation order, formulas, clamps, and rounding |
| `rngAlgorithm`   | Identifies the deterministic generator                       |
| `seed`           | Reproduces the run                                           |
| `inputHash`      | Detects fixture or command changes                           |
| `engineVersion`  | Identifies the serialized state/event contract               |

Any change that alters deterministic output for identical inputs must bump `formulaVersion` or `engineVersion`.

---

## 6. Units and numeric rules

Engine-internal state uses deterministic integer or fixed-point units:

| Quantity               | Internal unit                                      |
| ---------------------- | -------------------------------------------------- |
| Time                   | Integer milliseconds                               |
| Distance               | Integer metres; sub-segment progress in millionths |
| Fuel                   | Integer grams                                      |
| Percentages            | Basis points, `0–10_000`                           |
| Normalized performance | Parts per million, baseline `1_000_000`            |
| Ratings                | Integer `0–100`                                    |
| Position/order         | Integer with `sessionEntryId` as final tie-break   |

Schema-facing ratings are consumed directly as integer `0–100` values; no personnel-rating conversion is permitted. Intermediate rounding occurs only at documented segment boundaries using round-half-even.

---

## 7. Input contract

### 7.1 RaceInput

```ts
interface RaceInput {
	formulaVersion: string;
	engineVersion: string;
	seed: string;
	rules: RaceRules;
	track: SimulationTrack;
	entries: SimulationEntry[];
	commands: StrategyCommand[];
}
```

### 7.2 RaceRules

```ts
interface RaceRules {
	lapCount: number;
	refuelingEnabled: boolean;
	ersEnabled: boolean;
	drsEnabled: boolean;
	drsActivationLap: number;
	drsGapThresholdMs: number;
	mandatoryPitStops: number;
	requiredCompoundRuleId?: string;
}
```

Baseline fixture:

- `lapCount = 50`
- `refuelingEnabled = false`
- `ersEnabled = false`
- `drsEnabled = true`
- `drsActivationLap = 3`
- `drsGapThresholdMs = 1_000`

These are prototype fixture values, not permanent Formula Development Championship rules.

### 7.3 SimulationEntry

Each entry contains:

- Stable `sessionEntryId`, team ID, driver ID, car number, and grid position.
- Driver ratings required by the current formula version.
- A resolved car-performance snapshot.
- Setup values or pre-resolved peak-pace and tyre-wear factors.
- Starting fuel.
- Issued tyre sets and compound specifications.
- Initial strategy mode.

The first formula version consumes these driver ratings:

- `pace`
- `raceCraft`
- `consistency`
- `tyreManagement`
- `fuelManagement`
- `starts`
- `focus`
- `aggression`
- `composure`
- `feedback` only through the pre-resolved setup factor

The first formula version consumes these car factors:

- `topSpeed`
- `acceleration`
- `corneringHigh`
- `corneringLow`
- `brakingStability`
- `drag`
- `coolingEfficiency`
- `fuelEfficiency`
- `reliabilityOverall`
- `dryWeightKg`

ERS fields remain accepted by the boundary but are inactive when `ersEnabled = false`.

---

## 8. Track contract

### 8.1 SimulationTrack

```ts
interface SimulationTrack {
	id: string;
	lapDistanceM: number;
	pitLaneLossMs: number;
	segments: TrackSegment[];
}
```

### 8.2 TrackSegment

Each segment defines:

| Field                      | Meaning                           |
| -------------------------- | --------------------------------- |
| `id` / `sequence`          | Stable ordering                   |
| `officialSector`           | `1`, `2`, or `3`                  |
| `distanceM`                | Segment distance                  |
| `baseTimeMs`               | Neutral clean-air segment time    |
| `highSpeedWeight`          | High-speed cornering contribution |
| `lowSpeedWeight`           | Low-speed/mechanical contribution |
| `powerWeight`              | Acceleration/power contribution   |
| `topSpeedWeight`           | Maximum-speed contribution        |
| `brakingWeight`            | Braking contribution              |
| `overtakingDifficulty`     | Attempt threshold                 |
| `dirtyAirSensitivity`      | Following-time penalty            |
| `tyreEnergyFactor`         | Wear contribution                 |
| `fuelBurnFactor`           | Fuel-use contribution             |
| `isDrsDetection`           | Captures eligibility gap          |
| `isDrsActivation`          | Applies DRS effect                |
| `isPitEntry` / `isPitExit` | Pit transition markers            |

Track invariants:

- Segment distances sum exactly to `lapDistanceM`.
- Segment sequences are contiguous and unique.
- Every segment belongs to one official sector.
- Official sector ordering is contiguous.
- Pit entry precedes pit exit.
- DRS activation segments have a preceding detection segment.

Player-facing telemetry reports three official sectors; engine telemetry may expose all track segments for diagnostics and the future 2D map.

---

## 9. Strategy commands

The baseline accepts commands before the run:

```ts
interface StrategyCommand {
	sequence: number;
	sessionEntryId: string;
	triggerLap: number;
	triggerSegmentId: string;
	action: StrategyAction;
}
```

Initial actions:

- Change engine mode.
- Change tyre-conservation target.
- Change overtaking aggression.
- Pit for a specified issued tyre set.

Commands are sorted by lap, segment, sequence, and entry ID. Invalid or conflicting commands produce deterministic validation errors before the race starts.

The same command boundary will later accept live UI commands without changing engine internals.

---

## 10. Deterministic RNG

The prototype uses a `DeterministicRng` interface and a fixed `xoshiro128ss` implementation with four unsigned 32-bit state words.

Named streams are derived from the master seed:

- `pace_variance`
- `starts`
- `overtaking`
- `incidents`
- `reliability`
- `weather`

Only streams used by an enabled module advance. Adding weather or incidents must not alter pace or overtaking draws for an otherwise identical run.

Within a module:

- Entries are processed in stable `sessionEntryId` order.
- Ties use stable IDs, never collection insertion order.
- Random draws occur at documented points only.
- Normal-like pace noise uses a fixed sum-of-uniforms method rather than runtime-dependent transcendental functions.

---

## 11. Segment calculation

For each active car, neutral segment time is modified in this order:

```text
base segment time
-> car/track suitability
-> driver pace and segment-relevant skill
-> setup effectiveness
-> fuel-mass penalty
-> tyre warm-up/grip/wear
-> deterministic pace variance
-> traffic and dirty-air penalty
-> DRS effect when eligible
-> overtake interaction result
-> pit-lane state
-> integer rounding and clamps
```

The configurable formula shape is:

```text
segmentTimeMs =
  roundHalfEven(
    baseTimeMs
    × carFactor
    × driverFactor
    × setupFactor
    × tyreFactor
    × trafficFactor
    × varianceFactor
  )
  + fuelPenaltyMs
  + pitPenaltyMs
```

Coefficients and clamps live in a versioned `FormulaConfig`, not scattered literals.

### 11.1 Car factor

Each segment weights the applicable resolved car vectors. Weight totals are validated. Higher performance reduces time; higher drag increases time where applicable.

### 11.2 Driver factor

`pace` is the baseline. Segment type blends the relevant skills, while `consistency` narrows variance. Ratings are centered on the field-neutral value defined by `FormulaConfig`.

### 11.3 Fuel

Fuel mass adds lap time and is burned each segment:

```text
fuelPenaltyMs = fuelKg × configuredMsPerKgPerLap × segmentDistanceShare
fuelBurn = baseFuelPerLap × segmentFuelBurnFactor ÷ carFuelEfficiency × modeFactor
```

The engine rejects a starting fuel load that cannot complete the configured strategy under conservative assumptions.

### 11.4 Tyres

Effective tyre grip combines:

- Compound peak grip
- Warm-up progression
- Current wear
- Track abrasion/segment energy
- Driver tyre management
- Conservation/aggression mode
- Fuel load

Wear is monotonic and clamped to `0–100%`. A tyre can remain mounted beyond its useful performance window but cannot produce negative grip.

### 11.5 Traffic and dirty air

Cars are ordered by completed laps, segment sequence, within-segment progress, and stable ID.

A following car receives dirty-air loss when:

- It is within the configured following threshold.
- It occupies the same or immediately preceding interaction window.
- The segment has non-zero dirty-air sensitivity.

The penalty scales with gap, segment sensitivity, and the following car’s aero dependence.

### 11.6 Overtaking

An attempt may occur when:

- The attacker is within the attempt gap.
- The segment permits overtaking.
- Neither car is in the pit lane or retired.

Resolution uses:

- Attacker/defender pace difference
- `raceCraft`
- `aggression`
- `composure`
- Tyre and fuel advantage
- Segment difficulty
- DRS eligibility
- Seeded overtaking draw

Successful passes exchange running order and emit an event. Failed attempts may add time loss. Contact and crashes are deferred to the incident module.

### 11.7 Pit stops

A scheduled pit command activates at the pit-entry segment. Baseline stops:

- Apply track pit-lane loss.
- Apply deterministic tyre-change service time.
- Mount the requested available set.
- Close the previous stint and open the next.
- Do not add fuel.

---

## 12. Segment update order

Every segment transition follows this order:

1. Apply commands triggered at this lap/segment.
2. Resolve pit-entry and pit-lane transitions.
3. Capture DRS eligibility at detection segments.
4. Calculate clean-air segment times.
5. Apply tyre, fuel, setup, and seeded variance.
6. Build traffic interaction groups.
7. Apply dirty-air and DRS modifiers.
8. Resolve overtaking attempts in stable order.
9. Burn fuel and accumulate tyre wear.
10. Advance progress, lap, and official-sector clocks.
11. Emit segment, sector, lap, pit, pass, and command events.
12. Check finish/retirement state.

No collection may be mutated while it is being used to determine interaction order.

---

## 13. Output contract

### 13.1 RaceRunResult

```ts
interface RaceRunResult {
	metadata: RunMetadata;
	sessionResults: SessionResultOutput[];
	raceDetails: RaceResultDetailOutput[];
	pointAwards: SessionPointAwardOutput[];
	events: RaceEvent[];
	lapTelemetry: LapTelemetry[];
	sectorTelemetry: SectorTelemetry[];
	finalStateHash: string;
}
```

### 13.2 Required events

- Race start
- Segment completed
- Official sector completed
- Lap completed
- Strategy command applied/rejected
- DRS eligibility gained/lost
- Overtake attempted/succeeded/failed
- Pit entry/service/exit
- Tyre set mounted
- Car finished

Events include simulation time, lap, segment, affected entry IDs, type, and a typed payload.

### 13.3 Schema mapping

| Prototype output                 | Persistent destination later |
| -------------------------------- | ---------------------------- |
| Entry final classification       | `SessionResult`              |
| Pit stops/laps led               | `RaceResultDetail`           |
| Position/pole/fastest-lap points | `SessionPointAward`          |
| Tyre use                         | `SessionTyreUsage` + `Stint` |
| Final tyre wear                  | `TyreSet`                    |
| Car progress during a run        | `SessionCarCheckpoint`       |
| Engine RNG/clock                 | `SessionCheckpoint`          |
| Damage                           | `SessionDamageComponent`     |

The headless prototype serializes these shapes but does not write SQLite.

---

## 14. Calibration philosophy

Calibration uses fictional content with real-world-shaped statistical behavior.

Initial tunable targets:

- Stable single-car laps with plausible driver-dependent variance.
- A visible but non-dominant opening-lap fuel penalty.
- Tyre compounds with meaningful pace/longevity trade-offs.
- Pit loss large enough to create undercut/overcut decisions.
- Faster drivers and cars winning more often across many seeds, never automatically.
- Traffic reducing pace without permanently preventing passes.
- Grid position providing an advantage without determining the result.
- Strategy errors producing measurable but recoverable losses.

All targets are distributions measured over batches, not guarantees for one seed.

---

## 15. Prototype stages

### Stage A — Single-car stint

- 15-segment fictional track
- 50 laps
- Fuel burn and fuel-mass penalty
- Tyre warm-up and degradation
- Driver pace/consistency
- Sector/lap timing
- Deterministic output and state hash

### Stage B — Two-car interaction

- Shared track progress
- Following gaps and dirty air
- DRS detection/activation
- Overtaking
- Predefined strategy commands
- Pit stops and tyre changes

### Stage C — Formula Development Championship calibration field

- 10 fictional teams
- 30 entries
- Three issued tyre sets per entry
- Mixed one-stop/two-stop strategies
- Timing sheet, event log, CSV/JSON output
- Batch runner across many seeds

### Stage D — Deferred modules

After Stage C is stable:

1. Static-to-changing weather — see `WEATHER_SIMULATION_CONTRACT.md`
2. Driver errors and contact
3. Mechanical reliability and failures
4. Safety car/VSC/red flag
5. Refueling ruleset scenario
6. ERS module
7. Live command adapter
8. SQLite checkpoint integration

---

## 16. Acceptance criteria

### Determinism

- Identical input, commands, versions, and seed produce byte-identical canonical JSON.
- Reordered input collections produce the same result after canonical sorting.
- A checkpoint/resume harness produces the same final state hash as an uninterrupted run.
- Disabled modules do not advance their RNG streams.

### Invariants

- No negative lap or segment times.
- Fuel never becomes negative without a deterministic retirement/error result.
- Tyre wear remains within `0–100%`.
- Exactly one running-order position exists per active entry.
- Completed distance and official-sector clocks are monotonic.
- No car can overtake while in an incompatible pit/retirement state.
- Every mounted tyre set was issued to that entry.

### Statistical behavior

- Increasing only driver pace improves mean lap time across a seed batch.
- Increasing only consistency reduces lap-time variance.
- Increasing tyre management reduces degradation.
- Increasing car performance in a segment-relevant vector improves that segment.
- Starting with excess fuel is slower early and converges as fuel burns.
- A fresh-tyre pit stop can outperform staying out when degradation justifies the loss.
- Faster cars pass slower cars at a higher rate than equal or slower cars.

### Output compatibility

- Every entry produces one final `SessionResult`.
- Race-like sessions produce one `RaceResultDetail`.
- Point awards reconcile exactly to the configured points system.
- Telemetry can reproduce the final classification and pit-stop count.

---

## 17. Review gates

1. Contract review: interfaces, update order, units, and deferred scope.
2. Stage A review: inspect generated timing sheets and degradation curves.
3. Stage B review: inspect passes, traffic trains, and pit timing.
4. Stage C review: accepted for `academy-dry-v4` after batch, matched-strategy, tyre-management, and
   setup-sweep review.

No UI, persistence, or management-layer implementation begins until Stage C behavior is accepted.
