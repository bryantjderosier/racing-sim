# Vision & Scope Document

**Product:** Open-wheel racing management simulation (working title TBD)  
**Platform:** Electron desktop app — SvelteKit front-end, SQLite persistence, TypeScript end-to-end  
**Mode:** Single-player  
**Document status:** v1 foundation (supersedes prior planning)

---

## 1. Vision

Build a deep, long-horizon management sim for open-wheel racing in the spirit of **Out of the Park Baseball** and **Football Manager**: the player never drives the car. They run the team — people, money, development, and race-day decisions — while the world generates careers, rivalries, and history around them.

The fantasy is climbing (or rebuilding) a fully **fictional** three-tier ladder inspired by F1 / F2 / F3 structures, without licensed names, series, or tracks. Presentation is a serious, data-dense sim UI (menus, tables, 2D track map, telemetry overlays) with a **narrative layer** (press, board drama, light authored event chains) so the paddock feels politically and emotionally alive.

---

## 2. What “OOTP / FM style” means here

| Pillar                         | In this game                                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No 3D driving**              | No cockpit, no player-controlled driving physics, no 3D race view. Race weekends are managed via UI + 2D map/telemetry.                                  |
| **Text / data first**          | Decisions live in contracts, budgets, R&D trees, staff reports, and statistical history — not arcade spectacle.                                          |
| **In-race agency**             | Full-distance races with live calls (tires, fuel where allowed, energy/ERS, damage response, SC/VSC) — FM match-day depth, not post-sim-only results.    |
| **Career as story**            | Day-by-day calendar; board confidence and possible firing; stay and build a franchise or jump teams (including mid-season if a club pays the break fee). |
| **Deep history**               | Season-over-season stats, driver/team trajectories, and league tables that make a multi-decade save feel archival.                                       |
| **Customizable world (later)** | v1 ships one official fictional ladder. League size/evolution via voting comes later; player-authored custom leagues are out of scope for v1.            |

---

## 3. Player fantasy & career model

**Role:** Team principal / sporting director only (no owner sandbox as primary mode; no driver career).

**Start (v1):** Take over an **existing** team in the **bottom tier only**.

**Progression (blend):**

- Stay and march the same franchise up/down the ladder via on-track results and promotion/relegation, **or**
- Move in the off-season — or mid-season if another team offers and covers the contract break fee.
- The board can fire the player; job security is part of the sim.

---

## 4. World structure (v1)

### 4.1 Ladder

Three championship tiers with team counts roughly aligned to F1 / F2 / F3. All teams, drivers, tracks, sponsors, and series names are **fully fictional**.

| Tier       | Internal code | Championship                       | Calendar shape (v1 default)                       |
| ---------- | ------------- | ---------------------------------- | ------------------------------------------------- |
| **Tier 1** | `apex`        | World Formula Championship         | ~22–24 feature weekends; sprints optional / later |
| **Tier 2** | `challenger`  | International Formula Championship | ~14 dual-race weekends (~28 races)                |
| **Tier 3** | `academy`     | Formula Development Championship   | ~10 dual-race weekends (~20 races)                |

### 4.2 Promotion & relegation

- **2 up / 2 down** between adjacent tiers each season (~20% annual Tier 1 turnover on a ~10-team grid — intentional drama).
- **Eligibility gates:** sporting place alone is not enough — facilities, budget, and staff must meet tier minima. If the sporting qualifier fails gates, the next eligible team is promoted; the blocked team remains and receives a prestige/financial consolation.
- **Relegation parachute (v1):** multi-year, **tapering** financial support / cost relief after dropping a tier so Tier 1 burn rates do not force instant bankruptcy in Tier 2.
- **Promotion liquidity (v1):** clinching promotion triggers **sponsor promotion bonuses** and a **league merit advance** on Tier 1 TV/prize revenue during the winter window, so entry fees and customer supply contracts are payable before the first Tier 1 season.
- **Anti-yo-yo intent:** parachutes + eligibility gates are tuned so the same clubs do not permanently bounce between tiers as “elevator teams” (too rich for the lower tier, too weak to survive above).
- **No playoffs** in v1.

### 4.3 Car development ladder (not pure F2/F3 spec)

Juniors are **not** identical-spec series; freedom widens up the ladder and into Tier 1 constructor status.

