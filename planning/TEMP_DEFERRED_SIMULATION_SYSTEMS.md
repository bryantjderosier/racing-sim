# Temporary Deferred Simulation Systems Notes

**Status:** Locked design context; deferred beyond V4 calibration  
**Purpose:** Preserve decisions that affect later race and management systems without expanding the V4 implementation scope.

## Tier-specific performance balance

- Driver and car influence must vary by tier.
- The top tier gives car development and team performance greater influence.
- Lower, more specification-oriented tiers place greater emphasis on driver ability.
- Exact percentages remain calibration targets rather than fixed design values.

## Tyre knowledge and practice

- Before practice, teams receive predicted tyre performance, durability, and cliff ranges rather than exact values.
- Practice running progressively reveals actual behavior for the driver, car, setup, circuit, and conditions.
- Compound and setup knowledge is shared team-wide.
- Each driver still requires personal running to reveal warm-up, smoothness, degradation, and cliff behavior.
- General compound knowledge persists through the season.
- Similar circuits provide partial transferable knowledge.
- Circuit-specific behavior must be refined each weekend.
- Car upgrades, resurfacing, unusual temperatures, and compound changes reduce confidence.
- Mileage generates evidence, while engineer ability, simulation tools, driver feedback, and analysis capability determine learning speed and accuracy.
- Additional running has diminishing returns.
- The accepted V4 setup anchors are:
  - Peak pace: `997,000 ppm` pace factor and `1,040,000 ppm` tyre-wear factor.
  - Tyre preserving: `998,000 ppm` pace factor and `960,000 ppm` tyre-wear factor.
- On the baseline 50-lap medium-to-hard one-stop race, the preserving anchor gives up approximately
  1.342 seconds and reduces mean used-tyre wear by 303 basis points.
- Future setup discovery resolves contextual values around these anchors rather than exposing the
  exact factors before practice.

## Incident and reliability model

- Normal dry-race top-ten retention should average 70–75% after ordinary contact, damage, penalties, and failures are included.
- Clean, uninterrupted dry races should retain approximately 75–80%.
- Incident and failure probability should be driven primarily by identifiable risk factors:
  - Driver aggression and error tendency
  - Traffic density
  - Tyre condition
  - Weather and circuit characteristics
  - Existing damage
  - Component wear and maintenance
- A smaller irreducible-randomness layer must cover debris punctures, sudden defects, unpredictable contact, and similar real-world events.
- Random hazards should interact with track state rather than use unexplained uniform per-lap failures.
- During a race, teams receive symptoms and suspected causes.
- Telemetry, driver feedback, and inspection improve certainty.
- Post-race analysis confirms the cause and contributing factors.
- Engineer quality affects diagnostic speed and accuracy.

## Weather information and HQ capability

- Weather forecasts are probabilistic and become more reliable closer to the event.
- Better staff and tools improve estimates of timing, intensity, and confidence, but sudden local changes remain possible.
- The HQ weather-station building improves:
  - Forecast accuracy
  - Forecast lead time
  - Update frequency
  - Confidence ranges
- Weather-station upgrades strengthen these benefits without producing perfect forecasts.
- Trackside observations and local radar remain important.
- Wet and changing conditions should reduce top-ten retention below the normal dry-race target.

## Scope boundary

These decisions must inform future interfaces, but V4 does not implement the full incident, reliability, weather, practice-knowledge, staff-analysis, or HQ-building systems.
