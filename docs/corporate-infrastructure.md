# Pillar 3: Corporate Infrastructure, Finance, & HQ Campus

## 1. The Liquid Cash Income Engine
To maintain multi-division financial stability, a team’s liquid bank balance relies on a 3-pronged revenue architecture distributed dynamically across the race calendar.

### Revenue Streams
* **Sponsor Contracts:** The primary engine of rolling liquid cash. Consists of a baseline upfront payout, a flat per-race payment, and high-yielding performance target bonuses (e.g., *"Finish P8 or higher for a $500,000 payout"*). Corporate interest tiers are strictly governed by driver **Marketability** and current team standing.
* **Championship Prize Money:** A massive annual baseline payment awarded at the start of a new calendar year, calculated strictly from the team's finishing position in the Constructors' Championship from the previous season.
* **Customer Engine Supply Fees:** An elite-tier revenue stream unlocked exclusively for Factory Works teams. Allows players to manufacture and supply proprietary power units to AI customer teams on the grid for a flat, multi-year seasonal contract fee (e.g., $15,000,000 annually per customer team).

### Sponsor Slot Inventory Layout
To manage corporate inventory, the team car liveries possess 6 explicitly defined contract slots tracking individual lifecycles:
* **1x Title Sponsor Slot:** Massive upfront payout, heavy multi-year commitment, but demands extreme top-tier team championship standing and driver marketability thresholds to unlock.
* **2x Major Sponsor Slots:** Placed on sidepods and engine covers. Provides the structural bulk of the team's flat, per-race rolling operational cash.
* **3x Minor/Rear-Wing Sponsor Slots:** Short-term, volatile contracts (e.g., lasting 4–8 races) tightly focused on high-risk, high-reward specific performance bonuses (e.g., *"Qualify both cars inside Q3 this weekend"*).

---

## 2. Dynamic Cost Cap & Progression Anchors
To prevent uncompetitive "day-one spending dumps" where a rich team instantly purchases a championship car, financial progression is heavily restricted by operational throughput time and division-specific regulatory boundaries.

### The Seasonal Cost Cap Matrix
The Cost Cap is a strict regulatory ceiling (e.g., $140,000,000 baseline in Division 1) tracking only performance-enhancing development. It dynamically fluctuates year-to-year based on global economic triggers or sudden technical regulation overhauls. 

Every financial ledger entry in the database carries an explicit boolean flag: `is_cost_cap_applicable`. Development costs hit both liquid cash and the rolling cost cap pool, while exempt expenses skip the regulatory ledger tracking.

| Inside the Cost Cap (`is_cost_cap_applicable = true`) | Outside the Cost Cap (`is_cost_cap_applicable = false`) |
| :--- | :--- |
| • Raw materials & part fabrication costs | • Active driver salaries & contract buyout fees |
| • R&D Testing (Wind Tunnel/CFD power costs) | • Top 3 highest-paid specialist staff salaries |
| • Standard engineering & garage crew payroll | • HQ Campus facility construction & upgrade costs |
| • Mid-season upgrade package iterations | • Marketing, freight travel, & hospitality |

### The Multi-Division Scaling Ecosystem
Each tier of the racing pyramid operates within its own financial reality. Winning a division triggers the **Promotion Financial Shock Loop**:
* **Division 1 (The Pinnacle):** $140,000,000 Cost Cap. Peak sponsor payout brackets.
* **Division 2 (The Mid-Tier):** $75,000,000 Cost Cap. Leaner corporate sponsor pool.
* **Division 3 (The Proving Grounds):** $35,000,000 Cost Cap. Stripped-back, highly standardized spec-part budgets.
* **The Promotion Shock:** Upon promotion to a higher tier, a team's regulatory Cost Cap ceiling instantly scales up. However, their actual liquid cash balance does not change. The promoted team enters the upper division as a massive financial underdog, forcing them to survive on lower operational budgets until they can secure higher-paying sponsors.

### The Engine Supplier Lease Constraint
In Divisions 2, 3, and early Division 1, teams without a completed Powertrain Factory cannot build custom engines. They must select an AI baseline supplier (e.g., Alpha Power, Chronos V8) and sign a 1-to-3-year lease contract. This demands a massive, flat upfront fee paid outside the Cost Cap at the start of a calendar year and enforces a structural straight-line power limit ceiling on the car's simulation performance.

