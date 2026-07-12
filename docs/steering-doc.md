# Product Steering Document: Project Apex Management
**A Deep-Simulation Motorsports Management Strategy Game**

> **Locked rules:** [`design-decisions.md`](./design-decisions.md) is canonical when it conflicts with pillar prose below.

---

## 1. Executive Summary & Core Philosophy
Project Apex Management is a high-fidelity, data-driven motorsports management simulation designed to bridge the gap between accessible casual strategy and hardcore sports management. Taking inspiration from the broad visual and gameplay framework of *Motorsport Manager*, Project Apex re-engineers the underlying systems to achieve the depth, structural integrity, and long-term realism found in franchises like *Out of the Park (OOTP) Baseball* and *Football Manager*. 

The objective is to eliminate "gamey" exploits (cheesing), replace predictable linear scaling with organic dynamic development, and treat drivers, engineers, data, and regulations as complex, interconnected systems.

---

## 2. Analysis of the Base Game: *Motorsport Manager*
To understand what needs to change, we must map the architectural elements of *Motorsport Manager* (MM) and identify where its simulation loops break down into predictable, exploitable patterns.

### Core Systems in Motorsport Manager
* **Part Development:** Linear upgrades (Reliability vs. Performance). Slots accept components providing flat numerical bonuses (+20 Max Performance, etc.). Part status resets or standardizes between seasons.
* **Driver & Staff Progression:** Star-rating systems (1 to 5 stars) driven by static growth curves. Traits provide static modifiers. Contracts are straightforward negotiations with flat fee/wages and buyouts.
* **Sponsorships:** Fixed slots based on team appeal. Sponsors provide fixed upfront payments or flat per-race bonuses based on finishing positions.
* **HQ Building:** Linear unlock trees. Building a telemetry center or wind tunnel permanently increases part development caps or base stats.
* **Race Weekend Simulation:**
    * *Practice:* Mini-game to unlock percentage bonuses (e.g., +10% Soft Tyre performance) by driving laps.
    * *Qualifying:* Timing sector runs around tyre/brake temperature meters.
    * *Race:* Real-time 2D/3D track layout with three primary driving styles (Conserve, Neutral, Attack) and engine modes (Low, Medium, High). Tyres degrade linearly based on style.

### Where the Base Game "Cheese" Occurs
1.  **The Design Loop Exploit:** Players can build illegal parts with massive performance metrics at the end of a season, never race them (avoiding penalties), and have those metrics carry over as the team's base performance for the next season.
2.  **Stat-Padding Drivers:** Hiring low-wage drivers with high "Marketability" to instantly unlock tier-5 sponsors, funding rapid car development that renders driver skill irrelevant.
3.  **Predictable Tyre/Fuel Over-Pushing:** The race engine relies on simplistic thermal gates. Players can run engine modes at max, backing off exactly when a threshold hits, reliably beating AI teams that follow rigid, scripted strategy intervals.
4.  **Static Progression:** Driver and staff potential is largely fixed. Once you identify a "5-star potential" asset, investment is risk-free, eliminating the scouting uncertainty inherent in real motorsports.

---

## 3. Systems Blueprint: Remove, Modify, and Add

To shift the game from a casual strategy loop to an authentic, emergent simulation, the following systemic modifications are required:

### Things to REMOVE (The "Casual" Elements)
* **REMOVING Flat Numerical Star Ratings:** Visible 1-to-5 star indicators for staff, drivers, and parts are gone. They reduce complex assets to a single index, enabling immediate optimization.
* **REMOVING The "End-of-Season Part Carryover" Hack:** Parts built at the end of the year will no longer cleanly dictate next year's baseline. Technical regulation shifts and diminishing returns will govern year-over-year transitions.
* **REMOVING The Mini-Game Practice Loop:** Driving cars in circles to magically unlock an arbitrary "+10% Trim Bonus" is removed. Practice must be about engineering discovery, setup window targeting, and data gathering.
* **REMOVING Linear HQ Unlock Trees:** Building a facility shouldn't permanently unlock a static tier of parts. Facilities have operational costs, depreciation, and tech obsolescence.

