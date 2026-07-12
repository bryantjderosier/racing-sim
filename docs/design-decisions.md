# Locked Design Decisions

Canonical rules agreed in design Q&A. Prefer this file over older pillar prose when they conflict.
Numeric balance (exact costs, hour caps, XP rates) stays in data tables — not invented here.

---

## Pillar 4 — R&D, Parts, Wear

### Concept → blueprint
- **Visible:** project exists (slot, hours allocated, ETA, lead designer).
- **Hidden:** true `performance_points`, flaws, pitch sensitivity until revealed by testing.
- No flat “spend $X → +Y PP.”

### Performance quality (band center)
Weighted blend of:
1. Allocated WT + CFD hours on a **diminishing-returns** curve
2. Lead designer attrs for that slot
3. Facility tier multipliers on the relevant building
4. Small noise (identical spend ≠ identical parts)

Hours buy expected quality; elite staff raise ceiling and shrink variance; facilities multiply both.

### Reveal / fog
- At blueprint completion: true value exists; UI shows an **uncertainty band**.
- Band widens with weak CFD/WT correlation and weak Analysis/Feedback.
- **Track mileage** (practice/race) collapses the band toward the true value.
- Same fog pattern as personnel scouting.

### Flaws
- Each blueprint rolls **0–2 hidden flaws** at completion (e.g. pitch sensitivity, dirty-air collapse, curb fragility, thermal tire spike).
- Inside the same fog; become actionable via mileage/telemetry or strong Race Engineer Analysis.
- Peak PP is not always the correct pick.

### Developable slots
- First-class: `front_wing`, `rear_wing`, `underfloor`, `sidepods`, `suspension`, `power_unit`.
- Same concept → fog → mileage loop for all of the above.
- Gearbox: lease/spec or reliability-only until a later phase.

### Winter / regulation carryover
- No clean year-over-year PP carryover.
- Regulation-scaled regression on surviving blueprints (minor ~10%, major ~40%, category ban → invalidate slot).
- Mid-season **Next Year** pivot credit offsets the hit proportionally.
- Physical parts keep fatigue; usually scrap or emergency-spare; race kit comes from new concepts.
- Tier-5 HQ can reduce *localized* winter regression — does not erase regulation resets.

---

## Pillar 2 — Race Weekend / Lap Sim

### Lap structure
- Sim resolves **three sector times**; lap = sum.
- Each sector uses local track weights × car × driver × situational state.

### Sector time layers (multiplicative)
From track-sector base time:
1. Car aero/mech × sector `aero_efficiency_weight` / `mechanical_grip_weight`
2. Tire grip (compound + S-curve life + core temp)
3. Driver attrs gated by sector type
4. Situational (moisture, dirty air, damage, pace directive)

Prefer multipliers over flat second bonuses.

### Setup window
- Per track (+ weather state): hidden **target vector** for wings, ARBs, ride height, camber/toe, brake bias.
- Distance from target → smooth lap-time penalty; narrow sweet-spot plateau.
- Feedback + Race Engineer Setup control UI clarity, not whether the target exists.

### Practice knowledge trims
- Stint awards trim XP only for matching directive (quali / race / compound / wet).
- Tiers 1–3 per gameplay doc bonuses.
- XP scales with stint quality (clean laps, in-window setup, Feedback) — not raw lap count.
- Slick trim freezes when rain starts; wet trim is separate.

### Fuel & ERS
- Fuel = **mass**; burn rate × pace directive; kg → sector time cost.
- ERS = battery budget; Harvest / Balanced / Overtake maps.
- Overtake spends charge for short multiplicative power boost; Harvest refills at a time cost.
- Empty battery = no boost (not a cliff).

### Driver incidents
- Per-lap/sector incident roll from: pace intensity, tire cliff/overheat, setup distance, wet mismatch, traffic, Composure / Focus / Aggression.
- Aggression raises overtake success and crash risk.
- Severity table: time loss → spin → contact → damage/DNF.

### Mechanical failures
- Mounted parts wear reliability per lap (mileage × pace × curb/dirty-air).
- Below thresholds: minor fault (derate) → major → terminal DNF.
- Lightweight + low Max Condition Ceiling amplify risk.
- Staff Reliability attrs + Rig Testing shift starting pool / wear rate.

### Safety Car / VSC
- Event-driven from incidents/debris/location severity — not a random timer.
- Local yellow → VSC → full SC as warranted.
- Pit advantage emerges from compressed lost time, not a special free-pit flag.

