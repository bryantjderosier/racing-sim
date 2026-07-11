# Pillar 1: Personnel Architecture (Drivers & Staff)

## 1. Driver Attribute System

Drivers are defined by a **4x5 Grid Matrix** consisting of 20 active, scoutable, and trainable attributes. All attribute names are strictly optimized for compact UI/UX layout efficiency (maximum of 1–2 words).

### Group 1: Pace
*Governs raw speed, physical car control, and single-lap optimization.*
* **Qualifying:** Success rate, consistency, and absolute speed during low-fuel, fresh-tire single-lap runs.
* **Braking:** Efficiency and modulation entering deceleration zones; dictates minimum corner-entry speeds.
* **Cornering:** Authority over the car's apex trajectory; maximizes mid-corner rolling speed.
* **Traction:** Efficiency and throttle application accuracy on corner exit to minimize wheelspin.
* **Tyre Management:** Micro-management of the contact patch to minimize rubber abrasion and thermal spikes.

### Group 2: Racecraft
*Governs wheel-to-wheel combat, pack navigation, and dynamic race-day conditions.*
* **Overtaking:** Success probability, spatial awareness, and pathfinding when attempting to pass a rival.
* **Defending:** Tactical positioning and defensive car placement to break the slipstream and hold off faster cars.
* **Launch:** Reaction time and clutch release efficiency at lights-out and safety car restarts.
* **Traffic Navigation:** Speed efficiency when carving through backmarkers, blue flags, or heavy multi-car packs.
* **Wet Driving:** Intuition, car feel, and risk management when the track surface is damp, drying, or fully wet.

### Group 3: Mental
*Governs psychological stability, decision-making under stress, and endurance.*
* **Composure:** Resistance to driver errors when under direct tailing pressure or during high-stakes hunting.
* **Consistency:** Lap-to-lap variance across a full stint. High ratings yield robotic precision; low ratings yield high delta swings.
* **Adaptability:** Pace retention when suddenly dealing with mechanical faults, changing tire compounds, or shifting track grip.
* **Focus:** Rate of performance decay and mistake-risk scaling as driver physical fatigue increases over a race distance.
* **Aggression:** Propensity to dive into tight gaps. Acts as a multiplier for Overtaking/Defending but scales baseline crash risk.

### Group 4: Technical
*Governs off-track utility, engineering contribution, and team assets.*
* **Feedback:** Accuracy of setup data provided during practice. Directly affects the speed of dialing in the car's sweet spot.
* **Development:** Rate of experience point accumulation used to train attributes, and contribution to long-term R&D concept testing.
* **Marketability:** Commercial pull. Dictates corporate sponsor tiers unlocked and the baseline payout size of sponsorship contracts.
* **Morale Balance:** Internal psychological baseline and emotional resilience following bad weekends or tough negotiations.
* **Teamwork:** Willingness to comply with explicit team orders (e.g., swapping positions) and overall impact on garage chemistry.

---

## 2. Driver Hidden Metadata (Biological Trajectory & Independent Caps)

To ensure long-term, multi-decade simulation durability, these data variables sit beneath the active UI grid as hidden/scoutable background constants. They prevent attributes from scaling indefinitely and drive realistic career lifecycles.

* **Injury Proneness:** Probability multiplier for physical training injuries, illness, or structural injuries sustained during high-G racing accidents.
* **Longevity:** Age threshold baseline (e.g., age 32–38) at which a driver’s physical/pace attributes begin natural systemic decay.
* **Independent Growth Ceilings:** Instead of a single flat number, the database tracks an array of 20 unique integers (0–99) mapping 1:1 to each visible attribute. This prevents drivers from homogenizing into identical profiles, creating distinct, unalterable driver archetypes (e.g., a permanent low tire-management ceiling paired with an elite qualifying ceiling).

### Progression & The Unplayable Karting Tier
* **Weekly XP Progression:** A background calendar system tick calculates Development Points driven by the driver's **Development** attribute and active track mileage. Once an attribute matches its independent ceiling value, progression for that specific stat freezes permanently.
* **The Karting Pipeline:** Feeder series prospects (Ages 12–16) reside in an unplayable database table tracking these exact properties. As they log abstract results, their stats scale behind the scenes. At age 16, top prospects whose attributes pass the entry threshold graduate directly into the active scouting free-agency engine.