### Things to MODIFY (Re-Engineering Current Systems)
* **MODIFYING Part Development to a Concept Evolution Model:** * *Instead of:* Spending $500k to get a "+30 Front Wing".
    * *Now:* You develop aerodynamic concepts within an R&D framework. Part performance is a hidden curve determined by your Wind Tunnel hours, CFD budget, and Lead Designer attributes. Parts can have unintended flaws (e.g., high peak downforce but extreme sensitivity to pitch or turbulent air).
* **MODIFYING Driver Attributes & Scouting:** * *Instead of:* Knowing a driver has 18/20 Cornering.
    * *Now:* Attributes are hidden behind a scouting veil. You rely on telemetry logs from junior formulas, scout reports, and test sessions. Attributes are granular: Braking Modulation, Tyre Conservation Whispering, Adaptability to Wet Weather, Overtaking Aggression, and Feedback Accuracy.
* **MODIFYING Race Engine Micro-Management:**
    * *Instead of:* Clicking "Attack" engine mode to go faster at a linear fuel cost.
    * *Now:* Managing engine modes alters real fuel maps, ERS deployment curves, and component degradation (MGU-K, MGU-H, Turbo wear). Pushing an engine introduces a non-linear risk of sudden mechanical failure or thermal runaway depending on ambient air density and radiator sizing.
* **MODIFYING Sponsorships into Complex Ecosystems:**
    * Sponsors care about regional alignment, driver nationalities, political stability, and ethical standing. Contracts include performance metrics, activation clauses, and image rights challenges.

### Things to ADD (The OOTP / Football Manager Layer)
* **ADDING Advanced Financial Regulations & Cost Caps:** A strict financial cap system matching modern series. Navigating the cost cap means allocating resources carefully between active development, emergency crash damage repair, and future-season R&D. Exceeding the cap brings severe sporting and financial penalties.
* **ADDING A Dynamic Junior Academy & Feeder System:** Full simulation of lower formulas (F2, F3, Regional series, or equivalents) running concurrently in the background. Young drivers develop organically, suffer injuries, experience career-altering confidence crises, or change trajectories based on coaching quality.
* **ADDING Technical Regulations Volatility & Political Voting:** Every season features subtle or sweeping technical regulation changes (e.g., floor edge restrictions, fuel blend modifications). Teams can lobby governing bodies, build political alliances, and vote on future rule frameworks to intentionally disadvantage rival car concepts.
* **ADDING Telemetry Data, Setup Windows, and Engineering Feedback:**
    * During practice, drivers provide descriptive verbal feedback ("The car snaps on entry under trail braking").
    * Engineers analyze actual telemetry charts (ride heights, tyre surface vs. carcass temperatures).
    * Finding the right setup means locating a specific, dynamic "window" unique to that track's climate, track surface roughness, and your car's aero philosophy.
* **ADDING Dynamic Team Chemistry & Corporate Politics:** Engineers, Team Principals, and Drivers have egos, preferred working styles, and loyalties. A brilliant but toxic Chief Aerodynamicist can demoralize an entire design department, causing high staff turnover or internal leaks to the press.

---

## 4. Technical Architecture Considerations
* **Data Structure:** Emphasize relational matrices over single-value variables. A driver’s performance on a specific corner is the product of track surface temperature, tyre carcass degradation, car downforce balance, and the driver's underlying composure stat.
* **Background Simulation Engine:** Lower-tier series must simulate with high fidelity to maintain realistic career progression loops, using asynchronous multi-threading to protect day-to-day processing performance.
* **Modding Framework:** Design with deep data exposure from day one. All teams, tracks, parts, and regulatory structures should be fully configurable via externalized JSON or SQLite databases to leverage community-driven world-building.