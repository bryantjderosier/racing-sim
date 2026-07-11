# Pillar 2: Core Gameplay Loops & Race Weekend

## 1. Practice Session: Engineering Consultation Loop
The Practice session completely avoids abstract slider mini-games, operating instead as an authentic, data-driven consultation between the player, the Driver, and the Race Engineer.

### Under-the-Hood Physics Variables
The car's physical mechanical grip and balance are determined by 5 granular engineering parameters:
* **Front & Rear Wing Angles:** Dictates aerodynamic balance and straight-line aerodynamic drag.
* **Anti-Roll Bars (ARB):** Governs lateral chassis roll distribution and mid-cornering balance.
* **Ride Height:** Controls underbody ground-effect efficiency versus pitch and bump sensitivity.
* **Camber & Toe:** Dictates tire contact patch suspension geometry alignment and heating characteristics.
* **Brake Bias:** Controls front-to-rear deceleration brake stability.

### The Feedback System
When a car completes a multi-lap practice stint, the **Driver's Feedback** attribute and the **Race Engineer's Setup and Analysis** attributes filter the raw physics data to generate an explicit **Engineering Brief** on the UI:
* **High-Tier Personnel:** The UI displays a direct, highly accurate mechanical recommendation: *"The driver notes severe mid-corner rear snap. I recommend lowering the Rear Ride Height by 2mm and softening the Rear Anti-Roll Bar by 1 click."*
* **Mid-Tier Personnel:** The advice is partially obscured or given as an uncertain diagnosis range: *"The rear end is unstable over the curbs. We should look at softening the rear suspension or adjusting ride height, but we aren't sure of the exact value."*
* **Low-Tier Personnel:** The advice is vague, completely missing, or potentially incorrect: *"The car feels loose overall. Adjusting wings might help?"* This forces the player to rely on their own mechanical engineering intuition to guess the correct adjustments.

### Knowledge Trims (Data Accumulation)
While executing these test runs, the team passively logs data to unlock session multipliers:
* **Qualifying Trim:** Earned via low-fuel, short stint pace directives. Unlocks up to 3 tiers of raw pace bonuses strictly for the Qualifying session (Level 1: +0.1s, Level 2: +0.25s, Level 3: +0.4s per lap).
* **Race Trim:** Earned via high-fuel, long stint pace directives. Unlocks tiers that decrease baseline tire wear rates or improve lap-time consistency during the main race.
* **Compound Knowledge:** Provides a direct grip multiplier bonus exclusive to the specific tire compound utilized during the practice run.
* **Rain Edge Cases:** If precipitation begins, slick tire trim accumulation instantly freezes. Teams must immediately pivot to Intermediate or Wet compounds to accumulate a separate *Wet Weather Trim*, providing a massive track advantage if the upcoming race session is a predicted downpour.

---

## 2. Qualifying Simulation: The Three-Stage Knockout & Strategic Timing
Qualifying uses a high-tension knockout format heavily influenced by track surface grip progression, timing, and clean-air management.

### Session Progression Structure
The grid is progressively whittled down across three separate, timed blocks:
* **Q1 (18 Minutes):** All cars run; the bottom slowest cars are eliminated and locked into their starting grid positions.
* **Q2 (15 Minutes):** Times are wiped; the remaining field fights to avoid the next elimination cutoff.
* **Q3 (12 Minutes):** The top 10 elite cars enter a final shootout for Pole Position.

### Timing & Grip Mechanics
* **Track Evolution Math:** At the start of Q1, the track is "green" and dusty, operating at a lower grip multiplier (e.g., 0.95). Every completed lap by any car cleans the asphalt and lays down rubber, ticking the grip multiplier up dynamically (e.g., up to 1.02 by the end of Q3). Laps set in the final seconds of a session are inherently faster than those set at the beginning.
* **The Traffic Bubble:** Sending a driver out into a crowded sector forces them to navigate out-laps and slow cars. A driver's **Traffic Navigation** and **Composure** dictate how much clean air they can secure and how much time they lose if blocked by a rival's dirty air.
* **Out-Lap Preparation:** The player issues an order for out-lap intensity via the Race Engineer. Pushing too hard overheats the tire surface before the flying lap begins; driving too slowly drops core tire temperatures below the optimal thermal operating window. Drivers with low *Composure* or *Focus* stats will actively panic in bottlenecks, failing to bring tires and brakes into their optimal thermal windows.

---

## 3. Race Simulation: Pit Wall Management Engine
On Sunday, the player steps into the role of Pit Wall Manager, issuing high-level strategic directives rather than direct corner-by-corner steering commands.