### Qualifying by division (all grids = 20 cars)
| Division | Format |
|---|---|
| 1 | Q1 / Q2 / Q3 knockout (classic cutdowns to top 10) |
| 2 | Single session; best lap sets grid |
| 3 | No qualifying; grid = **reverse championship points** (tie-break: prior race result, then ballot) |

---

## Pillar 1 — Personnel

### Pit crew
- Staff with `role = pit_crew`; attrs Speed / Consistency / Focus under Pressure.
- Fatigue %; starting lineup + bench; player rotates.
- Stop time from squad averages; Consistency/Focus drive error matrix.

### Progression
- Weekly XP tick: Development (drivers) / role growth (staff) × facility multipliers + mileage bonus.
- No XP past independent attribute ceilings.
- Soft decay on pace/physical groups after `longevity` age.

### Race Engineer assignment
- One RE **per car** (assigned driver/car).
- Chemistry is per pairing; mid-season swap allowed but resets Chemistry progress.

### Morale / ego / loyalty (v1)
- Light sim: stored fields; weekly ticks from results, pay, team orders, toxic pairings.
- Affects XP rate, Feedback quality, small strategy errors, silly-season quit risk.
- Press leaks / deep politics deferred.

### Contract accept
- Accept score: salary vs market, years, reputation/standing, #1 / budget guarantees, release/buyout, Scout Leverage as demand suppress.
- Threshold + small noise.
- Marketability mainly moves sponsor/player side; stars weight reputation higher.

---

## Pillar 3 — Corporate / HQ

### Facility costs
- Lookup tables per `facility_type` × `tier` (cash, calendar days).
- Exponential cost/time curve; Powertrain Factory = multi-season special case.
- Construction remains **outside** cost cap.
- Data-driven (JSON/SQLite), not hardcoded formulas only.

### Efficiency mapping
- Each building buffs **one primary output** (WT → PP/hour; CFD → cost/efficiency of loops; Foundry → lead time; Simulator → driver XP; Scouting HQ → fog throughput; Rig Testing → new-part reliability; etc.).
- Parallel project slots are separate unlocks from the % curve.

### WT / CFD hours
- Hard weekly caps **per division**; refresh on calendar tick.
- Cap breaches / penalties can cut next season’s allowance.
- Facilities improve output **per hour**, not the regulatory cap.

### Sponsors (v1)
- Nationality, min marketability, optional standing gate, ethics_sensitivity.
- Mismatch reduces payout or blocks slot.
- upfront / per_race / bonus + optional position target.
- No full geopolitics / image-rights minigame.

### Facility condition
- **Tier stays permanent.**
- Buildings **degrade**; `condition_pct` lowers the efficiency bonus provided.
- Maintenance spend restores toward 100%.

---

## Pillar 5 — Calendar, Market, AI, Scoring

### Feeder / karting (v1)
- Lightweight probability ticks — not full weekend replays for lower series.
- Full session sim only for the player’s division.
- Graduates enter Div 3 / academies when thresholds met.

### Karting potential_tier
- Ceiling-band template + volatility (bronze → elite).
- Appraisal reveals tier confidence; Detection finds prospects.
- Age ~16 graduation requires aggregate attr threshold — tier alone insufficient.

### Regulation votes
- Winter: 3 technical proposals (impact + affected slot).
- One vote per team; AI from archetype + car strength in slot.
- Optional political capital to weight vote (shallow).
- Passed rules use locked regression math; pivot credit offsets.

### Driver market
- No mandatory annual silly season.
- Heat only when contracts enter final window (~6 months), retirements, or buyouts open seats.
- AI max offer from budget × need × target value; archetypes bias spend; wallets bound by division.

### Championship points
- Catalog of **6–8 presets**; active scheme can change via vote.
- Presets: Classic, Top 8, Flat field, Win heavy, Double points finale, Sprint weekend, Fastest lap/pole bonus, All finishers score.
- Constructors = sum of both cars.
- Div 3 reverse grid uses active standings table.

### Promotion / relegation
- End of season by constructors standings (default top 2 up / bottom 2 down; counts in data).
- Promotion Financial Shock: cap rises, cash unchanged.
- Re-validate engine supplier / works rules on arrival.

### R&D pivot gate
- Fixed mid-season calendar gate (e.g. after race 11 / when next-year regs publish).
- Before gate: 100% current car.
- After: player sets 0–100% current vs next-year split (one confirm; rare costly reset).
- AI archetypes bias as in season-calendar doc.

---

## Explicitly deferred
- Deep press / political favor economy
- Full feeder weekend simulation
- Gearbox as full developable slot
- Image-rights / sponsor minigames
- Exact numeric balance tables (costs, XP rates, hour caps, fault probabilities)
- Save-game / UI hierarchy (roadmap items)