---

## 3. Staff Architecture & Scouting Fog

The team infrastructure relies on **5 Core Specialist Roles**. Each role is defined by exactly **5 unique, UI-optimized attributes** tailored to their operational department.

### Recruitment Fog of War
All staff profiles outside the player's current organization are natively obscured by uncertainty brackets (e.g., showing an attribute value as *65–90*). Players must assign their scouting network to headhunt targeted personnel over a multi-week timeframe to completely lift the fog and unmask the exact database integers.

### Role 1: Chief Aerodynamicist
*Responsible for the vehicle's aerodynamic map, downforce generation, and airflow stability.*
* **Efficiency:** Ability to maximize absolute peak downforce limits under optimal wind tunnel parameters.
* **Packaging:** Precision in structural bodywork design to maximize aerodynamic gains while minimizing straight-line drag penalties.
* **Stability:** Mastery over pitch, roll, and ride-height sensitivity to ensure predictable downforce under braking and over curbs.
* **Innovation:** Loophole detection; rate of identifying structural grey areas in the technical regulations to yield R&D spikes.
* **CFD Mapping:** Efficiency in utilizing computational fluid dynamics data, reducing physical testing hour requirements.

### Role 2: Chief Mechanical Engineer
*Responsible for everything beneath the bodywork—the chassis core, suspension kinematics, and mechanical grip.*
* **Chassis:** Structural optimization of the core tub for ideal weight distribution, rigidity, and baseline mechanical grip.
* **Suspension:** Mastery over dampening and compliance, directly dictating low-speed corner mechanical grip and tire wear profiles.
* **Weight Optimization:** Skill to engineer components right to the minimum legal weight limit without compromising safety.
* **Reliability:** Structural engineering excellence that suppresses random manufacturing defects or part fatigue over runtime.
* **Damage Resistance:** Component structural integrity that minimizes the chance of terminal failure during light track contact.

### Role 3: Chief Powertrain Engineer
*Responsible for the internal combustion engine (ICE) and hybrid energy recovery systems (MGU-K, MGU-H).*
* **Thermal Efficiency:** Extraction of maximum raw horsepower from fuel combustion while mitigating engine running temperatures.
* **Harvesting:** Recovery efficiency of the MGU-K (kinetic under braking) and MGU-H (thermal via exhaust gasses).
* **Deployment:** Software mapping precision to deliver battery energy smoothly without cooking the rear tires or creating torque spikes.
* **Integration:** Compactness of the hybrid engine package layout to minimize chassis packaging compromises.
* **Reliability:** Structural durability of the power unit block, turbocharger, and energy store against long-term mileage degradation.

### Role 4: Race Engineer
*The trackside pit-wall link assigned to an individual car, responsible for real-time operations.*
* **Chemistry:** Driver rapport and trust; accelerates driver morale recovery and dampens stress during critical race events.
* **Setup:** Speed and precision in translating driver practice session feedback into exact mechanical adjustments.
* **Strategy:** Calculation speed for real-time tire degradation deltas, fuel maps, and safety car windows to optimize pit timing.
* **Analysis:** Mastery of real-time telemetry interpretation to spot early mechanical anomalies or critical thermal spikes.
* **Adaptability:** Effectiveness and operational speed when responding to sudden chaos (e.g., flash weather changes or dynamic penalties).

### Role 5: Head of Scouting
*Responsible for managing the global talent evaluation network and rival team espionage.*
* **Detection:** Base speed at which the department lifts the "Scouting Fog" off uncontracted drivers and staff globally.
* **Accuracy:** Precision of talent scouting reports, successfully tightening the confidence interval brackets around unknown attributes.
* **Appraisal:** Ability to accurately forecast a junior prospect's hidden Growth Ceiling and underlying biological metadata traits.
* **Leverage:** Negotiation strength; ability to suppress the initial contract interest barrier when poaching staff/drivers from rivals.
* **Coverage:** Geographical network efficiency, allowing the agency to track multiple feeder series concurrently without budget bloating.