| Tier       | Development model (v1 principle)                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 3** | Mostly **spec cores** with only small upgrade / reliability paths on those parts. Technical staff still matter via **setup discovery speed/accuracy** in practice and **reliability / engine-mode tolerance** on spec parts — not aero invention. |
| **Tier 2** | **2–3 spec parts**; the rest of the car is freely developable.                                                                                                                                                                                    |
| **Tier 1** | Teams may **purchase engines and parts from constructor suppliers**. As HQ buildings unlock and level up, a team can convert into its **own supplier / constructor**.                                                                             |

Promotion into Tier 1 therefore starts as a **customer** operation, not a blank R&D sheet and not an instant equal constructor.

**Supplier leverage (v1):** supply contracts have tiers such as **Factory Parity** (expensive, rare, near-best hardware) vs **Customer Spec** (cheaper, lower ceiling / year-old hardware). Supplier AI can **raise prices, delay upgrade rollouts, or refuse renewal** when a customer threatens them in the standings — pushing a scramble for a new supplier or accelerated constructor conversion.

### 4.4 Driver market

- **One global market** with **license points** (super-license-style progression) and tier eligibility.
- **Age caps** in lower tiers so veterans cannot farm Tier 3 indefinitely.
- **F1-like contracts:** off-season-heavy signing windows; mid-season moves rare (injury, termination, buyout).
- **Overflow paths (v1):** Tier 1 **reserve / test** seats, plus a **lightweight off-screen international pool** framed as foreign series (e.g. Americas / Japan analogs). Drivers hold **virtual contracts** with wages and **buyout fees** — not unrestricted free agents — so the pool is not a free supermarket. No playable foreign calendars in v1; stats stay frozen or lightly simulated.

---

## 5. v1 simulation pillars (in scope)

All of the following are first-class for v1:

1. **Race strategy & weekend operations** — practice/qualifying/race; live in-race management; weather; tires; ERS/energy; damage; safety car / VSC; **refueling in lower tiers**. One race engine with **tier-parameterized** modules (fuel weight, tire wear, battery/ERS) — not separate codebases per series. Junior practice rewards setup work from technical staff.
2. **Car R&D** — tier-appropriate development (see §4.3) that creates lasting performance identity across seasons and a customer→constructor path in Tier 1, including supplier contract leverage.
3. **Driver development** — growth, form, and career arcs across the license ladder, including reserve/test and contracted off-screen pool states.
4. **Finances & sponsors** — budgets, wage pressure, commercial deals, **relegation parachutes**, and **promotion liquidity** (sponsor escalators + league advances) tied to results, exposure, and tier changes.
5. **Staff & facilities** — hiring, quality, and infrastructure as performance levers (including Tier 3 setup/reliability), promotion gates, and constructor-conversion unlocks.
6. **Narrative layer** — emergent press/board/rivalry/supplier-conflict signals **plus** a small set of authored event chains.

**Explicitly deferred:** series regulations politics / governance drama as a deep system (league voting/evolution may appear later as world rules, not v1 feature depth).

---

## 6. Technical scope (v1)

- **Electron** shell, **SvelteKit** UI, **SQLite** local saves only, **TypeScript** throughout.
- Single-player, offline-first; no cloud sync in v1.
- **Save health:** permanent relational storage for career stats, race results, and milestones; lap-by-lap telemetry is **purged or archived** (compressed blobs / separate archive DB) so multi-decade saves do not bloat to gigabytes.

---

## 7. Out of scope (v1)

- 3D race view, driving physics, or player-as-driver modes
- Licensed real-world series, teams, drivers, or circuits
- Creating a custom team at start (existing bottom-tier takeover only)
- Player-authored custom leagues
- Multiplayer / online saves / cloud sync
- Promotion/relegation playoffs
- Deep regulations & politics simulation
- Sprint format as a required Tier 1 system (may land later)
- Playable off-screen / foreign-series calendars (lightweight virtual contracts only)
- Owner-only or pure financial sandbox as a separate mode

---

## 8. Success criteria (vision-level)

A successful v1 save feels like running a real open-wheel outfit: race weekends demand attention; off-season reshapes the grid; a multi-year climb from Tier 3 to Tier 1 is hard, legible, and memorable; and the statistical + narrative residue of that climb is worth keeping.