### Anti-Dumping Progression Friction
* **Weekly Resource Windows:** Teams are locked to a strict number of regulatory Wind Tunnel and CFD simulation testing hours per week. Spending cannot bypass this calendar constraint.
* **Manufacturing Lead Times:** Complex components require 14 to 21 calendar days in the foundry to manufacture. Upgrade implementation is organically distributed across the season.
* **The Mid-Season R&D Pivot Slider:** Around mid-season, the governing body finalizes technical rules for the upcoming year. Players must utilize an interface slider to allocate engineering resources between the *Current Car Performance* and *Next Year's Regulations*. Spending heavily on the current car risks falling behind in the next era, while pivoting early sacrifices current prize-money positioning.

### The Penalty Matrix
Exceeding the Cost Cap by the end of a season triggers automatic penalties for the subsequent calendar year:
* **Minor Breach (Less than 5% over):** Severe liquid cash fines and a 10% to 20% reduction in allowed Wind Tunnel testing hours for the upcoming season.
* **Major Breach (Greater than 5% over):** Retroactive deduction of Constructors' Championship points from the completed season, threatening lost titles, historical rankings, and prize distributions.

---

## 3. The HQ Campus Facility Network & Upgrades
The team headquarters features individual, specialized buildings visible on a central campus map. To preserve an authentic underdog journey, teams may start a career with a completely barren campus (Tier 0). 

Upgrades follow an **upward-sloping exponential growth curve**, meaning early tiers are cheap with modest gains, while the final masterclass tiers demand massive liquid capital but unlock game-changing operational capabilities and massive performance scaling.

### The Campus Progression Matrix
* **Tier 0 (Unbuilt/Locked Plot):** 0% Bonus. The facility does not exist. Demands a flat upfront "break ground" cost and construction timeline to activate.
* **Tier 1 (Dilapidated/Base):** +3% Efficiency baseline. 1 Parallel Project Slot.
* **Tier 2 (Standard):** +5% Efficiency.
* **Tier 3 (Advanced):** +9% Efficiency. 2 Parallel Project Slots.
* **Tier 4 (Elite):** +14% Efficiency. Unlocks access to "Legendary" staff recruitment pools.
* **Tier 5 (Masterclass):** +20% to +25% Efficiency. Unlocks 3 Parallel Project Slots and completely deletes localized winter part performance regression.

### District 1: Aero & Design
* **Wind Tunnel:** Directly increases the raw performance points generated per R&D hour. Tier 5 unlocks a secondary parallel project slot for wing concepts.
* **CFD Lab:** Enhances fluid dynamics digital precision, reducing the liquid cash cost of running active wind tunnel loops.
* **Design Studio:** Accelerates the baseline attribute growth and operational design speeds of junior engineering personnel.

### District 2: Operations & Tech
* **Weather Hub:** Extends the time horizon and directional precision of the live mid-race weather radar, allowing for perfect strategic tire transitions.
* **Scouting HQ:** Increases the operational **Coverage** and data-gathering speeds of the Head of Scouting, allowing multiple rival personnel profiles to be un-fogged concurrently.
* **Logistics Hub:** Passive modifier that dampens global travel and freight overhead costs outside the cost cap.

### District 3: Performance & HR
* **Simulator:** Accelerates weekly experience point (XP) generation across all trainable attributes for active and reserve drivers.
* **Fitness Center:** Suppresses the underlying probability triggers of hidden **Injury Proneness** driver variables and speeds up crash injury recovery.
* **Staff Academy:** Provides a continuous, passive weekly stat training boost to active Race Engineers and Chief Engineers.

### District 4: Manufacturing & Industry
* **Foundry:** Drastically cuts the real-time calendar lead times required to fabricate newly designed aerodynamic components. Level 5 unlocks parallel casting lines.
* **Rig Testing:** Enhances the starting structural **Reliability** and baseline **Damage Resistance** of all newly minted mechanical/suspension components.
* **Powertrain Factory:** The ultimate late-game infrastructure milestone. Demands a massive multi-season construction timeline (e.g., 2 full calendar years) and an enormous upfront cash payment. Once operational, it permanently deletes the requirement to pay seasonal engine lease fees to rival teams and unlocks the custom Powertrain R&D engine, allowing the team to engineer custom power units and sign profitable supply contracts with customer teams on the grid.