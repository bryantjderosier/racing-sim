# Pillar 5: Season Calendar, Driver Market, & AI Progression

## 1. The Dynamic Season Calendar & Regulation Changes
To ensure multi-season career durability, the racing calendar and the underlying technical regulations shift dynamically during every winter off-season.

### Calendar Generation & Track Weightings
* **The Master Track Pool:** The engine maintains a database of 30 unique tracks. Each track carries 3 structural weighting multipliers (scaling 0.5–1.5) that modify the simulation physics engine:
    * `aero_efficiency_weight`: Scales the contribution of aerodynamic components to top speed.
    * `mechanical_grip_weight`: Scales the effectiveness of suspension and sidepod cooling configurations.
    * `tire_abrasion_factor`: Directly modifies the baseline rate of the S-Curve degradation model.
* **Automated Schedule Rotation:** Each season schedule pulls a subset of 22 races from the 30-track pool. Every winter, 2–3 venues are rotated out, forcing teams to pivot their car design philosophies to match the year’s specific track profile bias.

### The Winter Regulation Vote & Overhaul Math
Every off-season, the governing body proposes 3 technical rule modifications. Passing a vote activates the Mid-Season R&D Pivot, and the engine applies a mathematical performance reset to current blueprints based on the overhaul severity:
* **Minor Tweak:** Flat 10% reduction to Performance Points across affected components.
* **Major Overhaul:** 40% reduction to Performance Points; existing blueprints are invalidated and must be redesigned from baseline levels.
* **Category Ban:** Specific slots (e.g., "Underfloor Aero") are restricted; all existing blueprints for that slot are reduced to entry-level stats.
* **Strategic Pivot:** Teams that allocated resources to the "Next Year’s Regulations" slider in Pillar 3 receive a proportional performance credit, partially offsetting these penalties.

---

## 2. Driver & Personnel Market Ecosystem
Drivers and technical staff function within an active professional market governed by fixed terms, financial leverage, and a structured talent pipeline.

### The Karting Tier Pipeline
* **The Non-Playable Incubator:** The engine tracks a database of young prospects (ages 12–16) with low starting stats but volatile hidden **Potential Tiers**. 
* **Scouting Integration:** Upgrading the **Scouting HQ** allows players to uncover these prospects. When retirements or vacancies occur on the active grids, top-performing karting prospects graduate into Division 3 free agency or designated Junior Academies.

### Paddock Contract Shuffling & AI Bidding
* **Silly Season:** Staff/drivers operate on multi-year terms. In the final 6 months of a contract, agents solicit competitive offers.
* **Bidding War Matrix:** When negotiating, AI teams evaluate candidates using a budget-constrained bidding loop based on the asset's **Marketability** and **Race Pace**. The AI calculates a maximum offer ceiling; players must use their Head of Scouting's **Leverage** attribute to lower wage demands or force a contract resolution.
* **Buyouts:** Mid-season contract terminations are possible via a direct, high-value liquid cash buyout fee that is strictly exempt from the Cost Cap.

---

## 3. AI Team Progression & Development Logic
AI-managed teams utilize distinct **Principal Personality Profiles** to dictate their capital expenditure and R&D logic, governed by strict budgetary AI boundaries.

### AI Manager Archetypes
* **The Aggressive Spender:** * *Logic:* Allocates majority resources to current-year R&D. Extremely fast early-season, but risks hitting the Cost Cap or being caught flat-footed by regulation changes.
    * *Boundary:* `max_allowed_cost_cap_buffer = 1.01`. Defers facility upgrades until liquid cash is in massive surplus.
* **The Long-Term Builder:** * *Logic:* Sacrifices current standings to invest in Wind Tunnel, CFD, and Foundry upgrades, building a structural R&D multiplier for later seasons.
    * *Boundary:* Dedicates a flat 40% of all income to the `facility_upgrade_fund`. Ignores mid-season car upgrades if reliability is >75%.
* **The Pragmatic Pivot:** * *Logic:* Hyper-sensitive to regulatory timelines. Immediately upon a regulation overhaul vote passing, they reallocate 90% of resources to next year’s car design, forcing the player to respond or lose the developmental benchmark.

### AI Progression Constraints
To prevent unrealistic AI behavior, all AI managers are bound by a rigid internal logic that restricts their spending based on their current division status, ensuring AI teams do not bankrupt themselves or violate cost-cap regulations in a way that breaks the game's competitive economy.