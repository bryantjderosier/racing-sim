## 1. Core Simulation & Math Layer
Before building an interface, we must define the underlying data loops.

* **The Performance Matrix:** How do car performance, track conditions (temperature, grip evolution), and driver attributes mathematically interact to produce a lap time?
* **Part Development Mechanics:** What data parameters define a car component (e.g., peak downforce, drag coefficient, weight, pitch sensitivity, thermal efficiency)? How does a player transition from R&D to a manufactured part?
* **The Scouting Veil:** What determines the accuracy of a player’s data? How does hiring better scouts or running test sessions peel back the uncertainty fog on driver and staff attributes?

## 2. The User Interface (UI) & User Experience (UX) Philosophy
Transitioning from a casual game to a deep text/data simulation requires a massive shift in how information is displayed.

* **The Manager's Dashboard (Main Hub):** What does the primary office screen look like? What information demands immediate attention (e.g., cost cap progress, upcoming regulation votes, staff morale)?
* **Telemetry & Practice UI:** How do we present complex engineering data to the player during a race weekend without making it unreadable? Will we use visual graphs (line charts for tyre temps/ride heights) or structured engineer readouts?
* **The Screen Hierarchy:** How deep is the menu nesting? (e.g., Team Hub $\rightarrow$ Engineering $\rightarrow$ Aero Dept $\rightarrow$ Wind Tunnel Allocation).

## 3. The Race Weekend Gameplay Loop
The live simulation is where the core gameplay happens. We need to define the player's agency during a race.

* **Live Race Interface:** Are we leaning toward a clean, minimalist data-table/text-engine view (like *Football Manager* / *OOTP*), or a 2D/3D track map overview with rich data overlays?
* **Driver Communication Commands:** Instead of simplistic "Attack/Conserve" buttons, how does the player issue tactical orders? (e.g., "Target Sector 2 delta," "Manage rear tyre surface temps," "Defend the inside line").
* **The Setup Window Loop:** How does the engineering feedback system function during practice? What handles the transition from driver notes ("The car is snappy on entry") to mechanical adjustment?

## 4. Roster, Staff, & Living World Mechanics
A great sports management game relies heavily on the world simulating realistically around the player.

* **Feeder Series Logic:** How deep does the asynchronous background simulation go? Are we simulating full weekend sessions for lower formulas, or utilizing a mathematical probability engine to generate their results?
* **Contract & Negotiation Systems:** What variables do drivers and staff care about? (e.g., release clauses, performance-related bonuses, team status, engineering budget guarantees).
* **Political & Regulatory Engine:** How often do technical regulations shift, and what does the voting/lobbying interface look like? How do teams trade political favors?

## 5. Technical Architecture & Modding Strategy
Setting the technical foundation early prevents architectural bottlenecks later.

* **Database Schema Design:** How will we structure the SQLite or JSON relational databases to link drivers, teams, historical stats, and active component wear?
* **Save Game State:** Given the massive amount of historical data tracked over a multi-decade career (a la *OOTP*), how do we optimize save/load times and background processing?
* **Modding Capabilities:** What parameters will be exposed to the community? How easily can users inject custom track assets, real-world team names, or custom driver portraits?