### Real-Time Directives
* **Pace & Tire Management:** Four intensity levels (*Conserve, Balanced, Push, Maximum*). Higher intensity yields faster lap times but accelerates tire carcass wear, spikes rubber thermal degradation, and increases the driver's mistake risk via **Focus** decay.
* **Fuel & Energy Deployment:** Controls electrical deployment from the MGU-K battery system (*Harvest, Balanced, Overtake*).
* **Combat Overrides:** Explicit tactical commands relayed via the Race Engineer, including: *"Hold up traffic behind," "Do not fight your teammate,"* or *"Execute aggressive overtake immediately."* Success or failure resolves against the driver's **Aggression**, **Overtaking**, and **Defending** attributes.

### Non-Linear S-Curve Tire Degradation Model
Tire grip drops over a stint using a distinct 3-phase life cycle rather than a linear countdown:
* **Phase A (Warm-Up & Peak):** The tire starts below optimal grip on its out-lap, quickly peaking as it heat-cycles. Soft compounds peak almost instantly; Hard compounds require 2 to 3 full laps to fully activate.
* **Phase B (Linear Decay):** A steady, predictable wear window where grip drops by a tiny fraction each lap.
* **Phase C (The Cliff):** When a compound drops below its structural threshold (e.g., 30% life for Softs, 20% for Hards), it hits *The Cliff*. Lap times instantly collapse by 2.0 to 4.0 seconds, and lock-up or spin probabilities spike exponentially.
* **The Thermal Overheating Loop:** Directives directly alter a tire's active *Core Temperature*. Setting a driver to "Attack" or "Push" unlocks instant raw grip but spikes core temperatures. If left on high-intensity directives for too long, the tires overheat—suffering an immediate temporary grip drop and permanently destroying a significant chunk of the tire's remaining life pool. High track temperatures favor Hard compounds, while cold tracks prevent them from warming up.

### Pit Strategy Engine
* **The Pit Gap Graph:** A live, visual timeline mapping out exactly where your car will re-enter the track relative to rival cars and traffic congestion if you choose to pit on the current lap.
* **Stint Management:** The player monitors live compound degradation percentages and calls the definitive *Box This Lap* order, selecting the incoming tire compound and setting fuel/energy targets for the upcoming stint.

### Pit Crew Attribute & Stress Matrix
Pit stop durations and execution success are driven dynamically by a dedicated, manageable Pit Crew Squad.
* **Core Squad Attributes:** Crew capabilities are calculated by averaging active operators across three metrics:
    * *Speed:* Dictates the theoretical fastest time to service the car (e.g., scaling from a 4.2s base down to an elite 1.9s execution).
    * *Consistency:* Dictates the statistical size of the crew's "safe execution window," directly mitigating error probabilities.
    * *Focus under Pressure:* Governs stress resistance when executing high-pressure actions, such as double-stacking cars during a Safety Car or servicing a car protecting a race lead.
* **The Error Matrix:** Triggering a failed roll selects a realistic mechanical snag:
    * *Jammed Wheel Nut:* Adds an immediate +3.5 seconds to the stationary time.
    * *Cross-Threaded Hub:* A severe error adding +6.0 to +10.0 seconds as operators reverse and re-thread the gun wheel hub.
    * *Unsafe Release:* The stop is fast, but the car is released into an oncoming AI vehicle's path, triggering an automatic 5-second time penalty from the stewards.
* **Fatigue & Training Management:** Players set weekly training focuses back at the factory (e.g., speed drills vs. recovery). Active race weekends and training tick up a crew's *Fatigue %*. Exhausted crews suffer heavy consistency and focus penalties. Players must maintain a bench of reserve crew members and manually rotate tired operators out between races.

---

## 4. The 4-Tier Chaos Engine
Randomized, dynamic variables break predictability and force real-time adaptive strategies.

* **Dynamic Weather:** Features a live-moving radar map. Rain falls dynamically across different sectors, shifting the track surface through four distinct moisture states (Dry, Damp, Wet, Flooded). Players must time the exact strategic cross-over points for *Slicks, Intermediates,* and *Full Wets*.
* **Safety Cars & Virtual Safety Cars (VSC):** Bunch the field together (Safety Car) or enforce a strict sector delta speed limit (VSC). Pitting under a VSC or Safety Car drastically reduces the effective time lost in the pit lane, creating high-priority strategic windows.
* **Mechanical Degradation:** Parts accumulate wear and micro-fractures every lap. Components can develop minor performance faults (e.g., loss of hybrid deployment) or suffer terminal, retirement-inducing mechanical failures based on the car's underlying **Reliability** ratings.
* **Driver Incidents:** High-aggression driving or low-composure mistakes cause drivers to lock up, slide off into gravel traps, spin out, or collide with rival cars, causing local yellow flags, debris zones, or full race stoppages.