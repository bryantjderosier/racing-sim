# Game Design Decision Log

**Status:** Active planning — no new gameplay UI until the simulation contracts are defined.
**Product:** Fictional open-wheel racing management simulation
**Planning order:** Core loop → entities and attributes → R&D → race simulation integration → progression and economy → persistence → UI flows

## Working rules

- Resolve one material design question at a time.
- Record the decision, rationale, consequences, and unresolved follow-ups before moving on.
- Present each unresolved question before its recommendation.
- Prefer typed contracts, formulas, fixtures, and headless tests before Svelte UI.
- Treat existing planning documents as context; replace them only when a new decision explicitly supersedes them.

## Existing planning context

- `VISION_AND_SCOPE.md` defines the team-principal fantasy, fictional three-tier ladder, day-by-day career, full race-weekend agency, R&D, staff, facilities, finances, and long-term history goals.
- `DATA_SCHEMA.md` defines the current persistence vocabulary.
- `RACE_SIMULATION_CONTRACT.md` defines the deterministic headless race-engine boundary and prototype inputs.
- `DATABASE_PERSISTENCE_CONTRACT.md` defines the verified local-save persistence boundary.

## Decisions

### D-001 — Reset unfinished gameplay UI before further design

**Decision:** Keep only the title-screen UI. Remove the unfinished career, create-manager, load, delete, avatar, and generated shadcn component screens. Preserve the Electron save bridge, database implementation, domain content, planning documents, and validation scripts.

**Rationale:** The save lifecycle has been verified, while the gameplay UI was being built before the underlying simulation rules were fully defined.

**Consequence:** New gameplay screens wait until the relevant simulation contracts and interaction flows are approved.

### D-002 — Planning proceeds from the core loop outward

**Decision:** Define the player’s time-advancement loop before finalizing player, car, staff, R&D, economy, or gameplay UI details.

**Rationale:** Attribute meaning and system cadence depend on when the player makes decisions and how those decisions resolve.

**Consequence:** The next unresolved question is the time-advancement action outside race weekends.

## Current question

### Q-001 — Time advancement outside race weekends

Between race-weekend decisions, the game needs a clear way to move the calendar forward while staff work, drivers train, R&D projects progress, finances resolve, contracts change, and the wider championship generates news.

This choice determines:

- how often the player actively checks the game;
- whether the calendar feels like a living day-by-day paddock or a sequence of weekly turns;
- when R&D, staff, finances, injuries, negotiations, and narrative events resolve;
- how much control the player has to pause before an important event;
- whether race weekends feel like a special high-attention mode inside a broader career rhythm.

**Recommendation:** Use an explicit day-by-day `Advance Time` action as the authoritative loop. The game should resolve one calendar day at a time, surface meaningful events or decisions, and pause when the player must respond. A later convenience action can advance to the next scheduled event, but it should still resolve and record each intervening day rather than skipping the simulation in large opaque jumps.

This best supports the existing vision of a day-by-day career with deep history and Football Manager/OOTP-style emergent stories, while keeping R&D and financial progress understandable and testable.

**Question:** Do you want the primary time-advancement action to resolve one explicit calendar day at a time, or should the normal loop advance through multiple quiet days until the next meaningful event or decision?

### D-003 — Explicit day-by-day advancement

**Decision:** The primary time-advancement action resolves exactly one calendar day at a time. The simulation records each intervening day, and meaningful decisions can pause the calendar. A future convenience action may advance to the next scheduled event without hiding the daily resolutions.

**Rationale:** This matches the intended day-by-day career rhythm and makes R&D, training, finances, contracts, and emergent stories legible without sacrificing a longer-term “advance to next event” convenience.

**Consequence:** We now need to define which events interrupt the day-by-day flow and which are only recorded in the inbox/history.

## Current question

### Q-002 — Interruptions during time advancement

An explicit daily loop can become tedious if every small update stops the player. It can also become emotionally flat if important developments are silently buried in an inbox. We need a threshold for events that pause time immediately versus events that resolve quietly and appear for later review.

This affects:

- contract negotiations and signing deadlines;
- R&D milestones and project completion;
- driver/staff injuries, illness, morale, and disputes;
- sponsor, board, supplier, and rival messages;
- financial warnings and insolvency risks;
- scouting discoveries and market opportunities;
- authored narrative events and race-weekend preparation.

**Question:** Which events should be allowed to pause the calendar immediately, and which should resolve quietly into the inbox for the player to review later?

**Recommendation:** Pause only for events that require a meaningful player decision or have a deadline that can materially change the outcome. Resolve routine progress, ordinary news, small stat changes, and non-urgent messages without pausing; place them in a prioritized inbox. This keeps the game data-rich and story-rich without turning every calendar day into a confirmation dialog.

### D-004 — Consequential-event interruption threshold

**Decision:** Only events requiring a meaningful player decision or having a consequential deadline pause the calendar. Routine progress, ordinary news, small stat changes, and non-urgent messages resolve into a prioritized inbox without stopping time.

**Rationale:** This preserves the day-by-day rhythm without turning every calendar day into a confirmation dialog, while keeping important decisions visible and timely.

**Consequence:** We now need to define how paused decisions are presented and cleared.

## Current question

### Q-003 — Handling multiple blocking decisions

When several consequential events become due together, the game needs to decide whether the player receives a single event at a time, a stack of modal prompts, or a dedicated decision inbox that can be worked through in priority order. This affects deadlines, context switching, and how much control the player has over the order of operations.

**Question:** When multiple blocking decisions are waiting, how should the player work through them?

**Recommendation:** Use one dedicated decision inbox with a clear priority order and deadline indicators. The calendar remains paused until all blocking decisions are resolved, but the player can review the full queue, inspect context, and choose the order when deadlines allow. Avoid stacking modal dialogs because they hide context and make the simulation feel like a sequence of pop-ups.

### D-005 — Dedicated blocking-decision inbox

**Decision:** Multiple blocking decisions are handled through one dedicated decision inbox with priority order and deadline indicators. The calendar remains paused until all blocking decisions are resolved, but the player can review context and choose the order when deadlines allow.

**Rationale:** This preserves player control and context without creating a chain of stacked modal dialogs.

**Consequence:** Each blocking event needs a defined deadline policy and fallback outcome.

## Current question

### Q-004 — Unresolved decisions at deadline

The simulation needs a deterministic outcome when a player does not resolve a blocking decision before its deadline. Examples include an expiring contract offer, a sponsor response, a driver-selection deadline, a mandatory R&D choice, or a board ultimatum.

**Question:** What should happen when a blocking decision reaches its deadline without player input?

**Recommendation:** Give every blocking event an explicit fallback outcome defined by the event itself. At the deadline, resolve it automatically using the least surprising safe action, record that the fallback occurred, and continue the calendar. The player should never be able to freeze the save indefinitely, and the game should never make an irreversible high-impact choice without showing the fallback rule in advance.

### D-006 — Explicit deadline fallbacks

**Decision:** Every blocking event has an explicit fallback outcome. If the player does not act before the deadline, the simulation resolves the event automatically using its least surprising safe action, records that the fallback occurred, and continues the calendar.

**Rationale:** Saves cannot be frozen indefinitely, and the player can understand the consequence of inaction before choosing to wait.

**Consequence:** We now need to define whether ordinary player actions consume calendar time or are planned before the next daily resolution.

## Current question

### Q-005 — Actions within a calendar day

The player will often need to make several decisions around the same date: assign staff, start or cancel an R&D project, respond to messages, negotiate contracts, set scouting priorities, and adjust team plans. The game needs a consistent rule for whether each action advances the calendar, whether actions can be queued, and when their effects become active.

**Question:** Should ordinary management actions happen within the current day before one explicit `Advance Time` tick, or should individual actions consume calendar time as they are made?

**Recommendation:** Let ordinary management actions happen within the current day without advancing time. `Advance Time` should be the single authoritative daily resolution that applies queued work, progresses projects, updates the world, and moves deadlines. Actions with real duration should enter explicit queues with start dates and completion dates rather than secretly consuming extra days.

### D-007 — Actions are planned before the daily tick

**Decision:** Ordinary management actions happen within the current day without advancing time. `Advance Time` is the single authoritative daily resolution. Actions with duration enter explicit queues with start dates and completion dates.

**Rationale:** This makes the calendar predictable and lets the player compose a plan before observing its consequences.

**Consequence:** The daily resolution needs a fixed, documented order so outcomes are deterministic and understandable.

## Current question

### Q-006 — Daily resolution order

When the player presses `Advance Time`, several systems may change on the same date: queued actions begin or complete, R&D and training progress, finances settle, contracts and deadlines advance, world events are generated, and blocking decisions may pause the calendar. If the order is not fixed, the same inputs can produce ambiguous outcomes.

**Question:** Should `Advance Time` resolve systems in one fixed deterministic phase order, and if so, what should that order prioritize?

**Recommendation:** Use a fixed phase pipeline: validate the day’s queued actions, resolve completions and starts, apply ongoing daily progress, settle finances and contracts, advance world/AI systems, generate inbox events, then evaluate deadlines and blocking decisions. Record the phase order in the simulation contract and use it as the basis for deterministic tests.

### D-008 — Deterministic daily phase pipeline

**Decision:** Each `Advance Time` tick uses a fixed pipeline: validate queued actions; resolve completions and starts; apply daily R&D, training, and recovery progress; settle finances and contracts; advance world and AI systems; generate inbox events; then evaluate deadlines and blocking decisions.

**Rationale:** A documented order makes same-day interactions predictable, reproducible, and testable.

**Consequence:** Race weekends need their own explicit phase model while remaining part of the same calendar and blocking-event system.

## Current question

### Q-007 — Race-weekend transition

The ordinary loop is built around one daily tick, but race weekends are the game’s highest-attention moments. They include practice, qualifying, race strategy, live race decisions, results, points, wear, incidents, and post-race consequences. We need to decide whether those sessions are just special daily events or a dedicated multi-phase mode.

**Question:** How should the calendar transition into, run through, and exit a race weekend?

**Recommendation:** Treat a race weekend as a dedicated multi-phase mode inside the calendar. The calendar pauses normal daily resolution at the weekend start; the player explicitly advances through each session with preparation and decision points; the race engine resolves the live race; then a post-weekend phase applies results, points, wear, finances, morale, and inbox events before normal day-by-day advancement resumes.

### D-009 — Race weekend as a separate gameplay mode

**Decision:** Race weekends use a dedicated multi-phase mode and their own UI, separate from the normal career dashboard and chart surfaces. Normal daily resolution pauses at the weekend start and resumes only after post-weekend results and consequences are applied.

**Rationale:** Race weekends are the game’s highest-attention activity and need a focused race-control experience rather than competing with the normal management dashboard.

**Consequence:** The race-weekend contract must define the player’s decisions and pacing for practice, qualifying, the race, and post-race resolution.

## Current question

### Q-008 — Player agency by race-weekend session

Practice, qualifying, and the race have different management purposes. Practice is about learning the car and track, qualifying is about maximizing a short performance window, and the race is about strategy and live intervention. We need to decide whether each session is a single preparation decision or a sequence of decision points.

**Question:** How much player agency should each race-weekend session provide?

**Recommendation:** Give practice and qualifying a focused pre-session planning phase plus a small number of meaningful session decisions, while giving the race the highest agency through live strategy calls and intervention windows. Avoid requiring constant input during every simulated lap; let the player set defaults and intervene when the race state creates a meaningful choice.

### D-010 — Escalating race-weekend agency

**Decision:** Practice is a lower-agency test-and-learn phase where the player plans stints to test parts, build tyre knowledge, and discover qualifying and race setup. Agency increases through qualifying and is highest during the sprint and main races.

**Rationale:** Each session has a distinct management purpose, and the weekend should build toward the highest-stakes decisions instead of demanding maximum input immediately.

**Consequence:** Practice needs explicit knowledge outputs that can affect later sessions without requiring constant lap-by-lap interaction.

## Current question

### Q-009 — Persistence of weekend knowledge

Practice can produce several kinds of knowledge: tyre-compound understanding, qualifying-setup confidence, race-setup confidence, part comparisons, and track/car familiarity. We need to decide what belongs only to the current weekend and what should become long-term team or driver development.

**Question:** Which practice discoveries should reset at the end of each race weekend, and which should persist across future races or seasons?

**Recommendation:** Reset tyre knowledge and qualifying/race setup confidence at the end of each weekend, because they should represent preparation for the current track and car condition. Persist slower-moving driver, engineer, and team track-familiarity gains across seasons, with diminishing returns, so repeated visits create history without making practice permanently optional.

### D-011 — Weekend knowledge persistence

**Decision:** Tyre knowledge and qualifying/race setup confidence reset at the end of each race weekend. Slower-moving driver, engineer, and team track-familiarity gains persist across seasons with diminishing returns.

**Rationale:** Current-weekend preparation should matter every visit, while repeated experience should create long-term history without making practice permanently optional.

**Consequence:** Practice needs a finite, understandable planning resource so the player must choose which tests and knowledge targets deserve track time.

## Current question

### Q-010 — Practice stint allocation

The player needs to configure practice work such as testing a new part, learning a tyre compound, comparing qualifying and race setups, or building driver confidence. We need to decide whether practice is represented as a finite set of discrete stints or as a continuous time budget that the player divides manually.

**Question:** Should practice use a finite number of discrete stint slots, or a continuous practice-time budget?

**Recommendation:** Use a finite number of discrete stint slots per driver/session. Each stint has a clear configuration—driver, tyre compound, fuel/load target, setup objective, and optional part test—and produces readable knowledge, confidence, and wear results. This keeps the planning legible and gives the practice UI a natural “plan, run, review” rhythm without simulating unnecessary lap-by-lap setup management.

### D-012 — Hybrid practice time model

**Decision:** Each practice session has a finite continuous time budget. The player plans discrete stints within that budget, and each deployment consumes time based on its configuration. Tyre, fuel, setup, and part changes between runs also consume time before the car can return to the track.

**Rationale:** This combines the strategic clarity of stint planning with the operational tradeoff of a real practice clock. More ambitious testing creates more knowledge but leaves less time for additional runs.

**Consequence:** The practice model must define whether a running stint can be interrupted or changed before its planned completion.

## Current question

### Q-011 — Control during a running practice stint

Once a car is deployed, the player may discover that the current run is producing enough information, that a part is behaving badly, or that a setup direction is clearly wrong. The game needs to decide whether a planned stint runs to completion or whether the player can recall the car early and accept the lost time.

**Question:** Should the player be able to interrupt a running practice stint before its planned completion?

**Recommendation:** Allow the player to recall a car early, but make the cost explicit: elapsed track time is lost, the return/changeover consumes time, and the shortened stint produces less reliable knowledge. Do not allow arbitrary mid-lap configuration changes; the meaningful decision should be whether the current run is worth completing.

### D-013 — Early practice-stint recall

**Decision:** The player may recall a running practice stint before its planned completion. Elapsed track time is lost, returning and changing the car consumes time, and the shortened stint produces less reliable knowledge. Mid-lap configuration changes are not allowed.

**Rationale:** This gives practice meaningful intervention without turning it into constant micromanagement.

**Consequence:** The practice session must define how multiple team cars share the session clock, garage, engineers, and deployment resources.

## Current question

### Q-012 — Concurrent team-car practice

An open-wheel team may have two cars running practice programs at the same time. Running both cars concurrently creates more learning opportunities, but it may compete for engineers, garage attention, setup changes, tyres, spare parts, and data review. Running only one car at a time makes the session simpler but removes an important team-management tradeoff.

**Question:** Should both team cars be able to run practice stints concurrently during the same session?

**Recommendation:** Allow both cars to run concurrently against the same session clock, with independent stint queues and car state. Keep meaningful bottlenecks in shared resources—engineer assignments, garage work, tyre inventory, spare parts, and data-analysis capacity—so the player still has to coordinate the team rather than receiving twice the value for free.

### D-014 — Concurrent two-car practice

**Decision:** Both team cars can run practice stints concurrently against the same session clock. Each car has an independent stint queue and car state, while engineers, garage work, tyres, spare parts, and data-analysis capacity remain shared resources.

**Rationale:** This reflects the operational reality of a two-car team and creates coordination decisions without making the second car artificially wait for the first.

**Consequence:** We need a rule for whether changes to both cars can occur in parallel or must queue behind shared resources.

## Current question

### Q-013 — Parallel car changes and shared resources

When both cars return from a stint, they may need tyre changes, fuel changes, setup changes, or part swaps. Some work can happen in separate garage bays, while specialist engineers, limited equipment, scarce parts, or data-review capacity may be shared. This determines whether a two-car team can fully exploit concurrent running or must schedule around operational bottlenecks.

**Question:** Should changes on both cars normally happen in parallel, or should team-wide resource conflicts make one car wait?

**Recommendation:** Let ordinary work happen in parallel through separate garage bays. Only shared or scarce resources should serialize the work and add delay—for example, one specialist engineer, one calibration rig, one available spare part, or one data-analysis queue. This keeps concurrency useful while making infrastructure and staffing meaningful later.

### D-015 — Scarce-resource scheduling

**Decision:** Ordinary changes to both cars happen in parallel through separate garage bays. Shared or scarce resources can serialize work and add delay. Players are expected to stagger car programs when necessary to keep scarce engineers, equipment, parts, or analysis capacity available.

**Rationale:** Resource contention should create planning and scheduling decisions rather than arbitrary restrictions on concurrent car operation.

**Consequence:** Practice needs a feedback-timing rule so the player knows what can be learned before committing the next stint.

## Current question

### Q-014 — Timing of practice feedback

Practice produces different kinds of information. Basic observations such as lap pace, tyre wear, obvious reliability symptoms, and whether a part is functioning can be understood quickly. Deeper conclusions—setup direction, part comparisons, degradation models, and confidence in a race setup—may require engineer or data-analysis capacity.

**Question:** Should practice feedback be available immediately after every stint, or should deeper results arrive later through the shared analysis process?

**Recommendation:** Provide immediate basic feedback after each stint, while making deeper engineering analysis consume shared capacity and complete after a delay. The player can therefore make informed short-term decisions without getting perfect knowledge for free, and scarce analysis resources remain strategically valuable.

### D-016 — Immediate basic and deferred deep feedback

**Decision:** Basic practice feedback is available immediately after each stint. Deeper setup conclusions, part comparisons, degradation models, and race-setup confidence consume shared analysis capacity and complete after a delay.

**Rationale:** The player can make informed short-term choices while engineering and data capacity remain strategically valuable.

**Consequence:** The feedback system needs to communicate partial knowledge and uncertainty instead of presenting early conclusions as exact truth.

## Current question

### Q-015 — Uncertainty in practice feedback

Early practice data should not make the player omniscient. A single stint may be affected by traffic, driver variation, fuel load, tyre condition, weather, or an imperfect test plan. The player needs to understand both the observed result and how trustworthy the conclusion is.

**Question:** Should practice feedback show exact conclusions immediately, or should deeper findings be represented with confidence levels and uncertainty ranges?

**Recommendation:** Use confidence levels and uncertainty ranges for deeper findings. Basic observed measurements can be shown precisely, but setup direction, part deltas, degradation estimates, and race-setup confidence should become more reliable as relevant stints, engineer skill, driver feedback, and analysis work accumulate.

### D-017 — Confidence-based practice findings

**Decision:** Basic observed practice measurements are shown precisely, while deeper findings use confidence levels and uncertainty ranges. Setup direction, part deltas, degradation estimates, and race-setup confidence become more reliable through relevant stints, engineer skill, driver feedback, and analysis work.

**Rationale:** The player receives useful information without becoming omniscient after one run, preserving the value of testing and engineering quality.

**Consequence:** The weekend needs a setup model that distinguishes short-run qualifying performance from long-run race performance.

## Current question

### Q-016 — Qualifying setup versus race setup

Practice can teach the team about two competing objectives. Qualifying favors short-run peak grip, tyre preparation, and outright pace; the race favors consistency, tyre life, stability, fuel behavior, and operating tolerance. A single setup may not maximize both, and changing setup between sessions should have an operational cost.

**Question:** Should the player maintain separate qualifying and race setup profiles for each car?

**Recommendation:** Maintain separate qualifying and race setup profiles for each car. Practice can improve confidence in both profiles, while switching or applying major changes consumes garage time and may create new uncertainty. This makes practice planning meaningful and gives the player a clear strategic choice rather than a single setup score.

### D-018 — Separate qualifying and race setup profiles

**Decision:** Each car maintains separate qualifying and race setup profiles. Practice improves confidence in both profiles, while switching or applying major changes consumes garage time and may introduce uncertainty.

**Rationale:** Short-run peak pace and long-run race performance are competing objectives, so one undifferentiated setup score would remove an important strategic choice.

**Consequence:** The setup model must define how team knowledge transfers between cars and how driver-specific feedback affects each profile.

## Current question

### Q-017 — Shared versus driver-specific setup knowledge

The two cars share a team’s engineering baseline, parts, and track data, but drivers may prefer different balance characteristics and provide different-quality feedback. A fully shared setup would simplify operations but flatten driver identity; a fully independent setup could double the work and make the player manage repetitive details.

**Question:** Should the team use a shared setup baseline that each driver can refine independently, or should every setup profile be entirely separate from the start?

**Recommendation:** Use a shared team baseline with driver-specific refinements. Team-level findings transfer to both cars, while each driver’s feedback, style, confidence, and preferred balance create independent adjustments. The player can copy a profile between cars for speed, but copied settings should inherit some uncertainty until validated by the receiving driver.

### D-019 — Shared baseline with driver-specific refinements

**Decision:** The team maintains a shared setup baseline that transfers to both cars. Each driver can refine that baseline independently using their feedback, style, confidence, and preferred balance. Copied settings inherit some uncertainty until validated by the receiving driver.

**Rationale:** This preserves team learning while giving each driver a distinct technical relationship with the car without doubling every management task.

**Consequence:** Qualifying needs a format that makes setup confidence, tyre preparation, traffic, and run timing meaningful.

### D-020 — Tier-specific, regulation-driven qualifying formats

**Decision:** Qualifying format is defined by the active championship regulations rather than one global rule. Tier 3 begins with a continuous timed session, while Tier 1 begins with knockout rounds. Regulation changes can alter the format during a career.

**Rationale:** Different tiers should feel meaningfully different while allowing the sporting rules to evolve as the player progresses.

**Consequence:** Qualifying must be implemented as a configurable rules contract, and the initial Tier 2 format still needs to be defined.

## Current question

### Q-019 — Tier 2 qualifying format

Tier 2 sits between Tier 3’s continuous session and Tier 1’s full knockout format. It could retain the simpler continuous structure, use a shorter knockout format, or begin with one format and change through regulation votes or championship rule updates.

**Question:** What should Tier 2 use at launch: continuous qualifying, a shortened knockout format, or full knockout rounds?

**Recommendation:** Use a shortened knockout format for Tier 2, such as two rounds with a limited elimination between them. This gives the tier a clear identity and a manageable step toward Tier 1 complexity while preserving regulation changes as a future source of variation.

### D-021 — Tier 2 shortened knockout qualifying

**Decision:** Tier 2 begins with a shortened knockout qualifying format using two rounds and limited elimination. The active championship regulations remain authoritative and can change the format later.

**Rationale:** Tier 2 should provide a meaningful progression from Tier 3’s continuous session to Tier 1’s full knockout format without introducing the full complexity immediately.

**Consequence:** Qualifying rules need configurable round counts, elimination thresholds, and session transitions rather than hardcoded tier behavior.

## Current question

### Q-020 — Sprint race availability

Sprint races can either be a universal part of every championship weekend or a regulation-controlled feature that varies by tier and changes over a career. Universal sprints are easier to learn, while varied schedules create stronger sporting identity and strategic differences between championships.

**Question:** Should sprint races run every weekend in every tier, or should their presence and frequency be controlled by championship regulations?

**Recommendation:** Make sprint races regulation-driven, with Tier 3 initially running no sprints, Tier 2 using occasional sprint weekends, and Tier 1 using them frequently. This creates meaningful tier progression while allowing future regulation changes to reshape the calendar.

### D-022 — F1/F2/F3-inspired tier structures

**Decision:** The three tiers use distinct sprint structures inspired by their real-world counterparts. Tier 1 follows an F1-style selected sprint-weekend model: sprint qualifying, sprint race, separate Grand Prix qualifying, and the main race. Tiers 2 and 3 follow F2/F3-style event structures: one qualifying session establishes the feature-race order, a sprint race uses a partial reverse grid, and the feature race uses qualifying order. The active regulations control which structure, session order, grid rules, and points system apply.

**Rationale:** This gives each tier a recognizable sporting identity and creates a natural progression from junior-category race weekends to the top-tier championship format.

**Consequence:** The race-weekend contract must support both a two-race junior event and a selected-sprint top-tier event, with regulation data determining the schedule rather than a single universal weekend template.

## Current question

### Q-021 — Reverse-grid scope

In the real F2 and F3 formats, the sprint grid reverses only the leading part of the qualifying order—currently the top 10 in F2 and top 12 in F3—while the feature race uses the qualifying order. Tier 1 sprint grids are set by sprint qualifying instead of a reverse grid.

**Question:** Should the game use fixed reverse-grid counts matching those tiers, or calculate the reversed portion as a configurable percentage of the field?

**Recommendation:** Use fixed counts at launch: reverse the top 10 in Tier 2 and top 12 in Tier 3, while Tier 1 uses sprint-qualifying order. Store those counts in the regulation data so future rule changes can modify them.

### D-023 — Fixed junior-tier reverse-grid counts

**Decision:** Tier 2 reverses the top 10 qualifying positions for its sprint race, Tier 3 reverses the top 12, and Tier 1 uses sprint-qualifying order. These values are regulation data and may change through future sporting-rule changes.

**Rationale:** Fixed counts preserve the recognizable F2/F3 structure while keeping the system flexible enough for regulation changes.

**Consequence:** Grid generation must consume reverse-grid rules from the active championship regulations and apply penalties after the regulated grid is constructed.

## Current question

### Q-022 — Tier-specific points systems

The real-world tiers use different sporting identities and race structures. A shared points table would be easier to understand, while tier-specific tables would make sprint and feature-race results carry different strategic weight as the player progresses.

**Question:** Should each tier use its own points system, or should all tiers share one unified points table?

**Recommendation:** Use tier-specific, regulation-defined points systems, including separate values for sprint, feature, and main races where applicable. Start with values inspired by the real F1/F2/F3 structures, while allowing regulation changes to alter points and bonuses later.

### D-024 — Tier-specific regulation-defined points

**Decision:** Each tier uses its own regulation-defined points system. Sprint, feature, and main race classifications can award different values, and future regulation changes can modify points and bonuses.

**Rationale:** Different race structures should create different strategic value, and progression between tiers should feel sporting rather than cosmetic.

**Consequence:** Championship standings must read scoring rules from the active regulations instead of assuming one universal points table.

## Current question

### Q-023 — Qualifying and fastest-lap bonuses

Qualifying performance already determines grids and therefore has indirect championship value. Adding direct bonuses for pole, sprint pole, or fastest lap would reward specific moments more heavily, but also makes the standings harder to understand and increases the number of regulation-specific exceptions.

**Question:** Should qualifying and fastest-lap achievements award championship points, or should points come only from race classifications at launch?

**Recommendation:** Keep race classifications as the only scoring source at launch. Qualifying and fastest lap should affect grids, strategy, and narrative rewards without adding extra standings calculations; regulation data can enable bonuses later.

### D-025 — Race classifications are the launch scoring source

**Decision:** At launch, championship points come only from race classifications. Qualifying position and fastest lap affect grids, race strategy, feedback, and narrative rewards but do not award standings points. Regulations may enable those bonuses later.

**Rationale:** A focused scoring model is easier to understand and keeps the strategic importance of qualifying distinct from the championship’s actual results.

**Consequence:** Standings calculations can initially consume only classified race results and the active tier’s sprint, feature, and main-race point values.

## Current question

### Q-024 — Championship tie-breakers

Tied points can be resolved by a countback system, such as most wins followed by most second-place finishes and then progressively lower finishing positions. A simpler final-round or head-to-head rule would be easier to implement but could feel arbitrary over a full season.

**Question:** How should equal championship points be resolved?

**Recommendation:** Use motorsport-style countback: most wins, then most second places, then most third places, continuing through the finishing order. If still tied, use the best finishing result achieved by the tied competitor in the latest round where they can be separated.

### D-026 — Countback championship tie-breakers

**Decision:** Equal championship points are resolved by countback: most wins, then most second-place finishes, then most third-place finishes, continuing through the finishing order. If competitors remain tied, the latest round containing a separating result determines the order.

**Rationale:** Countback rewards repeated strong results across the season and avoids an arbitrary final-round or hidden random tiebreaker.

**Consequence:** Standings must retain finishing-position distributions and enough round history to explain every tie-break result.

## Current question

### Q-025 — Driver and team championships

The player manages a team, but driver progression and team success are different goals. Real-world junior and top-tier championships track both individual driver standings and a team championship, with the team score built from its entered cars.

**Question:** Should every tier track both driver and team championships, with each team’s score equal to the combined points from its cars?

**Recommendation:** Track both championships in every tier. A team’s score should combine the points scored by its entered cars, while driver standings remain individual. This gives the player meaningful team-level objectives without removing the importance of driver selection and development.

### D-027 — Dual driver and team championships

**Decision:** Every tier tracks both an individual driver championship and a team championship. A team’s score is the combined points from its entered cars, while each driver’s points remain individual.

**Rationale:** The player needs team-level objectives, while driver development, contracts, and rivalries still require an individual championship measure.

**Consequence:** Race results must award points to both the driver and the team entry associated with that car at the time of the event.

## Current question

### Q-026 — Mid-season driver transfers

Drivers may change teams because of contract decisions, performance clauses, replacements, injuries, or player choices. If points move with the driver, the team championship becomes disconnected from the team that earned those results; if they stay with the original team, the driver’s individual championship loses continuity.

**Question:** When a driver changes teams mid-season, should their existing driver points follow them while team points remain with the team that scored them?

**Recommendation:** Keep driver points with the driver and team points with the team entry that earned them. This matches the separate identities of the two championships and makes mid-season transfers strategically meaningful without rewriting history.

### D-028 — Points remain with their championship identity

**Decision:** Driver points follow the driver through a mid-season transfer. Team points remain with the team entry that scored them and are not moved when a driver changes teams.

**Rationale:** This preserves the independent histories of the driver and team championships and avoids rewriting completed results.

**Consequence:** Every result must record both the driver identity and the team entry identity at the time points were earned.

## Current question

### Q-027 — DNF and classified-finish scoring

A retirement can happen before the finish even when a driver has completed most of the race distance. Treating every retirement as identical is simple, but real motorsport distinguishes between an unclassified retirement and a driver classified after completing enough distance.

**Question:** Should only classified finishers score points, with a minimum-distance rule determining whether a retired driver is classified?

**Recommendation:** Award points only to classified finishers. A driver who retires after completing the regulation’s minimum distance may remain classified and receive the corresponding finishing-position points; unclassified DNFs receive no points and starting a race alone never awards points.

### D-029 — Classified-finisher eligibility

**Decision:** Only classified finishers can score race points. A retired driver may still be classified if they complete the active regulation’s minimum race distance; an unclassified DNF receives no points, and a race start alone has no scoring value.

**Rationale:** This preserves the distinction between completing enough of an event to be classified and retiring too early to earn a result.

**Consequence:** Race regulations must expose a classification-distance threshold, and race results must retain completed distance for every entry.

## Current question

### Q-028 — Classification-distance threshold

The game needs a clear threshold for deciding whether a retired driver is classified. A single threshold is easier to understand, while regulation-defined thresholds allow different tiers or future sporting rules to vary.

**Question:** What should the launch classification threshold be: 75%, 90%, or another regulation-defined percentage of the winner’s race distance?

**Recommendation:** Use 90% of the winner’s completed distance at launch, stored as regulation data so a tier or future rule change can adjust it. This makes a classified finish meaningful while still allowing late-race failures to count when the driver completed nearly the full event.

### D-030 — Ninety-percent classification threshold

**Decision:** A retired driver is classified when they complete at least 90% of the winner’s completed race distance. The threshold is stored in the active regulations and may change by tier or future rule change.

**Rationale:** Completing nearly the full event is sufficient to preserve a meaningful result, while early retirements remain unclassified.

**Consequence:** The result model must distinguish scheduled distance, winner distance, entry distance, classification status, and points eligibility.

## Current question

### Q-029 — Shortened and red-flagged races

Races can finish early because of weather, red flags, safety concerns, or a time limit. Awarding full points regardless of distance makes a shortened result as valuable as a normal race, while awarding nothing can erase meaningful competition.

**Question:** Should shortened races use regulation-defined completion bands that determine whether full, partial, or no points are awarded?

**Recommendation:** Use regulation-defined completion bands. Start with full points for a substantially completed race, partial points for a meaningful but shortened race, and no points when too little racing has occurred. Keep the bands in championship regulations so each tier can mirror its sporting model and future rules can change them.

### D-031 — Regulation-controlled shortened-race scoring

**Decision:** Shortened or red-flagged races use completion bands from the active championship regulations. Those bands determine whether the result awards full points, partial points, or no points.

**Rationale:** A shortened event should retain some sporting value when meaningful racing occurred without making a severely curtailed result equal to a full race.

**Consequence:** The points contract must use scheduled distance and completed distance to select the active scoring band before applying finishing-position points.

## Current question

### Q-030 — Launch completion bands

The regulation-controlled model still needs concrete launch behavior. A single partial band is simple, but graduated reductions better reflect how much of the scheduled race was completed.

**Question:** Should the launch rules use graduated points bands: 75% or more for full points, 50–74% for 75% points, 25–49% for 50% points, 2–24% for 25% points, and below 2% for no points?

**Recommendation:** Use the graduated bands above. They make the value of a shortened race proportional to the amount of competition completed, while keeping every threshold explicit and editable through regulations.

### D-032 — Binary full-or-half shortened-race scoring

**Decision:** Replace the graduated points bands with a binary model. A sufficiently completed race awards full points; an officially classified but shortened race awards half points. A cancelled event or an event that produces no official classification awards no points.

**Rationale:** Full-or-half scoring is easier for players to understand and keeps shortened-race outcomes consequential without overloading the sporting rules with thresholds.

**Consequence:** The active regulations need only define the completion threshold for full points and the minimum conditions for an official classification.

## Current question

### Q-031 — Full-points threshold

The simplified model needs one launch threshold. A 75% threshold makes a substantially completed race worth full points, while shorter but officially classified races receive half points.

**Question:** Should races reaching at least 75% of their scheduled distance award full points, with shorter officially classified races awarding half points?

**Recommendation:** Use 75% as the launch threshold. Keep the threshold in regulation data so future sporting rules can change it.

### D-033 — Seventy-five-percent full-points threshold

**Decision:** A race reaching at least 75% of its scheduled distance awards full points. A shorter race that is officially classified awards half points. An event without an official classification awards no points.

**Rationale:** The binary model stays easy to understand while recognizing the difference between a substantially completed race and a shortened result.

**Consequence:** The active regulations need a full-points distance threshold and an official-classification rule, while the points engine applies only full, half, or zero scoring outcomes.

## Current question

### Q-032 — Calendar visibility and sprint scheduling

Sprint weekends affect practice preparation, setup development, resource allocation, and financial planning. Keeping the calendar hidden would add uncertainty, but it would also make deliberate season strategy difficult and reduce the value of long-term preparation.

**Question:** Should the complete season calendar, including sprint weekends, be known when the season begins?

**Recommendation:** Generate and reveal the complete calendar at season start. Regulations should determine the number of rounds, weekend formats, sprint venues, and session order; exceptional calendar disruptions can still occur as rare events.

### D-034 — Full calendar revealed at season start

**Decision:** The complete season calendar is generated and revealed when the season begins. Active regulations determine the number of rounds, weekend formats, sprint venues, and session order. Rare events may disrupt the published schedule.

**Rationale:** Advance visibility makes long-term preparation, resource allocation, setup development, and financial planning meaningful.

**Consequence:** The calendar is a season-level contract generated before the first round, with any disruption represented as an explicit event rather than hidden schedule mutation.

## Current question

### Q-033 — Manager attribute structure

The manager can be represented by a single reputation value, or by explicit skills that shape different parts of team management. A small attribute set creates meaningful identity and progression, but too many stats can turn the manager into another spreadsheet instead of the decision-maker.

**Question:** Should the manager have a small set of explicit core attributes, or should manager progression rely mostly on one general reputation value?

**Recommendation:** Use a small set of explicit core attributes—technical leadership, people leadership, race operations, scouting, and commercial management—plus a separate reputation value derived from results and decisions. Keep the player’s race agency in their choices rather than converting every action into an attribute check.

### D-035 — Five core manager attributes plus reputation

**Decision:** The manager has five explicit core attributes: technical leadership, people leadership, race operations, scouting, and commercial management. Reputation is tracked separately and is derived from results and important decisions.

**Rationale:** A compact attribute set gives the manager a clear identity and progression path without turning every decision into a hidden stat check.

**Consequence:** Systems must identify which attribute, if any, improves an outcome and must keep reputation effects distinct from direct skill effects.

## Current question

### Q-034 — Manager attribute progression

Attributes can grow from repeated relevant work, deliberate training, mentors, career milestones, or a combination. Pure passive leveling can make choices feel interchangeable, while purely action-based growth can force players into repetitive behavior instead of letting them shape a development plan.

**Question:** How should manager attributes improve during a career: through repeated actions, deliberate development choices, career milestones, or a hybrid of these?

**Recommendation:** Use a hybrid system. Relevant actions provide gradual, diminishing improvement; deliberate development choices and mentors provide focused growth; career milestones unlock caps, specializations, or new opportunities rather than simply granting large stat increases.

### D-036 — Hybrid manager attribute progression

**Decision:** Manager attributes improve through a hybrid system. Relevant actions provide gradual, diminishing improvement; deliberate development choices and mentors provide focused growth; career milestones unlock caps, specializations, or opportunities rather than simply granting large stat increases.

**Rationale:** Progression should respond to the player’s behavior while still giving them intentional control over their development path.

**Consequence:** The game needs activity-based growth signals, focused development options, mentor effects, and milestone unlocks with separate rules for each.

## Current question

### Q-035 — Manager starting profile

The manager needs an initial identity before career progression begins. Fixed backgrounds are readable and thematic, free point allocation offers control but encourages min-maxing, and a hybrid can provide both a strong starting story and limited customization.

**Question:** Should a new manager choose a background, freely distribute starting points, or use a hybrid of both?

**Recommendation:** Use a hybrid. A chosen background defines the manager’s initial strengths, weakness, and one contextual advantage; the player then receives a small number of points for personal customization. Keep the starting spread modest so the career is shaped by decisions rather than solved at creation.

### D-037 — Background plus limited starting customization

**Decision:** A new manager chooses a background that defines initial strengths, a weakness, and one contextual advantage, then receives a small number of points for personal customization. Starting differences remain modest.

**Rationale:** Backgrounds provide identity and narrative context while limited customization prevents character creation from solving the career before play begins.

**Consequence:** Starting backgrounds need explicit mechanical effects, and the creation contract must enforce a controlled starting power budget.

## Current question

### Q-036 — Directness of manager attribute effects

Manager attributes can act as hidden pass/fail gates, broad probability modifiers, or visible bounded modifiers to the quality and speed of relevant work. Hard gates make attributes feel powerful but can make player decisions irrelevant; purely hidden probabilities make progression difficult to understand.

**Question:** How directly should manager attributes affect outcomes?

**Recommendation:** Use visible, bounded modifiers to quality, speed, information, morale, and negotiation outcomes. Reserve hard thresholds for special opportunities or advanced actions, and never let an attribute replace the player’s core decision.

### D-038 — Visible bounded manager modifiers

**Decision:** Manager attributes provide visible, bounded modifiers to relevant quality, speed, information, morale, and negotiation outcomes. Hard thresholds are reserved for special opportunities or advanced actions, and attributes never replace the player’s core decision.

**Rationale:** Players can understand why an outcome changed and can still win through better planning even when an attribute is weak.

**Consequence:** Attribute effects must be exposed through readable feedback and must not become hidden pass/fail gates for ordinary management actions.

## Current question

### Q-037 — Driver attribute structure

Drivers can be represented by one overall rating, but that hides the differences that matter in a management simulation. Separate attributes can distinguish qualifying speed, race pace, consistency, tyre management, racecraft, feedback, and adaptability, while an overall value can still summarize a driver for scouting or AI use.

**Question:** Should drivers use a small set of explicit attributes, or should the game primarily use one overall driver rating?

**Recommendation:** Use explicit driver attributes—qualifying pace, race pace, consistency, tyre management, racecraft, feedback, and adaptability. Derive an overall rating only as a convenience for scouting and AI; never use it as the authoritative simulation value.

### D-039 — Four categories of four driver attributes

**Decision:** Drivers use 16 explicit attributes organized into four categories of four. Overall rating is derived for convenience only and is never authoritative in the simulation.

**Rationale:** Grouped attributes make driver identity and scouting easier to read while preserving the specialization and tradeoffs that a management game needs. This follows the useful structure of grouped attribute systems such as NHL 26, where the overall rating does not fully define the best player for every strategy. [EA NHL 26 attribute guide](https://help.ea.com/en/articles/nhl/nhl-26/nhl-attributes-guide/)

**Consequence:** Every driver attribute must belong to exactly one category, have a distinct simulation purpose, and contribute to readable category summaries without collapsing into a single authoritative score.

## Current question

### Q-038 — Driver attribute categories

The 16 attributes need categories that separate what the driver can do with the car, how they race around other cars, how well they support engineering, and how reliably they perform under pressure and over a race distance.

**Question:** Should the launch categories be Speed, Racecraft, Technical, and Composure & Conditioning?

**Recommendation:** Use these four categories with four attributes each:

- **Speed:** qualifying pace, race pace, wet-weather pace, low-fuel pace
- **Racecraft:** overtaking, defending, starts, traffic management
- **Technical:** setup feedback, tyre management, development feedback, adaptability
- **Composure & Conditioning:** consistency, concentration, pressure handling, stamina and recovery

### D-040 — Compact one-word driver labels

**Decision:** Driver categories and attributes should use one-word labels wherever the meaning remains clear. The grouped structure remains four categories with four attributes each.

**Rationale:** Compact labels make scouting, dashboards, and comparison screens easier to scan without removing depth from the underlying model.

**Consequence:** Names should be concise and consistent, with detailed descriptions providing the exact mechanical meaning where a short label is ambiguous.

## Current question

### Q-039 — One-word driver attribute vocabulary

The category names can be condensed to Pace, Racecraft, Technical, and Resilience. The attributes can also use compact labels while preserving their intended effects.

**Question:** Should the launch vocabulary use these one-word category and attribute labels?

**Recommendation:** Use:

- **Pace:** Qualifying, Race, Wet, Fuel
- **Racecraft:** Overtaking, Defending, Starts, Traffic
- **Technical:** Feedback, Tyres, Development, Adaptability
- **Resilience:** Consistency, Focus, Composure, Stamina

### D-041 — Clear attribute labels over forced brevity

**Decision:** Keep category names to one word where possible, but allow attribute names to use a second word when it makes their meaning clearer. Attribute descriptions remain authoritative when a label is still ambiguous.

**Rationale:** Compact labels improve readability, but forced one-word names such as “Fuel” or “Feedback” can hide the actual driver capability being measured.

**Consequence:** The final driver vocabulary should favor precise two-word names over unclear shorthand while preserving a compact visual hierarchy.

## Current question

### Q-040 — Final driver attribute labels

The proposed labels can be clarified without changing the four-category structure. This keeps the categories compact while making each stat self-explanatory in scouting and simulation feedback.

**Question:** Should the launch vocabulary use these labels?

**Recommendation:** Use:

- **Pace:** Qualifying Pace, Race Pace, Wet Pace, Low-Fuel Pace
- **Racecraft:** Overtaking, Defending, Race Starts, Traffic Management
- **Technical:** Setup Feedback, Tyre Management, Development Feedback, Adaptability
- **Resilience:** Consistency, Concentration, Pressure Handling, Recovery

### D-042 — Locked driver attribute vocabulary

**Decision:** The launch driver model uses four categories with these locked attributes:

- **Pace:** Qualifying Pace, Race Pace, Wet Pace, Low-Fuel Pace
- **Racecraft:** Overtaking, Defending, Race Starts, Traffic Management
- **Technical:** Setup Feedback, Tyre Management, Development Feedback, Adaptability
- **Resilience:** Consistency, Concentration, Pressure Handling, Recovery

**Rationale:** The vocabulary is compact enough for management screens while remaining clear about what each stat measures.

**Consequence:** Future changes should preserve these meanings or be recorded as an explicit revision to the driver-attribute contract.

## Current question

### Q-041 — Driver attribute visibility

Perfect information would make driver scouting a simple comparison of numbers. Hiding everything would make recruitment feel arbitrary. A management game benefits from estimates that become more reliable through scouting, observation, and working with a driver.

**Question:** Should the player see exact driver attributes, or should attributes be represented by scouting ranges and confidence levels?

**Recommendation:** Use confidence-based scouting. Contracted drivers should have mostly known current attributes, while unsigned and rival drivers are represented by estimated ranges that narrow through scouting, race observation, and shared team knowledge. Potential and development ceilings remain less certain until revealed through progression.

### D-043 — Confidence-based driver scouting

**Decision:** Contracted drivers have mostly known current attributes. Unsigned and rival drivers are represented by estimated ranges with confidence levels that improve through scouting, race observation, and shared team knowledge. Potential and development ceilings remain less certain until revealed through progression.

**Rationale:** Recruitment becomes an information-management decision instead of a spreadsheet comparison, while the player still gains reliable knowledge by investing time and resources.

**Consequence:** Driver records need separate truth values, player estimates, confidence, scouting evidence, and potential uncertainty.

## Current question

### Q-042 — Driver potential structure

Future development can use one overall potential value, separate potential ceilings for each attribute, or a mixture of both. A single potential number is easy to read but can hide unusual specialists; per-attribute ceilings create more distinctive career arcs but require more information to manage.

**Question:** Should drivers have one overall potential rating, or separate potential ceilings for each attribute?

**Recommendation:** Use separate potential ceilings for each attribute, with development tendencies that make some attributes easier or harder to improve. Derive an overall potential summary only for convenience; never use it as the authoritative development limit.

### D-044 — Attribute-specific driver potential

**Decision:** Each driver attribute has its own potential ceiling and development tendency. Overall potential is only a convenience summary and never the authoritative development limit.

**Rationale:** Attribute-specific ceilings create distinctive specialists and more believable career arcs than a single hidden potential number.

**Consequence:** Driver development must track current value, ceiling, growth rate, recent experience, training effect, and confidence separately for every attribute.

## Current question

### Q-043 — Driver development and aging

Drivers can improve through race experience, targeted training, and engineering collaboration, but age and accumulated fatigue should eventually affect development and performance. A hard age cutoff would create artificial career cliffs; ignoring age would remove an important roster and contract decision.

**Question:** Should driver development use a hybrid of experience, training, and gradual age-related decline?

**Recommendation:** Use a hybrid model. Experience and focused training drive improvement toward each attribute’s ceiling; age changes the rate and direction of development gradually, with physical and resilience attributes more vulnerable to decline than technical understanding or racecraft.

### D-045 — Category-specific HQ development buildings

**Decision:** The HQ has one development building for each driver category: Pace, Racecraft, Technical, and Resilience. Building levels provide modest, increasing bonuses to development speed for the matching category. Buildings accelerate progress toward existing ceilings but do not directly increase attributes or potential.

**Rationale:** Facilities create a long-term investment choice and reinforce team identity without making upgrades an automatic substitute for good drivers, training plans, or race experience.

**Consequence:** Each building needs level costs, build time, maintenance, and a bounded development-speed modifier with diminishing or deliberately modest returns.

## Current question

### Q-044 — HQ building scope

Category buildings could apply their development bonus automatically to every driver, or the player could assign drivers to individual facilities. Assignments create more control but also add repetitive micromanagement, especially with two cars and changing driver rosters.

**Question:** Should each category building provide a team-wide bonus, or should drivers be assigned to a specific building to benefit?

**Recommendation:** Make the building bonus team-wide for the matching category. Keep individual agency in training plans, staff allocation, and development focus rather than requiring players to move drivers between buildings.

### D-046 — Team-wide category facility bonuses

**Decision:** Each category building provides its development-speed bonus to all team drivers training or gaining experience in that category. Drivers are not assigned to individual buildings.

**Rationale:** The facility represents shared team capability, while training plans and staff allocation preserve player agency without repetitive assignment management.

**Consequence:** Facility effects must be applied through the category development pipeline and must remain separate from driver potential ceilings and direct attribute values.

## Current question

### Q-045 — HQ building upgrade curve

Building levels can provide equal bonuses at equal costs, or use modest diminishing returns with escalating construction cost, build time, and maintenance. The second approach keeps upgrades valuable without allowing a fully upgraded HQ to erase driver or staff differences.

**Question:** Should HQ buildings use diminishing development-speed returns with escalating upgrade costs and time?

**Recommendation:** Use a small number of upgrade levels with diminishing returns and escalating costs, construction time, and maintenance. Each level should feel useful, but facility investment should never dominate driver quality, staff skill, or player planning.

### D-047 — Five-level modest HQ bonus curve

**Decision:** Each category building has five upgrade levels that provide the following team-wide development-speed bonuses for the matching category: Level 1 +3%, Level 2 +6%, Level 3 +8%, Level 4 +10%, and Level 5 +12%. The bonus accelerates progress toward existing attribute ceilings but does not increase ceilings or directly raise attributes.

**Rationale:** The curve makes every level useful while limiting the maximum facility advantage to a modest improvement. At Level 5, development time is reduced by roughly 11% rather than the full 12% speed value.

**Consequence:** The four buildings can share one predictable bonus model, while their costs, build times, and maintenance still need to be defined.

## Current question

### Q-046 — HQ upgrade economy

The four category buildings can share the same construction and maintenance curve, or each can have unique costs and prerequisites. Shared costs make the strategic choice about which category to prioritize; unique costs could make one building objectively easier or harder to develop and add balance work without adding much decision value.

**Question:** Should all four HQ buildings use the same upgrade cost, build-time, and maintenance framework?

**Recommendation:** Use one shared upgrade framework for all four buildings. Let the player’s category priority—not arbitrary price differences—determine which facility is developed first, with future regulation or scenario rules able to add special prerequisites later.

### D-048 — Shared HQ upgrade economy

**Decision:** All four category buildings use the same upgrade cost, construction-time, and maintenance framework. Category priority determines investment order rather than arbitrary differences between buildings.

**Rationale:** A shared economy makes facility choices easier to compare and keeps balance work focused on the value of each category rather than hidden economic advantages.

**Consequence:** Any building-specific differences should come from its category effect or explicit scenario rules, not from an unrelated cost curve.

## Current question

### Q-047 — HQ expansion and building access

The player could upgrade all four buildings independently from the beginning, or higher levels could require overall HQ expansion. Hard building slots create permanent opportunity costs, while no HQ gating may make the facility system feel disconnected from long-term team growth.

**Question:** Should HQ expansion gate higher building levels, or should every building level be available independently from the start?

**Recommendation:** Make all four building tracks available at Level 1, then use HQ expansion to unlock higher levels—especially the final two levels. Do not use permanent building slots; the player’s opportunity cost should be money, time, and construction capacity.

### D-049 — HQ expansion gates advanced facility levels

**Decision:** All four category buildings are available at Level 1. HQ expansion unlocks higher building levels, especially the final two, without imposing permanent building slots. Facility investment competes for money, time, and construction capacity.

**Rationale:** The HQ remains a long-term progression system without forcing the player to permanently sacrifice an attribute category.

**Consequence:** HQ expansion is a prerequisite system separate from the four category building tracks and must expose which building levels each expansion supports.

## Current question

### Q-048 — HQ construction queue

Construction can happen through one shared queue, or several projects can run in parallel when the HQ has enough construction capacity. A single queue creates clear opportunity cost and is easier to balance; parallel projects reduce waiting but can weaken facility prioritization.

**Question:** Should the HQ allow one active construction project at a time, or multiple parallel projects based on construction capacity?

**Recommendation:** Use one shared construction queue at launch. Later HQ expansion can unlock a second queue or contractor capacity, but parallel construction should remain an expensive strategic upgrade rather than a default convenience.

### D-050 — Single HQ construction queue

**Decision:** The HQ has one shared construction queue at launch. Later HQ expansion may unlock a second queue or contractor capacity, but parallel construction remains an expensive strategic upgrade.

**Rationale:** A single queue creates a clear facility-prioritization decision and keeps the initial economy understandable.

**Consequence:** Every building and expansion project must reserve the shared queue, show its completion date, and compete with other long-term HQ investments.

## Current question

### Q-049 — Construction during race weekends

Race weekend uses a dedicated multi-phase mode that pauses normal daily decisions, but construction projects can last longer than a weekend. Pausing every project would make the calendar feel inconsistent; allowing the player to start new projects during the weekend would undermine the separate race-weekend focus.

**Question:** Should active HQ construction continue in the background while a race weekend is in progress?

**Recommendation:** Let active construction continue against elapsed calendar time, but prevent starting or reprioritizing HQ projects during the race weekend. Apply completed projects when the weekend returns control to the normal calendar.

### D-051 — Background HQ construction during race weekends

**Decision:** Active HQ construction continues against elapsed calendar time during race weekends. The player cannot start or reprioritize HQ projects during the weekend, and completed projects are applied when normal-calendar control resumes.

**Rationale:** Long-term work should respect calendar time without pulling the player out of the dedicated race-weekend experience for ordinary construction management.

**Consequence:** The simulation must track project completion during race-weekend mode while deferring player-facing project actions until the normal calendar returns.

## Current question

### Q-050 — HQ maintenance and underfunding

Facilities should create an ongoing operating cost so higher levels remain a commitment rather than a one-time purchase. If the team cannot pay maintenance, the game can reduce the bonus, suspend the facility, or destroy progress; harsh consequences create risk but can feel punitive and difficult to recover from.

**Question:** Should HQ buildings have recurring maintenance costs, with underfunding temporarily reducing or suspending their bonus rather than destroying the building?

**Recommendation:** Add recurring maintenance costs that scale modestly with building level. If maintenance cannot be paid, reduce the affected bonus first and suspend it only after continued underfunding; never destroy building levels automatically.

### D-052 — Recoverable HQ maintenance failure

**Decision:** HQ buildings have recurring maintenance costs that scale modestly with level. Missed maintenance reduces the affected bonus first, and continued underfunding can suspend the bonus, but building levels are never automatically destroyed.

**Rationale:** Facilities remain meaningful financial commitments without creating irreversible punishment that can trap a struggling team in a downward spiral.

**Consequence:** The economy must track facility operating status separately from ownership and upgrade level, allowing the player to recover benefits after restoring maintenance funding.

## Current question

### Q-051 — Driver training focus

Training can target one of the 16 attributes directly, train an entire category, or use a mixed plan. Direct targeting offers precision but can become repetitive micromanagement; category training is easier to manage but may reduce the player’s ability to shape specialists.

**Question:** Should driver training target individual attributes, entire categories, or a hybrid of both?

**Recommendation:** Use a hybrid. The player chooses a primary category, then selects one primary attribute and an optional secondary attribute within it. Category training creates the shared development context, while attribute priorities shape where progress is distributed.

### D-053 — Category-first, attribute-focused driver training

**Decision:** A driver training plan selects a primary category, one primary attribute within that category, and an optional secondary attribute that receives reduced progress. HQ bonuses apply to the selected category.

**Rationale:** This gives the player strategic focus without requiring 16 separate training queues, while still allowing drivers to become distinctive specialists.

**Consequence:** Training plans must distribute progress between primary and secondary attributes and must respect each driver’s potential ceiling and development tendency.

## Current question

### Q-052 — Training duration and fatigue

Driver training can be an instant allocation, a daily activity, or a multi-day program that competes with recovery and other team work. Longer programs create meaningful planning, but training should not become a free source of progress that ignores driver fatigue and availability.

**Question:** Should driver training use scheduled multi-day programs that consume time and create a manageable fatigue tradeoff?

**Recommendation:** Use scheduled multi-day programs. Training consumes driver and staff capacity, produces gradual progress, and adds manageable fatigue that must be balanced against recovery, simulator work, and upcoming race weekends. The player can interrupt a program, but loses some efficiency or invested time.

### D-054 — Scheduled multi-day driver training

**Decision:** Driver training uses multi-day programs that consume driver and staff capacity, provide gradual progress, and create manageable fatigue. Interrupting a program loses some efficiency or invested time.

**Rationale:** Training becomes a real calendar and resource decision instead of a free instant upgrade.

**Consequence:** Training must integrate with daily scheduling, staff availability, HQ category bonuses, fatigue, recovery, and race-weekend preparation.

## Current question

### Q-053 — Training concurrency

The team has two drivers and may want both developing at the same time. Allowing every program to run in parallel removes resource scarcity, while forcing all training through one queue creates unnecessary waiting for routine work.

**Question:** Should both drivers be able to train simultaneously, with advanced programs competing for shared staff or simulator capacity?

**Recommendation:** Allow both drivers to train simultaneously for ordinary programs. Specialized coaching, simulator time, and high-value development work should use shared capacity and serialize when they compete, preserving the player’s need to prioritize scarce resources.

### D-055 — Parallel routine training with shared specialist capacity

**Decision:** Both drivers can run ordinary training programs simultaneously. Specialized coaching, simulator time, and high-value development work consume shared capacity and serialize when they compete.

**Rationale:** Routine development remains practical for a two-car team while scarce expert resources retain strategic value.

**Consequence:** Training programs need resource requirements and priority handling so the player can see why a program is progressing, delayed, or waiting for capacity.

## Current question

### Q-054 — Training during race weekends

Race weekends already consume driver attention, staff capacity, and the dedicated team schedule. Continuing ordinary training during those sessions would imply that drivers can develop while fully occupied with practice, qualifying, and racing; pausing it entirely would make the weekend a meaningful interruption to long-term programs.

**Question:** Should scheduled driver training pause during race weekends and resume afterward, with race participation providing its own experience-based development?

**Recommendation:** Pause scheduled training when a driver enters race-weekend mode. Resume the program after the weekend, while practice, qualifying, and races provide separate experience and feedback development.

### D-056 — Race weekends pause scheduled training

**Decision:** Scheduled driver training pauses during race-weekend mode and resumes afterward. Practice, qualifying, and race participation provide separate experience and feedback development during the weekend.

**Rationale:** The race weekend remains a distinct high-demand activity while still contributing to long-term driver growth through experience and engineering feedback.

**Consequence:** The driver development system must distinguish training progress from race-weekend experience and prevent both from being applied as the same activity.

## Current question

### Q-055 — Fatigue effects on development and performance

Fatigue can be cosmetic, reduce training efficiency, affect race performance, or block activities entirely. Hard blocks make fatigue easy to understand but can feel punitive; ignoring fatigue removes the tradeoff from scheduling demanding programs before a race weekend.

**Question:** Should fatigue provide soft penalties to training progress and race performance, rather than preventing ordinary activities outright?

**Recommendation:** Use soft penalties. Fatigue gradually reduces training effectiveness, concentration, consistency, and recovery quality, while avoiding hard blocks except for severe injury or medical unavailability. The Recovery attribute and deliberate rest should mitigate the penalties.

### D-057 — Soft fatigue penalties

**Decision:** Fatigue provides soft penalties to training effectiveness, concentration, consistency, and recovery quality. Ordinary activities remain available, while severe injury or medical unavailability can block participation. The Recovery attribute and deliberate rest mitigate fatigue effects.

**Rationale:** Fatigue creates meaningful scheduling tradeoffs without turning normal development or race preparation into a series of arbitrary hard locks.

**Consequence:** Fatigue effects must be visible, gradual, and recoverable, with clear separation between normal fatigue and medical unavailability.

## Current question

### Q-056 — Recovery scheduling

Recovery can happen automatically whenever a driver is not training, or the player can schedule deliberate recovery programs that compete with development time. Automatic recovery is simple but passive; scheduled recovery creates agency before demanding weekends.

**Question:** Should recovery be automatic, scheduled, or a hybrid of both?

**Recommendation:** Use a hybrid. Drivers recover slowly through ordinary rest, while deliberate recovery plans accelerate recovery and improve readiness at the cost of training time. The player should be able to schedule recovery before important race weekends without micromanaging every rest day.

### D-058 — Hybrid driver recovery

**Decision:** Drivers recover slowly through ordinary rest, while deliberate recovery plans accelerate recovery and improve readiness at the cost of training time. Players can schedule recovery before important race weekends.

**Rationale:** Recovery is a meaningful preparation choice without requiring the player to micromanage every normal rest day.

**Consequence:** The calendar must distinguish passive recovery, deliberate recovery programs, and race-weekend readiness when calculating fatigue and availability.

## Current question

### Q-057 — Injury relationship to fatigue

Injuries can be fully separate race incidents, an automatic consequence of high fatigue, or a risk influenced by both fatigue and demanding events. Automatic injury from fatigue can feel punitive, while ignoring fatigue removes a reason to protect driver workload.

**Question:** Should injury be a separate event whose probability is influenced by fatigue, workload, and race incidents, rather than an automatic result of reaching a fatigue threshold?

**Recommendation:** Use a separate injury event with contributing risk factors. Fatigue, intense training, accumulated workload, and race incidents increase risk, but fatigue alone should not guarantee an injury. Injury severity determines recovery time and medical availability.

### D-059 — Risk-based injury events

**Decision:** Injuries occur as separate events whose probability is influenced by fatigue, intense training, accumulated workload, and race incidents. Fatigue alone does not guarantee an injury, and injury severity determines recovery time and medical availability.

**Rationale:** The system makes workload management consequential without making fatigue a deterministic punishment mechanic.

**Consequence:** Injury records need cause, severity, recovery estimate, medical status, and risk of aggravation or reinjury.

## Current question

### Q-058 — Compromised driver availability

An injured driver can be fully fit, unavailable, or medically cleared but compromised. Allowing compromised participation creates difficult team-selection decisions, while requiring full recovery removes that agency and can make injuries feel like simple absence timers.

**Question:** Should medically cleared but compromised drivers be allowed to race with visible performance and reinjury risks?

**Recommendation:** Use three availability states: fit, compromised, and unavailable. A compromised driver may race with visible performance, fatigue, and reinjury penalties; an unavailable driver cannot participate and requires a replacement.

### D-060 — Graded driver availability

**Decision:** Drivers have three availability states: fit, compromised, and unavailable. Compromised drivers may race with visible performance, fatigue, and reinjury penalties; unavailable drivers cannot participate and require a replacement.

**Rationale:** The player can make informed risk-versus-continuity decisions without treating every injury as an automatic absence.

**Consequence:** Race entry validation must check medical status, show the consequences of compromised participation, and support replacement selection for unavailable drivers.

## Current question

### Q-059 — Replacement-driver pipeline

When a driver is unavailable, the team can use a contracted reserve, promote an academy driver, or sign an available driver from the market. Requiring a reserve creates roster cost and planning, while relying only on emergency signings can make injuries feel arbitrary and reduce the value of development programs.

**Question:** Should every team maintain a primary reserve-driver option, with academy or market alternatives when the reserve is unavailable?

**Recommendation:** Give every team one primary reserve-driver option. The reserve can be a contracted specialist or an academy driver, while the market provides emergency alternatives at greater cost or lower reliability. The reserve slot should be a meaningful roster and budget decision.

### D-061 — Primary reserve-driver option

**Decision:** Every team has one primary reserve-driver option. The reserve may be a contracted specialist or academy driver, with emergency market alternatives available at greater cost or lower reliability. The reserve slot is a meaningful roster and budget decision.

**Rationale:** The player can prepare for injuries and unavailable drivers through planning instead of relying entirely on random emergency outcomes.

**Consequence:** The roster model must support reserve contracts, academy promotions, emergency signings, eligibility checks, and team-budget consequences.

## Current question

### Q-060 — Reserve-driver readiness

A reserve who never participates may lose race sharpness, while automatic full readiness removes the value of practice and preparation. The player could schedule simulator work, practice appearances, or test programs to keep the reserve ready, but those activities consume shared resources.

**Question:** Should reserve drivers require active readiness programs, or should they remain fully race-ready automatically while under contract?

**Recommendation:** Use active readiness programs. Reserves retain a baseline of readiness but improve through simulator work, practice appearances, and test programs that consume time and shared resources. This gives the player a reason to invest in the reserve without making the role mandatory to micromanage every day.

### D-062 — Active reserve-driver readiness

**Decision:** Reserve drivers retain baseline readiness but improve through simulator work, practice appearances, and test programs that consume time and shared resources. They do not require daily micromanagement.

**Rationale:** The reserve role remains useful and developable without becoming a passive guaranteed solution or a constant administrative burden.

**Consequence:** Reserve readiness needs a baseline, a decay or maintenance model, and supported activities that improve readiness and potentially driver development.

## Current question

### Q-061 — Driver roles and expectations

Driver contracts can contain explicit roles such as lead driver, second driver, and reserve. Roles could influence resource priority, media expectations, morale, and negotiation demands, or the team could treat every contracted driver identically and let performance determine status informally.

**Question:** Should driver roles be explicit contract and management commitments?

**Recommendation:** Use explicit roles: lead, second, and reserve. Roles set expectations and influence morale, priority decisions, and negotiations, but should not create permanent team orders or prevent the player from changing the competitive order through performance.

### D-063 — Four driver roles

**Decision:** Driver roles are explicit contract and management commitments: lead, equal, second, and reserve. Roles influence expectations, morale, priority decisions, and negotiations, but do not permanently determine competitive order.

**Rationale:** Equal status represents a meaningful alternative to a lead/second hierarchy and supports teams that want two drivers competing on comparable terms.

**Consequence:** Contracts and team operations must distinguish equal status from a hierarchy while still allowing performance and player decisions to change race-by-race priorities.

## Current question

### Q-062 — Equal-status parity

Equal status could promise identical resources and strategy priority, or it could simply mean that neither driver has a contractual advantage. Identical outcomes are impossible when drivers have different needs, performance, and feedback, but an empty promise would make the role feel cosmetic.

**Question:** Should Equal status guarantee parity of opportunity while allowing performance and race circumstances to determine individual decisions?

**Recommendation:** Guarantee parity of opportunity, not identical outcomes. Equal drivers receive comparable equipment, development access, and strategic consideration, while performance, data, and race circumstances can justify different operational choices.

### D-064 — Equal status means parity of opportunity

**Decision:** Equal-status drivers receive comparable equipment, development access, and strategic consideration. Performance, data, and race circumstances may still justify different operational choices.

**Rationale:** Equal status is a real management commitment without requiring the player to ignore evidence or make identical decisions in unequal situations.

**Consequence:** The team must distinguish contractual parity from temporary race-by-race priorities and communicate when a decision departs from equal treatment.

## Current question

### Q-063 — Changing driver roles

Driver roles are contract and management commitments, so changing a driver from equal to second or lead should affect expectations and trust. However, temporary race priorities should not require a full contract change every weekend.

**Question:** Should permanent role changes require renegotiation or explicit driver agreement, with morale and trust consequences if imposed?

**Recommendation:** Treat permanent role changes as contract events. Negotiate them when possible; imposing a change creates morale and trust costs, while temporary race-by-race priorities remain operational decisions that do not automatically change the contract role.

### D-065 — Role changes are contract events

**Decision:** Permanent driver-role changes are contract events. They should be negotiated when possible; imposed changes create morale and trust costs. Temporary race-by-race priorities remain operational decisions and do not automatically change the contract role.

**Rationale:** The player can manage team hierarchy deliberately without turning every strategic choice into a contract renegotiation.

**Consequence:** Driver contracts need role terms, trust impact, negotiation handling, and a separate mechanism for temporary operational priorities.

## Current question

### Q-064 — Car attribute structure

Cars can use one overall performance rating, the same four-by-four structure as drivers, or explicit component categories that map directly to design and R&D work. A component model makes upgrades legible and lets two cars share a baseline while diverging through setup, parts, and reliability state.

**Question:** Should car performance use explicit component attributes rather than one overall car rating?

**Recommendation:** Use explicit component attributes organized into four categories: Aero, Chassis, Powertrain, and Reliability. Derive overall summaries only for scouting, AI, and comparison; R&D and simulation should use the underlying attributes.

### D-066 — Granular car attributes under four category power levels

**Decision:** Each car has four visible category power levels: Aero, Chassis, Powertrain, and Reliability. Each category contains three to five granular sub-items. Upgrades and new designs improve those sub-items, which in turn update the category power level. The granular values remain authoritative for R&D and simulation; category levels summarize them for strategic comparison.

**Rationale:** The player can understand the car at a glance while still having meaningful design decisions such as improving the front wing, rear wing, or sidepods instead of raising an abstract Aero stat.

**Consequence:** Category power must be derived from sub-items without rewarding a category merely for having more sub-items, and each sub-item needs clear links to performance, reliability, or development work.

## Current question

### Q-065 — Category power calculation

Because the four categories can contain different numbers of sub-items, a simple sum would make a category with more sub-items appear stronger by construction. A normalized weighted average keeps category levels comparable while allowing important sub-items to matter more for a specific tier or design philosophy.

**Question:** Should each category power level be a normalized weighted average of its sub-items rather than a raw sum?

**Recommendation:** Use a normalized weighted average on a common scale, with optional small synergy effects for balanced sub-items. This keeps category power comparable and prevents adding more sub-items from creating free power.

### Proposed launch sub-items

- **Aero:** Front Wing, Rear Wing, Sidepods, Floor, Diffuser
- **Chassis:** Monocoque, Suspension, Weight, Brakes, Steering
- **Powertrain:** Engine, ERS, Gearbox, Deployment, Efficiency
- **Reliability:** Cooling, Hydraulics, Electronics, Durability, Serviceability

### D-067 — Additive car power levels with upgrade tradeoffs

**Decision:** In the Tier 3 example, each of the 20 car sub-items has a maximum value of 100. Each category contains five sub-items and therefore has a maximum power level of 500; the complete car has a maximum power level of 2,000. Category and car power levels are additive sums of their sub-items. Upgrades and new designs can increase some sub-items while reducing others.

**Rationale:** Fixed ceilings make progress legible and give every design decision a visible effect. Tradeoffs prevent upgrades from being a series of unconditional increases and create meaningful design philosophies.

**Consequence:** The car model must track current sub-item values, upgrade deltas, design history, and the resulting category and total power levels. The earlier weighted-average proposal is superseded by this additive model.

## Current question

### Q-066 — Cross-tier power scale

The Tier 3 example establishes a 0–100 scale for each sub-item, 0–500 for each category, and 0–2,000 for a car. The same scale across tiers would make comparisons and scouting readable; different caps could make higher tiers feel more powerful numerically but would complicate progression and obscure whether a car improved or merely changed scale.

**Question:** Should all tiers use the same 0–100 sub-item scale and 500/2,000 category and car maxima?

**Recommendation:** Use the same scale and maxima across all tiers. Differentiate tiers through starting baselines, regulation limits, available design depth, upgrade costs, and competitive context rather than larger numbers.

### D-068 — Tier-scaled car power ceilings

**Decision:** Car power ceilings scale by tier while retaining five sub-items per category and four categories per car:

| Tier | Sub-item maximum | Category maximum | Car maximum |
| --- | ---: | ---: | ---: |
| Tier 3 | 100 | 500 | 2,000 |
| Tier 2 | 150 | 750 | 3,000 |
| Tier 1 | 200 | 1,000 | 4,000 |

Category and car values remain additive sums of their sub-items. Upgrades and new designs can increase some sub-items while reducing others. This supersedes the cross-tier scale recommendation in D-067 while preserving its Tier 3 example and additive model.

**Rationale:** Higher tiers should have more technical headroom and a larger design space without changing the readable four-category, five-sub-item structure.

**Consequence:** R&D, car comparison, and upgrade effects must use the active tier’s sub-item ceiling when calculating values, deltas, and progress.

## Current question

### Q-067 — Tier-scaled upgrade deltas

If the same absolute upgrade value were used in every tier, it would be much more powerful in Tier 3 than Tier 1. For example, +10 points is 10% of a Tier 3 sub-item but only 5% of a Tier 1 sub-item.

**Question:** Should upgrade effects scale proportionally with each tier’s sub-item ceiling rather than using identical absolute point changes across tiers?

**Recommendation:** Use percentage-based upgrade effects and convert them to tier-specific point changes. A 5% upgrade would add 5 points in Tier 3, 7.5 points in Tier 2, and 10 points in Tier 1, keeping equivalent designs similarly meaningful at every tier.

### D-069 — Fixed-point car upgrades with longer higher-tier progression

**Decision:** Car upgrades use fixed absolute point changes rather than percentage-based changes. Tier 3, Tier 2, and Tier 1 retain sub-item ceilings of 100, 150, and 200 respectively, so higher tiers naturally require more design cycles to reach their category and car maxima. Upgrade tradeoffs also use explicit point changes and may raise one sub-item while lowering another.

**Rationale:** Fixed points make every upgrade’s effect concrete and allow higher-tier development to be a longer-term pursuit instead of scaling every upgrade to reach the cap at the same pace.

**Consequence:** R&D must define the size, cost, time, and tradeoff of each upgrade in absolute points, with higher-tier projects requiring more total work to approach maximum values.

## Current question

### Q-068 — Launch upgrade increments

The system needs a consistent size for ordinary and major design changes. Small fixed increments create a long progression path, while large increments make category caps arrive too quickly and reduce the value of successive generations.

**Question:** Should ordinary upgrades provide small fixed gains—such as +3 to +6 points per affected sub-item—with major projects providing larger gains and explicit tradeoffs?

**Recommendation:** Use small fixed gains for ordinary upgrades, roughly +3 to +6 points per affected sub-item. Reserve larger gains for major projects, and pair them with longer development times, higher costs, and meaningful negative deltas where appropriate.

### D-070 — Small fixed car-design increments

**Decision:** Ordinary car upgrades provide small fixed gains, approximately +3 to +6 points per affected sub-item. Major projects can provide larger gains but require longer development, higher costs, and meaningful negative deltas where appropriate.

**Rationale:** Small increments create a long development arc and make successive design generations matter, especially in higher tiers with larger sub-item ceilings.

**Consequence:** R&D projects need explicit point deltas, affected sub-items, costs, durations, and tradeoff definitions.

## Current question

### Q-069 — Predictability of car-design outcomes

The player can be shown exact upgrade results before committing, or the project can produce an estimated result that becomes more reliable through engineering skill, testing, and validation. Exact outcomes are easier to plan around; uncertainty makes research and test resources meaningful.

**Question:** Should car-design projects show exact sub-item changes before completion, or estimated changes with confidence ranges?

**Recommendation:** Show estimated changes with confidence ranges before completion. Engineering skill, prior designs, simulation, and track testing improve confidence, while the completed project reveals the final validated values.

### D-071 — Confidence-based car-design outcomes

**Decision:** Car-design projects show estimated sub-item changes with confidence ranges before completion. Engineering skill, prior designs, simulation, and track testing improve confidence; completed projects reveal the final validated values.

**Rationale:** The player can plan around expected outcomes without making engineering and testing resources irrelevant.

**Consequence:** Design projects need expected values, uncertainty ranges, confidence sources, and final validated results.

## Current question

### Q-070 — Upgrade versus new-design cycles

The team can continuously improve its current car through incremental upgrades, or periodically replace it with a new design that establishes a fresh baseline. Only incremental upgrades are flexible but can make a major regulation change feel like another normal project; only full redesigns can make seasons feel rigid and overly binary.

**Question:** Should the game use a hybrid of continuous incremental upgrades and periodic full-car design cycles?

**Recommendation:** Use a hybrid. Incremental upgrades improve the current car throughout a season, while a new design is created during the off-season or after major regulation changes. The new design inherits validated knowledge but establishes a new baseline with fresh tradeoffs and development uncertainty.

### D-072 — Four-stage development cycle for every upgrade

**Decision:** Every car upgrade and new design passes through the same sequential development cycle: Concept Design, CFD, Wind Tunnel, and Manufacturing. Incremental upgrades and full-car designs both use this pipeline, while the hybrid season/off-season structure remains in place.

**Rationale:** Each part should feel like an engineering project with a visible path from idea to track-ready hardware rather than an instant stat change.

**Consequence:** Every project needs stage-specific duration, resource requirements, output confidence, failure or rework handling, and a manufacturing completion state before it can be installed or tested.

## Current question

### Q-071 — R&D stage sequencing and concurrency

The four stages can be strictly sequential for each project, while multiple projects may occupy different stages at the same time if the team has the required capacity. Allowing projects to skip stages would weaken the meaning of the development cycle; forcing the entire team through one global queue would create unnecessary waiting.

**Question:** Should every project complete all four stages in order, while separate projects can run concurrently when shared capacity allows?

**Recommendation:** Require all four stages in order for every project. Allow separate projects to occupy different stages concurrently when the required CFD, wind-tunnel, engineering, or manufacturing capacity is available; shared resources should serialize only the work that actually conflicts.

### D-073 — Stage-specific R&D capacity

**Decision:** Every project completes Concept Design, CFD, Wind Tunnel, and Manufacturing in order. Separate projects may run concurrently when the relevant stage capacity is available, while conflicting shared resources serialize the affected work.

**Rationale:** This preserves the importance of scarce engineering resources without forcing unrelated projects into one global queue.

**Consequence:** R&D must track capacity independently for concept work, CFD, wind-tunnel testing, and manufacturing, including project priority and queue state.

## Current question

### Q-072 — R&D capacity model

The team can use one generic R&D queue, or each stage can have distinct capacity and facilities. A distinct model makes the wind tunnel, CFD resources, and manufacturing capability meaningful, while a generic queue is easier to manage but hides important infrastructure differences.

**Question:** Should Concept Design, CFD, Wind Tunnel, and Manufacturing each have distinct shared capacity that can be improved through staff and facilities?

**Recommendation:** Give each stage distinct shared capacity. Staff skill and dedicated facilities should improve speed, throughput, and confidence for that stage, while the player decides which projects receive priority when capacity is scarce.

### D-074 — Distinct capacity for each R&D stage

**Decision:** Concept Design, CFD, Wind Tunnel, and Manufacturing each have distinct shared capacity. Staff skill and dedicated facilities improve speed, throughput, and confidence for the relevant stage, and the player prioritizes projects when capacity is scarce.

**Rationale:** The team’s infrastructure becomes a strategic system rather than a single generic research stat or queue.

**Consequence:** R&D facilities and staff must map to specific stages, with capacity reservations and priority handling visible to the player.

## Current question

### Q-073 — R&D rework and failure

Projects can always advance, produce an uncertain final result, or occasionally fail a stage and require rework. Hard failures create drama but can make expensive projects feel unfair; no rework removes the operational consequences of poor confidence and inadequate testing.

**Question:** Should low-confidence projects be able to require rework or produce weaker results, while ordinary projects still make reliable progress?

**Recommendation:** Use soft failure and rework. Ordinary projects always progress, but low-confidence work can reveal weaker-than-expected values, introduce a tradeoff, or require an additional stage pass. Reserve catastrophic failures for rare, clearly signposted events rather than normal project resolution.

### D-075 — Soft R&D failure and rework

**Decision:** Ordinary R&D projects always progress. Low-confidence projects can produce weaker-than-expected values, reveal new tradeoffs, or require an additional stage pass. Catastrophic failures are rare and clearly signposted rather than normal project outcomes.

**Rationale:** Poor preparation has consequences without making the entire R&D system feel like an unpredictable dice roll.

**Consequence:** Project results need confidence-based resolution, rework states, additional resource costs, and clear explanations of what went wrong.

## Current question

### Q-074 — Manufactured parts and car allocation

The design can become a team-wide technology unlock, or Manufacturing can create physical parts that must be produced and allocated to individual cars. A shared unlock is convenient but removes scarcity; physical parts make manufacturing capacity, spares, and the two-car team structure strategically relevant.

**Question:** Should completed Manufacturing projects create physical part units that must be allocated to cars, while the validated design knowledge remains shared by the team?

**Recommendation:** Create physical part units. The validated design becomes shared team knowledge, but each manufactured copy must be allocated to a car, held as a spare, or produced again. This makes manufacturing capacity and upgrade timing matter across both cars.

### D-076 — Physical part units with shared design knowledge

**Decision:** Completed designs become shared team knowledge, while Manufacturing creates physical part units. Each copy is allocated to a car, held as a spare, or produced again. Manufacturing capacity and upgrade timing matter across both cars.

**Rationale:** The team can learn once but must still pay the operational cost of putting the hardware on both cars.

**Consequence:** Inventory must distinguish design versions from manufactured units, installed parts, spare parts, and parts awaiting allocation.

## Current question

### Q-075 — Manufacturing quantity and allocation

The player can manufacture one copy at a time, automatically produce enough copies for both cars, or choose a quantity when a design reaches Manufacturing. Automatic duplication is convenient but removes the decision about prioritizing one car or preserving a spare.

**Question:** Should the player choose the manufacturing quantity when a project reaches the Manufacturing stage, then allocate completed units to cars or spares?

**Recommendation:** Let the player choose the quantity at the start of Manufacturing. Each copy consumes additional materials, time, and capacity; completed units can then be installed on either car, stored as spares, or held for a later event.

### D-077 — Player-controlled manufacturing quantity

**Decision:** The player chooses manufacturing quantity when a design enters Manufacturing. Each copy consumes additional materials, time, and capacity. Completed units can be installed on either car, stored as spares, or held for a later event.

**Rationale:** Production becomes a meaningful two-car resource decision rather than an automatic duplication step.

**Consequence:** Manufacturing orders need quantity, material use, capacity time, completion tracking, inventory destinations, and cancellation or reprioritization rules.

## Current question

### Q-076 — Part installation and swapping

Physical parts should either appear on a car immediately when allocated or require an installation operation. Instant installation removes the operational cost of changing hardware; an installation process makes spare planning and race-weekend timing meaningful.

**Question:** Should installing or swapping a physical part consume garage time and be constrained by available session or between-event time?

**Recommendation:** Require installation and swapping to consume garage time. Outside race weekends it uses normal team capacity; during race weekends it must fit within session-transition time and cannot be performed as an instant mid-session change.

### D-078 — Time-consuming part installation

**Decision:** Installing or swapping a physical part consumes garage time. Outside race weekends it uses normal team capacity; during race weekends it must fit within session-transition time and cannot happen instantly during a session.

**Rationale:** Hardware changes become operational decisions tied to preparation time, spare planning, and race-weekend constraints.

**Consequence:** Car and race-weekend systems must track installation duration, garage capacity, part readiness, and whether a requested change can fit before deployment.

## Current question

### Q-077 — Part condition and wear

Physical parts can remain identical forever after manufacture, or they can accumulate mileage and condition loss. Persistent wear would make Reliability design, spares, maintenance, and replacement planning meaningful, but it adds state to every manufactured unit.

**Question:** Should each physical part track condition and wear across practice, qualifying, and races?

**Recommendation:** Track condition and wear for every physical part. Wear should gradually affect reliability risk and, where appropriate, performance confidence; maintenance can preserve a part, while replacement or retirement restores certainty.

### D-079 — Persistent physical-part condition

**Decision:** Every physical part tracks condition and wear across practice, qualifying, and races. Wear gradually increases reliability risk and can reduce performance confidence; maintenance can preserve a part, while replacement or retirement restores certainty.

**Rationale:** Parts become operational assets with a meaningful lifespan, making Reliability design, spares, and replacement timing matter.

**Consequence:** Part records need mileage or usage, condition, wear effects, maintenance history, installed-car history, and retirement state.

## Current question

### Q-078 — Part refurbishment

Worn parts can be replaced immediately if a spare exists, or refurbished to extend their life. Refurbishment preserves resources but should not make an old part equivalent to a new one or erase the value of manufacturing capacity.

**Question:** Should worn parts be refurbishable at a time and material cost, with refurbishment restoring only part of their condition?

**Recommendation:** Allow refurbishment. It should consume garage or manufacturing capacity, restore a limited amount of condition, and leave a permanent wear history that keeps a new part more reliable than a repeatedly refurbished one.

### D-080 — Partial part refurbishment with permanent wear history

**Decision:** Worn parts can be refurbished at a time and material cost. Refurbishment restores only part of the condition and leaves permanent wear history, so a new part remains more reliable than a repeatedly refurbished one.

**Rationale:** Refurbishment creates a useful short-term option without erasing the long-term value of manufacturing fresh parts.

**Consequence:** Refurbishment must update condition and wear history separately from the part’s design values and must consume the appropriate shared capacity.

## Current question

### Q-079 — Design value versus physical condition

The sub-item value represents what a part was designed to deliver, while physical condition represents how well that individual manufactured unit can currently deliver it. Combining them into one changing value would make R&D progress appear to disappear as parts wear.

**Question:** Should a part retain its designed sub-item values while a separate condition state modifies reliability, confidence, and severe-wear performance?

**Recommendation:** Keep design value and physical condition separate. The design value remains part of the team’s validated car capability; condition affects reliability risk and only produces noticeable performance loss at severe wear.

### D-081 — Separate design capability and physical condition

**Decision:** A part retains its designed sub-item values as a validated engineering capability. The individual unit’s condition modifies reliability risk and confidence, with noticeable performance loss only at severe wear.

**Rationale:** R&D progress remains stable and legible while physical wear creates meaningful operational risk.

**Consequence:** Simulation must apply design values and condition effects as separate inputs rather than permanently lowering the team’s underlying design capability when a unit wears.

## Current question

### Q-080 — Manufacturing variance between copies

Multiple copies of the same validated design can either perform identically or receive small random differences during manufacturing. Copy-to-copy performance variance could add realism, but it could also make manufacturing feel like a lottery and obscure whether an upgrade was actually good.

**Question:** Should copies of the same design have identical designed performance, with manufacturing quality affecting only initial condition and reliability confidence?

**Recommendation:** Keep designed performance identical across copies. Let manufacturing quality affect initial condition, reliability confidence, or rework risk rather than changing the core sub-item values of each copy.

### D-082 — Identical designed performance across copies

**Decision:** Copies of the same validated design have identical designed performance. Manufacturing quality affects initial condition, reliability confidence, and rework risk, but not the core sub-item values.

**Rationale:** Engineering decisions remain the source of performance differences while manufacturing still matters through operational reliability and quality control.

**Consequence:** Parts need separate design identity, manufacturing-quality state, condition, and wear history.

## Current question

### Q-081 — Car sub-item effects

Each granular sub-item can have one narrow effect, or a primary effect plus secondary interactions. Narrow effects are easier to explain but can make parts feel isolated; secondary interactions make the car more coherent but require clear feedback so the player understands why a design changed performance.

**Question:** Should each car sub-item have a primary on-track effect plus limited secondary effects?

**Recommendation:** Give each sub-item one clear primary effect and a small number of explainable secondary effects. Category totals provide broad capability, but the simulation should still respond to track type, weather, tyres, fuel, and setup rather than using the overall car total as a direct performance multiplier.

### D-083 — Primary and secondary car sub-item effects

**Decision:** Each car sub-item has one clear primary on-track effect and a small number of explainable secondary effects. Category totals provide broad capability, while track type, weather, tyres, fuel, and setup determine how capability is expressed.

**Rationale:** Parts feel distinct and understandable without reducing the car to four isolated totals or one overall multiplier.

**Consequence:** R&D feedback and race reports must identify the primary contribution of a sub-item and explain meaningful secondary interactions.

## Current question

### Q-082 — Cross-tier component structure

The same four categories and five sub-items could exist in every tier with different ceilings, or higher tiers could introduce additional sub-items. A shared structure makes progression and scouting readable; additional sub-items could create more technical depth but would require separate balance and UI for every tier.

**Question:** Should all tiers use the same four categories and five sub-items, with tier differences expressed through ceilings, regulations, and development depth?

**Recommendation:** Use the same four categories and five sub-items across all tiers. Let higher tiers gain complexity through larger ceilings, more demanding regulations, deeper upgrade interactions, and stronger competition rather than a different attribute vocabulary.

### D-084 — Shared cross-tier component vocabulary

**Decision:** Every tier uses the same four car categories and five sub-items per category. Tier identity comes from sub-item ceilings, regulations, development depth, and competitive context rather than a different attribute vocabulary.

**Rationale:** Players can carry their engineering understanding between tiers and compare cars without relearning the entire design language.

**Consequence:** The data model can share one component schema across tiers while applying tier-specific caps, costs, rules, and performance interpretation.

## Current question

### Q-083 — Shared team car design

The team can maintain one shared car design blueprint for both entries, or allow each car to have independent design values. Independent design values double the R&D burden and can make the two-car team feel like two unrelated projects; shared design values preserve team learning while physical parts and setup still create meaningful differences.

**Question:** Should both team cars share the same validated design values, with differences coming from physical part condition, installed specification, setup, and driver interaction?

**Recommendation:** Use one shared validated design blueprint for both cars. Individual cars can still differ through installed part versions, condition and wear, setup, damage, and driver-specific refinement, but the team should not maintain two separate underlying design trees by default.

### D-085 — Shared blueprint with independent car specifications

**Decision:** The team maintains one shared validated design blueprint, while each car may carry different installed part versions, condition, damage, setup, and driver-specific refinement.

**Rationale:** Shared engineering knowledge remains efficient, but the player can prioritize one car, preserve a spare, compare versions, or operate an older specification when resources are limited.

**Consequence:** Car entries need an explicit installed-specification state separate from the shared design blueprint and category power summary.

## Current question

### Q-084 — Asymmetric car specifications

Running different specifications on the two cars can support A/B testing, gradual rollout of upgrades, and priority decisions when only one copy is available. It also creates data-comparison and setup complexity that should be visible rather than treated as an error.

**Question:** Should the player be allowed to intentionally run different specifications on the two cars during a weekend or season?

**Recommendation:** Allow asymmetric specifications. Make the differences explicit in practice feedback, setup analysis, reliability risk, and driver comparison so the player can use one car as a test case without confusing the results.

### D-086 — Intentional asymmetric specifications

**Decision:** The player may run different specifications on the two cars during a weekend or season. Practice feedback, setup analysis, reliability risk, and driver comparison clearly identify the differences.

**Rationale:** A two-car team can use real competition to compare versions, introduce upgrades gradually, or prioritize one entry when parts are scarce.

**Consequence:** The weekend and analysis systems must preserve car-specific context and must not combine results from different specifications as if they came from one identical car.

## Current question

### Q-085 — A/B testing and engineering knowledge

Different car specifications can provide evidence about an upgrade’s effect, but driver, setup, traffic, weather, and tyre differences can confound the comparison. Treating every difference as proof would make the player omniscient; ignoring comparisons would waste the value of running two cars.

**Question:** Should controlled differences between the two cars generate shared engineering findings with confidence levels?

**Recommendation:** Generate comparison findings with confidence levels. The finding becomes stronger when the test controls driver, setup, tyre, fuel, weather, and traffic differences; uncontrolled comparisons still provide weaker directional evidence.

### D-087 — Confidence-based A/B engineering findings

**Decision:** Controlled differences between the two cars generate shared engineering findings with confidence levels. Findings are stronger when driver, setup, tyre, fuel, weather, and traffic are controlled; uncontrolled comparisons provide weaker directional evidence.

**Rationale:** The player gains useful knowledge from comparison without receiving perfect causality from every on-track difference.

**Consequence:** Analysis must retain test context and confidence instead of storing only a single unqualified part delta.

## Current question

### Q-086 — Explicit A/B test plans

The player can simply run different specifications and let the simulation infer comparisons, or explicitly plan matched tests. Explicit plans create agency and make practice time a scarce experimental resource, but they add another planning layer to the race weekend.

**Question:** Should A/B comparisons be explicit practice plans with a target part, reference specification, matched conditions, and planned stints?

**Recommendation:** Use explicit A/B test plans. The player selects the target part, reference specification, cars or drivers, controls, and planned stints; the resulting confidence reflects how closely the plan was executed.

### D-088 — Explicit A/B practice plans

**Decision:** A/B comparisons are explicit practice plans. The player selects the target part, reference specification, cars or drivers, controls, and planned stints; the resulting confidence reflects how closely the plan was executed.

**Rationale:** Testing becomes a deliberate use of scarce practice time rather than an automatic report generated from unrelated running.

**Consequence:** Practice planning, part inventory, setup controls, and analysis capacity must share a common test-plan record.

## Current question

### Q-087 — Engineering knowledge carryover

Validated findings from an old design could be discarded with the car, carried forward perfectly, or retained as team knowledge whose relevance changes when regulations or architecture change. Permanent knowledge rewards long-term engineering investment, but perfect transfer would make new designs too predictable.

**Question:** Should validated engineering findings carry into future designs, with confidence reduced when regulations, concepts, or component architecture change?

**Recommendation:** Retain findings as team knowledge. Directly unchanged components keep strong relevance; regulation changes, new concepts, and architectural changes reduce confidence and require fresh validation rather than deleting the knowledge entirely.

### D-089 — Persistent team engineering knowledge

**Decision:** Validated engineering findings are retained as team knowledge. Unchanged components keep strong relevance, while regulation, concept, and architecture changes reduce confidence and require fresh validation rather than deleting the finding.

**Rationale:** The team should benefit from accumulated institutional knowledge while still needing to adapt when the technical environment changes.

**Consequence:** Knowledge records need relevance, confidence, source evidence, and links to the design or architecture they describe.

## Current question

### Q-088 — Staff departures and engineering knowledge

Validated findings can belong entirely to the team, entirely to the staff who discovered them, or exist as shared institutional knowledge with some tacit expertise remaining with individuals. Erasing validated knowledge when an engineer leaves would feel punitive, but ignoring staff expertise would weaken hiring, retention, and succession decisions.

**Question:** Should validated findings remain with the team when staff leave, while unvalidated expertise and some confidence or throughput benefits depart with the individual?

**Recommendation:** Keep validated findings in the team knowledge base. When a key staff member leaves, preserve completed evidence but reduce relevant analysis throughput and lose unvalidated or tacit expertise that had not yet been documented.

### D-090 — Team knowledge survives staff departures

**Decision:** Validated findings remain in the team knowledge base when staff leave. Completed evidence is preserved, while relevant analysis throughput and unvalidated or tacit expertise can be lost with the individual.

**Rationale:** Institutional knowledge rewards documentation and long-term investment without making staff turnover irrelevant.

**Consequence:** Staff records must distinguish documented team knowledge from personal expertise, active analysis capacity, and incomplete work owned by an individual.

## Current question

### Q-089 — Staff specialization

R&D capacity can be provided by generalist staff who contribute to every stage, or by specialists mapped to Concept Design, CFD, Wind Tunnel, Manufacturing, and analysis. Generalists simplify staffing, while specialists make hiring, development, and succession strategically meaningful.

**Question:** Should staff be specialized by R&D stage, with limited cross-coverage from generalists or adjacent disciplines?

**Recommendation:** Use specialized staff roles mapped to R&D stages, with limited cross-coverage at reduced efficiency. This makes staffing choices meaningful while preventing one missing specialist from freezing the entire team.

### D-091 — Specialized R&D staff with limited cross-coverage

**Decision:** Staff have specialized roles mapped to R&D stages, with limited cross-coverage at reduced efficiency. Adjacent or generalist staff can help cover a gap but do not perform as well as the correct specialist.

**Rationale:** Hiring and succession become meaningful without making the team helpless whenever one specialist is unavailable.

**Consequence:** Staff assignments need primary discipline, secondary coverage, efficiency modifiers, and stage-specific capacity contributions.

## Current question

### Q-090 — Staff attribute model

Staff can be represented by one department rating, or by explicit attributes that explain why one engineer is better at speed, analysis, mentoring, or communication. A single rating is easier to compare, but explicit attributes create meaningful hiring tradeoffs and allow staff to complement each other.

**Question:** Should staff use explicit attributes in addition to their specialized role, rather than relying on one overall rating?

**Recommendation:** Use explicit staff attributes alongside role specialization. A compact shared set such as Expertise, Analysis, Efficiency, Communication, and Leadership can influence stage output, confidence, throughput, collaboration, and mentoring; an overall rating remains a derived convenience only.

### D-092 — Explicit staff attributes and role specialization

**Decision:** Staff use explicit attributes alongside a specialized role. The shared launch attributes are Expertise, Analysis, Efficiency, Communication, and Leadership. Overall ratings are derived convenience values only.

**Rationale:** The player can build complementary departments and evaluate staff for specific needs instead of hiring only the highest overall rating.

**Consequence:** Staff assignments and simulation effects must use role fit plus individual attributes, with clear explanations of how each contributes to stage output, confidence, throughput, collaboration, and mentoring.

## Current question

### Q-091 — Staff development

Staff can remain static employees, improve through experience and training, or develop through a career path that includes mentorship and specialization. Static staff simplify the simulation but make long-term retention and succession less meaningful.

**Question:** Should staff attributes improve through work experience, focused training, and mentorship during a career?

**Recommendation:** Use a slower hybrid development model. Relevant work improves staff gradually, focused training develops selected attributes, and mentorship transfers experience or unlocks specialization. Staff should have individual ceilings and career stages so development remains meaningful without becoming as frequent as driver progression.

### D-093 — Hybrid staff development

**Decision:** Staff improve through relevant work, focused training, and mentorship. Staff have individual ceilings and career stages, with slower progression than drivers.

**Rationale:** Staff can become long-term organizational assets without turning every day into a staff-leveling exercise.

**Consequence:** Staff development needs work-based growth, training programs, mentorship effects, individual ceilings, and career-stage rules.

## Current question

### Q-092 — Mentorship capacity

Mentorship can be a passive bonus available to every junior staff member, or an active assignment that uses a senior employee’s time and attention. Passive mentorship is convenient but removes a scarce-resource decision; active mentorship makes succession planning meaningful.

**Question:** Should mentorship use limited senior-staff capacity and require explicit assignments?

**Recommendation:** Use explicit mentorship assignments with limited capacity. A senior staff member can mentor one or a small number of juniors, reducing some available project throughput while improving selected attributes or accelerating specialization. The player should manage mentorship at the program level rather than micromanaging every day.

### D-094 — Limited explicit staff mentorship

**Decision:** Mentorship uses explicit assignments and limited senior-staff capacity. A senior staff member mentors one or a small number of juniors, reducing some project throughput while improving selected attributes or accelerating specialization.

**Rationale:** Succession planning becomes a real resource decision without requiring daily personnel micromanagement.

**Consequence:** Mentorship programs need participants, capacity cost, duration, target attributes or specialization, and progress tracking.

## Current question

### Q-093 — Staff workload and fatigue

Staff can have fixed throughput regardless of workload, or workload can affect quality, speed, morale, and retention. Hard exhaustion blocks would be disruptive, but ignoring workload would make capacity allocation too abstract.

**Question:** Should staff workload create soft performance and retention penalties, with severe burnout or absence reserved for exceptional cases?

**Recommendation:** Use soft workload penalties. Sustained overload gradually reduces efficiency, confidence, communication, and morale, while severe burnout or absence remains an exceptional event. Hiring, delegation, scheduling, and facility investment should mitigate the risk.

### D-095 — Soft staff workload penalties

**Decision:** Sustained staff overload gradually reduces efficiency, confidence, communication, and morale, while severe burnout or absence remains an exceptional event. Hiring, delegation, scheduling, and facility investment mitigate workload risk.

**Rationale:** Capacity allocation has consequences without turning ordinary busy periods into automatic staff loss.

**Consequence:** Staff workload needs visible status, recovery or relief actions, and links to performance and retention without replacing the underlying skill model.

## Current question

### Q-094 — Staff contracts and retention

Staff can be permanent roster entries with no contract pressure, or they can have salaries, contract terms, morale, and outside opportunities. Contract management makes retaining high-value staff meaningful but adds another negotiation layer to the team economy.

**Question:** Should key staff have contracts and retention risk similar to drivers, including salary demands and outside offers?

**Recommendation:** Give key staff contracts with salary, term, role expectations, morale, and retention risk. High-value or unhappy staff may receive outside offers, while strong team results, fair workload, development opportunities, and compensation improve retention.

### D-096 — Contracted staff retention

**Decision:** Key staff have contracts with salary, term, role expectations, morale, and retention risk. High-value or unhappy staff may receive outside offers; results, fair workload, development, and compensation improve retention.

**Rationale:** Staff become important long-term team assets and succession decisions rather than interchangeable capacity tokens.

**Consequence:** Staff contracts need negotiation, renewal, departure, outside-offer, and role-expectation events connected to team performance and workload.

## Current question

### Q-095 — Staff role changes and cross-training

Specialized staff can remain locked to their original discipline, or the player can retrain them into adjacent roles. Permanent flexibility makes staffing easier but weakens specialization; strict locks make hiring mistakes and staff departures overly punishing.

**Question:** Should staff be able to change disciplines through a time-consuming cross-training program?

**Recommendation:** Allow limited cross-training into adjacent disciplines. The staff member works at reduced efficiency during training, retains some original-role strength, and cannot become an instant replacement for a fully experienced specialist.

### D-097 — Limited staff cross-training

**Decision:** Staff can cross-train into adjacent disciplines through time-consuming programs. During training they work at reduced efficiency, retain some original-role strength, and cannot instantly replace a fully experienced specialist.

**Rationale:** The player can respond to staffing gaps and develop internal talent without making specialization irrelevant.

**Consequence:** Cross-training needs eligible role paths, duration, efficiency penalties, attribute transfer rules, and completion milestones.

## Current question

### Q-096 — Staff career stages and retirement

Staff can remain at a fixed ability forever, decline sharply with age, or move through career stages where expertise and leadership change over time. A hard decline makes experienced staff disposable; no aging removes succession pressure and long-term roster turnover.

**Question:** Should staff use gradual career stages with changing strengths, retirement risk, and succession needs?

**Recommendation:** Use gradual career stages. Experience and leadership can grow over time, while efficiency, workload tolerance, and availability may decline later in a career. Retirement should be a forecastable event with enough warning to develop or recruit a successor.

### D-098 — Gradual staff career stages

**Decision:** Staff move through gradual career stages. Experience and leadership can grow, while efficiency, workload tolerance, and availability may decline later. Retirement is forecastable and provides time for succession planning.

**Rationale:** Long-serving staff become valuable institutional leaders without making them permanently optimal or creating sudden roster shocks.

**Consequence:** Staff records need career stage, projected retirement window, development trajectory, workload tolerance, and succession relevance.

## Current question

### Q-097 — Staff collaboration and synergy

R&D can treat every staff member as independent capacity, or collaboration can create small benefits when specialists work well together. Synergy makes communication and leadership meaningful, but it should not allow a large department to stack unlimited bonuses.

**Question:** Should compatible staff create limited collaboration bonuses when assigned to the same R&D stage or project?

**Recommendation:** Add modest collaboration bonuses based on Communication, Leadership, role complementarity, and shared history. Use diminishing returns and a clear cap so synergy rewards stable teams without making large departments mandatory.

### D-099 — Capped staff collaboration bonuses

**Decision:** Compatible staff receive modest collaboration bonuses based on Communication, Leadership, role complementarity, and shared work history. Bonuses use diminishing returns and a clear cap.

**Rationale:** Stable teams are rewarded without allowing department size or unlimited stacking to dominate R&D outcomes.

**Consequence:** Collaboration effects need a bounded calculation and must remain separate from individual staff attributes and stage capacity.

## Current question

### Q-098 — Staff chemistry and familiarity

Collaboration can be calculated only from current attributes, or staff can build familiarity and trust through shared projects, mentorship, and successful delivery. Persistent chemistry makes team-building matter, but it should remain lightweight and recoverable after personnel changes.

**Question:** Should staff develop a persistent but bounded familiarity value that improves collaboration over time?

**Recommendation:** Add lightweight staff familiarity. Shared projects, mentorship, and successful delivery improve it; long separation can reduce it. Keep the effect bounded and visible so chemistry complements skill rather than replacing it.

### D-100 — Bounded staff familiarity

**Decision:** Staff develop lightweight familiarity through shared projects, mentorship, and successful delivery. Long separation can reduce it, but its effect remains bounded and visible.

**Rationale:** Team chemistry rewards continuity without becoming a hidden replacement for individual skill.

**Consequence:** Familiarity needs growth and decay rules, a visible effect summary, and protection against runaway collaboration bonuses.

## Current question

### Q-099 — Familiarity scope

Familiarity can be tracked for every staff pair, as one value for an R&D department, or as a hybrid. Pair-level relationships are expressive but create a large amount of state; department cohesion is easier to understand and better suited to a management game with many staff members.

**Question:** Should familiarity be represented primarily as department-level cohesion, with explicit mentor relationships as the only individual relationship exception?

**Recommendation:** Use department-level cohesion for ordinary collaboration and track explicit individual mentor relationships separately. This preserves team-building benefits without creating a relationship matrix for every pair of employees.

### D-101 — Department cohesion with mentor exceptions

**Decision:** Ordinary staff collaboration uses department-level cohesion. Individual relationship tracking is reserved for explicit mentor assignments.

**Rationale:** The model rewards building stable departments without creating a large pairwise relationship matrix.

**Consequence:** Departments need cohesion state, while mentor programs need separate individual relationship state and effects.

## Current question

### Q-100 — Cohesion growth and decay

Department cohesion should grow through shared work, successful delivery, and consistent leadership. It should decay through turnover, conflict, prolonged overload, and long separation, but it should not become a permanent snowball or collapse instantly after one departure.

**Question:** Should department cohesion grow and decay gradually through team events and workload conditions?

**Recommendation:** Use gradual growth and decay. Shared projects, successful deliveries, mentorship, and stable leadership improve cohesion; turnover, conflict, overload, and prolonged separation reduce it. Keep its performance bonus modest and separate from individual staff skill.

### D-102 — Gradual department-cohesion changes

**Decision:** Department cohesion grows and decays gradually. Shared projects, successful deliveries, mentorship, and stable leadership improve it; turnover, conflict, overload, and prolonged separation reduce it. Its performance bonus remains modest and separate from individual staff skill.

**Rationale:** Team culture matters over time without creating permanent snowballing or instant collapse.

**Consequence:** Cohesion needs event-based inputs, gradual adjustment, visible status, and a bounded effect on department performance.

## Current question

### Q-101 — Cohesion effects on R&D

Department cohesion could affect stage throughput, communication, confidence, or the actual quality of a design. Directly increasing design values would make culture substitute for engineering skill and project decisions; limiting cohesion to collaboration outcomes keeps its role understandable.

**Question:** Should cohesion affect R&D throughput, communication, and confidence without directly increasing a part’s designed sub-item values?

**Recommendation:** Limit cohesion to throughput, collaboration quality, information sharing, and confidence. It should not directly add points to a part’s designed sub-items; those values should come from the design, staff expertise, testing, and project decisions.

### D-103 — Cohesion affects collaboration, not design power

**Decision:** Department cohesion affects R&D throughput, collaboration quality, information sharing, and confidence. It does not directly add points to a part’s designed sub-items.

**Rationale:** Culture improves how the team works without replacing engineering expertise, testing, or project decisions as the source of design capability.

**Consequence:** Simulation must apply cohesion as a bounded process modifier rather than a direct car-power modifier.

## Current question

### Q-102 — Cohesion by R&D stage

The team can use one global engineering-cohesion value, or track cohesion separately for Concept Design, CFD, Wind Tunnel, and Manufacturing. Stage-level cohesion reflects the distinct staff groups and capacity already defined, while a global value is simpler but less diagnostic.

**Question:** Should cohesion be tracked separately for each R&D stage rather than as one global engineering value?

**Recommendation:** Track four stage-level cohesion values—Concept Design, CFD, Wind Tunnel, and Manufacturing. Cross-coverage and shared leadership can provide limited broader effects, but the primary cohesion should belong to the department where staff work.

### D-104 — Stage-specific R&D cohesion

**Decision:** Cohesion is tracked separately for Concept Design, CFD, Wind Tunnel, and Manufacturing. Cross-coverage and shared leadership may provide limited broader effects, but primary cohesion belongs to the department where staff work.

**Rationale:** The model reflects distinct stage capacity, staff specialization, and department culture without requiring a single opaque engineering score.

**Consequence:** R&D feedback must identify which department’s cohesion affected speed, collaboration, or confidence.

## Current question

### Q-103 — R&D facility upgrade tracks

Each R&D stage can rely only on staff capacity, or it can have a dedicated facility that improves throughput and confidence. Dedicated facilities create a long-term infrastructure path but should not directly raise the car’s designed sub-item values.

**Question:** Should Concept Design, CFD, Wind Tunnel, and Manufacturing each have their own upgradeable facility track?

**Recommendation:** Give each stage its own facility track. Facility levels should provide modest bonuses to capacity, speed, and confidence for that stage, use a shared upgrade economy, and never directly add car-power points.

### D-105 — Dedicated R&D facility tracks

**Decision:** Concept Design, CFD, Wind Tunnel, and Manufacturing each have an upgradeable facility track. Facility levels provide modest stage-specific bonuses to capacity, speed, and confidence, use a shared upgrade economy, and never directly add car-power points.

**Rationale:** Infrastructure investment improves how reliably the team develops parts without replacing the quality of the design, staff, or testing decisions.

**Consequence:** Facility records need stage ownership, level, capacity modifier, speed modifier, confidence modifier, cost, construction time, and maintenance.

## Current question

### Q-104 — R&D facility upgrade curve

The driver-development buildings already use five levels with modest diminishing returns. R&D facilities could reuse that framework for consistency, or use unique level counts and curves for each stage. A shared framework makes the economy easier to understand and balance.

**Question:** Should R&D facilities use the same five-level, diminishing-return upgrade framework as the driver-development buildings?

**Recommendation:** Reuse the five-level framework with shared construction, maintenance, and cost rules. Let each stage distribute its modest bonus differently between capacity, speed, and confidence, but keep the overall investment curve consistent.

### D-106 — Shared five-level R&D facility curve

**Decision:** R&D facilities use five upgrade levels with shared construction, maintenance, and cost rules. Each stage distributes its modest bonuses differently between capacity, speed, and confidence, while the overall investment curve remains consistent with driver-development buildings.

**Rationale:** A shared infrastructure economy is easier to compare and balance while still allowing each facility to serve a distinct engineering purpose.

**Consequence:** Facility upgrades need stage-specific bonus profiles within the common level and cost framework.

## Current question

### Q-105 — R&D facility specialization

Each facility can provide equal bonuses to capacity, speed, and confidence, or each stage can have a primary effect that reflects its role. Distinct profiles make facility choices more strategic and help players understand why a facility matters.

**Question:** Should each R&D facility have a primary bonus with smaller secondary bonuses?

**Recommendation:** Give each facility a primary purpose:

- Concept Design: throughput and early design confidence
- CFD: analysis speed and simulation confidence
- Wind Tunnel: validation confidence and correlation quality
- Manufacturing: production capacity and build quality

Each facility can provide smaller secondary bonuses, but none should directly add car-power points.

### D-107 — Stage-specialized R&D facility effects

**Decision:** R&D facilities have distinct primary purposes: Concept Design improves throughput and early design confidence; CFD improves analysis speed and simulation confidence; Wind Tunnel improves validation confidence and correlation quality; Manufacturing improves production capacity and build quality. Secondary bonuses remain smaller, and facilities never directly add car-power points.

**Rationale:** Each infrastructure investment has a clear strategic identity while remaining part of one understandable facility economy.

**Consequence:** Facility UI and project feedback must explain each stage’s primary and secondary effects separately.

## Current question

### Q-106 — Shared HQ construction priority

R&D facilities and driver-development buildings can use one shared HQ construction queue, or each system can receive a separate queue. Separate queues speed up development but reduce the opportunity cost that makes infrastructure choices meaningful.

**Question:** Should R&D facility upgrades compete with driver-development buildings in the same shared HQ construction queue?

**Recommendation:** Use one shared HQ construction queue. The player should choose between improving driver development, R&D capacity, and other HQ infrastructure rather than progressing every investment simultaneously.

### D-108 — Shared HQ construction priority across systems

**Decision:** R&D facility upgrades and driver-development buildings compete in one shared HQ construction queue. The player prioritizes between driver growth, R&D capacity, and other infrastructure.

**Rationale:** Infrastructure choices retain meaningful opportunity cost instead of allowing every development path to advance in parallel by default.

**Consequence:** All HQ construction projects need a common queue, cost model, completion state, maintenance impact, and priority interface.

## Current question

### Q-107 — R&D facility access and HQ expansion

The four R&D facilities can be available immediately at a basic level, or their construction can be locked behind HQ expansion. Early access lets every team participate in the full development loop; expansion gates can preserve long-term infrastructure progression.

**Question:** Should all four R&D facilities be available at Level 1, with HQ expansion unlocking their advanced levels?

**Recommendation:** Make all four facilities available at Level 1. Use HQ expansion to unlock higher facility levels, especially the final levels, so the full R&D loop is available early without removing long-term infrastructure goals.

### D-109 — Early R&D access with HQ-gated advanced levels

**Decision:** All four R&D facilities are available at Level 1. HQ expansion unlocks higher facility levels, especially the final levels, while the complete R&D loop remains available from the beginning.

**Rationale:** Players can engage with the full design cycle early while still having meaningful long-term infrastructure goals.

**Consequence:** Facility access and facility level must be separate states, with HQ expansion defining which advanced levels are legal.

## Current question

### Q-108 — R&D facility maintenance

R&D facilities can use their own maintenance rules or follow the established HQ model. Separate rules add complexity without adding much strategic value, while shared rules make operating status consistent across the team’s infrastructure.

**Question:** Should R&D facilities use the same maintenance and underfunding rules as driver-development buildings?

**Recommendation:** Use the same rules: modest recurring maintenance, reduced bonuses when underfunded, suspension only after continued underfunding, and no automatic destruction of facility levels.

### D-110 — Shared HQ maintenance rules for R&D facilities

**Decision:** R&D facilities use the same maintenance model as driver-development buildings: modest recurring costs, reduced bonuses when underfunded, suspension after continued underfunding, and no automatic destruction of facility levels.

**Rationale:** Consistent infrastructure rules reduce complexity and make the HQ economy easier to understand.

**Consequence:** All HQ facilities need a common operating-status model and recoverable maintenance-failure behavior.

## Current question

### Q-109 — R&D project resources

R&D can use money alone, a generic research-points currency, or a small set of concrete resources such as staff time, stage capacity, materials, and cash. Money alone removes operational scarcity; too many currencies add bookkeeping without improving decisions.

**Question:** Should R&D projects consume money, staff time, stage capacity, and manufacturing materials rather than a generic research-points currency?

**Recommendation:** Use those four concrete resources and avoid generic research points. Money funds operations, staff time and stage capacity determine throughput, and manufacturing materials limit physical production and copies.

### D-111 — Concrete R&D resource model

**Decision:** R&D projects consume money, staff time, stage capacity, and manufacturing materials. No generic research-points currency is used.

**Rationale:** Each resource corresponds to a real management constraint and creates decisions without adding an abstract progression currency.

**Consequence:** Project definitions must specify cash cost, staff demand, stage-capacity demand, and material cost where physical production is involved.

## Current question

### Q-110 — Manufacturing material granularity

Manufacturing can use one generic Materials resource, or several specialized material types such as composites, metals, electronics, and power-unit components. Specialized materials create supply-chain decisions but add inventory and balancing complexity.

**Question:** Should launch manufacturing use one generic Materials resource rather than multiple specialized material inventories?

**Recommendation:** Use one generic Materials resource at launch. Create scarcity through suppliers, tier rules, lead times, budgets, and event modifiers; reserve specialized material inventories for a later expansion once the core R&D loop is proven.

### D-112 — Money-and-time manufacturing model

**Decision:** Launch manufacturing does not consume a separate Materials resource or specialized inventory. Manufacturing parts costs money and takes time; staff availability, manufacturing capacity, and facility status still determine throughput. The generic research-points model remains excluded.

**Rationale:** Money and elapsed time provide enough resource tension for the core loop without adding inventory bookkeeping that does not directly improve the player’s decisions.

**Consequence:** Manufacturing projects need cash costs, durations, quantity rules, capacity demand, and completion states, but no materials ledger.

## Current question

### Q-111 — Manufacturing quantity economics

Manufacturing can charge the same cost and time for every copy, or use a setup cost followed by a per-copy cost and duration. A setup-and-copy model makes producing a second unit cheaper than starting a separate design, while still preserving the time and budget tradeoff of equipping both cars.

**Question:** Should manufacturing use a base setup cost and duration plus additional per-copy cost and time?

**Recommendation:** Use a base setup cost and duration plus per-copy costs and time. Additional copies should benefit from modest batch efficiency but still consume meaningful money, capacity, and calendar time.

### D-113 — Setup-plus-copy manufacturing economics

**Decision:** Manufacturing uses a base setup cost and duration plus additional per-copy costs and time. Batch production receives modest efficiency, but every copy still consumes money, capacity, and calendar time.

**Rationale:** The first unit carries project setup overhead while additional units remain cheaper than restarting the process without becoming free duplication.

**Consequence:** Manufacturing orders need setup cost, setup duration, per-copy cost, per-copy duration, batch-efficiency rules, and capacity reservation.

## Current question

### Q-112 — Tier and complexity scaling for manufacturing

Manufacturing costs and durations can be identical across tiers, or scale with the tier, affected sub-items, upgrade magnitude, and design complexity. Scaling makes higher-tier development more demanding, but should use a predictable formula rather than arbitrary penalties.

**Question:** Should manufacturing cost and duration scale with active tier and project complexity?

**Recommendation:** Scale both with tier and complexity. Higher-tier projects, larger point changes, more affected sub-items, and major designs should require more money and time, while the shared setup-plus-copy formula remains consistent.

### D-114 — Tier- and complexity-scaled manufacturing

**Decision:** Manufacturing cost and duration scale with active tier, upgrade magnitude, affected sub-item count, and major-design status. The setup-plus-copy formula remains consistent across projects.

**Rationale:** Higher-tier and more ambitious work should require more commitment without introducing arbitrary, project-specific economics.

**Consequence:** Manufacturing formulas need transparent tier and complexity inputs so the player can compare projects before committing.

## Current question

### Q-113 — Manufacturing order interruption

Manufacturing orders can run to completion once started, or the player can pause and reprioritize them when a race weekend, urgent spare, or financial problem changes the plan. Full interruption flexibility is useful, but pausing can otherwise become a free way to reshuffle work constantly.

**Question:** Should manufacturing orders be pausable and reprioritizable, with a small setup loss or delay when interrupted?

**Recommendation:** Allow pausing and reprioritization. Preserve completed copy progress, but apply a modest setup penalty or delay when an order is interrupted so the player must still make deliberate queue decisions.

### D-115 — Interruptible manufacturing orders

**Decision:** Manufacturing orders can be paused and reprioritized. Completed copy progress is preserved, while interruption applies a modest setup penalty or delay.

**Rationale:** The player can respond to urgent spares, race-weekend needs, or financial pressure without making queue changes costless.

**Consequence:** Manufacturing queues need pause state, progress preservation, interruption penalty, reprioritization history, and transparent completion-date recalculation.

## Current question

### Q-114 — Manufacturing during race weekends

Manufacturing is a long-running background process, but race-weekend mode should prevent new management work from pulling attention away from practice, qualifying, and racing. Pausing active production wastes calendar time; allowing new orders or reprioritization during the weekend weakens the mode boundary.

**Question:** Should active manufacturing continue during race weekends while new orders and reprioritization remain unavailable until normal-calendar control resumes?

**Recommendation:** Let active manufacturing continue against elapsed calendar time. Freeze new orders and queue changes during race weekends, then apply completed copies and restore manufacturing control when the weekend ends.

### D-116 — Background manufacturing during race weekends

**Decision:** Active manufacturing continues against elapsed calendar time during race weekends. New orders and queue changes are frozen until normal-calendar control resumes, when completed copies are applied.

**Rationale:** Long-running production respects calendar time without competing with the dedicated race-weekend decision space.

**Consequence:** Manufacturing must resolve project completion during weekend mode while deferring player-facing production actions.

## Current question

### Q-115 — Manufacturing quality and initial condition

Manufactured copies can begin at identical condition, receive a fixed quality grade, or have an estimated initial condition determined by staff, facility, workload, and confidence. Quality variation should affect reliability and longevity without changing the validated design value.

**Question:** Should each manufactured copy receive an initial condition and reliability confidence based on the Manufacturing stage’s staff, facility, workload, and project confidence?

**Recommendation:** Give each copy an initial condition and reliability confidence based on those factors. Keep the result within a bounded range, show an estimate before completion when possible, and never change the copy’s designed sub-item values.

### D-117 — Bounded manufacturing quality outcomes

**Decision:** Each manufactured copy receives bounded initial condition and reliability confidence based on Manufacturing staff, facility, workload, and project confidence. The player can see an estimate before completion when possible, and manufacturing quality never changes designed sub-item values.

**Rationale:** Production quality matters operationally without turning copies of a validated design into random performance variants.

**Consequence:** Manufacturing results need quality factors, confidence estimates, condition initialization, and a clear separation between design capability and production quality.

## Current question

### Q-116 — Manufacturing quality control

The team can accept a manufactured copy immediately, or perform an optional quality-control inspection before installation. Inspection can catch defects and improve confidence, but should cost money, staff time, or manufacturing capacity.

**Question:** Should the player be able to order an optional quality-control pass on manufactured parts before installation?

**Recommendation:** Add an optional quality-control pass. It consumes modest money and time, improves confidence, and can identify a defect that requires rework or delays installation; it does not increase the design’s sub-item values.

### D-118 — No separate quality-control action

**Decision:** Remove the optional quality-control pass. Manufacturing quality is resolved inside the normal Manufacturing stage using staff, facility, workload, and project-confidence inputs. The completed copy reports its condition and reliability state without requiring another player action.

**Rationale:** Manufacturing already has a dedicated stage, and a separate inspection action would add another layer of management without enough strategic value.

**Consequence:** The Manufacturing completion result must include condition, reliability confidence, and any defect or rework state directly.

## Current question

### Q-117 — Manufacturing defect discovery

Without a separate inspection action, defects can be reported immediately when Manufacturing completes, or some latent issues can remain uncertain until practice and track use reveal them. Immediate reporting is clearer; limited latent uncertainty preserves the value of testing without creating another management button.

**Question:** Should obvious manufacturing defects be reported on completion, with only latent reliability issues revealed through practice and use?

**Recommendation:** Report obvious defects immediately on completion. Allow only latent reliability issues to remain uncertain and reveal themselves through practice, installation feedback, or race use.

### D-119 — Immediate obvious-defect reporting

**Decision:** Obvious manufacturing defects are reported when Manufacturing completes. Only latent reliability issues remain uncertain and can be revealed through practice, installation feedback, or race use.

**Rationale:** The player receives clear operational information without adding a separate inspection action, while real reliability uncertainty remains meaningful.

**Consequence:** Manufacturing completion must classify defects as obvious or latent and record the appropriate repair, rework, wear, and confidence effects.

## Current question

### Q-118 — Regulation deadlines and R&D projects

Regulation changes can make an upgrade legal only if it is completed by a deadline, or can allow a project to finish but delay its use until the next season. Existing parts may be grandfathered, while unfinished designs may need adaptation.

**Question:** Should regulation deadlines determine when a design or manufactured part becomes legal, with late projects usable only under the next regulation set?

**Recommendation:** Use regulation deadlines. Existing legal parts can be grandfathered when rules change, but projects that miss the homologation deadline must be adapted or deferred to the next regulation set before they can be used competitively.

### D-120 — Regulation deadlines govern technical legality

**Decision:** Regulation deadlines determine when designs and manufactured parts are legal. Existing legal parts may be grandfathered, while late projects must be adapted or deferred to the next regulation set before competitive use.

**Rationale:** Regulation changes create meaningful planning windows without invalidating every completed asset immediately.

**Consequence:** Technical projects need regulation compatibility, homologation deadline, grandfathering status, and adaptation or deferral outcomes.

## Current question

### Q-119 — Regulation-change warning period

Regulation changes can be announced shortly before taking effect, announced during the prior season, or introduced through a longer proposal and approval process. Early warning supports strategic adaptation; too much certainty can remove sporting surprise.

**Question:** Should major regulation changes be announced well before the effective season, with a transition window for teams to adapt their designs?

**Recommendation:** Announce major changes during the prior season and make them effective during the next off-season. Provide clear impact summaries and deadlines, while reserving rare emergency changes for exceptional sporting events.

### D-121 — Prior-season regulation warning period

**Decision:** Major regulation changes are announced during the prior season and become effective during the next off-season. Teams receive impact summaries and deadlines, while emergency changes remain rare sporting events.

**Rationale:** Early warning makes adaptation and long-term R&D planning meaningful without eliminating the possibility of exceptional disruption.

**Consequence:** The calendar and regulation systems must expose proposal, announcement, transition, deadline, and effective dates.

## Current question

### Q-120 — Player influence on regulations

The player can simply react to regulations, or have limited influence through team reputation, alliances, league standing, and formal votes. Direct control would undermine the sporting world, while no influence would make the manager’s political and commercial reputation less useful.

**Question:** Should the player be able to advocate for and vote on proposed regulation changes without having direct control over the final outcome?

**Recommendation:** Allow limited influence. The player can advocate, negotiate, build alliances, and vote when their team has a formal seat, but the final outcome depends on the wider championship vote and political context.

### D-122 — Limited player influence over regulations

**Decision:** The player can advocate, negotiate, build alliances, and vote when the team has a formal seat, but cannot directly control regulation outcomes. Final changes depend on the wider championship vote and political context.

**Rationale:** Sporting politics becomes a meaningful extension of reputation and management without turning the player into an unrestricted rules editor.

**Consequence:** Regulation proposals need supporters, voting power, political context, outcomes, and effective dates.

## Current question

### Q-121 — Tier-specific regulation governance

The three tiers can share one global rule process, or each tier can maintain its own sporting and technical regulations. Independent governance better reflects the distinct F1/F2/F3-inspired identities and lets changes in one tier remain meaningful without rewriting every championship.

**Question:** Should each tier have its own regulation set and governance process?

**Recommendation:** Give each tier independent regulations and governance. Cross-tier influence can exist for broad sporting trends, but technical rules, points, formats, and voting should primarily belong to the active championship.

### D-123 — Independent tier regulation governance

**Decision:** Each tier has its own regulations and governance process. Cross-tier influence may exist for broad sporting trends, but technical rules, points, formats, and voting primarily belong to the active championship.

**Rationale:** The tiers retain distinct F1/F2/F3-inspired identities while allowing sporting rules to evolve independently.

**Consequence:** Regulations, proposals, voting, and effective dates must be scoped to a championship tier unless explicitly marked as cross-tier.

## Current question

### Q-122 — Team financial structure

Team finances can use one cash balance, separate locked budgets for operations and R&D, or multiple currencies for different departments. Separate budgets create clear boundaries but can make the economy feel artificial; one balance keeps the player focused on allocation and commitments.

**Question:** Should the team use one cash balance with visible commitments and forecasts, rather than separate departmental currencies?

**Recommendation:** Use one cash balance. Show committed spending, projected income, payroll, facility maintenance, R&D costs, and available reserves so the player can make tradeoffs without juggling artificial currencies.

### D-124 — Unified team cash balance

**Decision:** The team uses one cash balance. The financial view exposes committed spending, projected income, payroll, facility maintenance, R&D costs, and available reserves.

**Rationale:** A unified balance keeps financial decisions grounded in real tradeoffs instead of separating money into artificial departmental currencies.

**Consequence:** Every contract, facility, R&D project, manufacturing order, sponsor payment, and championship payout must flow through the same cash ledger.

## Current question

### Q-123 — Team revenue sources

The team can be funded by sponsor contracts, championship payouts, owner or manufacturer support, commercial activities, or a combination. Too many income systems add bookkeeping, while a single source makes financial strategy shallow.

**Question:** Should team income come primarily from sponsors, championship payouts, and limited owner or manufacturer funding?

**Recommendation:** Use those three primary sources. Sponsors provide negotiated recurring income with obligations, championship payouts reward performance, and owner or manufacturer support provides a limited safety net rather than an unlimited bailout.

### D-125 — Three primary team revenue sources

**Decision:** Team income comes primarily from sponsor contracts, championship payouts, and limited owner or manufacturer support. Sponsor income is negotiated and recurring; payouts reward performance; support is a safety net rather than an unlimited bailout.

**Rationale:** The team’s financial health connects sporting results, commercial decisions, and organizational backing without requiring a large number of separate revenue systems.

**Consequence:** The finance model must forecast all three sources and expose their timing, uncertainty, obligations, and consequences.

## Current question

### Q-124 — Sponsor contract structure

Sponsors can provide flat guaranteed income, performance bonuses, explicit targets and penalties, or a combination. Purely guaranteed deals are predictable but passive; fully performance-based deals can make budgets volatile and difficult to plan.

**Question:** Should sponsor contracts include a guaranteed base payment plus performance targets, bonuses, obligations, and penalties?

**Recommendation:** Use a mixed contract structure: guaranteed base income for stability, performance bonuses for upside, explicit obligations the team must satisfy, and manageable penalties or reduced renewal value when targets are missed.

### D-126 — Mixed sponsor contracts

**Decision:** Sponsor contracts include guaranteed base income, performance bonuses, explicit obligations, and manageable penalties or reduced renewal value when targets are missed.

**Rationale:** Sponsors provide budget stability while still making sporting performance and commercial decisions financially meaningful.

**Consequence:** Sponsor offers need income, targets, obligations, bonus rules, penalty rules, term, and renewal value.

## Current question

### Q-125 — Sponsor fit and objectives

Sponsors can differ only by payment, or they can pursue different objectives such as championship results, driver visibility, development reputation, regional exposure, technology, or sustainability. A larger payment should not always be the best deal if its obligations conflict with the team’s strategy.

**Question:** Should sponsors have distinct priorities and fit considerations beyond the size of their payment?

**Recommendation:** Give sponsors distinct priorities and compatibility with the team’s reputation, tier, drivers, results, and strategy. The player should evaluate total fit and obligations rather than automatically accepting the largest offer.

### D-127 — Sponsor fit beyond payment

**Decision:** Sponsors have distinct priorities and compatibility with the team’s reputation, tier, drivers, results, development strategy, and commercial identity. Payment size alone does not determine the best offer.

**Rationale:** Commercial management becomes a strategic layer that can reinforce or conflict with the sporting plan.

**Consequence:** Sponsor offers need fit factors, priority tags, obligation compatibility, and an explanation of why the offer suits or conflicts with the team.

## Current question

### Q-126 — Sponsor exclusivity and conflicts

Multiple sponsors can coexist without restrictions, or sponsors can occupy categories with exclusivity rules. Unrestricted stacking creates unrealistic income and makes sponsor selection trivial; strict exclusivity can make the commercial system too brittle.

**Question:** Should sponsor contracts use limited category slots and conflict rules so incompatible sponsors cannot be signed together?

**Recommendation:** Use limited sponsor categories and manageable exclusivity rules. Allow one primary sponsor per major category, with smaller partners filling compatible supporting slots; conflicts should be visible before signing and negotiable in some cases.

### D-128 — Limited sponsor categories and exclusivity

**Decision:** Sponsors occupy limited categories with manageable exclusivity rules. Teams can sign one primary sponsor per major category plus compatible supporting partners; conflicts are visible before signing and may be negotiable.

**Rationale:** Sponsor selection remains strategic without making the commercial system too brittle or allowing unlimited income stacking.

**Consequence:** Sponsor contracts need category ownership, conflict rules, supporting-slot limits, and negotiation outcomes.

## Current question

### Q-127 — Sponsor contract duration

Sponsors can offer one-season deals, multi-year commitments, or flexible contracts with renewal options. Short deals provide flexibility and access to rising sponsors; long deals provide stability but can lock the team into poor fit or underpriced income.

**Question:** Should the game support both short-term and multi-year sponsor contracts with different stability, flexibility, and payment tradeoffs?

**Recommendation:** Support both. One-season deals offer flexibility and potential upside; multi-year deals provide predictable income but reduce future negotiation freedom and may become less attractive if the team’s reputation rises.

### D-129 — Flexible sponsor contract durations

**Decision:** Sponsor contracts can be one-season or multi-year. One-season deals provide flexibility and upside; multi-year deals provide predictable income while reducing future negotiation freedom and potentially becoming underpriced as reputation rises.

**Rationale:** Contract length becomes a strategic risk-versus-stability choice rather than a cosmetic term.

**Consequence:** Sponsor contracts need term, renewal window, early-renewal, exit, and renegotiation rules.

## Current question

### Q-128 — Sponsor renegotiation and termination

A team’s performance and reputation can change significantly during a contract. The player could be locked in until expiration, renegotiate early, or terminate with penalties. Full lock-in is predictable but limits the commercial strategy; unrestricted renegotiation makes contracts meaningless.

**Question:** Should strong performance allow limited early renegotiation or renewal, while termination carries clear financial and reputation penalties?

**Recommendation:** Allow limited early renegotiation or renewal when performance and sponsor fit improve. Termination remains possible but carries visible financial, relationship, and reputation costs.

### D-130 — Fixed sponsor terms at launch

**Decision:** Remove mid-contract sponsor renegotiation and termination from the launch scope. Sponsors remain committed for the agreed term, with renewal and replacement handled at the normal contract window.

**Rationale:** Sponsor contracts stay understandable and meaningful without adding a second negotiation layer during an active term.

**Consequence:** Contract performance is evaluated for bonuses, penalties, fit, and renewal value, but the base agreement remains fixed until expiration except for explicitly defined breach or crisis rules added later.

## Current question

### Q-129 — Sponsor renewal timing

At the end of a sponsor term, the team can automatically renew, receive a new offer, negotiate among competing sponsors, or face a gap if it delayed planning. Renewal timing determines how much commercial preparation the player must do.

**Question:** Should sponsor renewal and replacement happen during a defined pre-expiration window rather than automatically at the exact end of the contract?

**Recommendation:** Use a pre-expiration renewal window. The player receives offers and can choose a renewal or replacement before the current contract ends, keeping income continuity visible without adding mid-contract renegotiation.

### D-131 — Pre-expiration sponsor renewal window

**Decision:** Sponsor renewal and replacement occur during a defined pre-expiration window. The player receives offers and chooses renewal or replacement before the current contract ends.

**Rationale:** Commercial continuity becomes a planning responsibility without requiring mid-contract renegotiation.

**Consequence:** Sponsor contracts need expiration dates, renewal windows, offer timing, and income-gap warnings.

## Current question

### Q-130 — Sponsor obligation interaction

Sponsor obligations can be passive season targets that the simulation tracks automatically, or frequent active tasks that ask the player to complete promotional and commercial actions. Constant tasks risk turning sponsorship into a checklist rather than a strategic layer.

**Question:** Should most sponsor obligations be automatically tracked season objectives, with only occasional high-value decisions requiring player input?

**Recommendation:** Track most obligations automatically through results, visibility, tier participation, and agreed commitments. Reserve active player decisions for occasional high-value events such as showcase appearances, launch commitments, or major sponsor activations.

### D-132 — Mostly automatic sponsor obligations

**Decision:** Most sponsor obligations are automatically tracked through results, visibility, tier participation, and agreed commitments. Occasional high-value events require player input, such as showcase appearances, launch commitments, or major sponsor activations.

**Rationale:** Sponsors remain strategically important without turning the season into a repetitive commercial checklist.

**Consequence:** Contracts need measurable automatic objectives plus a small set of event-driven activation opportunities.

## Current question

### Q-131 — Championship payout structure

Championship payouts can be a flat tier payment, a performance-based reward, or a combination of participation income, team results, and driver results. A single flat payment reduces the financial value of competition; a purely variable payout makes budgets difficult to forecast.

**Question:** Should each tier provide a predictable base payout plus performance-based team and driver championship bonuses?

**Recommendation:** Use a mixed payout structure. Each tier provides a known base participation or commercial payment, with additional bonuses based on team and driver championship results. Publish the payout rules early so the player can plan around them.

### D-133 — Mixed championship payout structure

**Decision:** Each tier provides a known base participation or commercial payment plus performance-based team and driver championship bonuses. Payout rules are published early.

**Rationale:** The team receives predictable financial support while strong results retain meaningful economic value.

**Consequence:** Championship regulations need base payouts, team bonuses, driver bonuses, eligibility, and timing rules.

## Current question

### Q-132 — Championship payout timing

Payouts can arrive entirely at season end, entirely after each round, or through a combination of installments and final settlement. End-of-season payment creates cash-flow pressure; per-round payment is predictable but reduces the financial impact of the final standings.

**Question:** Should base payouts arrive in installments during the season, with performance bonuses paid after relevant results and final championship settlement?

**Recommendation:** Use installments for the predictable base payout and pay performance bonuses after the relevant round or final standings are confirmed. This creates cash-flow planning without making championship money arrive only after the season is over.

### D-134 — Installment-based championship payouts

**Decision:** Predictable base championship payments arrive in installments during the season. Performance bonuses are paid after the relevant results or final championship standings are confirmed.

**Rationale:** The team can plan cash flow during the season while championship performance still has meaningful financial consequences.

**Consequence:** Payout schedules must distinguish recurring base income, round-based bonuses, and final championship settlements.

### D-135 — Controlled team debt

**Decision:** The team may use limited short-term debt or credit to cover unavoidable obligations. Debt adds interest, reduces future flexibility and sponsor confidence, and persistent insolvency triggers cost cuts, asset sales, or ownership intervention rather than immediate game over.

**Rationale:** One poor season should create a difficult recovery challenge without abruptly ending a career that still has meaningful choices available.

**Consequence:** Finance needs credit limits, interest, debt service, insolvency thresholds, lender or owner consequences, and recovery actions.

## Current question

### Q-134 — Insolvency recovery

When debt persists, the team can enter a structured recovery plan or the career can end immediately. A recovery plan preserves the management challenge but must impose real consequences so overspending is not optimal.

**Question:** Should insolvency trigger a structured recovery plan with forced cuts, frozen upgrades, and possible relegation before a career-ending failure?

**Recommendation:** Use a structured recovery path. Escalating insolvency can force payroll cuts, staff or driver releases, HQ and R&D freezes, asset sales, sponsor loss, and relegation. Career-ending failure should occur only after repeated inability to recover or owner withdrawal.

### D-136 — Structured insolvency recovery

**Decision:** Persistent insolvency triggers escalating recovery actions: payroll cuts, staff or driver releases, HQ and R&D freezes, asset sales, sponsor loss, and possible relegation. Career-ending failure occurs only after repeated inability to recover or owner withdrawal.

**Rationale:** Financial failure becomes a difficult strategic phase rather than an abrupt game-over state, while continued overspending remains dangerous.

**Consequence:** The finance and board systems need recovery thresholds, intervention actions, deadlines, and clear warnings before irreversible outcomes.

## Current question

### Q-135 — Contracted payroll commitments

Driver and staff contracts can be treated as flexible monthly expenses, or as committed obligations with salaries, bonuses, and termination costs. Committed payroll makes contracts meaningful and explains why insolvency cannot be solved instantly by changing priorities.

**Question:** Should driver and key-staff contracts create scheduled payroll commitments with bonuses, contract terms, and termination costs?

**Recommendation:** Treat contracted payroll as a scheduled commitment. Base salaries are paid on a regular cadence, bonuses are triggered by defined outcomes, and early termination creates visible financial and relationship costs.

### D-137 — Scheduled contracted payroll

**Decision:** Driver and key-staff contracts create scheduled payroll commitments. Base salaries are paid regularly, bonuses trigger from defined outcomes, and early termination creates visible financial and relationship costs.

**Rationale:** Payroll becomes a real long-term obligation and explains why roster and staffing decisions affect financial recovery.

**Consequence:** Contracts need payment schedules, bonus conditions, terms, termination rules, and cash-flow forecasting.

## Current question

### Q-136 — Driver and staff contract length

Short contracts provide flexibility but increase renewal risk and negotiation frequency. Multi-year contracts provide stability and protect key talent but can lock the team into expensive or underperforming commitments.

**Question:** Should drivers and key staff support both short-term and multi-year contracts with different stability and flexibility tradeoffs?

**Recommendation:** Support both. Short contracts preserve flexibility but carry higher renewal and poaching risk; multi-year contracts stabilize the team but reduce budget flexibility and can become expensive liabilities.

### D-138 — Flexible driver and staff contract lengths

**Decision:** Drivers and key staff can sign short-term or multi-year contracts. Short terms preserve flexibility but increase renewal and poaching risk; multi-year terms stabilize the team but reduce budget flexibility and can become expensive liabilities.

**Rationale:** Contract duration creates a clear stability-versus-flexibility decision for both the sporting roster and technical organization.

**Consequence:** Contract offers need term, salary, renewal risk, role expectations, and long-term cash-flow projections.

## Current question

### Q-137 — Negotiable contract clauses

Contracts can use one fixed template, or the player can negotiate a small set of meaningful clauses. Full bespoke contracts add unnecessary complexity, but fixed terms make driver roles, staff expectations, and performance incentives feel cosmetic.

**Question:** Should contracts use a small set of negotiable clauses in addition to salary and term?

**Recommendation:** Use modular contract clauses: role, salary, term, performance bonuses, priority or parity expectations, development promises, and exit or renewal conditions. Keep the clause set small and readable rather than simulating bespoke legal contracts.

### D-139 — Modular driver and staff contract clauses

**Decision:** Contracts use a small modular clause set covering role, salary, term, performance bonuses, priority or parity expectations, development promises, and exit or renewal conditions.

**Rationale:** The player can shape meaningful employment agreements without managing a bespoke legal document for every person.

**Consequence:** Contract rules need clause compatibility, expectations, cost, morale impact, and consequences for breach or renegotiation at the normal contract window.

## Current question

### Q-138 — Contract negotiation interaction

The player can freely edit every contract term, or negotiations can use a small number of offers and counteroffers constrained by the person’s market value, role, reputation, morale, and alternatives. Free editing is precise but risks becoming administrative rather than strategic.

**Question:** Should contract negotiations use a small number of explicit offers and counteroffers constrained by the person’s expectations and market value?

**Recommendation:** Use structured offers and counteroffers. The player selects priorities and tradeoffs, while acceptance ranges are shaped by role, performance, reputation, morale, market demand, and competing opportunities.

### D-140 — Structured contract negotiations

**Decision:** Driver and staff negotiations use structured offers and counteroffers. Acceptance ranges are shaped by role, performance, reputation, morale, market demand, and competing opportunities.

**Rationale:** Negotiation remains a meaningful management decision without becoming a freeform contract editor.

**Consequence:** The contract system needs offer rounds, acceptance ranges, counteroffer reasons, negotiation outcomes, and relationship effects.

## Current question

### Q-139 — Contract negotiation windows

Negotiations can be available at any time, limited to off-season and pre-expiration windows, or opened mid-season whenever a person becomes unhappy or receives an offer. Constant access creates administrative noise; fully closed windows make injuries and sudden vacancies difficult to handle.

**Question:** Should normal contract negotiations occur during pre-expiration and off-season windows, with limited emergency mid-season signings for vacancies and replacements?

**Recommendation:** Use defined negotiation windows. Handle renewals and planned moves before expiration or during the off-season; allow limited emergency mid-season signings for unavailable drivers, staff departures, or explicit crisis events.

### D-141 — Defined driver and staff negotiation windows

**Decision:** Normal driver and staff negotiations occur before contract expiration or during the off-season. Limited emergency mid-season signings are allowed for unavailable drivers, staff departures, or explicit crisis events.

**Rationale:** The roster remains stable during competition while the game can still respond to genuine vacancies and emergencies.

**Consequence:** The calendar must expose negotiation windows, expiration dates, emergency eligibility, and signing deadlines.

## Current question

### Q-140 — External offers and poaching

Competitors can ignore contracted personnel until expiration, or approach them during the contract with buyout and retention rules. External interest creates retention pressure, but forced mid-contract departures would undermine the player’s planning.

**Question:** Should rival teams be able to make limited external offers to contracted drivers and staff, with buyout or retention negotiations rather than automatic departures?

**Recommendation:** Allow limited external offers. Notify the player, provide retention or buyout options when the contract allows them, and require an explicit outcome; contracted personnel should not leave automatically without a defined clause or player agreement.

### D-142 — Limited external offers with explicit outcomes

**Decision:** Rival teams may make limited external offers to contracted drivers and staff. The player is notified and can pursue retention or a buyout when the contract allows it; departure requires an explicit clause or agreement.

**Rationale:** Retention becomes an active management concern without making signed contracts meaningless or allowing automatic forced departures.

**Consequence:** External offers need eligibility, notification, response windows, retention options, buyout terms, and relationship consequences.

## Current question

### Q-141 — Buyout clauses

Contracts can omit buyout clauses entirely, making personnel protected until expiration, or include optional release clauses that provide flexibility at a known cost. A buyout should affect salary demands and contract negotiations rather than being a free escape hatch.

**Question:** Should buyout or release clauses be optional contract terms with a clearly stated cost and compensation tradeoff?

**Recommendation:** Make buyout clauses optional contract terms. A lower buyout should increase salary or reduce willingness to sign, while a high buyout protects the team but makes the contract less attractive to the employee.

### D-143 — Optional contract buyout clauses

**Decision:** Buyout or release clauses are optional contract terms. Lower buyouts increase salary demands or reduce acceptance; higher buyouts protect the team but make the contract less attractive.

**Rationale:** Contract protection becomes a visible negotiation tradeoff rather than an invisible lock or unrestricted exit.

**Consequence:** Contract offers must show buyout amount, salary impact, acceptance impact, and who may trigger the clause.

## Current question

### Q-142 — Driver and staff free-agent market

The game can provide an unlimited pool of available personnel, a fixed roster of free agents, or a changing market influenced by contracts, performance, retirements, promotions, and team finances. A living market makes timing and scouting meaningful but must remain readable.

**Question:** Should the game maintain a changing free-agent market for drivers and staff, with normal activity before seasons and limited emergency activity mid-season?

**Recommendation:** Use a changing but bounded free-agent market. Refresh it around pre-season and contract windows, allow limited emergency additions mid-season, and represent unfamiliar candidates with scouting ranges rather than exact attributes.

### D-144 — Bounded changing free-agent market

**Decision:** Drivers and staff enter a changing but bounded free-agent market. The market refreshes around pre-season and contract windows, supports limited emergency additions mid-season, and represents unfamiliar candidates with scouting ranges.

**Rationale:** Recruitment becomes a timing and information decision without creating an infinite pool of interchangeable personnel.

**Consequence:** Market entries need availability windows, scouting confidence, asking terms, role expectations, and reasons for entering or leaving the market.

## Current question

### Q-143 — Free-agent competition

Multiple teams can pursue the same free agent, with the candidate choosing based on salary, role, team reputation, development opportunity, tier, and competitive prospects. A simple first-come signing is easy but removes meaningful recruitment competition.

**Question:** Should free-agent recruitment use offer windows where candidates compare competing teams before accepting?

**Recommendation:** Use offer windows. Candidates evaluate structured offers across compensation, role, development, reputation, tier, and competitive outlook; the player receives interest signals and a deadline rather than an instant guaranteed signing.

### D-145 — Competitive free-agent offer windows

**Decision:** Free-agent recruitment uses offer windows. Candidates compare structured offers across compensation, role, development, reputation, tier, and competitive outlook before accepting.

**Rationale:** Recruitment becomes a competitive management decision rather than a first-come transaction.

**Consequence:** Candidates need offer deadlines, interest signals, comparison factors, acceptance outcomes, and reasons for rejecting or preferring an offer.

## Current question

### Q-144 — Free-agent motivations

If every candidate primarily maximizes salary, recruitment becomes a simple bidding contest. Drivers and staff can instead value different combinations of compensation, role, development, tier, reputation, stability, and location or personal fit.

**Question:** Should free agents have individual motivations beyond salary that influence which offer they prefer?

**Recommendation:** Give candidates individual motivations. Show readable preference signals—such as “seeks a lead role” or “values technical development”—without exposing exact hidden weighting, so scouting and relationship knowledge remain valuable.

### D-146 — Individual free-agent motivations

**Decision:** Free agents have individual motivations beyond salary, including role, development, tier, stability, reputation, compensation, and personal fit. The player sees readable preference signals without exact hidden weighting.

**Rationale:** Recruitment rewards fit and information rather than becoming a pure salary auction.

**Consequence:** Candidate profiles need motivations, preference signals, uncertainty, and reasons for accepting or rejecting offers.

## Current question

### Q-145 — Scouting free agents

Free-agent attributes and motivations can be visible immediately, or scouting can consume staff time, money, and capacity to narrow estimates. Immediate information is convenient but makes the scouting attribute and staff system less valuable.

**Question:** Should scouting a free agent consume time or staff capacity while improving attribute ranges, potential estimates, and motivation confidence?

**Recommendation:** Make scouting an explicit but lightweight activity. It consumes scouting capacity and time, narrows attribute and potential ranges, and improves confidence in motivations before the candidate’s offer window closes.

### D-147 — Capacity-based free-agent scouting

**Decision:** Free-agent scouting is an explicit activity that consumes scouting capacity and time. It narrows attribute and potential ranges and improves confidence in motivations before the offer window closes.

**Rationale:** Scouting gives the manager’s Scouting attribute and staff resources a clear purpose without making recruitment a heavy research project.

**Consequence:** Scouting assignments need duration, capacity cost, confidence gain, completion state, and candidate-window deadlines.

## Current question

### Q-146 — Scouting knowledge freshness

A scouting report can remain exact forever, or it can become dated as a driver or staff member changes through age, development, form, role, and new information. Permanent exact reports are convenient but make repeat scouting and information quality irrelevant.

**Question:** Should external scouting reports lose confidence over time while preserving their dated evidence and history?

**Recommendation:** Let current estimates lose confidence gradually as they age or as the person’s circumstances change. Preserve the old report as dated evidence, and allow refreshed scouting to restore confidence; contracted team members receive more current internal visibility.

### D-148 — Aging external scouting confidence

**Decision:** External scouting estimates lose confidence gradually as reports age or a person’s circumstances change. Old reports remain dated evidence, refreshed scouting restores confidence, and contracted team members receive more current internal visibility.

**Rationale:** Information remains valuable without becoming permanently exact, rewarding continued observation and team knowledge.

**Consequence:** Scouting reports need timestamps, evidence history, confidence decay, refresh actions, and separate internal visibility for contracted personnel.

## Current question

### Q-147 — Standard team roster structure

The team can maintain only its two race drivers and one reserve, or carry a larger development pool of academy and test drivers. A minimal roster is easier to manage; a broader pool supports succession, scouting, and long-term development but adds payroll and planning.

**Question:** Should each team have two race seats, one primary reserve option, and an optional academy or development pool?

**Recommendation:** Use two race seats and one primary reserve option as the standard roster. Allow an optional academy or development pool with additional salary and training costs, so depth becomes a strategic investment rather than a mandatory roster burden.

### D-149 — Standard seats with optional academy depth

**Decision:** Each team has two race seats and one primary reserve option. An academy or development pool is optional and carries additional salary and training costs.

**Rationale:** Every team can cover ordinary competition and emergencies, while deeper succession planning remains a strategic investment.

**Consequence:** Roster rules need seat eligibility, reserve eligibility, academy capacity, development costs, and promotion paths.

## Current question

### Q-148 — Academy driver contracts

Academy drivers can be ordinary free agents waiting in the same market, or they can have distinct development contracts with lower salary, training commitments, and promotion expectations. A separate academy structure makes succession planning meaningful without requiring every prospect to occupy a race or reserve seat.

**Question:** Should academy drivers use separate development contracts with limited slots, training commitments, and promotion opportunities?

**Recommendation:** Use development contracts. Academy drivers occupy limited slots, receive planned training and experience, and can be promoted to reserve or race seats when performance, readiness, and eligibility justify it.

### D-150 — Academy development contracts

**Decision:** Academy drivers use development contracts with limited slots, planned training and experience, and promotion opportunities to reserve or race seats based on performance, readiness, and eligibility.

**Rationale:** The academy becomes a deliberate succession system instead of a list of inactive prospects.

**Consequence:** Academy records need contract terms, training plans, experience sources, eligibility, readiness, and promotion history.

## Current question

### Q-149 — Academy race experience

Academy drivers can develop only through training and simulator work, or gain experience through practice appearances, loans, or racing in a lower tier. Race experience accelerates development but introduces availability, cost, and poaching risks.

**Question:** Should academy drivers be able to gain experience through practice appearances, loans, or lower-tier race seats before promotion?

**Recommendation:** Support all three paths where regulations allow. Practice provides controlled exposure, loans provide regular competition, and lower-tier seats provide the strongest experience at the cost of reduced direct team control.

### D-151 — Multi-path academy race experience

**Decision:** Academy drivers can develop through practice appearances, loans, or lower-tier race seats where regulations allow. Practice provides controlled exposure, loans provide regular competition, and lower-tier seats provide the strongest experience with less direct team control.

**Rationale:** The player can choose between control, development speed, and competitive readiness instead of using one universal academy path.

**Consequence:** Academy development must track experience source, availability, control, eligibility, cost, and promotion readiness.

## Current question

### Q-150 — Academy loan terms

A loan can be a simple temporary transfer, or include a defined role, minimum race opportunities, development objectives, payment terms, and recall conditions. Structured terms protect the academy investment but require more negotiation.

**Question:** Should academy loans use structured terms covering duration, role, minimum opportunities, development objectives, payment, and recall conditions?

**Recommendation:** Use structured loan terms. Protect the academy driver’s development opportunity while allowing the receiving team operational control; recall should be limited to injury, contract, or explicitly defined emergency conditions.

### D-152 — Structured academy loan terms

**Decision:** Academy loans define duration, role, minimum opportunities, development objectives, payment, and recall conditions. The receiving team controls operations, while recall is limited to defined emergencies.

**Rationale:** Loans protect the development investment while giving the receiving team enough control to provide meaningful competition.

**Consequence:** Loan contracts need obligations, monitoring, breach handling, payment, and recall rules.

## Current question

### Q-151 — Championship points during loans

The driver can keep individual championship points while loaned, while the team that enters the driver’s car receives team points. Moving team points back to the parent team would disconnect the result from the team that operated the car.

**Question:** Should a loaned driver keep their driver points while the team that enters them receives the corresponding team points?

**Recommendation:** Use that split. Driver points follow the driver; team points belong to the team entry that operated and scored the car, consistent with the general transfer rule.

### D-153 — Loaned-driver points follow championship identity

**Decision:** A loaned driver keeps individual driver points, while the team entry operating the car receives the corresponding team points.

**Rationale:** The driver’s championship history remains continuous and team standings reflect the team that actually entered and operated the car.

**Consequence:** Loaned race results must record driver identity, parent contract, loaning team, and race-entry team separately.

## Current question

### Q-152 — Loan financial responsibility

The parent team can continue paying the driver’s salary, the receiving team can assume the full cost, or the loan can use a negotiated salary split and loan fee. A negotiated structure makes loans financially meaningful without requiring a complex transfer market.

**Question:** Should loan agreements define a negotiated salary split and optional loan fee between the parent and receiving teams?

**Recommendation:** Use negotiated loan finances. The parent team remains responsible for the base contract unless the agreement says otherwise; the receiving team can pay a salary share and/or loan fee based on role, tier, and development value.

### D-154 — Negotiated academy-loan finances

**Decision:** Loan agreements define negotiated financial terms. The parent team remains responsible for the base contract by default; the receiving team may pay a salary share and/or loan fee based on role, tier, and development value.

**Rationale:** Loans create meaningful financial tradeoffs without requiring a separate transfer-market economy.

**Consequence:** Loan offers need salary responsibility, salary share, loan fee, duration, role, and development value.

## Current question

### Q-153 — Academy promotion decisions

Academy drivers can be promoted automatically when they reach an ability threshold, or the player can choose when to promote them based on readiness, role availability, finances, and contract expectations. Automatic promotion is predictable; player-controlled promotion preserves the management decision.

**Question:** Should academy promotion require eligibility and readiness thresholds while leaving the final promotion decision to the player?

**Recommendation:** Use eligibility gates plus player choice. A driver must meet sporting, readiness, contract, and regulatory requirements, but the player decides when the promotion is strategically appropriate.

### D-155 — Eligibility-gated academy promotion

**Decision:** Academy promotion requires sporting, readiness, contract, and regulatory eligibility, but the player makes the final promotion decision.

**Rationale:** Promotion becomes a strategic roster decision rather than an automatic reward for reaching a single rating threshold.

**Consequence:** Promotion rules need eligibility checks, readiness state, contract compatibility, regulatory approval, and explicit player confirmation.

## Current question

### Q-154 — Promotion contract changes

An academy driver can keep the development contract after promotion, or promotion can trigger a new reserve or race-seat contract with changed salary, role, expectations, and buyout terms. Keeping the old contract is simple but weakens the importance of the promotion.

**Question:** Should promotion to a reserve or race seat trigger a new contract negotiation with updated role, salary, and expectations?

**Recommendation:** Trigger a new contract negotiation on promotion. The player can formalize the new role, compensation, development expectations, and protection terms rather than silently changing the driver’s status.

### D-156 — Promotion triggers a new contract

**Decision:** Promotion from academy to reserve or race seat triggers a new contract negotiation covering role, salary, performance expectations, development commitments, and buyout or protection terms.

**Rationale:** Promotion is a meaningful change in responsibility and value rather than a silent roster-state change.

**Consequence:** Promotion cannot be finalized until the new role and contract are accepted or an explicit emergency arrangement is recorded.

## Current question

### Q-155 — Timing of academy promotions

Planned promotions can occur during normal contract windows, while injuries or departures may create an urgent mid-season vacancy. Restricting all promotions to the off-season harms roster resilience; allowing any promotion at any time can make contract planning irrelevant.

**Question:** Should planned promotions occur during normal windows, with emergency mid-season promotions allowed when a seat or reserve position becomes available?

**Recommendation:** Use both paths. Planned promotions occur before a season or during contract windows; emergency promotions can happen mid-season when a valid vacancy exists and the driver meets readiness, contract, and regulatory requirements.

### D-157 — Planned and emergency academy promotions

**Decision:** Planned academy promotions occur before a season or during contract windows. Emergency promotions can happen mid-season when a valid vacancy exists and the driver meets readiness, contract, and regulatory requirements.

**Rationale:** The roster can respond to genuine vacancies without making promotion timing arbitrary.

**Consequence:** Promotion events need planned and emergency eligibility, vacancy type, contract handling, and regulatory validation.

## Current question

### Q-156 — Performance-based mid-season seat changes

Race seats can change only for injury, departure, or contract events, or the player can replace an underperforming driver with a reserve or academy driver. Performance-based changes increase agency but can damage morale, trust, and contract relationships.

**Question:** Should sustained underperformance allow the player to make a mid-season race-seat change with visible financial, morale, and contract consequences?

**Recommendation:** Allow performance-based changes. Require a meaningful performance or team-objective threshold, show the consequences before confirmation, and treat the move as a major management event rather than a routine lineup toggle.

### D-158 — Performance-based seat changes

**Decision:** Sustained underperformance can justify a mid-season race-seat change. The game requires a meaningful performance or team-objective threshold, shows consequences before confirmation, and treats the change as a major management event.

**Rationale:** The player can respond to a genuinely poor fit without turning the lineup into a routine toggle.

**Consequence:** Seat-change evaluation needs a sustained-performance record, objective context, contract effects, morale impact, and player confirmation.

## Current question

### Q-157 — Contextual driver evaluation

Raw finishing positions and points can punish drivers for weak equipment, poor strategy, weather, traffic, or reliability. Evaluation can instead compare performance to expected car capability, teammate pace, track context, and assigned role.

**Question:** Should driver performance evaluations use context-adjusted expectations rather than raw results alone?

**Recommendation:** Use context-adjusted evaluation. Combine results with expected car performance, teammate comparison, qualifying and race pace, consistency, strategy context, reliability, and role expectations so seat decisions reflect driver contribution rather than finishing position alone.

### D-159 — Context-adjusted driver performance evaluation

**Decision:** Driver performance is evaluated against expected car performance, teammate comparison, qualifying and race pace, consistency, strategy context, reliability, and role expectations rather than raw results alone.

**Rationale:** Seat decisions should reflect driver contribution and circumstances instead of punishing a driver for equipment or operational factors outside their control.

**Consequence:** Performance records need expected-versus-actual context, teammate comparison, event conditions, and role-specific interpretation.

## Current question

### Q-158 — Performance report visibility

The game can hide performance evaluation in a single internal score, or show the player evidence through reports that explain expected pace, actual contribution, trends, and confidence. Visible reports make seat decisions understandable without exposing every simulation formula.

**Question:** Should the player receive readable performance reports showing evidence, trends, and confidence behind driver evaluations?

**Recommendation:** Provide readable performance reports. Show expected versus actual contribution, teammate comparison, trend direction, major context factors, and confidence without exposing every internal formula.

### D-160 — Evidence-based driver performance reports

**Decision:** The player receives readable driver performance reports showing expected versus actual contribution, teammate comparison, trend direction, major context factors, and confidence without exposing every internal formula.

**Rationale:** Performance-based roster decisions remain understandable and evidence-backed rather than relying on a hidden evaluation score.

**Consequence:** Reports need evidence selection, confidence calculation, trend tracking, and role-specific summaries.

## Current question

### Q-159 — Performance report timing

Performance information can update continuously, after every session, after each race weekend, or through slower management summaries. Continuous updates create noise and invite overreaction; waiting too long hides useful signals before contract and seat decisions.

**Question:** Should the game provide a detailed report after each race weekend, with longer-term trend summaries updated across several events?

**Recommendation:** Provide detailed post-weekend reports and slower trend summaries across multiple events. Practice, qualifying, sprint, and main-race evidence can be included in the weekend report without turning every session into a separate management screen.

### D-161 — Post-weekend driver performance reporting

**Decision:** Driver performance is summarized in detailed post-weekend reports, with practice, qualifying, sprint, and main-race evidence. Longer-term trends update across multiple events instead of producing a separate management screen for every session.

**Rationale:** The player receives timely evidence without being overwhelmed by continuous evaluation updates.

**Consequence:** Race-weekend results must preserve session-level evidence for the report while presenting a coherent weekend summary.

## Current question

### Q-160 — Race simulation detail and presentation

The simulation can calculate only final classifications, or maintain detailed internal state for segments, tyres, fuel, incidents, setup, parts, and driver decisions before presenting a summary. Detailed internal state supports trustworthy reports and future analysis, but the player should not need to read raw telemetry after every race.

**Question:** Should the race simulation maintain detailed internal event data while presenting the player with summarized, actionable race reports?

**Recommendation:** Maintain detailed internal simulation data and present summarized reports. Preserve enough evidence to explain pace, strategy, incidents, degradation, reliability, and driver contribution without exposing raw telemetry as the default experience.

### D-162 — Detailed internal race simulation with summarized presentation

**Decision:** The race simulation maintains detailed internal event data for pace, strategy, incidents, degradation, reliability, and driver contribution. The player receives summarized, actionable reports rather than raw telemetry by default.

**Rationale:** The simulation remains explainable and extensible without making the player manually interpret every low-level event.

**Consequence:** Race results need event evidence, causal summaries, and a presentation layer that can expose deeper detail when the player requests it.

## Current question

### Q-161 — Race decision cadence

The player can control the race continuously, make decisions every lap, or intervene only at meaningful decision windows. Continuous control maximizes agency but risks turning the race into repetitive micromanagement; event windows preserve strategy while keeping the race readable.

**Question:** Should race control use meaningful decision windows—such as pit opportunities, weather changes, safety cars, degradation thresholds, and team orders—rather than requiring lap-by-lap input?

**Recommendation:** Use event-driven decision windows. Let the player set pre-race plans and intervene when meaningful conditions change, with optional pause or advance controls around pit stops, weather, incidents, degradation, and team orders.

### D-163 — Event-driven race decision cadence

**Decision:** Race control uses meaningful decision windows rather than requiring lap-by-lap input. The player sets pre-race plans and can intervene around pit stops, weather, incidents, degradation, and team orders.

**Rationale:** The player retains strategic agency without turning the race into repetitive manual input.

**Consequence:** The race UI and simulation need event triggers, pause or advance behavior, default responses, and a record of player interventions.

## Current question

### Q-162 — Pre-race strategy plans

Each car can start a race with a planned strategy that the simulation follows automatically, or the player can make all race decisions reactively. Plans make preparation meaningful and provide a safe default when the player does not intervene.

**Question:** Should each car begin the race with a pre-race strategy plan that the simulation follows until conditions or player decisions change it?

**Recommendation:** Give each car a pre-race strategy plan covering stints, tyre targets, fuel, pace, pit windows, and contingency responses. The simulation follows the plan by default and opens decision windows when conditions invalidate or challenge it.

### D-164 — Per-car pre-race strategy plans

**Decision:** Each car begins the race with a pre-race strategy plan covering stints, tyre targets, fuel, pace, pit windows, and contingency responses. The simulation follows the plan by default and opens decision windows when conditions invalidate or challenge it.

**Rationale:** Preparation matters while the player retains the ability to adapt to changing race conditions.

**Consequence:** Strategy plans need defaults, contingencies, car-specific state, and a clear distinction between planned and player-overridden decisions.

## Current question

### Q-163 — Shared versus driver-specific race plans

The team can create one strategy template for both cars, or maintain separate plans from the beginning. A shared plan supports team consistency; driver-specific refinements account for pace, tyre management, confidence, role, and different race situations.

**Question:** Should the team use a shared strategy baseline that each driver can refine independently?

**Recommendation:** Use a shared team strategy baseline with driver-specific refinements. Team-level tyre, fuel, and pit-window knowledge transfers to both cars, while each driver’s pace, tyre management, confidence, and role shape their final plan.

### D-165 — Shared race strategy with driver refinements

**Decision:** The team uses a shared race strategy baseline with driver-specific refinements. Team-level tyre, fuel, and pit-window knowledge transfers to both cars, while driver pace, tyre management, confidence, and role shape each final plan.

**Rationale:** Team learning is shared without forcing both cars into identical strategies or ignoring driver differences.

**Consequence:** Strategy records need team-level assumptions, car-specific refinements, driver context, and deviations from the shared plan.

## Current question

### Q-164 — Team orders in race planning

Team orders can be absent, decided only when a race situation appears, or included in the pre-race plan as conditional instructions. Explicit orders create strategic clarity but can affect driver morale, role expectations, and team trust.

**Question:** Should team orders be conditional parts of race plans, with player decisions and driver morale consequences when orders are issued or ignored?

**Recommendation:** Support conditional team orders. The player can define priorities such as position swaps, racing restrictions, strategic priority, and tow or slipstream cooperation; execution and driver response depend on role, trust, morale, and race context.

### D-166 — Conditional team orders

**Decision:** Team orders can define position swaps, racing restrictions, strategic priority, and tow or slipstream cooperation. Execution and driver response depend on role, trust, morale, and race context.

**Rationale:** Team orders become a real leadership and relationship decision rather than an automatic command toggle.

**Consequence:** Race events need order type, urgency, driver response, compliance, refusal, morale impact, and trust history.

## Current question

### Q-165 — Driver compliance with team orders

Drivers can always obey explicit orders, always choose independently, or respond based on the type of order and their relationship with the team. Safety-critical or contract-defined instructions should be more reliable than discretionary competitive preferences.

**Question:** Should drivers usually comply with clear safety or contract-defined orders, while discretionary orders can be questioned or refused based on morale, trust, role, and race context?

**Recommendation:** Use graded compliance. Safety and clearly agreed contractual orders have high compliance; discretionary orders can be questioned or refused when trust, morale, role expectations, or race circumstances are poor. Refusal creates visible relationship and reputation consequences.

### D-167 — Graded driver compliance with team orders

**Decision:** Safety and clearly agreed contractual orders have high compliance. Discretionary orders can be questioned or refused based on trust, morale, role expectations, and race context; refusal creates visible relationship and reputation consequences.

**Rationale:** Leadership and driver relationships matter without making every instruction an unpredictable refusal check.

**Consequence:** Team-order outcomes need compliance rules, contract context, driver state, and post-event relationship effects.

## Current question

### Q-166 — Tyre allocation and scarcity

Tyres can be an unlimited strategic choice, or each weekend can provide a regulation-defined allocation that practice, qualifying, sprint, and race plans consume. Finite tyres make practice planning meaningful, but the player needs clear inventory and compound information before committing.

**Question:** Should each race weekend use a finite, regulation-defined tyre allocation shared across practice, qualifying, sprint, and main races?

**Recommendation:** Use finite weekend tyre allocations. Regulations determine compound availability and quantity; practice consumes tyres, and the player must balance learning, qualifying preparation, sprint plans, and race reserves.

### D-168 — Finite regulation-defined tyre allocations

**Decision:** Each race weekend uses finite tyre allocations defined by the active regulations. Practice, qualifying, sprint, and main-race plans consume the available compounds and sets.

**Rationale:** Tyre usage becomes a central practice and race-planning tradeoff rather than an unlimited tactical option.

**Consequence:** Weekend state must track compound, set condition, usage, allocation limits, and each session’s consumption.

## Current question

### Q-167 — Per-driver tyre allocations

Tyres can be one freely shared team pool or assigned to each driver under sporting regulations. A free pool offers flexibility but can make one car’s practice program consume the other’s legal race options; per-driver allocations better match real sporting constraints.

**Question:** Should tyre allocations be tracked per driver or car, with cross-car transfers allowed only when the active regulations permit them?

**Recommendation:** Track allocations per driver and car entry. The team can plan the combined weekend usage, but cannot freely transfer a set from one driver to the other unless the active regulations explicitly allow it.

### D-169 — Per-driver and per-entry tyre allocations

**Decision:** Tyre allocations are tracked per driver and car entry. The team can plan combined weekend usage, but cross-driver transfers are prohibited unless active regulations explicitly allow them.

**Rationale:** The model preserves team-level planning while respecting sporting allocation constraints.

**Consequence:** Tyre inventory needs driver ownership, car entry, compound, set identity, condition, usage history, and transfer eligibility.

## Current question

### Q-168 — Tyre-set condition and reuse

A tyre set can be single-use, or retain condition across practice, qualifying, sprint, and race sessions. Reusable sets create meaningful decisions about preserving low-mileage tyres and accepting worn-set performance, but need clear heat-cycle and degradation rules.

**Question:** Should each tyre set retain condition and usage history so it can be reused when regulations and safety allow?

**Recommendation:** Track tyre-set condition and heat cycles. Used sets can be reused when legal, but wear affects grip, degradation, warm-up, and failure risk; new sets provide the strongest performance and confidence.

### D-170 — Reusable tyre sets with heat-cycle wear

**Decision:** Each tyre set retains condition and heat-cycle usage. Used sets can be reused when legal; wear affects grip, degradation, warm-up, and failure risk, while new sets provide the strongest performance and confidence.

**Rationale:** Tyre conservation becomes a meaningful weekend decision without making every set single-use.

**Consequence:** Tyre state needs set identity, compound, heat cycles, condition, temperature history, degradation, legality, and failure risk.

## Current question

### Q-169 — Dynamic tyre temperature

Tyre performance can use a static compound value, or track temperature and warm-up during each stint. Dynamic temperatures make driver Tyre Management, setup, weather, pace, traffic, and out-lap decisions meaningful.

**Question:** Should tyre temperature and warm-up be dynamic state affected by compound, driver, setup, weather, pace, traffic, and stint history?

**Recommendation:** Use dynamic tyre temperature. Performance should improve as tyres enter their operating window, fall away when overheated or underheated, and respond to driver Tyre Management, setup, weather, pace, traffic, and previous heat cycles.

### D-171 — Dynamic tyre-temperature state

**Decision:** Tyre temperature and warm-up are dynamic state affected by compound, driver, setup, weather, pace, traffic, and stint history. Performance improves inside the operating window, while underheating reduces grip and overheating accelerates degradation.

**Rationale:** Tyre behavior connects driver skill, setup, weather, and race decisions into one meaningful system.

**Consequence:** The tyre model must track temperature, operating window, warm-up rate, thermal sensitivity, degradation, and the factors that move the set toward or away from its ideal range.

## Current question

### Q-170 — Compound differentiation

Tyre compounds can be cosmetic variants with one simple pace difference, or have distinct tradeoffs in peak grip, durability, warm-up, thermal sensitivity, and wet performance. Distinct compounds make allocation and strategy meaningful but require regulations to define which options are available.

**Question:** Should each compound have distinct pace, durability, warm-up, thermal-sensitivity, and weather-performance characteristics?

**Recommendation:** Give compounds distinct tradeoffs. Softer compounds provide more peak grip but shorter life and greater thermal sensitivity; harder compounds last longer but warm more slowly and offer less peak performance. Regulations determine available compounds by tier and event.

### D-172 — Distinct compound tradeoffs

**Decision:** Tyre compounds have distinct pace, durability, warm-up, thermal-sensitivity, and weather-performance characteristics. Softer compounds provide higher peak grip with shorter life and greater thermal sensitivity; harder compounds last longer but warm more slowly and offer less peak performance. Regulations determine available compounds by tier and event.

**Rationale:** Compound choice becomes a strategic tradeoff rather than a simple ordered list of speed values.

**Consequence:** Compound definitions need operating windows, degradation curves, warm-up behavior, thermal sensitivity, weather response, and regulation availability.

## Current question

### Q-171 — Wet-weather tyre compounds

Wet conditions can use the same dry compounds with performance penalties, or provide dedicated intermediate and wet tyres with crossover points. Dedicated wet tyres create meaningful weather strategy and connect directly to practice and pit decisions.

**Question:** Should intermediate and wet tyres be separate compounds with dynamic crossover thresholds as track conditions change?

**Recommendation:** Use dedicated intermediate and wet compounds. The correct choice depends on track moisture, rain intensity, standing water, temperature, and drying line; crossover thresholds should be visible as estimates and become clearer through weather and tyre knowledge.

### D-173 — Dedicated wet-weather compounds

**Decision:** Intermediate and wet tyres are separate compounds with dynamic crossover thresholds based on track moisture, rain intensity, standing water, temperature, and drying line. Thresholds are estimated and improve through weather and tyre knowledge.

**Rationale:** Wet-weather strategy becomes a meaningful timing decision rather than a binary weather toggle.

**Consequence:** Race weekends need weather state, track-water state, tyre crossover estimates, forecast confidence, and dynamic pit-window evaluation.

## Current question

### Q-172 — Weather forecast uncertainty

Weather can be presented as an exact schedule, a forecast range, or a confidence-weighted prediction that updates as the weekend progresses. Exact forecasts make tyre timing easy; uncertain forecasts create value for scouting, weather staff, observation, and conservative contingency plans.

**Question:** Should weather forecasts use timing ranges and confidence levels rather than exact rain and drying times?

**Recommendation:** Use timing ranges and confidence levels. Forecast quality improves with weather staff, facilities, observation, and time, while live track data gradually replaces prediction as conditions develop.

### D-174 — Uncertain, improving weather forecasts

**Decision:** Weather forecasts use timing ranges and confidence levels. Weather staff, facilities, observation, and elapsed time improve forecast quality, while live track data gradually replaces prediction as conditions develop.

**Rationale:** Forecasting creates informed uncertainty and makes weather preparation valuable without making the player guess blindly.

**Consequence:** Forecasts need confidence, update timing, observed conditions, forecast-versus-actual history, and links to tyre crossover decisions.

## Current question

### Q-173 — Weather update cadence

Weather information can update continuously, at fixed session intervals, or only when meaningful conditions change. Continuous updates create noise; fixed intervals are predictable; event-driven updates preserve readability while still surfacing important changes.

**Question:** Should weather forecasts update at meaningful event windows—such as rain onset, intensity changes, drying transitions, and safety-car periods—rather than every lap?

**Recommendation:** Use event-driven weather updates with occasional scheduled refreshes. Surface changes when rain begins or intensifies, the track crosses tyre thresholds, drying accelerates, or a safety-car period changes the forecast relevance.

### D-175 — Event-driven weather updates

**Decision:** Weather updates occur at meaningful events with occasional scheduled refreshes. The game surfaces rain onset or intensification, tyre-threshold crossings, accelerated drying, safety-car changes, and major forecast shifts.

**Rationale:** Weather information remains actionable without producing noisy lap-by-lap notifications.

**Consequence:** Weather events must update forecast confidence, track state, tyre crossover estimates, and active race decision windows.

## Current question

### Q-174 — Shared track evolution

Track rubber, moisture, drying, marbles, and grip evolution can be shared across the entire session, or each car can experience an isolated track state. A shared state better represents a real race weekend and lets other cars influence the player’s conditions.

**Question:** Should track evolution be shared across both team cars and all cars in the session?

**Recommendation:** Use one shared track state per session. Rubber, moisture, drying, marbles, grip, and temperature evolve from weather and all cars’ activity, while each car still receives driver- and setup-specific responses to that state.

### D-176 — Shared track state within sessions

**Decision:** Each session uses one shared track state. Rubber, moisture, drying, marbles, grip, and temperature evolve from weather and all cars’ activity, while car responses remain driver- and setup-specific.

**Rationale:** The track behaves as a shared sporting environment rather than a separate simulation for each team entry.

**Consequence:** Session results must update the track state and pass relevant conditions into the next session according to time gaps and weather.

## Current question

### Q-175 — Track-state carryover between sessions

Track rubber and grip can reset completely between sessions, carry forward unchanged, or evolve through time, weather, and support-series activity. Persistent state makes practice timing and weather more meaningful, while a full reset is easier to understand.

**Question:** Should track state carry between sessions with partial rubber and grip persistence, weather-driven washing or drying, and time-based changes?

**Recommendation:** Carry track state between sessions. Rubber and grip persist partially, rain can wash rubber away, drying changes moisture and grip, and time gaps or support-series activity modify the state before the next session.

### D-177 — Persistent, weather-responsive track state

**Decision:** Track state carries between sessions with partial rubber and grip persistence. Rain can wash rubber away, drying changes moisture and grip, and time gaps or support-series activity modify the state before the next session.

**Rationale:** Session order and weather create meaningful preparation differences without resetting the circuit after every session.

**Consequence:** The weekend timeline must apply time, weather, and activity transitions to the shared track state.

## Current question

### Q-176 — Support-series track activity

Support-series running can be ignored, simulated as a detailed parallel championship, or represented by an abstract activity value that adds rubber, marbles, and observations to the circuit. A detailed parallel simulation adds too much scope for the benefit it provides.

**Question:** Should support-series activity be represented by an abstract scheduled effect on track evolution rather than a full separate race simulation?

**Recommendation:** Use abstract scheduled activity. Each support session contributes a regulation- and weather-dependent amount of rubber, marbles, moisture displacement, and track knowledge without requiring a second full race simulation.

### D-178 — Abstract support-series track effects

**Decision:** Support-series sessions use abstract scheduled effects that contribute regulation- and weather-dependent rubber, marbles, moisture displacement, and track knowledge without requiring a second full race simulation.

**Rationale:** The circuit feels alive and shared while simulation scope remains focused on the player’s championship.

**Consequence:** Calendar events need support-session activity values and a deterministic effect on the shared track state.

## Current question

### Q-177 — Fuel load and race strategy

Fuel can be a static setup choice, or a continuous per-car resource that affects weight, pace, consumption, pit strategy, and race-range risk. A dynamic fuel state gives the player another strategic axis but must remain readable alongside tyres and energy deployment.

**Question:** Should each car track fuel as a continuous race resource that affects weight, pace, consumption, pit windows, and finishing range?

**Recommendation:** Track fuel continuously for each car. Fuel load affects weight and pace, consumption responds to engine mode, driver, weather, traffic, and damage, and the player must balance starting load, pace, pit strategy, and the risk of running short.

### D-179 — Continuous per-car fuel state

**Decision:** Each car tracks fuel continuously through the race. Fuel load affects weight and pace; consumption responds to engine mode, driver, weather, traffic, and damage; strategy balances starting load, pace, pit timing, and finishing range.

**Rationale:** Fuel becomes a strategic resource that interacts with race pace and risk instead of a static pre-race number.

**Consequence:** Race simulation needs fuel load, consumption rate, fuel mode, projected range, reserve margin, and fuel-related decision windows.

## Current question

### Q-178 — Refueling regulations

Refueling can be prohibited, available during pit stops, or determined by tier-specific regulations. Prohibiting it makes starting fuel and conservation central; allowing it adds pit strategy but increases race-system complexity.

**Question:** Should launch race regulations prohibit refueling, while keeping refueling as a configurable future regulation option?

**Recommendation:** Prohibit refueling at launch. Make starting fuel, conservation, engine modes, damage, weather, and safety margins the strategic fuel decisions; preserve refueling as a regulation-controlled future extension.

### D-180 — Tier-specific refueling regulations

**Decision:** Tier 1 prohibits refueling during races. Tiers 2 and 3 allow refueling under their active regulations. Each tier’s refueling rules remain configurable for future regulation changes.

**Rationale:** Lower tiers gain an additional strategic and operational distinction, while Tier 1 retains the higher-tier fuel-management model.

**Consequence:** Race-weekend and pit-stop contracts must read refueling legality and limits from the active tier regulations rather than using one global rule.

## Current question

### Q-179 — Lower-tier refueling interaction

In Tiers 2 and 3, refueling can be a fixed full refill or a player-selected quantity. A fixed refill is simpler, while variable refueling makes pit duration, fuel load, undercut timing, and risk management more meaningful.

**Question:** Should lower-tier pit stops allow a player-selected refueling quantity, with pit time increasing according to the amount added?

**Recommendation:** Allow variable refueling quantities in Tiers 2 and 3. The player chooses the target fuel load, and pit duration reflects the amount added while remaining subject to tier regulations and safety limits.

### D-181 — Variable lower-tier refueling

**Decision:** Tiers 2 and 3 allow player-selected refueling quantities. The player chooses the target fuel load, pit duration reflects the amount added, and tier regulations define safety and quantity limits.

**Rationale:** Refueling becomes a genuine pit-strategy decision instead of a fixed animation or automatic refill.

**Consequence:** Pit-stop simulation needs fuel target, added quantity, refueling duration, safety rules, and resulting track-position impact.

## Current question

### Q-180 — Refueling crew performance

Refueling time can be fixed by regulation, or affected by pit crew skill, equipment, coordination, fuel quantity, and pressure. Variable crew performance makes staff development and pit strategy relevant but should not create excessive randomness.

**Question:** Should pit crew skill, equipment, coordination, and pressure affect lower-tier refueling duration and incident risk?

**Recommendation:** Let pit crew capability affect refueling duration and a small amount of safety risk. Use bounded, explainable modifiers so larger fuel loads take longer while skilled, coordinated crews remain more consistent.

### D-182 — Bounded pit-crew refueling effects

**Decision:** Pit crew capability affects lower-tier refueling duration, consistency, and a small amount of safety risk. Modifiers remain bounded and explainable, while larger fuel loads always take longer.

**Rationale:** Pit operations matter without allowing random pit errors to dominate race outcomes.

**Consequence:** Pit-stop simulation needs crew capability, fuel quantity, pressure, duration, consistency, and safety outcomes.

## Current question

### Q-181 — Pit-crew attribute model

Pit crews can use one overall pit-stop rating, or explicit attributes that distinguish speed, precision, coordination, consistency, and safety. A compact explicit model makes training and staffing meaningful while keeping pit operations separate from driver and R&D attributes.

**Question:** Should pit crews use a small set of explicit attributes rather than one overall pit-stop rating?

**Recommendation:** Use explicit pit-crew attributes: Speed, Precision, Coordination, Consistency, and Safety. Derive an overall pit rating for convenience, but use the underlying attributes for tyre changes, refueling, releases, and incident risk.

## Current question

### Q-018 — Qualifying format

Qualifying can be a single continuous session built around planned timed runs, or a series of elimination phases with changing traffic and pressure. A multi-round format is more dramatic but adds rules, transitions, and simulation complexity across three championship tiers.

**Question:** Should qualifying use one continuous timed session, or multiple elimination rounds?

**Recommendation:** Use one continuous timed session for the initial simulation contract, with discrete run plans, out-lap and preparation choices, traffic risk, tyre selection, fuel targets, and a final push window. Leave elimination rounds as a rules-layer extension once the core qualifying model is stable.

### D-183 — Task-based pit-crew skills and tier-scaled rosters

**Decision:** Pit-crew members use task-specific skills rather than only a single overall pit-stop rating. Initial skill families include Front Jack, Rear Jack, Wheel Gun, Tire Carry, Refuel, and Repair. Active crew size and station specialization scale by tier: lower tiers use smaller crews that require multi-skilled coverage, while higher tiers add specialized stations, parallel workers, and redundancy.

**Rationale:** Staffing choices should directly affect pit-stop capability. A small lower-tier crew creates meaningful value for versatile personnel, while larger upper-tier crews can gain speed and consistency through specialization.

**Consequence:** Pit-crew rosters need tier-specific station templates, task-skill ratings, assignment coverage checks, and pit-stop calculations that account for both specialization and multi-skill coverage.

## Current question

### Q-182 — Pit-stop station assignment

A multi-skilled crew member could be assigned to different stations across different pit stops, but allowing one person to perform multiple simultaneous tasks would make lower-tier crews unrealistically powerful and difficult to evaluate. The game needs a clear distinction between versatility and parallel capacity.

**Question:** Should each crew member perform one station per pit stop, with multi-skilled members changing assignments between stops as needed?

**Recommendation:** Yes. Allow one active station per crew member per stop, and let the player define a default assignment plus overrides for planned stops. This makes versatility valuable in lower tiers while preserving the speed advantage of larger, specialized upper-tier crews.

### D-184 — One station per crew member per pit stop

**Decision:** Each pit-crew member performs one active station per pit stop. Multi-skilled members can change assignments between stops through default assignments and planned-stop overrides.

**Rationale:** Versatility helps smaller crews cover more situations without allowing one person to provide unrealistic simultaneous capacity. Larger tiers remain faster because they can staff more specialized stations in parallel.

**Consequence:** Pit-stop planning needs station assignments, skill-based coverage checks, and per-stop overrides while preserving one active task per crew member.

## Current question

### Q-183 — Pit-crew skill development

Pit-crew task skills can remain mostly static, improve through repeated race-weekend work, or advance through focused training and team facilities. Experience should reward consistent staffing, while training should let players address weaknesses such as poor wheel-gun speed or refueling safety.

**Question:** Should individual pit-crew task skills improve through a combination of race experience, focused training, and facility support?

**Recommendation:** Use a hybrid model. Race experience gradually improves familiarity and consistency for assigned stations; focused training improves selected task skills; and pit facilities/equipment provide modest bounded bonuses. Keep progression slower than driver development and avoid individual staff micromanagement beyond role, assignment, and training focus.

### D-185 — Hybrid pit-crew skill progression

**Decision:** Individual pit-crew task skills improve through a combination of race experience, focused training, and facility/equipment support. Experience primarily improves familiarity and consistency, training improves selected skills, and facilities provide modest bounded bonuses. Progression is slower than driver development.

**Rationale:** The model rewards stable staffing while still giving the player meaningful ways to develop weak stations without requiring excessive staff micromanagement.

**Consequence:** Pit-crew members need individual task-skill progression, station experience, training focus, and facility modifiers.

## Current question

### Q-184 — Pit-crew fatigue and rotation

Pit-stop work can be modeled without fatigue, or crew members can accumulate fatigue during race weekends and across repeated events. Fatigue would make larger rosters and cross-trained substitutes useful, but detailed per-lap crew management would add unnecessary complexity.

**Question:** Should pit-crew fatigue affect performance, with rotation and recovery handled at the session or weekend level?

**Recommendation:** Use bounded fatigue. Fatigue should reduce speed and consistency modestly during demanding weekends, while planned rotation, rest, and recovery restore readiness. Keep decisions at the session/weekend level rather than asking the player to manage every individual stop.

### D-186 — Bounded pit-crew fatigue and session-level rotation

**Decision:** Pit-crew fatigue modestly reduces speed and consistency during demanding race weekends. Players manage rotation, rest, and recovery at the session or weekend level rather than for every individual pit stop.

**Rationale:** Fatigue makes roster depth and cross-training matter without turning pit operations into repetitive minute-by-minute staffing management.

**Consequence:** Race-weekend simulation needs crew readiness, fatigue accumulation, recovery, rotation plans, and bounded performance penalties.

## Current question

### Q-185 — Tier-specific active crew templates

Pit-crew size can be completely fixed by tier, or each tier can define required stations plus a limited number of flexible slots. A template gives the player meaningful staffing choices while preventing unlimited hiring from eliminating the intended lower-tier challenge.

**Question:** Should each tier use a regulation-defined active crew template with required stations, allowed specialist slots, and a limited number of flexible positions?

**Recommendation:** Yes. Define a tier template with minimum and maximum active positions, required coverage, and unlockable specialist slots. Let the player choose which individuals fill those positions, while regulation changes can revise the template over time.

### D-187 — Regulation-defined pit-crew templates

**Decision:** Each tier uses a regulation-defined active crew template with minimum and maximum positions, required station coverage, specialist slots, and limited flexible positions. Players choose which individuals fill the positions, and regulation changes can revise the templates.

**Rationale:** Tier progression remains structurally meaningful while staffing choices determine how well each team meets the available requirements.

**Consequence:** Pit-crew rules need versioned tier templates, position requirements, specialist unlocks, flexible-slot rules, and validation when regulations change.

## Current question

### Q-186 — Crew assignment workflow

Players can manually assign every crew member to a station, or the game can provide an automatic best-fit lineup. Manual assignment creates control over specialization and versatility, while automation prevents the staffing screen from becoming tedious.

**Question:** Should manual assignment be the core workflow, with an automatic best-fit assignment available as a convenience?

**Recommendation:** Yes. Let players manually assign and lock important stations, while best-fit assignment considers task skill, fatigue, coverage, and risk. Save a default lineup and allow session/weekend overrides without requiring manual setup for every stop.

### D-188 — Manual assignment with best-fit assistance

**Decision:** Manual pit-crew assignment is the core workflow, supported by automatic best-fit assignment. Players can lock important stations, save default lineups, and use session or weekend overrides. Best-fit assignment considers task skill, fatigue, coverage, and risk.

**Rationale:** The player retains meaningful control over specialization and versatility without being forced to rebuild the entire lineup for routine sessions.

**Consequence:** The staffing interface needs manual station assignment, locked positions, saved lineups, overrides, and a best-fit recommendation action.

## Current question

### Q-187 — Pit-crew recruitment

Pit-crew members can be recruited individually from a staff market, assigned from a generated team pool, or represented as a single anonymous crew that improves through facilities. Individual recruitment best supports the task-skill model, but it adds roster and contract decisions.

**Question:** Should teams recruit and contract individual pit-crew members with distinct task-skill profiles?

**Recommendation:** Yes. Use an individual staff market with task-skill profiles, contract costs, and availability. Keep the number of members manageable through tier templates and a limited reserve pool, rather than introducing anonymous crew units.

### D-189 — Individual pit-crew recruitment

**Decision:** Teams recruit and contract individual pit-crew members with distinct task-skill profiles. Tier templates and a limited reserve pool keep roster management manageable.

**Rationale:** Individual recruitment makes staffing choices, specialization, versatility, development, and retention meaningful parts of team management.

**Consequence:** The staff market needs pit-crew candidates, task-skill profiles, contracts, availability, and roster-capacity rules.

## Current question

### Q-188 — Pit-crew scouting certainty

Candidate task skills can be fully visible before signing, or scouting can present ranges and confidence that improve with observation. Full visibility is simpler; uncertainty makes scouting and recruitment more strategic.

**Question:** Should unsigned pit-crew candidates show estimated task-skill ranges and scouting confidence, with exact skills revealed after hiring or deeper evaluation?

**Recommendation:** Use ranges and confidence for unsigned candidates. Basic listings reveal broad estimates, scouting and trial work narrow the ranges, and the exact profile becomes known after hiring. Existing contracted crew should have visible, reliable skill values.

### D-190 — Pit-crew scouting ranges and known contracted skills

**Decision:** Unsigned pit-crew candidates show estimated task-skill ranges and scouting confidence. Listings provide broad estimates, scouting and trial work narrow the ranges, and exact skills become known after hiring. Contracted crew have visible, reliable skill values.

**Rationale:** Recruitment gains strategic uncertainty without making the performance of the player’s current crew opaque.

**Consequence:** Candidate listings need skill estimates and confidence, while contracted crew records need confirmed task-skill values.

## Current question

### Q-189 — Pit-crew skill breadth

Pit-crew members can be locked to one specialty, or each person can have ratings across the task set with stronger primary skills and weaker secondary skills. Broad skill profiles support lower-tier versatility and make cross-training meaningful.

**Question:** Should every pit-crew member have ratings across all task skills, with primary specialties and secondary strengths rather than hard role classes?

**Recommendation:** Yes. Give each member a full task-skill profile with one or two primary specialties and useful secondary skills. Avoid hard role locks so lower-tier teams can build coverage through versatile personnel, while higher tiers still benefit from dedicated specialists.

### D-191 — Full pit-crew task profiles

**Decision:** Every pit-crew member has ratings across the task set, with one or two primary specialties and useful secondary skills. Members are not hard-locked to a single role.

**Rationale:** Broad profiles make versatility valuable in smaller crews while allowing larger crews to gain an advantage from dedicated specialists.

**Consequence:** Candidate generation, training, assignment, and pit-stop simulation need full task-skill vectors with specialization patterns.

## Current question

### Q-190 — Crew-level coordination

Pit-stop performance can depend only on the assigned member’s task skill, or combine individual task skill with a shared crew-level coordination value. A team factor can represent handoffs, communication, and release timing, but it should not overpower strong or weak individual specialists.

**Question:** Should pit-stop performance combine individual task skills with a small crew-wide coordination modifier?

**Recommendation:** Yes. Make assigned task skill the primary factor and apply a small bounded coordination modifier based on stable lineups, training, leadership, and facilities. This rewards team cohesion without hiding individual staffing quality.

### D-192 — Bounded crew coordination modifier

**Decision:** Pit-stop performance is driven primarily by assigned task skills, with a small bounded crew-wide coordination modifier influenced by stable lineups, training, leadership, and facilities.

**Rationale:** Coordination rewards a cohesive crew without allowing team chemistry to overwhelm individual station quality.

**Consequence:** Pit-crew simulation needs a separate crew coordination value and clear limits on how it modifies station performance, handoffs, release timing, and consistency.

## Current question

### Q-191 — Coordination growth and lineup changes

Crew coordination can be static, improve through shared work, or reset whenever the lineup changes. A gradual model rewards continuity while allowing rebuilt crews to recover without making staff changes permanently crippling.

**Question:** Should crew coordination improve through repeated shared work and decline gradually when members or assignments change?

**Recommendation:** Yes. Let shared race-weekend work and coordinated training build cohesion gradually; let lineup changes reduce it modestly rather than reset it. Preserve some team-level knowledge so replacing one member does not erase the entire crew’s development.

### D-193 — Gradual crew-coordination development

**Decision:** Shared race-weekend work and coordinated training build crew cohesion gradually. Lineup or assignment changes reduce cohesion modestly rather than resetting it, and some team-level knowledge persists when individual members leave.

**Rationale:** Stable crews gain an operational advantage, but roster changes remain viable and do not erase the team’s entire development history.

**Consequence:** Crew coordination needs growth, decay, persistence, and lineup-history rules that operate separately from individual task skills.

## Current question

### Q-192 — Pit control and safe release

A pit stop also requires someone to confirm that the car is clear to leave, coordinate the handoff between stations, and prevent an unsafe release. This can remain an invisible simulation check, or become an explicit responsibility that affects staffing and skill coverage.

**Question:** Should pit control and safe release be an explicit crew responsibility with its own skill or station?

**Recommendation:** Yes. Add a Pit Control/Release responsibility. Lower tiers can cover it through a multi-skilled existing member, while higher tiers can unlock a dedicated controller. Use it to influence release timing, handoff consistency, and small safety risks.

### D-194 — Explicit Pit Control/Release responsibility

**Decision:** Pit Control/Release is an explicit pit-crew responsibility. Lower tiers can cover it with a multi-skilled existing member, while higher tiers can unlock a dedicated controller. It affects release timing, handoff consistency, and small safety risks.

**Rationale:** Safe release and station handoffs become meaningful staffing considerations without requiring a separate controller in every tier.

**Consequence:** Tier templates need Pit Control/Release coverage rules, and pit-stop simulation needs a dedicated release and handoff outcome.

## Current question

### Q-193 — Repair-skill granularity

Repair work can use one broad Repair skill covering front-wing swaps, rear-wing swaps, wing-angle changes, and similar adjustments, or split into multiple repair specialties. A broad skill keeps lower-tier staffing manageable; separate specialties add precision and more recruitment depth.

**Question:** Should repair remain one broad task skill at launch, with specialized repair tasks reserved for a later expansion?

**Recommendation:** Yes. Use one Repair skill at launch to cover common wing changes, angle adjustments, and routine pit repairs. Add specialized repair skills only if later gameplay proves that the broader category hides meaningful staffing choices.

### D-195 — Broad launch Repair skill

**Decision:** Repair is one broad launch skill covering common wing changes, angle adjustments, and routine pit repairs. Specialized repair skills remain a possible later expansion rather than part of the initial model.

**Rationale:** A broad repair category keeps lower-tier staffing manageable while still making repair capability a meaningful pit-stop consideration.

**Consequence:** Repairer assignments use one task rating at launch, and tier templates can scale repair capacity by adding positions rather than splitting the skill immediately.

## Current question

### Q-194 — Tire-handling skill granularity

Tire work can use one Tire Carry/Handling skill, or distinguish the person removing the old tire from the person installing the new tire. Separate tasks better represent larger upper-tier crews, while one skill keeps lower-tier coverage simpler.

**Question:** Should tire handling be split into Tire Off and Tire On skills, with Tire Carry folded into those responsibilities?

**Recommendation:** Yes. Use Tire Off and Tire On as separate skills. Lower-tier members can be trained in both, while upper tiers gain speed by assigning dedicated specialists. Fold carrying and positioning into the relevant task instead of adding a third tire skill.

### D-196 — Separate Tire Off and Tire On skills

**Decision:** Tire handling uses separate Tire Off and Tire On skills. Lower-tier members can cover both, while upper tiers gain speed through dedicated specialists. Carrying and positioning are included in the relevant task rather than becoming a third skill.

**Rationale:** The model supports the different removal and installation responsibilities seen in larger crews without overloading smaller-tier rosters with too many separate attributes.

**Consequence:** Tire station templates need removal and installation coverage, and individual profiles need both Tire Off and Tire On ratings.

## Current question

### Q-195 — Wheel-gun skill scope

Wheel-gun work can use one universal skill across all four wheel positions, or split into front, rear, left, and right specialties. A universal skill keeps recruitment and development readable while station assignment and crew coordination can still distinguish each corner.

**Question:** Should Wheel Gun remain one universal task skill across all wheel positions?

**Recommendation:** Yes. Use one Wheel Gun skill for all corners. Let station assignment, fatigue, coordination, and experience determine corner-level differences instead of creating four separate gunner attributes.

### D-197 — Universal Wheel Gun skill

**Decision:** Wheel Gun is one universal task skill used across all wheel positions. Station assignment, fatigue, coordination, and experience create corner-level differences without separate front, rear, left, or right gunner attributes.

**Rationale:** The game preserves meaningful gunner staffing while keeping recruitment, training, and scouting readable.

**Consequence:** Individual profiles need one Wheel Gun rating, and tier templates define how many gunner stations can operate in parallel.

## Current question

### Q-196 — Jack-skill scope

The front and rear jack positions have different equipment, movement, and timing responsibilities. They can share one Jack skill for simplicity, or use separate Front Jack and Rear Jack skills that reward targeted specialization.

**Question:** Should Front Jack and Rear Jack remain separate task skills?

**Recommendation:** Yes. Keep Front Jack and Rear Jack separate. Lower-tier members can develop both for flexible coverage, while higher tiers benefit from dedicated specialists assigned to each end of the car.

### D-198 — Separate Front Jack and Rear Jack skills

**Decision:** Front Jack and Rear Jack are separate task skills. Lower-tier members can develop both for flexible coverage, while higher tiers benefit from dedicated specialists at each end of the car.

**Rationale:** The model reflects distinct equipment and timing responsibilities without requiring separate skills for every physical corner.

**Consequence:** Individual profiles need Front Jack and Rear Jack ratings, and tier templates need coverage for both positions.

## Current question

### Q-197 — Refuel-skill scope

Refueling is available in Tiers 2 and 3 but prohibited in Tier 1 under the current regulations. The task can use one universal Refuel skill, or split into quantity handling, hose operation, and safety checks. A single skill keeps the lower-tier system focused while still allowing refuel performance to depend on crew quality and fuel quantity.

**Question:** Should Refuel remain one universal task skill for all lower-tier refueling operations?

**Recommendation:** Yes. Use one Refuel skill covering connection, fuel flow, quantity handling, and basic safety. Let fuel quantity, pressure, fatigue, equipment, and Pit Control modify the outcome without adding multiple refueling attributes.

### D-199 — Universal Refuel skill

**Decision:** Refuel is one universal task skill covering connection, fuel flow, quantity handling, and basic safety in the tiers where refueling is legal. Fuel quantity, pressure, fatigue, equipment, and Pit Control modify outcomes without creating separate refueling attributes.

**Rationale:** Lower-tier refueling remains strategically meaningful while the skill model avoids unnecessary sub-specialization.

**Consequence:** Tiers 2 and 3 need Refuel coverage in their active crew templates; Tier 1 does not require the station while refueling remains prohibited.

## Current question

### Q-198 — Crew-size limits and facilities

Facilities could increase the number of active pit-crew members within a tier, or active crew size could remain defined by regulations while facilities improve capability. Allowing facilities to add positions gives direct progression but risks letting money erase the intended tier structure.

**Question:** Should active pit-crew size remain regulation-defined, with facilities improving skills, equipment, training, and coordination rather than adding positions?

**Recommendation:** Yes. Keep active crew size and station limits regulation-defined. Let facilities improve performance, development, readiness, and coordination, while regulation changes—not spending—determine when additional specialist positions become available.

### D-200 — Regulation-defined pit-crew size

**Decision:** Active pit-crew size and station limits are defined by regulations. Facilities improve crew performance, development, readiness, equipment, and coordination, but cannot add positions within a tier. Regulation changes determine when additional specialist positions become available.

**Rationale:** Tier identity and lower-tier staffing constraints remain meaningful instead of being bypassed through facility spending.

**Consequence:** Crew-size rules must be part of the active regulations, while facilities and equipment provide bounded quality improvements within those limits.

## Current question

### Q-199 — Pit-equipment quality and condition

Pit equipment such as wheel guns, jacks, refueling hardware, and release systems can be a static background modifier or a managed team asset with quality, maintenance, and condition. Managed equipment adds another progression path but should not become a repetitive consumable-resource system.

**Question:** Should pit equipment have quality and condition that affect performance, with upgrades and scheduled maintenance rather than per-stop resource management?

**Recommendation:** Yes. Use a small number of equipment packages with quality and condition ratings. Upgrades improve speed, consistency, and safety; maintenance restores condition for money on a scheduled basis. Do not require players to manage consumables during individual stops.

### D-201 — No separately managed pit equipment

**Decision:** Pit equipment is not a separately managed roster or maintenance system. Equipment effects remain abstracted into broader facility, training, and team-performance modifiers.

**Rationale:** Individual task skills, staffing, fatigue, coordination, and tier rules already provide meaningful pit-crew decisions. A separate equipment subsystem would add detail without enough strategic value.

**Consequence:** The pit-crew model does not need equipment inventories, equipment condition, upgrade packages, or per-stop maintenance decisions.

## Current question

### Q-200 — Pit-stop outcome complexity

Pit stops can simulate every station as a detailed sub-event, or resolve the stop from station coverage, task skills, fatigue, coordination, and regulation rules into a total duration plus a small set of outcomes. The latter keeps the model readable while preserving the consequences of staffing decisions.

**Question:** Should pit stops resolve through a concise total-time model with bounded mistakes and clear explanations rather than detailed equipment-level sub-events?

**Recommendation:** Yes. Calculate station contributions and total stop time, then apply bounded consistency and safety checks that can produce outcomes such as a clean stop, a slow station, a delayed release, or a rare failed operation. Show the main cause without exposing unnecessary simulation detail.

### D-202 — Concise pit-stop resolution

**Decision:** Pit stops resolve through station contributions and total duration, followed by bounded consistency and safety checks. Outcomes include clean stops, slow stations, delayed releases, and rare failed operations, with the primary cause explained to the player.

**Rationale:** Staffing and planning remain consequential without requiring the player to inspect a detailed equipment-level event stream.

**Consequence:** Pit-stop reports need total time, station-level contributors, outcome severity, and a concise cause summary.

## Current question

### Q-201 — Pit-stop predictability and variance

Pit-stop times can be nearly deterministic, or include random variance and mistakes. Strong consistency should make outcomes more predictable, while lower consistency can create a wider range of times and a greater chance of a delay.

**Question:** Should pit stops use a predictable baseline time with bounded variance that decreases as crew consistency and coordination improve?

**Recommendation:** Yes. Make skill and staffing determine the baseline, then apply modest variance based on consistency, fatigue, coordination, pressure, and conditions. Reserve major failures for rare, clearly signaled events so randomness creates tension without deciding races routinely.

### D-203 — Predictable pit-stop baselines with bounded variance

**Decision:** Pit-crew skills and staffing determine a predictable baseline stop time. Consistency, fatigue, coordination, pressure, and conditions add modest variance, while major failures remain rare and clearly signaled.

**Rationale:** Better crews are reliably better, but race-day pressure still creates understandable uncertainty without letting randomness decide outcomes routinely.

**Consequence:** Simulation needs baseline station timing, bounded variance inputs, rare-failure thresholds, and player-facing explanations for deviations.

## Current question

### Q-202 — Race-weekend pit practice

Pit crews can improve only through normal race stops and off-week training, or teams can spend limited practice time rehearsing pit stops. Practice drills would build coordination and familiarity but compete with driver setup, tyre, and fuel work for the same session time.

**Question:** Should teams be able to schedule optional pit-stop practice during race weekends at the cost of practice-session time?

**Recommendation:** Yes, but keep it lightweight. Allow a limited pit-practice plan during practice sessions that modestly improves coordination and stop familiarity for the weekend, while consuming real session time and competing with car-development work.

### D-204 — Optional race-weekend pit practice

**Decision:** Teams may schedule lightweight pit-practice plans during race weekends. Practice consumes real session time, competes with car-development work, and modestly improves crew coordination and stop familiarity for that weekend.

**Rationale:** Pit operations become part of race-weekend preparation without requiring a separate practice mode or overpowering the driver’s setup and development priorities.

**Consequence:** Practice planning needs a pit-drill option with duration, time opportunity cost, and a bounded temporary coordination/familiarity benefit.

## Current question

### Q-203 — One roster across two cars

The team can use one shared pit-crew roster for both cars, or maintain fully independent crews. A shared roster makes double-stacking and staffing depth meaningful; independent crews are simpler during simultaneous stops but require roughly twice the recruitment and development.

**Question:** Should both cars draw from one shared pit-crew roster, with no crew member available for two simultaneous stops?

**Recommendation:** Yes. Use one shared team roster. A member can support either car, but not both at the same moment; higher-tier templates can provide enough positions for parallel car coverage, while lower tiers must manage double-stack delays and crew conflicts.

### D-205 — Shared pit-crew roster for both cars

**Decision:** Both cars draw from one shared team pit-crew roster. A member cannot support both cars at the same moment. Higher-tier templates can provide parallel coverage, while lower tiers must manage double-stack delays and crew conflicts.

**Rationale:** Shared staffing creates a meaningful two-car strategy constraint and makes tier-scaled crew depth matter during races.

**Consequence:** Pit-stop simulation needs per-car crew availability, simultaneous-stop conflict detection, parallel coverage rules, and resulting delay calculations.

## Current question

### Q-204 — Simultaneous-stop priority

When both cars request a stop before the shared crew is ready, the team can use a fixed priority, allow the player to choose at the decision window, or let the simulation resolve priority automatically. A priority rule prevents ambiguity while an override preserves race-time agency.

**Question:** Should the player set a default car priority with the ability to override it when both cars need the shared crew?

**Recommendation:** Yes. Provide a default priority, such as Lead Car or First Ready, and allow an event-window override when strategy or urgency changes. The lower-priority car waits and receives a clearly reported double-stack delay.

### D-206 — Configurable simultaneous-stop priority

**Decision:** Players set a default priority for simultaneous pit requests, such as Lead Car or First Ready, and can override it at an event window. The lower-priority car waits and receives a reported double-stack delay.

**Rationale:** Teams have a predictable operating policy while retaining the ability to react to tyre damage, weather, strategy, or championship context.

**Consequence:** Race strategy needs a default pit priority, event-window overrides, urgency evaluation, and transparent double-stack delay reporting.

## Current question

### Q-205 — Car-specific crew lineups

The shared roster can use one common lineup for both cars, or let players assign preferred members to each car while retaining shared-pool fallback. Car-specific lineups create room for driver-specific priorities and familiarity, but must still respect the rule that one member cannot work two simultaneous stops.

**Question:** Should players be able to assign preferred pit-crew lineups to each car from the shared roster?

**Recommendation:** Yes. Allow preferred Car A and Car B lineups from the shared pool, with automatic fallback when a member is unavailable. A member may support both cars across separate stops, but never two overlapping stops.

### D-207 — One shared pit-crew setup per team

**Decision:** Each team fields one shared pit-crew setup for both drivers because the pit lane provides one team pit slot. There are no separate Car A and Car B lineups. The same station structure and crew assignments serve either driver, while simultaneous stops are resolved through the team’s priority and queue rules. This supersedes D-206’s car-specific lineup decision.

**Rationale:** The pit-lane structure makes a single team setup the correct operational model and keeps staffing focused on one cohesive crew.

**Consequence:** Lineup management uses one team roster and one active station template. Driver-specific preferences do not create separate crews; when both cars stop together, the second car waits for the shared setup.

## Current question

### Q-206 — Weekend pit-crew setup changes

The single shared setup can be fixed for the whole weekend, or players can rotate members and assignments between practice, qualifying, sprint, and race sessions. Session-level changes make fatigue and training relevant without allowing constant mid-stop reconfiguration.

**Question:** Should players be able to change the shared pit-crew setup between race-weekend sessions, but not during an active pit stop?

**Recommendation:** Yes. Allow lineup and assignment changes between sessions, subject to availability and fatigue. Lock the setup once a session or race is underway, with only the planned priority and pit-strategy decisions remaining adjustable.

### D-208 — Session-based setup changes with delegation

**Decision:** The single shared pit-crew setup can be changed between race-weekend sessions, subject to fatigue and availability, but is locked once a session or race begins. Players may delegate lineup management to the chief mechanic.

**Rationale:** Players who want direct control can optimize the crew, while delegation keeps pit operations manageable and reinforces the chief mechanic’s team-management role.

**Consequence:** The chief mechanic needs an automated lineup process that can produce a session-ready crew setup and explain its changes to the player.

## Current question

### Q-207 — Chief-mechanic lineup authority

The chief mechanic can either freely choose the best available lineup, or operate within player-defined constraints such as required station coverage, fatigue limits, and preferred specialists. Constraints preserve player intent while allowing automation to handle routine adjustments.

**Question:** Should players define lineup rules and constraints that the chief mechanic must follow when automating the pit-crew setup?

**Recommendation:** Yes. Let players set required coverage, minimum skill thresholds, fatigue limits, and specialist preferences. The chief mechanic fills the lineup within those rules, reports any compromises, and never changes the setup after the session has started.

### D-209 — Constraint-based chief-mechanic automation

**Decision:** Players define required coverage, skill thresholds, fatigue limits, and specialist preferences for automated lineup selection. The chief mechanic fills the setup within those rules, reports compromises, and cannot change it after the session begins.

**Rationale:** Automation follows the player’s intended operating policy instead of silently making decisions that could undermine staffing or safety priorities.

**Consequence:** Lineup rules need configurable constraints, validation, compromise reporting, and session-lock behavior.

## Current question

### Q-208 — Hard and soft lineup constraints

Some lineup rules should never be violated, while others can be treated as preferences when the roster cannot satisfy everything. Required station coverage and unsafe fatigue levels are safety-critical; minimum skill thresholds and specialist preferences can be softened if the chief mechanic explains the compromise.

**Question:** Should station coverage and safety limits be hard constraints, while skill thresholds and preferences are soft constraints?

**Recommendation:** Yes. Never violate required station coverage or safety/fatigue limits. Treat skill thresholds and specialist preferences as soft constraints, and clearly report when the automated lineup must compromise.

### D-210 — Hard safety constraints and soft skill preferences

**Decision:** Automated lineup selection never violates required station coverage or safety/fatigue limits. Skill thresholds and specialist preferences are soft constraints that can be compromised when necessary, with a clear report to the player.

**Rationale:** Automation remains safe and predictable while still making the player’s preferences useful when the roster supports them.

**Consequence:** The lineup evaluator needs hard-failure validation, soft-preference scoring, and explicit compromise reporting.

## Current question

### Q-209 — Chief-mechanic influence

The chief mechanic can be a purely administrative automation switch, or a real staff role whose leadership, communication, and operational expertise affect lineup recommendations and crew coordination. The chief mechanic should not replace the individual task skills of the pit crew.

**Question:** Should the chief mechanic’s staff abilities affect automated lineup quality and crew coordination?

**Recommendation:** Yes. Use the chief mechanic’s existing leadership, communication, and operational expertise to improve lineup recommendations, coordination, and compromise handling. Keep individual pit-stop station timing driven by the assigned crew members’ task skills.

### D-211 — Chief mechanic as supervisory staff

**Decision:** The chief mechanic’s leadership, communication, and operational expertise affect automated lineup quality, coordination, and compromise handling, while individual station timing remains driven by pit-crew task skills.

**Rationale:** Delegated automation has a meaningful staff-quality dimension without allowing the chief mechanic to replace the physical skill requirements of the pit crew.

**Consequence:** Chief mechanic staff records need relevant abilities and a clear connection to lineup automation and crew coordination.

## Current question

### Q-210 — Chief mechanic and active stations

The chief mechanic can count as one of the physical pit-crew positions, or remain a supervisory role outside the active station count. Combining the roles helps very small teams, but it can make the person responsible for coordination unavailable for hands-on work.

**Question:** Should the chief mechanic be a separate supervisory role that does not occupy an active pit-crew station?

**Recommendation:** Yes. Keep the chief mechanic outside the active station count. This preserves clear responsibility for lineup planning, communication, and safe coordination while the physical crew fills the regulated stations.

### D-212 — Separate chief-mechanic supervisory role

**Decision:** The chief mechanic is a supervisory staff role outside the active pit-crew station count. They manage lineup planning, communication, and coordination while the physical crew fills the regulated stations.

**Rationale:** Leadership responsibilities remain clear and do not reduce the physical coverage available during a stop.

**Consequence:** Chief mechanic staffing is managed separately from pit-crew station slots and cannot substitute for required physical crew coverage.

## Current question

### Q-211 — Individual and crew-wide training

Pit-crew training can focus on one member’s task skill, improve the whole crew’s coordination, or use only one of those approaches. Individual drills build specialization and versatility; crew drills build shared timing and communication.

**Question:** Should pit-crew training support both individual task focus and whole-crew coordination programs?

**Recommendation:** Yes. Allow individual training to improve selected task skills and crew-wide drills to improve coordination and shared familiarity. Use limited training capacity and meaningful time costs, but avoid requiring players to schedule every member separately.

### D-213 — Individual task training and crew drills

**Decision:** Pit-crew development supports both individual task training and whole-crew coordination programs. Individual programs improve selected task skills; crew drills improve coordination and shared familiarity. Training uses limited capacity and meaningful time costs without requiring separate scheduling for every member.

**Rationale:** Teams can address specific station weaknesses while also building the collective timing needed for reliable stops.

**Consequence:** Training systems need individual focus, crew-wide drills, capacity limits, time costs, and separate effects on task skills versus coordination.

## Current question

### Q-212 — Pit-crew development ceilings

Pit-crew members can improve indefinitely toward tier limits, or each member can have potential ceilings that shape their long-term value. Ceilings make recruitment and training choices matter, but should not make a poor early hire permanently useless.

**Question:** Should each pit-crew member have bounded development potential for their task skills?

**Recommendation:** Yes. Give members bounded task-skill ceilings that vary by person. Show estimates for candidates and make the limits clearer through scouting, hiring, and development, while allowing useful secondary-skill growth below the ceiling.

### D-214 — Bounded individual pit-crew potential

**Decision:** Each pit-crew member has bounded development ceilings that vary by person and task. Candidate ceilings are estimated through scouting, and secondary skills can continue to develop usefully below their individual limits.

**Rationale:** Long-term staffing value depends on both current ability and development fit without making early recruitment mistakes permanently unrecoverable.

**Consequence:** Pit-crew profiles need current task ratings, task-specific potential estimates, development progress, and scouting confidence.

## Current question

### Q-213 — Per-task potential model

Potential can be one overall value for a member, or separate ceilings for Front Jack, Rear Jack, Wheel Gun, Tire Off, Tire On, Refuel, Repair, and Pit Control/Release. A per-task model better represents versatile versus specialized crew members.

**Question:** Should pit-crew potential be tracked separately for each task skill?

**Recommendation:** Yes. Use task-specific potential ceilings. This allows a member to be an elite future Wheel Gun specialist, a strong generalist, or someone whose best development path is cross-training across several stations.

### D-215 — Task-specific pit-crew potential

**Decision:** Pit-crew potential is tracked separately for each task skill. Members can have different long-term ceilings for specialist tasks and cross-training paths.

**Rationale:** Task-specific potential supports meaningful recruiting and development choices for both specialist and versatile lower-tier crew.

**Consequence:** Training and scouting must evaluate each task independently rather than relying on one overall potential score.

## Current question

### Q-214 — Changing primary specialties

A member’s primary specialties can remain fixed, or long-term training can shift which tasks are strongest. Fixed specialties make profiles easy to read; trainable specialties let teams adapt versatile crew to changing tier templates and vacancies.

**Question:** Should long-term training be able to change a member’s primary and secondary specialties?

**Recommendation:** Yes, with gradual movement. Training can shift a member’s strongest tasks over time, but natural potential ceilings remain fixed and specialization changes should require sustained focus rather than a quick reset.

### D-216 — Gradual pit-crew specialization changes

**Decision:** Sustained training can gradually change a pit-crew member’s strongest and secondary tasks. Natural task-specific potential ceilings remain fixed, and specialization cannot be reset quickly.

**Rationale:** Versatile members can adapt to new tier templates and vacancies without making specialist identity or long-term development meaningless.

**Consequence:** Training progression needs momentum, focus duration, and fixed potential ceilings for each task.

## Current question

### Q-215 — Skill decay and station familiarity

Core task skill can remain permanent once learned, while station familiarity and crew coordination can fade when members are not used together. Full skill decay would make roster rotation overly punishing; no decay would make long-term assignment choices less meaningful.

**Question:** Should unused members retain core task skills while gradually losing only station familiarity and lineup coordination?

**Recommendation:** Yes. Preserve trained task ratings, but let station familiarity and shared coordination fade modestly with disuse. Practice or race-weekend assignments should restore those values quickly enough to support rotation.

### D-217 — Persistent skills with fading familiarity

**Decision:** Trained pit-crew task ratings persist. Station familiarity and shared lineup coordination fade modestly with disuse and recover through practice or race-weekend assignments.

**Rationale:** Rotation remains viable without making established skills disappear, while active use still matters for reliable teamwork.

**Consequence:** Crew profiles need persistent task ratings plus separate familiarity and coordination state that changes with assignments.

## Current question

### Q-216 — Reserve pit-crew coverage

Teams can operate only with their active station lineup, or maintain a limited reserve pool for illness, fatigue, contracts, and emergency replacements. Reserves add roster depth but should not bypass the regulated active crew size.

**Question:** Should a limited reserve pool cover unavailable or fatigued active members between race-weekend sessions?

**Recommendation:** Yes. Allow a small reserve pool that the chief mechanic can use between sessions while respecting the active crew template. Reserve members should carry a modest familiarity and coordination penalty until they work with the active lineup.

### D-218 — Limited reserve pit-crew pool

**Decision:** Teams may maintain a small reserve pool to replace unavailable or fatigued active members between sessions. Reserves respect the active crew template and begin with a modest familiarity and coordination penalty until integrated with the main lineup.

**Rationale:** Reserves provide resilience without allowing teams to bypass tier-based active staffing limits.

**Consequence:** Roster rules need reserve eligibility, replacement timing, reserve readiness, and integration effects.

## Current question

### Q-217 — Reserve capacity by tier

Reserve positions can be unlimited, chosen freely by the team, or defined by each tier’s regulations. Regulation-defined reserve capacity keeps staffing differences meaningful while still letting players choose which individuals fill those slots.

**Question:** Should each tier define a separate maximum number of reserve pit-crew positions?

**Recommendation:** Yes. Let regulations define active positions and reserve capacity separately. Lower tiers should have fewer reserve slots, while higher tiers can support more depth; the player chooses which qualified individuals occupy the available reserves.

### D-219 — Regulation-defined reserve capacity

**Decision:** Each tier’s regulations define active pit-crew positions and reserve capacity separately. Lower tiers have fewer reserve slots, while higher tiers can support more depth. Players choose which qualified individuals fill those slots.

**Rationale:** Reserve depth becomes another tier-scaled constraint without allowing unlimited staffing to bypass the intended structure.

**Consequence:** Regulation templates need active and reserve position limits, and roster validation must enforce both independently.

## Current question

### Q-218 — Timing of reserve replacements

An active member may become unavailable or too fatigued during a race weekend. Replacement can occur only between sessions, preserving the locked setup, or during a session before the next stop, which adds reactive flexibility but complicates the race model.

**Question:** Should reserve replacements happen only between race-weekend sessions, with the current session using its locked lineup?

**Recommendation:** Yes. Apply replacements between sessions only. If a member becomes unavailable during an active session, the team operates with the locked setup and receives the resulting coverage or performance penalty.

### D-220 — Session-locked reserve replacements

**Decision:** Reserve replacements occur only between race-weekend sessions. If a member becomes unavailable during an active session, the team continues with the locked setup and receives the resulting coverage or performance penalty.

**Rationale:** Race-weekend staffing remains predictable and preserves the importance of preparation while still allowing recovery between sessions.

**Consequence:** The active setup is immutable during a session, and unavailability must affect the current session through reduced coverage, slower stops, or increased risk.

## Current question

### Q-219 — Locking concrete tier templates

The task and staffing rules are now defined broadly, but the actual station counts still need to be set for Tiers 3, 2, and 1. Those templates should scale specialization and parallel capacity without copying real-world teams so literally that the game becomes difficult to manage.

**Question:** Should we now define the concrete active and reserve station templates for each tier?

**Recommendation:** Yes. Define the tier templates next, starting with a minimal Tier 3 crew, then adding specialization and parallel capacity through Tier 2 and Tier 1. Keep the exact counts game-balanced rather than requiring a strict real-world structure.

### D-221 — Concrete tier-template design

**Decision:** Pit-crew planning now moves from broad rules to concrete active and reserve station templates, beginning with a minimal combined-role Tier 3 crew and scaling specialization and parallel capacity through Tiers 2 and 1.

**Rationale:** Exact station counts are needed to make the task-skill, staffing, reserve, and tier-progression systems playable and testable.

**Consequence:** Each tier needs a defined active roster, reserve capacity, required coverage, flexible roles, and the task skills expected for each position.

## Current question

### Q-220 — Tier 3 active crew template

Tier 3 should emphasize versatility and smaller staffing. A proposed baseline is eight active members: one Front Jack, one Rear Jack, four multi-skilled tire/wheel workers who can cover Wheel Gun, Tire Off, and Tire On, one Refuel specialist, and one Repair/Flex member. The chief mechanic handles supervisory Pit Control rather than occupying a physical station.

**Question:** Should Tier 3 begin with this eight-member combined-role template?

**Recommendation:** Yes. Use eight active positions for Tier 3: two jacks, four combined tire/wheel positions, one Refuel position, and one Repair/Flex position. This creates the lower-tier need for versatile staff while leaving clear room for Tiers 2 and 1 to add specialization and parallel capacity.

### D-222 — Tier 3 eight-member active template

**Decision:** Tier 3 uses eight active positions: one Front Jack, one Rear Jack, four combined Tire/Wheel Gun positions, one Refuel position, and one Repair/Flex position. The chief mechanic provides supervisory Pit Control outside the physical station count.

**Rationale:** The template is small enough to require versatile personnel while covering the core lower-tier pit operations.

**Consequence:** Tier 3 staffing validation must check eight active positions, combined Tire/Wheel Gun capability, Refuel coverage, Repair/Flex coverage, and separate chief-mechanic oversight.

## Current question

### Q-221 — Tier 3 reserve capacity

Tier 3 can have no reserve positions, or one reserve position that provides resilience without materially expanding the small-roster advantage. The reserve should be versatile enough to cover a missing station but cannot join the active stop setup unless a between-session replacement occurs.

**Question:** Should Tier 3 allow one reserve pit-crew position?

**Recommendation:** Yes. Allow one reserve position in Tier 3. It should favor a versatile member with useful Jack, Tire/Wheel Gun, Refuel, or Repair skills and be activated only between sessions.

### D-223 — Tier 3 three-member reserve pool

**Decision:** Tier 3 allows three reserve pit-crew positions rather than one. Reserves provide rotation and coverage for fatigue or unavailability, activate only between sessions, and do not increase the active eight-member pit-stop setup.

**Rationale:** A single reserve would not provide enough depth when multiple members need rest or when more than one station becomes unavailable across a weekend.

**Consequence:** Tier 3 roster limits are eight active positions plus three reserve positions. Reserve selection should favor versatile members who can cover several lower-tier tasks.

## Current question

### Q-222 — Tier 2 active crew template

Tier 2 can retain the Tier 3 combined-role structure or begin separating tire and wheel-gun work. A proposed ten-member template is one Front Jack, one Rear Jack, two Wheel Guns, two Tire Off positions, two Tire On positions, one Refuel position, and one Repair/Flex position. The chief mechanic remains outside the physical station count for Pit Control.

**Question:** Should Tier 2 use this ten-member active template with separate tire-off, tire-on, and wheel-gun specialization?

**Recommendation:** Yes. Use ten active positions: two jacks, two Wheel Guns, two Tire Off, two Tire On, one Refuel, and one Repair/Flex. This is a meaningful step above Tier 3 without reaching Tier 1’s full parallel four-gunner and eight-tire-handler structure.

### D-224 — Tier 2 ten-member active template

**Decision:** Tier 2 uses ten active positions: one Front Jack, one Rear Jack, two Wheel Guns, two Tire Off, two Tire On, one Refuel, and one Repair/Flex. The chief mechanic remains outside the physical station count for Pit Control.

**Rationale:** Tier 2 introduces meaningful separation between wheel-gun and tire-handling work while retaining lower-tier refueling and a flexible repair position.

**Consequence:** Tier 2 staffing validation must check ten active positions, separate Tire Off and Tire On coverage, two Wheel Gun positions, Refuel coverage, Repair/Flex coverage, and chief-mechanic oversight.

## Current question

### Q-223 — Tier 2 reserve capacity

Tier 2 can use the same three-reserve depth as Tier 3, or add reserve positions as the active crew becomes larger and more specialized. More reserves make rotation and specialist coverage more reliable without changing the active station template.

**Question:** Should Tier 2 allow four reserve pit-crew positions?

**Recommendation:** Yes. Allow four reserves in Tier 2. This provides enough depth to cover fatigue and specialist absences while keeping the active ten-member structure regulation-limited.

### D-225 — Tier 2 four-member reserve pool

**Decision:** Tier 2 allows four reserve pit-crew positions. Reserves provide rotation and specialist coverage while the active ten-member station structure remains regulation-limited.

**Rationale:** Tier 2’s increased specialization creates more opportunities for fatigue or absence to affect a critical station, so it needs more depth than Tier 3.

**Consequence:** Tier 2 roster limits are ten active positions plus four reserve positions.

## Current question

### Q-224 — Tier 1 active crew template

Tier 1 can use the full parallel structure described earlier: one Front Jack, one Rear Jack, four Wheel Guns, four Tire Off positions, four Tire On positions, and two Repair positions. Refueling remains absent because Tier 1 prohibits race refueling, and the chief mechanic remains outside the physical station count for Pit Control.

**Question:** Should Tier 1 use this sixteen-member active template with full wheel and tire specialization?

**Recommendation:** Yes. Use sixteen active positions: two jacks, four Wheel Guns, four Tire Off, four Tire On, and two Repair. This gives Tier 1 the largest parallel pit operation and clearly distinguishes it from the combined-role lower tiers.

### D-226 — Tier 1 sixteen-member active template

**Decision:** Tier 1 uses sixteen active positions: one Front Jack, one Rear Jack, four Wheel Guns, four Tire Off, four Tire On, and two Repair. Refueling is absent under Tier 1 regulations, and the chief mechanic remains outside the physical station count for Pit Control.

**Rationale:** Tier 1 receives the full parallel wheel and tire operation, with dedicated repair capacity and no lower-tier refueling station.

**Consequence:** Tier 1 staffing validation must check sixteen active positions and the full specialist coverage defined by the template.

## Current question

### Q-225 — Tier 1 reserve capacity

Tier 1 can use four reserves like Tier 2, or expand reserve depth to match its much larger specialist active crew. A larger reserve pool helps protect critical specialist stations and supports rotation across longer race weekends.

**Question:** Should Tier 1 allow six reserve pit-crew positions?

**Recommendation:** Yes. Allow six reserves in Tier 1. This provides meaningful depth across specialized stations without allowing reserves to increase the sixteen-member active setup during a stop.

### D-227 — Tier 1 six-member reserve pool

**Decision:** Tier 1 allows six reserve pit-crew positions. Reserves provide depth across specialized stations and do not increase the sixteen-member active setup during a stop.

**Rationale:** A large specialist crew needs enough reserve depth to protect critical positions and support rotation across demanding race weekends.

**Consequence:** Tier 1 roster limits are sixteen active positions plus six reserve positions.

## Current question

### Q-226 — Reserve coverage assignments

Reserve members can remain unassigned until a vacancy occurs, or each reserve can have preferred primary and secondary coverage stations. Preferred coverage makes automated replacement faster and lets players build a deliberate depth chart without turning reserves into permanent active positions.

**Question:** Should each reserve have preferred primary and secondary coverage stations for automated replacement?

**Recommendation:** Yes. Let players define preferred coverage for each reserve, with secondary options based on their task profile. The chief mechanic uses those preferences and current fatigue, skill, and coordination when selecting a replacement.

### D-228 — Preferred reserve coverage

**Decision:** Each reserve has preferred primary and secondary coverage stations. The chief mechanic uses those preferences alongside task skill, fatigue, and coordination when selecting a replacement.

**Rationale:** Reserves become an intentional depth chart rather than an undifferentiated list of available staff.

**Consequence:** Reserve profiles need coverage preferences, fallback options, and replacement scoring within the active tier template.

## Current question

### Q-227 — Reserve integration practice

Reserves can remain outside crew drills, or participate in selected practice sessions to build familiarity with the active lineup. Including them improves resilience, but training too many people at once can dilute limited practice capacity.

**Question:** Should selected reserve members participate in pit-practice and crew drills to build readiness before replacing an active member?

**Recommendation:** Yes. Allow selected reserves to join crew drills and pit practice. The chief mechanic should prioritize reserves marked as likely coverage options, while training capacity prevents the entire reserve pool from receiving full benefits every time.

### D-229 — Reserve integration through practice

**Decision:** Selected reserves may participate in crew drills and pit practice to build readiness. The chief mechanic prioritizes likely coverage options, while limited training capacity prevents the full reserve pool from receiving maximum benefits every time.

**Rationale:** Reserve depth becomes useful before an emergency rather than functioning as a purely reactive replacement list.

**Consequence:** Practice planning needs reserve participation choices, readiness gains, and training-capacity tradeoffs.

## Current question

### Q-228 — Tier-template transition timing

When a team is promoted, demoted, or affected by a regulation change, its active and reserve template can change immediately, at the next race, or only at the next season. Mid-weekend changes would be disruptive; delayed changes give teams time to recruit and train for the new structure.

**Question:** Should tier-template changes take effect between seasons or at the next event, never during an active race weekend?

**Recommendation:** Yes. Apply normal promotion and regulation-template changes at the next event or season transition, with no changes during an active weekend. Give teams advance notice and a preparation window to fill new positions.

### D-230 — Advance-notice tier-template changes

**Decision:** Promotion and regulation-template changes take effect at the next event or season transition, never during an active race weekend. Teams receive advance notice and a preparation window to recruit, train, and assign the required crew.

**Rationale:** Staffing changes are predictable and actionable rather than appearing as an unexpected mid-weekend disruption.

**Consequence:** The calendar and regulations need effective dates, advance notices, and a staffing-preparation period before template validation becomes active.

## Current question

### Q-229 — Understrength operation after template changes

A team may still lack enough qualified crew when a larger template becomes active. The game can block race entry until every position is filled, or allow temporary understrength operation with clear performance penalties and emergency staffing pressure.

**Question:** Should teams be allowed to race temporarily understrength after a template change, with slower and less consistent pit stops rather than being blocked from entering?

**Recommendation:** Yes. Allow understrength operation as an emergency state. Preserve hard coverage validation for a normal lineup, but apply transparent speed, consistency, and safety penalties until the team fills the missing positions.

### D-231 — Understrength emergency operation

**Decision:** Teams may enter events understrength after a template change. Normal lineup validation still identifies missing required coverage, but the team receives transparent speed, consistency, and safety penalties until the positions are filled.

**Rationale:** A staffing shortfall creates a meaningful management problem without making promotion or regulation changes capable of blocking a season outright.

**Consequence:** The game needs understrength status, missing-position reporting, penalty calculations, and prompts for recovery actions.

## Current question

### Q-230 — Temporary emergency pit crew

An understrength team can recruit temporary crew for a single event or operate only with its permanent roster. Emergency hires preserve playability and create a financial tradeoff, but should have lower familiarity and coordination with the established team.

**Question:** Should teams be able to hire temporary emergency pit-crew members to cover missing positions for a race weekend?

**Recommendation:** Yes. Allow short-term emergency contracts with an immediate cost, limited availability, and reduced familiarity/coordination. Emergency members cover the active template temporarily but do not expand the permanent roster or reserve capacity.

### D-232 — Temporary emergency pit-crew contracts

**Decision:** Teams may hire temporary pit-crew members for a single race weekend. Emergency contracts have immediate costs, limited availability, and reduced familiarity/coordination. They cover the active template temporarily without expanding permanent roster or reserve capacity.

**Rationale:** Emergency staffing provides a recoverable response to regulation or promotion changes while preserving the value of established team cohesion.

**Consequence:** The staff market needs temporary pit-crew offers, event-limited assignments, costs, and reduced integration effects.

## Current question

### Q-231 — Converting emergency crew to permanent staff

Temporary crew can leave after the event, or the team can receive an option to offer a permanent contract afterward. A post-event offer makes emergency hiring a possible scouting and recruitment path without forcing the player to retain every replacement.

**Question:** Should teams be able to offer a permanent contract to a temporary emergency crew member after the race weekend?

**Recommendation:** Yes. Allow a post-weekend permanent offer when the member is willing and a roster slot is available. Keep the decision optional, with the temporary member’s observed performance and clarified profile informing the offer.

### D-233 — Permanent offers after emergency service

**Decision:** After a temporary emergency contract, teams may offer the member a permanent contract if the member is willing and a permanent roster or reserve slot is available. The offer is optional and can use observed performance and a clarified skill profile.

**Rationale:** Emergency hiring can become a legitimate scouting and recruitment path without forcing teams to retain every short-term replacement.

**Consequence:** Temporary contracts need an end-of-event decision point, member willingness, roster-slot validation, and permanent-offer terms.

## Current question

### Q-232 — Pit-crew contract structure

Pit-crew members can use a simple one-time hiring cost, or the broader staff contract model with salary, duration, renewal, and role terms. Individual contracts make retention and specialist recruitment meaningful but should avoid excessive clause management.

**Question:** Should permanent pit-crew members use standard staff contracts with salary, duration, renewal, and role terms?

**Recommendation:** Yes. Use the standard staff contract model with salary, duration, renewal windows, and a small number of role or retention terms. Avoid detailed performance-bonus clauses for individual pit-crew members at launch.

### D-234 — Standard pit-crew contracts

**Decision:** Permanent pit-crew members use standard staff contracts with salary, duration, renewal windows, and limited role or retention terms. Detailed individual performance-bonus clauses are excluded at launch.

**Rationale:** Pit-crew staffing fits the broader personnel economy without creating a separate contract subsystem or excessive clause management.

**Consequence:** Pit-crew recruitment and retention need salary, duration, renewal, role terms, and roster-slot validation.

## Current question

### Q-233 — Contracted crew role expectations

Contracts can omit role expectations entirely, or identify a member as an expected active specialist, reserve, or development hire. Role expectations can guide salary and retention while remaining separate from the exact station assignment chosen for a session.

**Question:** Should pit-crew contracts include an expected active, reserve, or development role?

**Recommendation:** Yes. Include a broad role expectation that affects salary and retention, but keep session-level station assignments flexible. A reserve can be activated, and an active member can rotate, without rewriting the contract every weekend.

### D-235 — Contract role expectations without rigid station locks

**Decision:** Pit-crew contracts may specify an expected Active, Reserve, or Development role. The expectation affects salary and retention, but session-level station assignments remain flexible and do not require contract changes.

**Rationale:** Contract expectations communicate career and roster status without turning every lineup rotation into a negotiation.

**Consequence:** The personnel system needs broad pit-crew role labels and separate session-level assignment state.

## Current question

### Q-234 — Permanent pit-crew role changes

A member’s expected role can change temporarily through rotation, or permanently through a contract event. Permanent promotion from reserve to active or reassignment to development should affect expectations and potentially salary, while routine session rotation should not.

**Question:** Should permanent changes between Active, Reserve, and Development roles require a contract update or renegotiation?

**Recommendation:** Yes. Handle permanent role changes through a contract update or renegotiation, while allowing temporary session rotations without changing the contract.

### D-236 — Contract-managed permanent pit-crew roles

**Decision:** Permanent changes between Active, Reserve, and Development roles require a contract update or renegotiation. Temporary session rotations do not change the contract.

**Rationale:** Long-term expectations, salary, and retention remain aligned without adding negotiation overhead to normal race-weekend rotation.

**Consequence:** Pit-crew contracts need role-change events distinct from temporary lineup assignments.

## Current question

### Q-235 — Pit-crew task rating scale

Pit-crew task skills can use the same 0–100 scale as other player-facing attributes, or a separate compressed scale. A shared scale makes scouting, training, comparisons, and tier templates easier to understand.

**Question:** Should all pit-crew task skills use a 0–100 rating scale?

**Recommendation:** Yes. Use 0–100 for Front Jack, Rear Jack, Wheel Gun, Tire Off, Tire On, Refuel, Repair, and related task skills. Keep tier performance differences in station requirements, modifiers, and context rather than changing the meaning of the rating scale.

### D-237 — Shared personnel rating standard

**Decision:** Driver, staff, and pit-crew attributes use the same 0–100 rating scale. The meaning of the scale remains consistent across personnel systems, while role-specific formulas and context determine how ratings affect outcomes.

**Rationale:** A shared scale makes scouting, development, comparisons, contracts, and player-facing reports easier to understand across the entire team.

**Consequence:** Personnel data, training, scouting, and UI display conventions need one common rating standard.

## Current question

### Q-236 — Derived pit-crew summary rating

The game can show only the individual task ratings, or provide a derived overall pit-crew rating for quick comparison. A summary is useful for browsing candidates, but it must not replace task-specific evaluation because a versatile generalist and a specialist may have the same overall value for different templates.

**Question:** Should pit crews have a derived summary rating for convenience while station performance always uses the relevant task skills?

**Recommendation:** Yes. Show a derived summary rating for quick comparisons, but never use it as the primary simulation input. Station outcomes should always use the assigned member’s relevant task skills, fatigue, familiarity, and coordination.

### D-238 — Display-only pit-crew summary rating

**Decision:** Pit-crew members have a derived summary rating for quick comparisons, but the summary rating never drives simulation. Station outcomes use the assigned member’s relevant task skills, fatigue, familiarity, and coordination.

**Rationale:** A summary helps players browse candidates and rosters without hiding the task-specific decisions that determine actual pit-stop performance.

**Consequence:** Candidate and roster views need a clear distinction between summary information and the task ratings used by the simulation.

## Current question

### Q-237 — Template-fit evaluation

The same member can be more valuable in different tiers: Tier 3 rewards broad coverage and Refuel capability, while Tier 1 rewards high Wheel Gun, Tire Off, Tire On, and Repair specialization. A universal summary rating cannot represent that difference by itself.

**Question:** Should the game show a template-fit score alongside the universal summary rating?

**Recommendation:** Yes. Show a tier-template fit score based on required coverage, relevant task skills, versatility, and available positions. Keep it as planning guidance only; the simulation still uses the underlying member and crew state.

### D-239 — Tier-template fit guidance

**Decision:** Candidate and roster views show a tier-template fit score based on required coverage, relevant task skills, versatility, and available positions. The score is planning guidance only and does not replace the underlying simulation inputs.

**Rationale:** Players can compare candidates against their actual regulatory needs rather than relying on a misleading universal rating.

**Consequence:** Recruitment and staffing views need template-aware fit calculations that update when tier regulations or roster requirements change.

## Current question

### Q-238 — Pit-stop timing composition

Pit-stop stations operate partly in parallel: jacks, wheel guns, tire handling, refueling, and repairs can overlap according to the tier template. Total duration can be the sum of every task, or the critical path through dependent station phases, with the slowest required work determining the stop’s baseline.

**Question:** Should total pit-stop duration use a critical-path model based on parallel station phases rather than simply summing every task time?

**Recommendation:** Yes. Model station phases and dependencies, let parallel work overlap, and use the slowest required path to determine baseline duration. Apply Pit Control and release timing after the physical work, with clear reports for the station that extended the stop.

### D-240 — Critical-path pit-stop timing

**Decision:** Pit-stop duration uses station phases and dependencies. Parallel work overlaps, the slowest required path determines baseline duration, and Pit Control/release timing follows physical service. Reports identify the station or phase that extended the stop.

**Rationale:** The model reflects how a larger specialist crew gains time through parallel capacity without requiring a detailed event for every individual movement.

**Consequence:** Pit-stop simulation needs a phase graph, station durations, dependency rules, parallelism, and critical-path reporting.

## Current question

### Q-239 — Pit-stop phase graph

The critical path can use a small fixed sequence: pit entry and stop, car stabilization and jacks, parallel wheel/tire and refueling work, optional repair work, then safe release. Tier templates determine which phases and stations are active.

**Question:** Should pit stops use this small fixed phase graph with tier-specific optional stations?

**Recommendation:** Yes. Use Entry/Stop, Stabilize/Lift, Service, Optional Repair, and Release phases. Allow Service tasks to overlap where the tier template supports it, while Refuel and Repair remain optional according to regulations and strategy.

### D-241 — Fixed pit-stop phase graph

**Decision:** Pit stops use Entry/Stop, Stabilize/Lift, Service, Optional Repair, and Release phases. Service work overlaps where the tier template supports it, while Refuel and Repair remain optional according to regulations and strategy.

**Rationale:** A small predictable phase graph provides enough structure for critical-path timing without exposing unnecessary simulation complexity.

**Consequence:** Pit-stop plans and event outcomes need phase activation, dependencies, and clear timing contributions.

## Current question

### Q-240 — Repair-phase triggers

The Repair phase can occur only when the player plans a wing change or adjustment, or it can also be forced by discovered damage. Planned repairs give the player control over timing; forced repairs represent damage that cannot safely be ignored.

**Question:** Should Repair activate when planned by the player, or when damage requires it, with unplanned repairs adding time to the stop?

**Recommendation:** Use both triggers. Let players plan routine wing changes and adjustments, while significant damage can force an unplanned repair. Show the expected repair time when possible and apply the repairer’s skill to the outcome.

### D-242 — Planned and damage-forced repairs

**Decision:** The Repair phase activates for player-planned wing changes or adjustments and for significant damage that requires an unplanned repair. Expected repair time is shown when possible, and repairer skill affects the result.

**Rationale:** Players retain control over routine work while severe damage can create unavoidable operational consequences.

**Consequence:** Damage and pit-stop planning need repair triggers, estimated duration, repair-skill effects, and unplanned-repair reporting.

## Current question

### Q-241 — Damage severity and repair choice

Damage can be treated as always repairable, or divided into minor damage that may be carried and major damage that requires a stop repair. A simple severity distinction lets players trade immediate pit time against reduced performance without creating a complex damage taxonomy.

**Question:** Should minor damage be optional to repair while major damage forces a Repair phase?

**Recommendation:** Yes. Use a simple minor/major distinction. Minor damage can be carried with a clear performance or reliability penalty; major damage forces repair when the car pits and can impose additional risk if ignored where regulations allow it.

### D-243 — Simple minor/major damage states

**Decision:** Damage uses a simple minor/major distinction. Minor damage may be carried with a clear performance or reliability penalty. Major damage forces repair when the car pits and can create additional risk if ignored where regulations allow it.

**Rationale:** Damage remains strategically meaningful without requiring a large catalog of repair-specific states.

**Consequence:** Damage simulation needs severity, carry-or-repair rules, repair duration, and risk/performance effects.

## Current question

### Q-242 — Player control of pit-stop service

The player can manually sequence every station task, or choose the intended service package while the chief mechanic and crew execute the station order automatically. Service-package control preserves strategic agency without making the player manage physical timing details.

**Question:** Should players choose the pit-stop service package while the crew automatically handles station order and timing?

**Recommendation:** Yes. The player chooses tyres, refuel quantity where legal, planned repairs, and other service decisions. The chief mechanic executes the phase order using the locked crew setup and reports the resulting duration and delays.

### D-244 — Service-package strategy with automatic execution

**Decision:** Players choose pit-stop service packages, including tyres, legal refueling quantity, and planned repairs. The chief mechanic automatically executes the phase order using the locked crew setup and reports duration and delays.

**Rationale:** Players control strategic intent while the crew handles physical sequencing and timing.

**Consequence:** Race strategy needs service packages, crew execution rules, duration estimates, and pit-stop result reporting.

## Current question

### Q-243 — Pit-stop package planning and overrides

Pit-stop packages can be created only when a car enters the pit lane, or planned in advance with event triggers and an override option. Advance plans make tyre, fuel, repair, and crew-priority decisions actionable without requiring constant manual input.

**Question:** Should players define pit-stop packages in advance with conditional triggers and override them at race decision windows?

**Recommendation:** Yes. Support preplanned packages triggered by lap, tyre condition, fuel range, weather, safety-car events, or damage, with event-window overrides when the race develops differently.

### D-245 — Conditional pit-stop packages

**Decision:** Players can define pit-stop packages in advance with triggers based on lap, tyre condition, fuel range, weather, safety-car events, or damage. Packages can be overridden at race decision windows.

**Rationale:** Teams can prepare coherent strategies while retaining agency when race conditions diverge from the plan.

**Consequence:** Strategy plans need conditional package rules, trigger evaluation, priority handling, and event-window override controls.

## Current question

### Q-244 — Delegated pit-package selection

Lineup automation and service-package selection can remain separate, or the chief mechanic can also choose a package when the player delegates race operations. Delegation should follow player-defined strategy constraints rather than silently changing tyre, fuel, or repair priorities.

**Question:** Should players be able to delegate pit-stop package selection to the chief mechanic using explicit strategy constraints?

**Recommendation:** Yes. Offer optional package automation with player-defined hard rules and preferences, such as minimum fuel range, tyre-condition limits, repair priorities, and refueling legality. The chief mechanic should report the selected package and any compromise.

### D-246 — Constraint-based pit-package automation

**Decision:** Players may delegate pit-stop package selection to the chief mechanic using explicit hard rules and preferences. Hard rules include regulation compliance, safety, and minimum fuel range; preferences include tyre condition, repair priority, and performance tradeoffs. The chief mechanic reports the package and any compromise.

**Rationale:** Delegation remains useful without allowing automation to make unsafe or illegal strategic choices.

**Consequence:** Package automation needs hard-rule validation, preference scoring, compromise reporting, and clear player override controls.

## Current question

### Q-245 — Hard and soft pit-package constraints

Automated package selection needs a clear response when rules conflict. Regulation legality, safety, and a car’s minimum required fuel range should never be violated; tyre preference, repair timing, and performance optimization can be traded off when necessary.

**Question:** Should regulation, safety, and minimum fuel-range rules be hard constraints while tyre, repair, and performance preferences remain soft?

**Recommendation:** Yes. Never violate legality, safety, or minimum fuel range. Allow the chief mechanic to compromise softer preferences and clearly report the tradeoff.

### D-247 — Hard legality and safety rules for package automation

**Decision:** Automated pit-package selection never violates regulation legality, safety, or minimum fuel-range requirements. Tyre, repair, and performance preferences remain tradeable, and any compromise is reported.

**Rationale:** Automation remains trustworthy while still making strategic tradeoffs when multiple valid packages are possible.

**Consequence:** Package selection reports need hard-rule status, chosen soft preferences, compromises, and override options.

## Current question

### Q-246 — Pit-stop result reporting

Pit-stop feedback can show only the total duration, or explain the result through total versus expected time, phase contributions, the slowest station, and any delay or safety event. Clear reporting is necessary for players to improve staffing and strategy.

**Question:** Should each pit-stop report show total time, expected time, phase breakdown, primary delay cause, and service result?

**Recommendation:** Yes. Show total versus expected time, the phase or station that added time, service completion, release outcome, and any relevant fatigue, coordination, or damage context. Keep the default summary concise with optional detail.

### D-248 — Layered pit-stop reports

**Decision:** Each pit-stop report shows total versus expected time, the phase or station that added time, service completion, release outcome, and relevant fatigue, coordination, or damage context. The default summary is concise, with optional detail.

**Rationale:** Players can understand the operational result quickly and investigate enough detail to make better staffing and strategy decisions.

**Consequence:** Pit-stop reporting needs expected-time comparison, phase/station attribution, service outcomes, and expandable detail.

## Current question

### Q-247 — Experience from completed pit stops

Pit stops can contribute to station familiarity and crew coordination, while individual task skills improve mainly through training. Successful work can build confidence; poor stops can create lessons or review opportunities without instantly increasing the responsible member’s rating.

**Question:** Should completed pit stops improve station familiarity and crew coordination, with training remaining the primary path for task-skill growth?

**Recommendation:** Yes. Successful stops build familiarity and coordination gradually. Slow or failed stops should create review and learning opportunities, but should not grant large instant skill increases or replace focused training.

### D-249 — Pit-stop experience and coordination growth

**Decision:** Completed pit stops gradually improve station familiarity and crew coordination. Slow or failed stops create review and learning opportunities, but do not grant large instant skill increases or replace focused training.

**Rationale:** Race work naturally develops the crew while preserving training as the main way to target specific task weaknesses.

**Consequence:** Pit-stop results need to feed familiarity and coordination progression, with bounded gains based on participation and outcome quality.

## Current question

### Q-248 — Historical pit-stop benchmarks

The team can evaluate each stop only in the moment, or retain historical benchmarks by station, crew lineup, and tier. A compact history helps players identify recurring weaknesses and measure whether training or staffing changes worked.

**Question:** Should the game retain summarized historical pit-stop benchmarks for the team?

**Recommendation:** Yes. Track rolling benchmarks for total time, phase time, station contribution, consistency, and release quality. Keep the history summarized and decision-oriented rather than exposing a full telemetry archive.

### D-250 — Summarized historical pit-stop benchmarks

**Decision:** The team retains rolling benchmarks for total time, phase duration, station contribution, consistency, and release quality. Historical data remains summarized and decision-oriented rather than a full telemetry archive.

**Rationale:** Players can measure operational progress and identify recurring problems without managing a separate analytics system.

**Consequence:** Pit-stop history needs aggregation, relevant context, trend calculation, and player-facing comparisons.

## Current question

### Q-249 — Chief-mechanic improvement recommendations

Historical benchmarks can remain passive information, or the chief mechanic can identify recurring station weaknesses and recommend training, lineup changes, reserve development, or recruitment. Recommendations should inform the player without silently changing the team’s plan.

**Question:** Should the chief mechanic turn pit-stop history into actionable training, staffing, and recruitment recommendations?

**Recommendation:** Yes. Provide concise recommendations tied to recurring evidence, such as weak Tire On performance or poor release consistency. Keep them advisory by default, with optional delegation for routine training or lineup adjustments.

### D-251 — Post-weekend pit-crew recommendation emails

**Decision:** After each race weekend, the chief mechanic sends recommendation emails based on pit-stop history. The player retains final control by approving recommendations as written or editing the proposed training, staffing, lineup, or recruitment changes before applying them.

**Rationale:** Recommendations arrive at a natural review point and support informed delegation without silently changing the team’s plans.

**Consequence:** The post-weekend inbox needs evidence-linked pit-crew recommendations, editable proposed actions, and explicit player approval before changes are applied.

## Current question

### Q-250 — Recommendation email grouping

The chief mechanic can send one email for every issue, or consolidate related findings into one post-weekend pit-crew review. A consolidated message reduces inbox noise while still allowing separate actions for training, staffing, and lineup concerns.

**Question:** Should pit-crew recommendations arrive as one consolidated post-weekend review email with separate actionable sections?

**Recommendation:** Yes. Use one consolidated review with sections for performance trends, staffing gaps, training priorities, reserve readiness, and recruitment needs. Each section should have its own approve or edit action.

### D-252 — Consolidated post-weekend pit-crew review

**Decision:** Pit-crew recommendations arrive as one post-weekend review email with separate actionable sections for performance trends, staffing gaps, training priorities, reserve readiness, and recruitment needs. Each section can be approved or edited independently.

**Rationale:** The player receives a coherent review without inbox spam and can act on only the areas that matter.

**Consequence:** Recommendation emails need section-level actions, editable proposals, and separate application status.

## Current question

### Q-251 — Evidence behind recommendations

Recommendations can state only the proposed action, or show the evidence that produced it. Players need to know whether a staffing change is based on one unusual stop or a recurring trend before approving a cost or lineup change.

**Question:** Should each recommendation include supporting evidence, confidence, expected impact, and relevant cost or time tradeoffs?

**Recommendation:** Yes. Include the benchmark or trend behind the recommendation, confidence level, expected benefit, cost/time impact, and the main tradeoff. Keep the explanation concise but inspectable.

### D-253 — Evidence-backed pit-crew recommendations

**Decision:** Each pit-crew recommendation includes its supporting benchmark or trend, confidence, expected benefit, cost/time impact, and main tradeoff. The explanation remains concise but inspectable.

**Rationale:** Players can distinguish recurring operational problems from isolated events before approving consequential changes.

**Consequence:** Recommendation generation needs evidence links, confidence, projected effects, tradeoffs, and readable review summaries.

## Current question

### Q-252 — Approval requirement for recommendations

Recommendations can always require explicit player approval, or low-risk routine actions can be applied automatically under delegated chief-mechanic authority. Explicit approval preserves control over staffing and spending; automatic application reduces inbox work but risks unwanted changes.

**Question:** Should every pit-crew recommendation require explicit player approval before it changes training, staffing, lineup, or recruitment plans?

**Recommendation:** Yes. Require explicit approval or player edits for every recommendation at launch. Delegated automation can prepare proposals, but it should not silently change personnel, spending, or strategic plans.

### D-254 — Explicit approval for pit-crew recommendations

**Decision:** Every pit-crew recommendation requires explicit player approval or edits before changing training, staffing, lineup, recruitment, spending, or other plans. The chief mechanic cannot apply changes silently at launch.

**Rationale:** Delegation reduces analysis work while the player retains ownership of consequential team decisions.

**Consequence:** Recommendation actions need pending, approved, edited, and declined states with no implicit execution.

## Current question

### Q-253 — Unresolved recommendation handling

A player may leave a recommendation unresolved after the post-weekend review. It can disappear, remain as a persistent inbox item, or carry forward with refreshed evidence. Persistence prevents important staffing issues from being lost, while refreshing avoids acting on stale information.

**Question:** Should unresolved pit-crew recommendations carry forward and refresh with new evidence rather than disappearing or duplicating?

**Recommendation:** Yes. Keep one persistent recommendation thread, refresh its evidence after later weekends, and increase its urgency only when the underlying problem remains or worsens.

### D-255 — Persistent, refreshed recommendation threads

**Decision:** Unresolved pit-crew recommendations remain as one persistent thread. New evidence refreshes the thread, and urgency increases only when the underlying problem persists or worsens.

**Rationale:** Important staffing issues remain visible without producing duplicate inbox messages or treating old evidence as new.

**Consequence:** Recommendation state needs persistence, evidence refresh, urgency changes, and thread-level history.

## Current question

### Q-254 — Dismissing pit-crew recommendations

Players may decide that a recommendation is not worth pursuing now. The recommendation can close permanently, remain active indefinitely, or be dismissed with a cooldown and return only when new evidence materially changes the situation.

**Question:** Should players be able to dismiss a recommendation with a cooldown before it can return?

**Recommendation:** Yes. Allow dismissal with a cooldown. Reopen the recommendation only when new evidence materially changes the issue or the player’s previous decision becomes unsafe or infeasible.

### D-256 — Dismissible recommendation cooldowns

**Decision:** Players can dismiss pit-crew recommendations with a cooldown. A dismissed recommendation reopens only when new evidence materially changes the issue or the prior decision becomes unsafe or infeasible.

**Rationale:** The player can reject low-value advice without being repeatedly nagged, while genuinely changed risks remain visible.

**Consequence:** Recommendation threads need dismissal state, cooldown timing, reopen triggers, and safety overrides.

## Current question

### Q-255 — Recommendation priority

Multiple pit-crew recommendations may arrive together, ranging from a safety-critical coverage gap to an efficiency improvement. Prioritization can use safety, race impact, financial cost, and time sensitivity so the player understands what needs attention first.

**Question:** Should pit-crew recommendations have visible priority based on safety, race impact, and time sensitivity?

**Recommendation:** Yes. Use clear priority levels driven primarily by safety and required coverage, then race impact and deadlines. High-priority safety recommendations should remain visible even when lower-priority advice is dismissed.

### D-257 — Prioritized pit-crew recommendations

**Decision:** Pit-crew recommendations have visible priority driven primarily by safety and required coverage, then race impact and deadlines. High-priority safety recommendations remain visible even when lower-priority advice is dismissed.

**Rationale:** The player can distinguish urgent operational risks from ordinary optimization suggestions.

**Consequence:** Recommendations need priority calculation, visible urgency, persistence rules, and safety-priority overrides.

## Current question

### Q-256 — Acknowledging safety-critical issues

Safety-critical pit-crew issues can remain advisory, or require the player to acknowledge the risk before advancing. Acknowledgement does not have to mean accepting the recommendation; it confirms that the player has seen the issue and chosen how to handle it.

**Question:** Should safety-critical pit-crew recommendations require explicit acknowledgement before the player can advance?

**Recommendation:** Yes. Require acknowledgement for safety-critical coverage or release risks, while allowing the player to proceed with an explicit understrength or risk-accepted decision. Ordinary performance recommendations remain non-blocking.

### D-258 — Acknowledged safety-risk decisions

**Decision:** Safety-critical pit-crew issues require explicit acknowledgement before advancement. The player may accept the risk or operate understrength, but ordinary performance recommendations remain non-blocking.

**Rationale:** The game preserves player agency while ensuring that significant operational risks cannot be missed.

**Consequence:** Safety recommendations need acknowledgement state, risk-acceptance actions, and advancement gating.

## Current question

### Q-257 — Duration of risk acceptance

An accepted pit-crew safety risk can remain valid indefinitely, expire at the end of the current session, or require re-acknowledgement at the next race weekend. Short-lived acceptance prevents an old decision from silently carrying into changed staffing or regulation conditions.

**Question:** Should a risk-accepted pit-crew decision apply only until the next session or race weekend, after which it must be reviewed again?

**Recommendation:** Yes. Keep risk acceptance temporary and tied to the current operational context. Reopen the issue at the next relevant session or weekend, especially if crew availability, regulations, or risk severity changes.

### D-259 — Temporary pit-crew risk acceptance

**Decision:** Accepted pit-crew safety risks apply only to the current operational context and reopen at the next relevant session or race weekend, or sooner if crew availability, regulations, or severity changes.

**Rationale:** A player’s risk decision remains meaningful without silently carrying stale safety assumptions into a different situation.

**Consequence:** Safety-risk decisions need expiry, revalidation triggers, and renewed acknowledgement when conditions materially change.

## Current question

### Q-258 — Pre-stop service estimates

Before committing to a pit-stop package, the player can receive only a package label, or see estimated duration, variance, service effects, and likely position impact. Estimates should communicate uncertainty rather than promise exact results.

**Question:** Should each available pit-stop package show an estimated duration range, risk level, and expected race impact before selection?

**Recommendation:** Yes. Show expected total time, a bounded range, service completion, safety/consistency risk, and projected position or gap impact. Mark estimates as more or less confident based on crew familiarity, conditions, and available information.

### D-260 — Pre-stop package estimates

**Decision:** Available pit-stop packages show expected total time, a bounded range, service completion, safety/consistency risk, and projected position or gap impact. Estimate confidence reflects crew familiarity, conditions, and available information.

**Rationale:** Players can compare strategic options using understandable uncertainty rather than exact but misleading predictions.

**Consequence:** Race decision windows need package previews, confidence indicators, risk estimates, and projected timing/position effects.

## Current question

### Q-259 — Shared pit-slot queue estimates

Because the team has one shared pit slot and one crew setup, a package may incur additional delay if the other car is scheduled to pit nearby. The preview can ignore this until the event occurs, or show expected queue and double-stack effects.

**Question:** Should pit-stop package estimates include expected shared-crew queue or double-stack delay when both cars may pit close together?

**Recommendation:** Yes. Include expected queue delay and identify which car has priority. Show the estimate as conditional because the final delay depends on the other car’s actual stop timing and any event-window changes.

### D-261 — Conditional shared-slot delay estimates

**Decision:** Pit-stop package previews include expected shared-crew queue or double-stack delay and identify the priority car. The estimate is conditional on the other car’s actual stop timing and event-window changes.

**Rationale:** The player can evaluate the real two-car cost of a stop without treating a forecast as a guaranteed result.

**Consequence:** Package previews need shared-slot state, priority context, conditional delay estimates, and update behavior when the other car’s plan changes.

## Current question

### Q-260 — Pit-stop decision deadlines

At an event window, the player may respond manually, rely on a preplanned package, or delegate to the chief mechanic. Without a clear deadline and fallback, a missed decision could create an arbitrary or unfair result.

**Question:** Should each pit-stop decision window have a deadline with the preplanned package or delegated chief-mechanic plan as the automatic fallback?

**Recommendation:** Yes. Give the player a bounded response window. If no response arrives, apply the active preplanned package or the chief mechanic’s constrained recommendation, then report that the fallback was used.

### D-262 — Deadline-based pit-stop decisions

**Decision:** Each pit-stop decision window has a bounded response period. If the player does not respond, the active preplanned package or the chief mechanic’s constrained recommendation is applied and the fallback is reported.

**Rationale:** Race decisions remain time-sensitive while automation provides predictable behavior when the player does not intervene.

**Consequence:** Event windows need deadlines, fallback selection, applied-plan reporting, and integration with strategy automation.

## Current question

### Q-261 — Safe fallback package

A preplanned package may become invalid because of regulations, fuel state, damage, tyre availability, or crew coverage. The fallback can fail, use the closest legal package, or apply a conservative safe service package.

**Question:** Should an invalid or missing pit-stop plan automatically fall back to the closest legal and safe package?

**Recommendation:** Yes. Use a conservative legal fallback that preserves minimum fuel range, required safety, and available service coverage. Avoid optional work unless damage makes it necessary, and report why the fallback was used.

### D-263 — Conservative legal pit-stop fallback

**Decision:** Invalid or missing pit-stop plans automatically fall back to the closest legal and safe package. The fallback preserves minimum fuel range, required safety, and available crew coverage, avoids optional work unless necessary, and reports the reason.

**Rationale:** Automation remains safe and understandable when conditions invalidate a preplanned strategy.

**Consequence:** Fallback selection needs legality checks, minimum-service rules, damage handling, and explanatory reporting.

## Current question

### Q-262 — Reusable pit-stop package templates

Players can rebuild each package during every race weekend, or save named templates such as Tyre Change, Full Service, Emergency Damage, and Refuel Stop. Templates reduce repetitive planning but must be validated against the active tier’s regulations and available crew.

**Question:** Should players be able to save reusable, regulation-aware pit-stop package templates?

**Recommendation:** Yes. Allow named reusable templates that automatically validate against current regulations, tyre/fuel availability, crew coverage, and tier-specific services. Flag invalid templates rather than applying them silently.

### D-264 — No reusable pit-package templates at launch

**Decision:** Reusable saved pit-stop package templates are deferred. Players configure packages for each race weekend, while the system’s conservative legal fallback remains available when a plan is invalid or missing.

**Rationale:** The core pit-stop strategy is defined without adding a separate template-library management layer.

**Consequence:** Launch scope does not include saved package templates or template validation workflows; this remains a future convenience feature.

## Current question

### Q-263 — Pit-crew launch scope

The launch pit-crew model now includes task-based members, tier-scaled active and reserve templates, shared two-car staffing, fatigue and rotation, training, scouting, contracts, chief-mechanic delegation, critical-path pit timing, service packages, and post-weekend recommendations. Additional systems such as equipment inventories and reusable package templates are intentionally deferred.

**Question:** Is this pit-crew scope defined well enough to lock for launch and move to the next game system?

**Recommendation:** Yes. Lock this as the launch pit-crew scope and defer further detail until the core race-weekend simulation proves which additional systems provide real strategic value.

### D-265 — Pit-crew launch scope locked

**Decision:** The launch pit-crew scope is locked around task-based individual skills, tier-scaled active and reserve templates, one shared team setup, fatigue and rotation, training, scouting, contracts, chief-mechanic delegation, critical-path pit timing, service packages, and post-weekend recommendations. Equipment inventories and reusable package templates are deferred.

**Rationale:** The pit-crew model has enough depth for meaningful staffing and race strategy without adding low-value management layers before the race simulation is proven.

**Consequence:** Future pit-crew work should validate and balance this scope rather than expand it by default.

## Current question

### Q-264 — Race-weekend event cadence

The race weekend is a separate UI from the normal management dashboard. Its simulation can run continuously with frequent player control, or advance automatically between meaningful event windows where the player reviews information and makes decisions for one or both cars.

**Question:** Should we define the exact race-weekend event windows and pause/advance cadence next?

**Recommendation:** Yes. Use chronological event windows with automatic simulation between them, pausing for meaningful decisions such as practice-stint changes, qualifying runs, pit opportunities, weather shifts, damage, and team orders. Preserve default plans when the player does not intervene.

### D-266 — Chronological race-weekend event windows

**Decision:** Race-weekend sessions advance chronologically between meaningful event windows. The simulation pauses for practice-stint changes, qualifying runs, pit opportunities, weather shifts, damage, team orders, and other consequential decisions. Default plans apply when the player does not intervene.

**Rationale:** The player controls important moments without needing constant real-time input during routine simulation.

**Consequence:** Race-weekend UI and simulation need event scheduling, pause points, default-plan fallback, and session-specific decision types.

## Current question

### Q-265 — Common session phase structure

Each practice, qualifying, sprint, and main-race session can use a different screen flow, or share a common structure: Pre-session Planning, Live Session, Decision Windows, Session End, and Review. A common skeleton makes the separate race-weekend UI easier to learn while allowing each session to expose different decisions.

**Question:** Should every race-weekend session use this common phase structure with session-specific decisions inside it?

**Recommendation:** Yes. Use Pre-session Planning, Live Session, Decision Windows, Session End, and Review for every session. Practice, qualifying, and races can customize the available actions without changing the overall rhythm.

### D-267 — Common race-weekend session phases

**Decision:** Every race-weekend session uses Pre-session Planning, Live Session, Decision Windows, Session End, and Review. Practice, qualifying, sprint, and main-race sessions customize available actions within that shared structure.

**Rationale:** A consistent session rhythm reduces UI learning cost while preserving meaningful differences between session types.

**Consequence:** Each session type needs phase-specific actions, transition rules, event windows, and review data within the common framework.

## Current question

### Q-266 — Pre-session planning scope

Pre-session Planning can include car setup, tyre allocation, fuel baseline, pit packages, crew lineup, driver instructions, and weather contingencies. Once Live Session begins, structural choices can lock while event-window decisions remain adjustable.

**Question:** Should Pre-session Planning configure all baseline car, driver, strategy, and pit-crew plans before the session begins, with only event-window adjustments available afterward?

**Recommendation:** Yes. Configure setup, tyres, fuel, pit packages, crew lineup, driver instructions, and contingencies before the session. Lock structural staffing and setup at start, while allowing planned strategy overrides at decision windows.

### D-268 — Pre-session baseline and live-session overrides

**Decision:** Pre-session Planning configures setup, tyres, fuel, pit packages, crew lineup, driver instructions, and contingencies. Structural staffing and setup lock when Live Session begins, while planned strategy overrides remain available at decision windows.

**Rationale:** The player prepares a coherent baseline without losing the ability to react to evolving race conditions.

**Consequence:** Session transitions need lock rules, editable strategy fields, and decision-window overrides distinct from structural setup changes.

## Current question

### Q-267 — Live-session speed and pause control

The Live Session can run at one fixed speed, offer speed controls, or allow manual pause in addition to automatic pauses at decision windows. Speed and pause controls help players manage long sessions, but strategic changes should still occur through defined decision windows.

**Question:** Should Live Session support speed controls and manual pause while automatically pausing at meaningful decision windows?

**Recommendation:** Yes. Provide normal speed, faster simulation, and manual pause. Automatically pause at decision windows, but keep strategic changes tied to valid event windows and do not allow rewinding.

### D-269 — Player-controlled live-session pacing

**Decision:** Live Session supports normal speed, faster simulation, and manual pause. The simulation automatically pauses at meaningful decision windows, while strategic changes remain tied to valid windows and the session cannot be rewound.

**Rationale:** Players can control session pacing without turning every moment into a manual decision or allowing retroactive strategy changes.

**Consequence:** Race-weekend simulation needs speed modes, pause control, event-window detection, and no-rewind state handling.

## Current question

### Q-268 — Decision-window interruption frequency

The game can pause for every minor event, group routine events into short batches, or interrupt only for consequential decisions. Too many interruptions make the weekend tedious; too few reduce player agency and hide important information.

**Question:** Should decision windows be prioritized by consequence, with safety-critical events pausing immediately and routine events grouped or summarized?

**Recommendation:** Yes. Pause immediately for safety, damage, pit, weather, and strategic events that require timely action. Batch routine telemetry and low-impact updates into summaries so the player is not interrupted unnecessarily.

### D-270 — Consequence-prioritized decision windows

**Decision:** Safety, damage, pit, weather, and consequential strategy events can pause the session immediately. Routine telemetry and low-impact updates are batched into summaries.

**Rationale:** Event interruptions reflect decision importance instead of simulation noise.

**Consequence:** Events need consequence levels, pause behavior, summary behavior, and timing rules.

## Current question

### Q-269 — Player-configurable event pauses

Players can use one fixed interruption policy, or customize which event categories pause, notify, or summarize. Customization supports different management styles, but safety-critical events should not be silently disabled.

**Question:** Should players customize pause and notification behavior for non-critical race-weekend events?

**Recommendation:** Yes. Provide sensible presets plus per-category controls for non-critical events. Keep safety-critical events as mandatory acknowledgement events, while routine updates can be paused, notified, or summarized.

### D-271 — Configurable non-critical event behavior

**Decision:** Players receive sensible pause-policy presets and can customize pause or notification behavior for non-critical event categories. Safety-critical events remain mandatory acknowledgement events; routine updates can be paused, notified, or summarized.

**Rationale:** Players can choose their preferred level of race-weekend involvement without losing awareness of serious risks.

**Consequence:** Race-weekend settings need event-category controls, presets, mandatory-event rules, and session-specific application.

## Current question

### Q-270 — Session-specific pause policies

Practice may benefit from more detailed interruptions, while a race may need fewer but more urgent decision windows. A single global policy is simpler; session-specific policies better match the decisions and pace of each session type.

**Question:** Should players have separate pause and notification policies for practice, qualifying, sprint, and main-race sessions?

**Recommendation:** Yes. Provide session-specific defaults and allow overrides for each session type. Practice can favor detailed feedback, while qualifying and races emphasize high-impact strategy, safety, weather, and pit events.

### D-272 — Session-specific race-weekend pause policies

**Decision:** Players have separate pause and notification policies for practice, qualifying, sprint, and main-race sessions. Practice defaults favor detailed feedback, while qualifying and races emphasize high-impact strategy, safety, weather, and pit events.

**Rationale:** Each session type has a different decision density and strategic purpose, so one interruption policy would not fit all of them.

**Consequence:** Race-weekend settings need session-specific defaults, overrides, and event-category behavior.

## Current question

### Q-271 — Practice event triggers

Practice is organized around planned stints with setup, tyre, fuel, and part changes consuming time. Decision windows can occur at fixed time intervals, after each planned stint, or when meaningful test results, weather changes, damage, or car issues occur.

**Question:** Should practice pause primarily at stint boundaries and meaningful test events rather than at fixed time intervals?

**Recommendation:** Yes. Pause after planned stints and when important test results, weather changes, damage, or car issues occur. Use time thresholds only as a fallback so the player can manage the session without constant interruptions.

### D-273 — Stint-driven practice event windows

**Decision:** Practice pauses primarily at planned stint boundaries and meaningful test events, including important results, weather changes, damage, and car issues. Time thresholds act as a fallback rather than the primary interruption cadence.

**Rationale:** Practice remains centered on the player’s test program instead of arbitrary timer interruptions.

**Consequence:** Practice simulation needs stint completion events, test-result triggers, condition changes, and fallback time thresholds.

## Current question

### Q-272 — Shared practice timeline

Both cars can run practice stints concurrently, but setup changes, parts, tyres, fuel, pit-crew support, and engineering attention may be shared resources. Players can schedule each car independently, or plan both cars on one shared timeline that exposes conflicts before the session begins.

**Question:** Should practice planning use one shared timeline for both cars with visible resource conflicts and time costs?

**Recommendation:** Yes. Plan both cars in one shared timeline. Show conflicts for tyres, parts, crew, engineers, setup changes, and session time before execution, while allowing both cars to run concurrently when resources permit.

### D-274 — Shared two-car practice planning

**Decision:** Practice uses one shared timeline for both cars. Resource conflicts and time costs for tyres, parts, crew, engineers, setup changes, and session time are visible before execution; both cars can run concurrently when resources permit.

**Rationale:** The player can coordinate both cars as one team and understand the operational cost of competing practice programs.

**Consequence:** Practice planning needs shared-resource reservations, conflict warnings, concurrency rules, and timeline validation.

## Current question

### Q-273 — Stint changeover time

Changes between practice stints require the car to return, be serviced, receive setup or part changes, and deploy again. This changeover can be treated as free planning time or consume a duration based on the work requested.

**Question:** Should every practice stint include an automatic changeover duration based on setup, tyre, fuel, and part changes before the car can return to track?

**Recommendation:** Yes. Add changeover time automatically for the requested work and show it directly on the shared timeline. Simple tyre or setup changes should be quicker than part swaps, repairs, or major configuration changes.

### D-275 — Automatic practice changeover costs

**Decision:** Every practice stint includes automatic changeover time for setup, tyre, fuel, and part work. Changeover duration appears on the shared timeline, with simple changes faster than part swaps, repairs, or major configuration changes.

**Rationale:** Practice time becomes a real planning resource and exposes the operational cost of testing different configurations.

**Consequence:** Changeover durations need task definitions, resource requirements, concurrency rules, and timeline display.

## Current question

### Q-274 — Invalid practice schedules

A practice plan may exceed session time, double-book shared resources, or request unavailable parts and tyres. The game can silently trim the plan, auto-resolve conflicts, or block execution and show suggested fixes.

**Question:** Should invalid practice schedules be blocked with clear conflicts and suggested fixes rather than silently changed?

**Recommendation:** Yes. Prevent execution until required conflicts are resolved, show the exact cause, and offer suggestions such as moving a stint, shortening work, changing the car program, or removing an unavailable request.

### D-276 — Validated practice schedules

**Decision:** Practice execution is blocked when the schedule exceeds session time, double-books shared resources, or requests unavailable parts or tyres. The game shows the exact conflict and suggests schedule or program changes rather than silently altering the plan.

**Rationale:** The player retains control over the test program and can understand every compromise before the session begins.

**Consequence:** Practice planning needs validation, conflict explanations, fix suggestions, and an explicit ready-to-run state.

## Current question

### Q-275 — Delegated practice-plan creation

The player can build every practice schedule manually, or delegate plan creation to the chief mechanic using goals and constraints such as setup learning, part testing, tyre work, and driver comparison. Automation should propose a valid plan for approval rather than silently changing the program.

**Question:** Should the chief mechanic be able to generate a valid practice plan from player-defined goals and constraints?

**Recommendation:** Yes. Offer optional practice-plan generation that prioritizes the player’s chosen goals, respects shared resources and time, and presents a valid plan for approval or editing before execution.

### D-277 — Approved delegated practice planning

**Decision:** The chief mechanic may generate a valid practice plan from player-defined goals and constraints. The plan respects shared resources and session time and requires player approval or edits before execution.

**Rationale:** Delegation reduces scheduling work without allowing automation to choose an unapproved test program.

**Consequence:** Practice planning needs goal inputs, constraint handling, generated-plan previews, approval, and editing.

## Current question

### Q-276 — Practice-goal priority

Practice programs may pursue setup learning, part testing, tyre understanding, driver comparison, qualifying preparation, or race preparation at the same time. Without priorities, automated planning cannot resolve conflicts when time or resources are limited.

**Question:** Should players rank practice goals by priority for each car and the team as a whole?

**Recommendation:** Yes. Allow primary, secondary, and optional goals for each car, plus shared team priorities. The chief mechanic allocates scarce time and resources in that order and reports which goals were completed, reduced, or skipped.

### D-278 — Ranked per-car and team practice goals

**Decision:** Players rank primary, secondary, and optional practice goals for each car, with shared team priorities. The chief mechanic allocates scarce time and resources in that order and reports completed, reduced, and skipped goals.

**Rationale:** Automated planning has a clear decision hierarchy when practice time and resources cannot satisfy every objective.

**Consequence:** Practice goals need priority levels, per-car assignments, team-level priorities, completion status, and tradeoff reporting.

## Current question

### Q-277 — Locked practice stints

Players can provide only ranked goals, or lock specific mandatory stints such as a part comparison, qualifying run, or race-setup validation. Locked stints preserve high-value tests but reduce the chief mechanic’s ability to optimize the remaining schedule.

**Question:** Should players be able to lock mandatory practice stints that automated planning must preserve when building the schedule?

**Recommendation:** Yes. Allow a limited number of locked stints per session. The chief mechanic schedules around them, flags conflicts that make them impossible, and uses remaining time for ranked goals.

### D-279 — Locked practice stints

**Decision:** Players may lock a limited number of mandatory practice stints per session. The chief mechanic schedules around them, reports conflicts that make them impossible, and uses remaining time for ranked goals.

**Rationale:** High-value tests remain protected while automated planning still handles the rest of the session.

**Consequence:** Practice planning needs locked-stint markers, conflict validation, and separate scheduling for remaining goals.

## Current question

### Q-278 — Practice feedback timing

Practice feedback can be fully immediate, fully delayed until engineering analysis, or layered. Immediate feedback helps the player react during the session; deeper analysis needs time to compare runs, isolate variables, and account for uncertainty.

**Question:** Should practice provide immediate basic feedback during the session followed by a deeper analysis report after the session?

**Recommendation:** Yes. Show immediate pace, driver comments, tyre behavior, setup symptoms, and obvious issues. Deliver deeper comparative analysis after the session or on the next management day, with confidence and uncertainty where evidence is incomplete.

### D-280 — Layered practice feedback

**Decision:** Practice provides immediate pace, driver comments, tyre behavior, setup symptoms, and obvious issues, followed by deeper comparative analysis after the session or on the next management day. Findings include confidence and uncertainty when evidence is incomplete.

**Rationale:** The player can react during practice while still receiving more reliable engineering conclusions after analysis.

**Consequence:** Practice reporting needs immediate observations, delayed analysis, evidence confidence, and unresolved-finding states.

## Current question

### Q-279 — Driver-specific versus shared practice findings

Two cars can produce different feedback from the same test because of driver style, setup variation, traffic, or run conditions. Reports can show only separate car results, or distinguish driver-specific findings from validated team knowledge that can inform both cars.

**Question:** Should practice reports separate driver-specific findings from shared team findings?

**Recommendation:** Yes. Show each car’s observations separately, then identify findings that are common and reliable enough to become shared team knowledge. Keep driver-specific refinements attached to the relevant driver until evidence supports broader validation.

### D-281 — Separate driver and team practice knowledge

**Decision:** Practice reports separate each car’s observations from common findings that are reliable enough to become shared team knowledge. Driver-specific refinements remain attached to the relevant driver until broader evidence validates them.

**Rationale:** The team benefits from shared learning without treating every driver-specific or noisy observation as universally true.

**Consequence:** Practice knowledge needs car-level observations, team-level findings, confidence, validation state, and driver-specific attachment.

## Current question

### Q-280 — Validating shared practice findings

A shared finding can be promoted after one strong result, after repeated corroborating runs, or through explicit engineering validation. Requiring evidence protects the team from overreacting to traffic, weather, driver style, or uncontrolled variables.

**Question:** Should shared practice findings require corroborating evidence or explicit engineering validation before informing both cars?

**Recommendation:** Yes. Require repeated or well-controlled evidence, or an explicit engineering validation step, before promoting a finding to shared team knowledge. Preserve the finding with lower confidence while it remains unvalidated.

### D-282 — Evidence-based shared-finding validation

**Decision:** Shared practice findings require repeated or well-controlled evidence, or explicit engineering validation, before becoming trusted team knowledge. Unvalidated findings remain available with lower confidence.

**Rationale:** Findings become reliable through evidence rather than a single noisy run or unsupported interpretation.

**Consequence:** Practice planning and engineering analysis need validation states, evidence thresholds, follow-up tests, and confidence updates.

## Current question

### Q-281 — Validation work versus track time

Validation can happen through off-track engineering analysis, or require a controlled follow-up test that consumes practice time and resources. Some findings are analytical; others need track evidence to separate setup, driver, tyre, and condition effects.

**Question:** Should uncertain findings sometimes require a planned follow-up test that consumes practice time, while simpler findings can be validated through engineering analysis?

**Recommendation:** Yes. Let engineering analysis validate straightforward findings off-track, but require controlled follow-up stints for uncertain performance or correlation findings. Show the required time and resources before the player commits.

### D-283 — Follow-up validation stints

**Decision:** Engineering analysis can validate straightforward findings off-track, while uncertain performance or correlation findings require controlled follow-up stints that consume practice time and resources. Required costs are shown before commitment.

**Rationale:** The player understands when a conclusion requires more than desk analysis and can weigh validation against other practice goals.

**Consequence:** Validation plans need time/resource estimates, evidence requirements, and practice scheduling integration.

## Current question

### Q-282 — Validation test controls

A follow-up test is only useful if the relevant variables are controlled. The game can hide that logic, or show a concise test brief identifying what should remain constant, what changes, and what evidence will confirm or reject the finding.

**Question:** Should every follow-up validation stint show its required controls, changed variable, and success criteria before scheduling?

**Recommendation:** Yes. Show a concise test brief: controlled variables, changed variable, required run conditions, expected evidence, and what result would increase or reduce confidence.

### D-284 — Transparent validation test briefs

**Decision:** Every follow-up validation stint shows controlled variables, the changed variable, required run conditions, expected evidence, and the result criteria that will raise or lower confidence.

**Rationale:** Players understand why a test matters and what makes its result useful before spending scarce practice time.

**Consequence:** Validation plans need readable test briefs, controlled-variable definitions, success criteria, and confidence effects.

## Current question

### Q-283 — Validation result states

A follow-up test can confirm a finding, produce inconclusive evidence, or contradict the original conclusion. Treating every result as simply validated or failed hides uncertainty and makes contradictory evidence difficult to represent.

**Question:** Should validation produce three states: Validated, Inconclusive, or Refuted?

**Recommendation:** Yes. Use Validated, Inconclusive, and Refuted states. Refuted findings should reduce confidence and explain the contradiction without deleting the historical evidence.

### D-285 — Three-state practice validation

**Decision:** Follow-up validation produces Validated, Inconclusive, or Refuted states. Refuted findings reduce confidence and explain the contradiction while preserving historical evidence.

**Rationale:** The knowledge system represents confirmation, uncertainty, and contradiction without collapsing all imperfect tests into binary success or failure.

**Consequence:** Findings need validation state, confidence changes, contradiction explanations, and historical evidence retention.

## Current question

### Q-284 — Conditional knowledge after refutation

A refuted shared finding may be completely wrong, or may only apply to a particular driver, setup, tyre, weather condition, or fuel state. The game can archive it as false or retain it as a conditional observation with reduced scope and confidence.

**Question:** Should refuted shared findings be retained as conditional or driver-specific knowledge when the evidence suggests a narrower application?

**Recommendation:** Yes. Narrow the finding’s scope when possible, reclassify it as conditional or driver-specific, reduce confidence, and preserve the evidence that explains when it may still apply.

### D-286 — Conditional practice knowledge after refutation

**Decision:** Refuted shared findings are narrowed when evidence supports a conditional or driver-specific application. Confidence is reduced, and historical evidence is retained to explain the remaining scope.

**Rationale:** Contradictory results refine the team’s understanding instead of simply erasing knowledge or treating it as universally true.

**Consequence:** Knowledge records need scope, condition tags, confidence, validation history, and reclassification behavior.

## Current question

### Q-285 — Practice knowledge persistence

Validated findings can persist indefinitely, decay after inactivity, or lose confidence when regulations, car architecture, tyres, or facilities change. Persistent knowledge rewards learning, while context changes should prevent obsolete conclusions from remaining certain.

**Question:** Should validated practice knowledge persist across weekends but lose confidence after significant regulation, architecture, tyre, or facility changes?

**Recommendation:** Yes. Preserve validated knowledge as a starting point, but reduce confidence when the context changes materially. Require targeted revalidation for high-impact findings before treating them as fully current again.

### D-287 — Context-sensitive practice knowledge persistence

**Decision:** Validated practice knowledge persists across weekends, but confidence is reduced after significant regulation, car architecture, tyre, or facility changes. High-impact findings require targeted revalidation before returning to full confidence.

**Rationale:** The team retains institutional learning without treating old conclusions as automatically current after the operating context changes.

**Consequence:** Knowledge records need context links, confidence modifiers, change detection, and revalidation requirements.

## Current question

### Q-286 — Staff departure and tacit knowledge

Knowledge can belong to the team as validated documentation, or remain partly tacit in the staff who discovered and interpreted it. Staff departures should not erase proven findings, but may reduce confidence in unvalidated interpretations and specialized context.

**Question:** Should validated team knowledge survive staff departures while unvalidated or tacit findings lose confidence when key staff leave?

**Recommendation:** Yes. Preserve validated knowledge in the team record. Reduce confidence in unvalidated or tacit findings when the responsible staff leave, unless another staff member has sufficient expertise to retain and document the context.

### D-288 — Staff-departure knowledge transfer

**Decision:** Validated knowledge survives staff departures. Unvalidated or tacit findings lose confidence when responsible staff leave unless another expert can retain and document the context.

**Rationale:** Institutional knowledge is protected when proven, while undocumented expertise remains a meaningful retention and handover risk.

**Consequence:** Staff departures need knowledge ownership, expertise matching, confidence changes, and handover opportunities.

## Current question

### Q-287 — Pre-departure knowledge handover

Before a staff member leaves, the team can ignore tacit knowledge, or schedule a handover with another engineer or department lead. Handover should consume time and capacity but can preserve context around unvalidated practice findings.

**Question:** Should teams be able to schedule a pre-departure handover that transfers tacit practice knowledge to another qualified staff member?

**Recommendation:** Yes. Allow a time-limited handover before departure. Transfer confidence and context based on the receiving staff member’s expertise, with incomplete handovers preserving only part of the original tacit knowledge.

### D-289 — Time-limited tacit-knowledge handovers

**Decision:** Teams may schedule a time-limited handover before a staff member leaves. Knowledge transfer depends on the receiving staff member’s expertise, and incomplete handovers preserve only part of the original tacit context.

**Rationale:** Departure creates a manageable planning decision rather than an unavoidable knowledge loss or an automatic perfect transfer.

**Consequence:** Handover actions need duration, capacity cost, sender/recipient expertise matching, transfer confidence, and completion state.

## Current question

### Q-288 — Handover recipient recommendations

The player can choose any recipient, or the chief mechanic or department lead can recommend the best qualified recipient based on expertise, workload, role, and future responsibilities. The player should retain final approval over time and staffing costs.

**Question:** Should the chief mechanic or department lead recommend a handover recipient for player approval?

**Recommendation:** Yes. Recommend the strongest available recipient using expertise, workload, role fit, and future relevance. Let the player approve or choose another recipient before committing the handover time.

### D-290 — Recommended handover recipients

**Decision:** The chief mechanic or department lead recommends a handover recipient using expertise, workload, role fit, and future relevance. The player approves or chooses another recipient before committing time.

**Rationale:** The team receives useful personnel guidance without surrendering control over staffing priorities or capacity.

**Consequence:** Handover recommendations need expertise matching, workload awareness, recipient alternatives, and player approval.

## Current question

### Q-289 — Cross-department knowledge transfer

Tacit practice knowledge can transfer only within the same department, or to an adjacent department with reduced confidence and additional handover time. Cross-department transfer can preserve important context but should not make specialized expertise interchangeable.

**Question:** Should relevant tacit practice knowledge transfer to adjacent departments with a confidence penalty?

**Recommendation:** Yes, but limit it to adjacent roles with meaningful expertise overlap. Same-department transfers retain the most confidence; cross-department transfers take longer and preserve less context.

### D-291 — Limited cross-department handovers

**Decision:** Relevant tacit practice knowledge may transfer to adjacent departments with meaningful expertise overlap. Same-department transfers retain the most confidence; cross-department transfers take longer and preserve less context.

**Rationale:** Important knowledge can cross team boundaries without making specialized expertise interchangeable.

**Consequence:** Handover eligibility needs role adjacency, expertise overlap, duration modifiers, and confidence-transfer rules.

## Current question

### Q-290 — Locking practice knowledge scope

Practice planning, immediate and delayed feedback, driver-specific versus shared findings, validation, confidence, context changes, and staff handovers are now defined. Further detail could expand into a large knowledge-management subsystem before the core race-weekend loop is tested.

**Question:** Should we lock the practice-knowledge scope now and move to defining qualifying?

**Recommendation:** Yes. Lock the current practice-knowledge model and defer further knowledge-management detail until race-weekend testing shows a clear need.

### D-292 — Practice-knowledge scope locked

**Decision:** The launch practice-knowledge model is locked around immediate and delayed feedback, driver-specific and shared findings, evidence-based validation, confidence, context changes, and staff handovers. Further knowledge-management detail is deferred until race-weekend testing demonstrates a need.

**Rationale:** Practice has enough information depth to support meaningful testing without creating a separate knowledge-management game.

**Consequence:** Future practice work should balance and validate this scope rather than expand it by default.

## Current question

### Q-291 — Tier-specific qualifying formats

Qualifying can use one shared format across all tiers, or scale by championship level. A continuous timed session fits Tier 3’s simpler structure, a shortened knockout format fits Tier 2, and a full multi-round knockout format gives Tier 1 the highest strategic and competitive pressure.

**Question:** Should qualifying use a continuous Tier 3 format, a two-round knockout Tier 2 format, and a full multi-round knockout Tier 1 format?

**Recommendation:** Yes. Use a continuous timed session in Tier 3, a shortened two-round knockout in Tier 2, and a full multi-round knockout in Tier 1, with regulation data defining exact durations and elimination counts.

### D-293 — Regulation-votable qualifying formats

**Decision:** The launch qualifying formats are Tier 3 continuous timed qualifying, Tier 2 shortened two-round knockout qualifying, and Tier 1 full multi-round knockout qualifying. These are starting regulations and may be modified through future regulation proposals and votes.

**Rationale:** The tiers begin with clear identities while preserving the long-term possibility of regulation-driven format changes.

**Consequence:** Qualifying regulations need proposal, voting, approval, effective-date, and tier-specific format data.

## Current question

### Q-292 — Timing of qualifying regulation changes

Approved qualifying changes can take effect immediately, during the current season, at the next event, or at the next season. Advance notice and a stable effective date give teams time to prepare cars, drivers, strategies, and staff.

**Question:** Should approved qualifying-format changes normally take effect at the next season, with advance notice before teams prepare for it?

**Recommendation:** Yes. Apply normal qualifying-format changes at the next season with advance notice. Permit mid-season changes only for exceptional safety or regulatory emergencies.

### D-294 — All regulation changes begin next season

**Decision:** All approved regulation changes take effect at the next season. No regulation change applies during the current season or mid-weekend, including qualifying-format changes.

**Rationale:** Teams can plan cars, staffing, contracts, facilities, and strategy against a stable rule set throughout the current season.

**Consequence:** Regulation proposals need approval timing, advance notice, next-season effective dates, and no mid-season application path.

## Current question

### Q-293 — Qualifying-run structure

Within any qualifying format, a run can be treated as one simple lap attempt, or include preparation, out-lap, push lap, in-lap, tyre condition, fuel target, traffic, and cooldown choices. A structured run creates meaningful planning decisions while the qualifying format controls how many runs and rounds are available.

**Question:** Should each qualifying run use a structured preparation, push, and recovery sequence rather than a single instant lap attempt?

**Recommendation:** Yes. Let the player plan tyre choice, fuel target, preparation, traffic timing, push effort, and recovery. Simulate the run as a short sequence with traffic, tyre preparation, and execution affecting the final lap.

### D-295 — Structured qualifying runs

**Decision:** Each qualifying run includes planned tyre choice, fuel target, preparation, traffic timing, push effort, and recovery. The run simulates a short sequence in which tyre preparation, traffic, and execution affect the final lap.

**Rationale:** Qualifying becomes a planning and execution challenge rather than a single button press or instant lap result.

**Consequence:** Qualifying simulation needs run plans, preparation phases, push execution, recovery, traffic, tyre state, and lap-result reporting.

## Current question

### Q-294 — Shared qualifying timeline

Both cars may prepare, leave the garage, complete push laps, and recover at the same time. Tyre allocation, engineering attention, garage operations, traffic, and track position are shared team concerns even when each driver has an individual run plan.

**Question:** Should qualifying use one shared timeline for both cars with visible garage, tyre, engineering, and traffic conflicts?

**Recommendation:** Yes. Coordinate both cars on one timeline, show shared-resource and traffic conflicts, and allow concurrent runs when resources and track position permit.

### D-296 — Shared two-car qualifying timeline

**Decision:** Qualifying uses one shared timeline for both cars. Garage operations, tyres, engineering attention, traffic, and track position create visible conflicts, while concurrent runs are allowed when resources and conditions permit.

**Rationale:** The team manages qualifying as a coordinated operation rather than two isolated driver simulations.

**Consequence:** Qualifying planning needs shared-resource reservations, track-position forecasts, traffic conflicts, and concurrent-run rules.

## Current question

### Q-295 — Qualifying run-window scheduling

Players can choose exact run windows, choose only broad priorities while the chief mechanic schedules runs, or use a hybrid. Exact windows create control over traffic and track gaps, but forecasts are uncertain and can become invalid as other cars leave the pits.

**Question:** Should players schedule preferred qualifying run windows with warnings for traffic, garage, tyre, and track-position conflicts?

**Recommendation:** Yes. Allow preferred run windows and order, show predicted conflicts and track gaps, and let the chief mechanic adjust within player constraints when conditions change. Do not silently overwrite locked or high-priority runs.

### D-297 — Constraint-based qualifying run windows

**Decision:** Players may schedule preferred qualifying run windows and order, with predicted traffic, garage, tyre, and track-position conflicts. The chief mechanic may adjust within constraints when conditions change, but cannot silently overwrite locked or high-priority runs.

**Rationale:** Players control qualifying intent while the team can respond to uncertain traffic and track conditions.

**Consequence:** Run planning needs preferred and locked windows, priority levels, conflict warnings, and constrained rescheduling.

## Current question

### Q-296 — Live qualifying classification

Qualifying can reveal only completed lap results, or maintain a live provisional classification with gaps, sector information, traffic context, and tyre/fuel state. Live timing creates pressure and helps the player decide whether another run is necessary.

**Question:** Should every completed push lap update a live provisional classification with gaps and relevant sector information?

**Recommendation:** Yes. Show provisional order, lap time, gap, sector progress, tyre state, and traffic context as runs complete. Keep unrevealed competitor information appropriately uncertain when the player lacks direct data.

### D-298 — Live qualifying classification

**Decision:** Each completed push lap updates a live provisional classification with order, lap time, gap, sector progress, tyre state, and traffic context. Competitor information remains uncertain when the player lacks direct data.

**Rationale:** Qualifying provides continuous competitive feedback without exposing information the team could not reasonably know.

**Consequence:** Qualifying timing needs provisional rankings, data confidence, sector updates, competitor-information rules, and live refresh behavior.

## Current question

### Q-297 — Valid laps and best-lap classification

Qualifying classification can use every completed lap, or each driver’s best valid lap in the relevant session or round. Invalid laps should remain visible as events but cannot determine the official order.

**Question:** Should each driver’s best valid lap determine qualifying classification within the active session or round?

**Recommendation:** Yes. Use the best valid lap for classification. Show invalidated laps with a clear reason, preserve their timing context for analysis, and exclude them from official order.

### D-299 — Best-valid-lap qualifying classification

**Decision:** Each driver’s best valid lap determines classification within the active qualifying session or round. Invalidated laps remain visible with their reason and timing context but cannot determine official order.

**Rationale:** The format rewards a clean competitive lap while preserving enough information to explain lost opportunities.

**Consequence:** Timing and classification need valid-lap state, invalidation reasons, best-lap selection, and round-specific ordering.

## Current question

### Q-298 — Times across qualifying rounds

Knockout formats can carry a driver’s fastest time into the next round, or reset the timing classification at the start of each round while carrying forward eligibility, tyre condition, penalties, and strategic consequences.

**Question:** Should qualifying times reset at the start of each knockout round, with only eligibility and physical/strategic consequences carrying forward?

**Recommendation:** Yes. Reset the timed classification for each round. Carry forward who advanced, tyre condition, heat cycles, penalties, damage, and strategic information, but require a new valid lap to set the next-round order.

### D-300 — Round-reset qualifying times

**Decision:** Timed classification resets at the start of each knockout round. Advancement, tyre condition, heat cycles, penalties, damage, and strategic information carry forward, but every round requires a new valid lap for order.

**Rationale:** Each round is a fresh performance test while preserving the physical and strategic consequences of earlier running.

**Consequence:** Qualifying rounds need separate timing state, advancement state, carryover state, and reset rules.

## Current question

### Q-299 — Regulation-defined qualifying field sizes

Knockout formats need to specify how many drivers enter each round, how many advance, and how many are eliminated. Those values can be hard-coded by tier or stored in regulations so future votes can change the format without rewriting the simulation.

**Question:** Should qualifying round field sizes and advancement counts be regulation-defined rather than hard-coded?

**Recommendation:** Yes. Store entrants, advancing drivers, eliminated drivers, round durations, and tie-break rules in the active regulations. Use launch defaults for each tier and allow future regulation votes to change them.

### D-301 — Regulation-defined qualifying rounds

**Decision:** Active regulations define qualifying entrants, advancing and eliminated drivers, round durations, and tie-break rules. Launch defaults differ by tier and can be changed through future regulation votes.

**Rationale:** Qualifying formats remain data-driven and adaptable without changing the underlying simulation structure.

**Consequence:** Qualifying regulations need round definitions, field sizes, advancement rules, timing, and tie-break configuration.

## Current question

### Q-300 — Tier 3 continuous qualifying

Tier 3 can use one continuous session in which every driver competes for a best valid lap, with no elimination rounds. The session can still include run planning, traffic, tyre preparation, weather, and a final push window.

**Question:** Should Tier 3 qualifying have one continuous session with every driver eligible for the full session and classification based on the best valid lap?

**Recommendation:** Yes. Give every Tier 3 driver the full continuous session. Use best valid lap classification, with no knockout eliminations, while preserving run planning, traffic, tyre, weather, and final-push decisions.

### D-302 — Tier 3 continuous qualifying

**Decision:** Tier 3 qualifying is one continuous session in which every driver remains eligible for the full session and classification uses each driver’s best valid lap. There are no knockout eliminations.

**Rationale:** Tier 3 has the simplest qualifying structure while retaining meaningful run planning, traffic, tyre, weather, and final-push decisions.

**Consequence:** Tier 3 qualifying needs one session timing state, full-session eligibility, best-lap classification, and no advancement/elimination rounds.

## Current question

### Q-301 — Tier 2 shortened knockout

Tier 2 can use two qualifying rounds: an opening round for the full field followed by a shorter final round for the advancing drivers. Drivers eliminated in the opening round receive their relative positions from that round, while the final round determines the front of the grid.

**Question:** Should Tier 2 use two rounds, with the full field in Round 1 and only the regulation-defined advancing group competing for the top positions in Round 2?

**Recommendation:** Yes. Use a full-field opening round and a shortened final round. Round 1 orders eliminated drivers; Round 2 resets times and determines the advancing drivers’ final positions.

### D-303 — Tier 2 two-round knockout qualifying

**Decision:** Tier 2 qualifying uses a full-field opening round and a regulation-defined shortened final round. Round 1 orders eliminated drivers; Round 2 resets times and determines the advancing drivers’ final positions.

**Rationale:** Tier 2 gains knockout pressure and strategic depth without the full complexity of Tier 1’s multi-round format.

**Consequence:** Tier 2 regulations need opening-field size, advancing count, round durations, elimination ordering, and round-reset rules.

## Current question

### Q-302 — Tier 1 full knockout

Tier 1 can use three knockout rounds: a full-field opening round, a reduced middle round, and a final round for the remaining drivers. Each round resets timed classification, while earlier rounds determine who advances and the final round determines the top grid positions.

**Question:** Should Tier 1 use a three-round knockout format with regulation-defined field sizes and advancement counts for each round?

**Recommendation:** Yes. Use opening, middle, and final rounds in a full knockout structure. Reset times each round, carry advancement and physical/strategic consequences forward, and let regulations define field sizes and eliminations.

### D-304 — Tier 1 three-round knockout qualifying

**Decision:** Tier 1 qualifying uses opening, middle, and final knockout rounds with regulation-defined field sizes and advancement counts. Timed classification resets each round while advancement, tyre state, damage, penalties, and strategic consequences carry forward.

**Rationale:** Tier 1 receives the highest-pressure qualifying structure without changing the underlying run, timing, and event-window systems.

**Consequence:** Tier 1 regulations need three round definitions, field sizes, advancement counts, durations, and carryover rules.

## Current question

### Q-303 — Ordering eliminated qualifiers

Drivers eliminated in earlier rounds need final-grid positions. They can be ordered by their best valid lap in the round where they were eliminated, with drivers surviving to later rounds ranked ahead of earlier eliminations.

**Question:** Should eliminated drivers be ordered by their best valid lap in the round where they were eliminated, with later-round eliminations ahead of earlier-round eliminations?

**Recommendation:** Yes. Rank final-round eliminations first, then middle-round eliminations, then opening-round eliminations. Within each group, use the best valid lap from that driver’s final qualifying round.

### D-305 — Round-based eliminated-driver ordering

**Decision:** Final-grid ordering ranks drivers eliminated in later rounds ahead of earlier eliminations. Within each elimination group, order drivers by their best valid lap from the round where they were eliminated.

**Rationale:** Advancing farther is rewarded while each driver’s final qualifying performance determines their position within that group.

**Consequence:** Grid formation needs elimination-round history, round-specific best laps, ordering groups, and tie-break rules.

## Current question

### Q-304 — Qualifying penalties and grid formation

Qualifying penalties can be applied during the session, after qualifying, or not until the race start. Applying them after the session preserves the sporting result while allowing the final grid to reflect technical, procedural, or driver penalties.

**Question:** Should qualifying penalties be applied after classification to produce the adjusted starting grid while preserving the original qualifying order for records?

**Recommendation:** Yes. Preserve the sporting qualifying classification, then apply approved penalties to create the adjusted grid. Show both original position and final starting position with the penalty reason.

### D-306 — Revised launch qualifying regulations

**Decision:** The launch qualifying formats are revised as follows:

- Tier 3 has no qualifying session. The grid uses reverse current Drivers’ Championship order.
- Tier 2 uses one long continuous qualifying session. Every driver sets their best valid lap, and the final best laps determine the grid.
- Tier 1 retains the three-round knockout format defined in D-303.

This supersedes D-301’s Tier 3 continuous qualifying decision and D-302’s Tier 2 two-round knockout decision. All formats remain starting regulations subject to future regulation votes and next-season effective dates.

**Rationale:** Tier progression is clearer: Tier 3 emphasizes championship-order inversion, Tier 2 introduces a straightforward full-field qualifying test, and Tier 1 retains the highest-complexity knockout format.

**Consequence:** Qualifying simulation needs tier-specific format selection, reverse-grid handling, one-session Tier 2 timing, and Tier 1 knockout rounds.

## Current question

### Q-305 — Tier 3 reverse-grid ordering

Tier 3 has no qualifying session, so its grid must use a championship-order source. After the first race, current Drivers’ Championship order is available; the opening race and any tied positions need a deterministic fallback.

**Question:** Should Tier 3 reverse the current Drivers’ Championship order, using the previous season’s final order for the opening race and established countback rules for ties?

**Recommendation:** Yes. Reverse the current championship order after results exist. For the opening race, use the previous season’s final order; if no prior order exists, use the regulation-defined entry ranking. Resolve ties with the championship countback rules before reversing the order.

### D-307 — Tier 3 reverse championship-order grid

**Decision:** Tier 3 has no qualifying session. After results exist, the grid reverses current Drivers’ Championship order. The opening race uses the previous season’s final order, or regulation-defined entry ranking when no prior order exists. Ties are resolved before reversal using championship countback rules.

**Rationale:** Tier 3 receives a clear starting-regulation identity and rewards championship recovery through reverse-order starting positions.

**Consequence:** Tier 3 race weekends need no qualifying session and must construct grids from championship standings and regulation fallbacks.

## Current question

### Q-306 — Tier 2 continuous qualifying runs

Tier 2’s long qualifying session can limit each driver to a fixed number of attempts, or allow drivers to plan multiple runs until the session ends, constrained by tyres, fuel, preparation time, traffic, and track conditions. The final grid uses each driver’s best valid lap.

**Question:** Should Tier 2 allow multiple planned qualifying runs throughout one long session, with each driver’s best valid lap setting the final grid?

**Recommendation:** Yes. Allow multiple runs until time, tyres, fuel, and preparation capacity run out. Keep run planning and traffic management meaningful, while the best valid lap at session end determines the grid.

### D-308 — Multi-run Tier 2 qualifying

**Decision:** Tier 2 allows multiple planned qualifying runs during one long continuous session. Time, tyres, fuel, preparation capacity, traffic, and conditions constrain attempts; each driver’s best valid lap at session end determines the grid.

**Rationale:** Tier 2 introduces full-field qualifying strategy without adding knockout-round complexity.

**Consequence:** Tier 2 qualifying needs one shared session clock, repeated run planning, finite resources, traffic management, and final best-lap classification.

## Current question

### Q-307 — Tier 2 single-clock session

Tier 2 can use one uninterrupted qualifying clock for the full field, or divide the session into sub-phases that do not eliminate drivers. A single clock best matches the intended long-session format and keeps every driver eligible until time expires.

**Question:** Should Tier 2 use one uninterrupted qualifying clock with no internal rounds or eliminations?

**Recommendation:** Yes. Use one regulation-defined session clock for all drivers. Do not eliminate or reset drivers during the session; only the final best valid laps determine the grid.

### D-309 — Tier 2 uninterrupted qualifying clock

**Decision:** Tier 2 qualifying uses one regulation-defined uninterrupted session clock. Drivers are not eliminated or reset during the session; final best valid laps determine the grid.

**Rationale:** The format remains a single long qualifying test with strategy emerging from run timing, resource use, traffic, and track evolution.

**Consequence:** Tier 2 needs one session timer, continuous eligibility, run completion rules, and final-session classification.

## Current question

### Q-308 — Tier 1 round transitions

Tier 1 knockout rounds can transition instantly, or pause for a short planning window in which the player reviews classification, confirms advancement, selects tyres and fuel, and plans the next round. A transition should not carry timed laps forward or create extra track time.

**Question:** Should Tier 1 include a short planning window between knockout rounds before the next round’s clock begins?

**Recommendation:** Yes. Pause between rounds for classification review, tyre/fuel planning, driver instructions, and run scheduling. Keep the transition outside the timed session and reset the next round’s lap classification.

### D-310 — Tier 1 qualifying round transitions

**Decision:** Tier 1 includes a short planning window between knockout rounds for classification review, tyre and fuel planning, driver instructions, and run scheduling. The transition adds no track time, and the next round starts with a fresh timed classification.

**Rationale:** The player can react to the completed round without turning the transition into an extra competitive phase.

**Consequence:** Tier 1 qualifying needs round-end review, transition planning, resource updates, and fresh round timing.

## Current question

### Q-309 — Qualifying launch scope

The launch qualifying model now defines tier-specific formats, structured runs, shared two-car planning, live classification, best valid laps, knockout round resets, regulation-defined field sizes, penalties, and next-season regulation changes.

**Question:** Is the qualifying model defined well enough to lock for launch and move to race start and formation procedures?

**Recommendation:** Yes. Lock the current qualifying model and defer additional qualifying detail until race-weekend testing shows a clear gap.

### D-311 — Qualifying launch scope locked

**Decision:** The launch qualifying model is locked around tier-specific formats, structured runs, shared two-car planning, live classification, best valid laps, knockout round resets, regulation-defined field sizes, penalties, and next-season regulation changes. Additional detail is deferred until race-weekend testing identifies a clear need.

**Rationale:** Qualifying has enough strategic and operational depth to support the race-weekend loop without expanding into unnecessary edge cases.

**Consequence:** Future qualifying work should validate and balance this scope rather than add features by default.

## Current question

### Q-310 — Race start and formation phases

The race can begin directly from the grid, or use a short sequence of Pre-grid, Formation Lap, Starting Grid, and Race Start. A formation phase creates room for tyre temperature, clutch and launch preparation, weather, damage, and formation incidents before the lights go out.

**Question:** Should every race use Pre-grid, Formation Lap, Starting Grid, and Race Start phases?

**Recommendation:** Yes. Use the same short start sequence for sprint and main races, with session regulations determining formation-lap length and any tier-specific procedures.

### D-312 — Common race-start sequence

**Decision:** Sprint and main races use Pre-grid, Formation Lap, Starting Grid, and Race Start phases. Active regulations define formation-lap length and tier-specific procedures.

**Rationale:** A consistent start rhythm makes race sessions readable while preserving regulation-driven differences.

**Consequence:** Race sessions need start-phase transitions, formation rules, grid state, and race-start timing.

## Current question

### Q-311 — Pre-grid final decisions

Pre-grid can be an informational phase, or the final decision window for starting tyres, fuel load, setup, damage repairs, driver instructions, pit priorities, and race strategy before the formation lap locks the car’s starting configuration.

**Question:** Should Pre-grid be the final decision window for starting tyres, fuel, repairs, driver instructions, pit priorities, and race strategy?

**Recommendation:** Yes. Allow final changes and show their projected effects during Pre-grid. Lock the starting configuration when the formation lap begins, except for events or procedures explicitly allowed by regulations.

### D-313 — Pre-grid final configuration lock

**Decision:** Pre-grid is the final decision window for starting tyres, fuel, repairs, driver instructions, pit priorities, and race strategy. Starting configuration locks when the formation lap begins, except for regulation-permitted changes.

**Rationale:** The player gets a final informed decision point without allowing late changes to undermine the formation and start sequence.

**Consequence:** Pre-grid needs projected effects, legality checks, final confirmation, and a formation-lap configuration lock.

## Current question

### Q-312 — Formation-lap operations

The formation lap can be a simple transition to the grid, or allow tyre and brake warming, engine and clutch preparation, driver launch instructions, weather observation, and detection of mechanical issues before the start.

**Question:** Should the formation lap simulate tyre/brake preparation, launch readiness, weather observation, and possible mechanical issues before the starting grid?

**Recommendation:** Yes. Use the formation lap as a short operational phase. Let preparation affect launch readiness and first-lap performance, while rare mechanical or weather issues can create a final risk or report before the start.

### D-314 — Formation-lap preparation and issue detection

**Decision:** The formation lap is a short operational phase in which tyre and brake preparation, launch readiness, weather observation, and rare mechanical issues can affect the start and first lap.

**Rationale:** The formation lap has strategic meaning without becoming a second race or requiring constant driver control.

**Consequence:** Formation simulation needs preparation state, launch readiness, weather updates, issue detection, and start-performance modifiers.

## Current question

### Q-313 — Tyre and brake warming control

The player can choose a conservative, balanced, or aggressive formation-lap preparation approach. More aggressive warming can improve launch readiness but increase tyre stress, brake risk, or formation-lap incidents.

**Question:** Should players choose a bounded formation-lap warming approach that trades launch readiness against tyre, brake, and incident risk?

**Recommendation:** Yes. Offer Conservative, Balanced, and Aggressive preparation choices. Apply modest, explainable effects to tyre/brake readiness and first-lap performance without requiring manual weaving or throttle control.

### D-315 — Bounded formation-lap warming choices

**Decision:** Players choose Conservative, Balanced, or Aggressive formation-lap preparation. The choice creates modest, explainable effects on tyre and brake readiness, first-lap performance, tyre stress, and incident risk without requiring manual driving inputs.

**Rationale:** Formation-lap preparation creates a meaningful final choice while keeping the operational phase concise.

**Consequence:** Formation-lap strategy needs preparation levels, driver/car effects, risk modifiers, and clear pre-start reporting.

## Current question

### Q-314 — Per-car formation-lap approach

Both cars share the same weather, track, and formation-lap conditions, but each driver may have different tyre readiness, confidence, risk tolerance, or launch needs. The team can require one approach for both cars or allow separate choices.

**Question:** Should players choose the formation-lap warming approach separately for each car?

**Recommendation:** Yes. Allow per-car choices while sharing the same track and weather state. Driver attributes, tyre condition, and car readiness can make Conservative, Balanced, or Aggressive more appropriate for each driver.

### D-316 — Per-car formation-lap preparation

**Decision:** Players choose Conservative, Balanced, or Aggressive formation-lap preparation separately for each car. Both cars share the same track and weather state, while driver attributes, tyre condition, and car readiness influence the result.

**Rationale:** Each driver can receive an appropriate preparation plan without breaking shared race conditions.

**Consequence:** Formation-lap planning needs per-car choices and shared environmental state with separate readiness outcomes.

## Current question

### Q-315 — Race-start event resolution

The race start can be treated as an instant grid transition, or as a short event using grid position, driver Race Starts ability, launch readiness, tyre and brake state, weather, reaction, and launch risk to determine first-lap track-position changes.

**Question:** Should Race Start be a discrete event that resolves launch performance and early track-position changes from driver, car, preparation, and conditions?

**Recommendation:** Yes. Resolve a short start sequence using grid position, Race Starts, reaction, launch readiness, tyre/brake state, weather, and controlled risk. Report gains, losses, incidents, and first-lap consequences clearly.

### D-317 — Discrete race-start resolution

**Decision:** Race Start resolves as a short event using grid position, driver Race Starts, reaction, launch readiness, tyre and brake state, weather, and controlled risk. Results report track-position gains or losses, incidents, and first-lap consequences.

**Rationale:** The start matters strategically without requiring continuous manual driving input.

**Consequence:** Race simulation needs launch inputs, start-risk modifiers, first-lap position changes, and start-result reporting.

## Current question

### Q-316 — Launch approach

Before the lights, the player can choose a conservative, balanced, or aggressive launch approach. Aggression may improve initial position but increase wheelspin, contact, tyre stress, or first-corner risk.

**Question:** Should players choose a bounded launch approach for each car before the race start?

**Recommendation:** Yes. Offer Conservative, Balanced, and Aggressive launch approaches per car. Apply modest, explainable effects to reaction, position gain, tyre stress, contact risk, and first-corner performance.

### D-318 — Per-car launch approaches

**Decision:** Players choose Conservative, Balanced, or Aggressive launch approaches separately for each car. The approach creates modest, explainable effects on reaction, position gain, tyre stress, contact risk, and first-corner performance.

**Rationale:** Drivers can receive different launch instructions based on grid position, championship context, readiness, and risk tolerance.

**Consequence:** Race-start planning needs per-car approach selection and shared start-state resolution.

## Current question

### Q-317 — First-corner resolution

The first corner can be folded into the start event, or resolved as a short follow-up event using launch position, racecraft, defending, overtaking, traffic, tyre state, and launch risk. A separate resolution makes the immediate consequences of the start understandable without requiring manual driving.

**Question:** Should the first corner be a distinct follow-up event after Race Start?

**Recommendation:** Yes. Resolve the first corner as a short event using track position, Racecraft, defending, overtaking, traffic, tyre state, and launch risk. Report position changes, contact, and any damage before normal race simulation resumes.

### D-319 — Distinct first-corner resolution

**Decision:** The first corner is a separate follow-up event after Race Start. It uses track position, Racecraft, defending, overtaking, traffic, tyre state, and launch risk, then reports position changes, contact, and damage before normal race simulation resumes.

**Rationale:** The start and first corner are high-impact moments that deserve clear feedback without turning the race into continuous manual driving.

**Consequence:** Race sessions need start, first-corner, and normal-race transition states with separate event resolution and reporting.

## Current question

### Q-318 — Transition to normal race simulation

After the first corner, the race can immediately enter its normal event loop, or retain elevated decision frequency through the opening lap. The opening phase has higher traffic and position volatility, while later laps can use the standard cadence of strategy, pit, weather, damage, and team-order events.

**Question:** Should the race use a short opening-lap phase after the first corner before transitioning to the normal race simulation cadence?

**Recommendation:** Yes. Keep the opening lap as a short elevated-risk phase with focused position, traffic, tyre, and damage events, then transition to the standard race loop.

### D-320 — Elevated opening-lap phase

**Decision:** After the first corner, the race uses a short elevated-risk opening-lap phase focused on position, traffic, tyre, and damage events before entering the standard race loop.

**Rationale:** Early-race volatility receives appropriate attention without making the entire race equally interruption-heavy.

**Consequence:** Race simulation needs opening-lap state, elevated event rules, transition criteria, and normal-loop initialization.

## Current question

### Q-319 — Normal race-loop cadence

The normal race can advance one lap at a time, use larger time blocks, or advance automatically until a consequential event occurs. Lap-level state still needs to update continuously enough for tyres, fuel, gaps, weather, traffic, and strategy to remain meaningful.

**Question:** Should the normal race loop advance automatically between consequential event windows rather than pausing every lap?

**Recommendation:** Yes. Simulate laps and state changes continuously in the background, pausing for pit opportunities, tyre or fuel thresholds, weather, damage, safety cars, team orders, major position battles, and other consequential events.

### D-321 — Consequential-event normal race loop

**Decision:** The normal race loop simulates laps and state changes in the background and pauses for consequential events including pit opportunities, tyre or fuel thresholds, weather, damage, safety cars, team orders, and major position battles.

**Rationale:** The race retains continuous simulation while reserving player attention for moments where a decision can materially change the outcome.

**Consequence:** Race simulation needs event detection, threshold evaluation, pause policies, default plans, and event-window context.

## Current question

### Q-320 — Player-defined race thresholds

Tyre wear, fuel range, gap, weather, and damage thresholds can use fixed defaults or be configured by the player for each car and strategy plan. Configurable thresholds let players decide when to review a pit stop or change approach without requiring constant monitoring.

**Question:** Should players configure per-car thresholds for tyre, fuel, gap, weather, damage, and other normal-race event windows?

**Recommendation:** Yes. Provide sensible defaults and allow per-car threshold overrides. The chief mechanic can recommend thresholds based on data, but player-defined hard safety limits should take precedence.

### D-322 — Per-car race-event thresholds

**Decision:** Players configure per-car thresholds for tyre, fuel, gap, weather, damage, and other normal-race event windows. Sensible defaults are provided, chief-mechanic recommendations can inform changes, and player-defined hard safety limits take precedence.

**Rationale:** Each car can use a strategy appropriate to its driver, condition, championship context, and race objective.

**Consequence:** Race strategy needs threshold profiles, per-car overrides, recommendation inputs, and safety-priority rules.

## Current question

### Q-321 — Hard and soft race thresholds

Some thresholds should always create a mandatory event, such as unsafe damage, insufficient fuel range, or a tyre condition that risks failure. Others can be alerts or preferences, such as a preferred undercut gap or performance drop threshold.

**Question:** Should race thresholds support hard safety triggers and softer advisory alerts?

**Recommendation:** Yes. Hard thresholds must pause and require acknowledgement or action; soft thresholds can notify, summarize, or pause according to player settings. Never allow a soft preference to override a hard safety limit.

### D-323 — Hard and soft race thresholds

**Decision:** Race thresholds support mandatory hard safety triggers and configurable soft advisory alerts. Hard thresholds pause and require acknowledgement or action; soft thresholds follow player notification settings and cannot override safety limits.

**Rationale:** The player can tune involvement without allowing convenience settings to conceal unsafe or impossible race states.

**Consequence:** Event windows need threshold severity, acknowledgement rules, notification settings, and safety precedence.

## Current question

### Q-322 — Normal-race decision-window information

When a race event window opens, the player needs enough context to choose an action: current car state, gaps, tyre and fuel projections, weather, damage, crew readiness, available services, and expected consequences of each option.

**Question:** Should every normal-race decision window show current state, projected outcomes, recommended actions, and the time or position impact of available choices?

**Recommendation:** Yes. Show the immediate state, short-horizon projections, available actions, expected time or position effects, confidence, and chief-mechanic recommendation. Keep the default view concise with optional detail.

### D-324 — Contextual normal-race decision windows

**Decision:** Normal-race decision windows show current state, short-horizon projections, available actions, expected time or position effects, confidence, and chief-mechanic recommendations. The default view remains concise with optional detail.

**Rationale:** Players can make informed choices without needing to reconstruct race state from raw telemetry.

**Consequence:** Decision windows need current-state snapshots, projections, action comparisons, confidence, recommendations, and detail layers.

## Current question

### Q-323 — Uncertainty in race projections

Race projections can display exact-looking values, or ranges with confidence based on tyre condition, weather, traffic, damage, driver feedback, and available data. Ranges better represent uncertain outcomes and prevent false precision.

**Question:** Should race projections use ranges and confidence levels rather than exact guaranteed outcomes?

**Recommendation:** Yes. Show expected values with plausible ranges and confidence. Wider ranges should result from uncertain weather, traffic, damage, limited knowledge, or low crew/driver confidence.

### D-325 — Range-based race projections

**Decision:** Race projections display expected values with plausible ranges and confidence. Uncertainty widens with weather, traffic, damage, limited knowledge, or low crew and driver confidence.

**Rationale:** The player receives useful forecasts without being given false precision about inherently uncertain race outcomes.

**Consequence:** Projection systems need expected values, ranges, confidence drivers, and uncertainty display rules.

## Current question

### Q-324 — Projection updates during the race

Projections can remain fixed until the next manual review, or update when new telemetry, tyre behavior, weather, traffic, damage, or strategy information changes the underlying assumptions. Event-driven updates keep forecasts useful without constantly interrupting the player.

**Question:** Should race projections update automatically when meaningful new evidence changes their assumptions?

**Recommendation:** Yes. Refresh projections after meaningful telemetry, tyre, weather, traffic, damage, or strategy events. Update quietly during normal simulation and surface the change at the next relevant decision window.

### D-326 — Event-driven race projection refresh

**Decision:** Race projections refresh after meaningful telemetry, tyre, weather, traffic, damage, or strategy events. Updates occur quietly during normal simulation and surface at the next relevant decision window.

**Rationale:** Forecasts remain current without turning every small state change into an interruption.

**Consequence:** Projection updates need evidence triggers, quiet refresh behavior, decision-window surfacing, and changed-assumption tracking.

## Current question

### Q-325 — Stale and invalidated race plans

A preplanned strategy can become merely less attractive, or become invalid because of safety, fuel range, tyre availability, damage, regulations, or unavailable resources. The game should distinguish a warning from a hard invalidation.

**Question:** Should the game flag stale strategies for review and block or replace only plans that violate hard safety, legality, or resource constraints?

**Recommendation:** Yes. Mark changed assumptions and offer a review for stale plans. Block or replace only plans that are illegal, unsafe, impossible, or outside hard resource limits, using the conservative fallback rules already defined.

### D-327 — Stale-plan review and hard invalidation

**Decision:** Changed assumptions mark race strategies stale and surface them for review. Only illegal, unsafe, impossible, or hard-resource-invalid plans are blocked or replaced, using the conservative fallback rules.

**Rationale:** Players are warned when a plan has weakened without losing control to unnecessary automation or being forced to rebuild every strategy.

**Consequence:** Strategy state needs stale markers, hard invalidation rules, review events, fallback selection, and clear notifications.

## Current question

### Q-326 — Normal race-loop scope

The normal race-loop model now includes automatic progression, consequential event windows, per-car thresholds, hard and soft alerts, contextual projections, uncertainty, event-driven updates, and stale-plan handling. Further detail could expand into low-value telemetry management before the core loop is tested.

**Question:** Should we lock the normal race-loop decision model now and move to safety-car, incident, and race-interruption procedures?

**Recommendation:** Yes. Lock the current normal race-loop model and defer additional telemetry detail until simulation testing shows a clear need.

### D-328 — Normal race-loop scope locked

**Decision:** The launch normal race-loop model is locked around automatic progression, consequential event windows, per-car thresholds, hard and soft alerts, contextual projections, uncertainty, event-driven updates, and stale-plan handling. Additional telemetry detail is deferred until simulation testing demonstrates a need.

**Rationale:** The race loop has enough decision depth to support strategy without requiring the player to manage every simulated data point.

**Consequence:** Future race-loop work should validate and balance the current model before expanding its telemetry surface.

## Current question

### Q-327 — Incident severity levels

Race incidents can use many detailed categories, or a compact severity model that distinguishes ordinary issues from events that alter the race state. A small set of outcomes can cover minor contact, significant damage, safety-car conditions, red-flag conditions, and retirement.

**Question:** Should race incidents use a compact severity model that escalates from minor issues to major damage, safety-car conditions, red flags, and retirements?

**Recommendation:** Yes. Use a compact severity ladder: Minor, Significant, Safety-Car, Red-Flag, and Retirement. Let regulations and track context determine which response each severity can trigger.

### D-329 — Compact race-incident severity ladder

**Decision:** Race incidents use Minor, Significant, Safety-Car, Red-Flag, and Retirement severity levels. Active regulations and track context determine which response each level can trigger.

**Rationale:** Incidents remain understandable while supporting different race-control consequences across tiers and events.

**Consequence:** Incident simulation needs severity, response rules, regulation context, track context, and event reporting.

## Current question

### Q-328 — Variable incident outcomes

The same contact, lock-up, mechanical issue, or weather event can produce different consequences depending on driver attributes, car condition, traffic, surface, weather, risk settings, and prior damage. Fixed outcomes are predictable but less representative of racing.

**Question:** Should incident severity be determined by context and bounded probability rather than fixed to the initial event type?

**Recommendation:** Yes. Use the event type as a starting point, then resolve severity from driver skill, car condition, traffic, weather, risk approach, and prior damage. Keep outcomes bounded and explain the main contributing factors.

### D-330 — Context-dependent incident severity

**Decision:** Incident type provides the starting point, while final severity is resolved from driver skill, car condition, traffic, weather, risk approach, and prior damage. Outcomes remain bounded and report the main contributing factors.

**Rationale:** Race incidents feel contextual and explainable without becoming arbitrary or catastrophically random.

**Consequence:** Incident resolution needs contextual inputs, bounded probabilities, severity outcomes, and cause reporting.

## Current question

### Q-329 — Incident decision windows

Minor incidents can be summarized after resolution, while significant damage, safety-car conditions, red flags, and retirement risks may require immediate player attention. Interrupting for every incident would create noise; delaying major incidents would remove meaningful agency.

**Question:** Should Significant and more severe incidents create immediate decision windows while Minor incidents are summarized unless the player’s settings request otherwise?

**Recommendation:** Yes. Pause for Significant, Safety-Car, Red-Flag, and Retirement outcomes. Summarize Minor incidents by default, with player-configurable notification behavior for non-critical events.

### D-331 — Severity-based incident decision windows

**Decision:** Significant, Safety-Car, Red-Flag, and Retirement outcomes create immediate decision windows. Minor incidents are summarized by default, with configurable notification behavior for non-critical events.

**Rationale:** Player attention is reserved for incidents capable of changing strategy, safety, or race classification.

**Consequence:** Incident events need severity-triggered pauses, response actions, summary behavior, and race-control transitions.

## Current question

### Q-330 — Safety-Car phase

The Safety-Car phase can be treated as a simple pace reduction, or as a distinct race-control state with reduced speed, no overtaking, compressed gaps, pit-strategy changes, tyre and fuel implications, and a controlled restart sequence.

**Question:** Should a Safety-Car incident create a distinct race-control phase with its own strategy and restart procedures?

**Recommendation:** Yes. Use a Safety-Car state with reduced pace, overtaking restrictions, gap compression, altered pit calculations, updated tyre and fuel projections, and a separate restart event when the track is clear.

### D-332 — Distinct Safety-Car race-control state

**Decision:** A Safety-Car incident creates a distinct race-control state with reduced pace, overtaking restrictions, compressed gaps, altered pit calculations, updated tyre and fuel projections, and a separate restart event when the track is clear.

**Rationale:** Neutralization changes the strategic value and timing of pit stops enough to require explicit race-state handling.

**Consequence:** Safety-Car simulation needs race-control state, pace rules, gap compression, pit opportunity calculations, tyre/fuel updates, and restart scheduling.

## Current question

### Q-331 — Safety-Car pit decisions

During a Safety-Car period, the player can keep the current strategy, pit immediately, pit one car before the other, or delegate the decision to the chief mechanic. The decision must account for tyre condition, fuel, pit-crew availability, queue priority, and the expected restart timing.

**Question:** Should the Safety-Car phase create an explicit pit-strategy decision window for each car?

**Recommendation:** Yes. Reevaluate each car’s package during the Safety-Car window, show the neutralization advantage and shared-crew queue cost, and allow pit, hold, reorder, or constrained chief-mechanic delegation.

### D-333 — Safety-Car pit-strategy windows

**Decision:** A Safety-Car period creates an explicit pit-strategy decision window for each car. The player can reevaluate packages using neutralization advantage, shared-crew queue cost, tyre condition, fuel, damage, and restart timing, with pit, hold, reorder, or constrained chief-mechanic delegation available.

**Rationale:** Neutralization becomes a real strategic opportunity rather than an automatic pit trigger.

**Consequence:** Safety-Car strategy needs per-car package review, queue-aware timing, revised projections, and delegation rules.

## Current question

### Q-332 — Safety-Car restart approach

The restart can use one automatic behavior, or allow each driver a Conservative, Balanced, or Aggressive restart approach. Aggression may improve the chance of gaining position but increase tyre stress, contact risk, and vulnerability to an overtake.

**Question:** Should players choose a bounded restart approach for each car before the Safety-Car restart?

**Recommendation:** Yes. Offer Conservative, Balanced, and Aggressive restart approaches per car. Resolve restart timing, gap management, launch readiness, tyre state, driver Racecraft, and contact risk as a short event.

### D-334 — Per-car Safety-Car restart approaches

**Decision:** Players choose Conservative, Balanced, or Aggressive restart approaches separately for each car. Restart resolution uses timing, gap management, launch readiness, tyre state, Racecraft, and contact risk.

**Rationale:** Drivers can respond differently to the same restart based on championship context, tyre condition, and risk tolerance.

**Consequence:** Restart planning needs per-car approach choices and shared field-state resolution.

## Current question

### Q-333 — Restart and first-corner sequence

A Safety-Car restart can resolve as one position update, or use a shortened launch followed by a distinct first-corner event. Reusing the opening-start structure keeps restart outcomes understandable while accounting for compressed gaps and warmed tyres.

**Question:** Should every Safety-Car restart use a shortened launch-and-first-corner sequence similar to the opening race start?

**Recommendation:** Yes. Use a shortened restart event followed by a first-corner resolution, with compressed gaps and tyre state modifying the normal start logic. Do not repeat the full formation-lap phase.

### D-335 — Shortened Safety-Car restart sequence

**Decision:** Every Safety-Car restart uses a shortened launch event followed by first-corner resolution. Compressed gaps and tyre state modify the normal start logic, and the full formation-lap phase is not repeated.

**Rationale:** Restarts receive appropriate competitive resolution without duplicating the entire race-start procedure.

**Consequence:** Restart simulation needs launch state, compressed-gap modifiers, first-corner resolution, and restart-specific reporting.

## Current question

### Q-334 — Red-Flag race-control phase

A Red Flag can end the race immediately, or pause the race for a controlled stoppage with cars returning to the pit lane, repairs and tyre changes subject to regulations, revised strategy, and a later restart. The active regulations should determine which services and restart formats are legal.

**Question:** Should a Red Flag create a distinct stoppage phase with regulation-defined repairs, tyre changes, strategy review, and restart procedures?

**Recommendation:** Yes. Pause the race in a Red-Flag state, apply active regulation limits to repairs and tyres, allow a strategy review, and use a regulation-defined restart or race-ending procedure.

### D-336 — Regulation-controlled Red-Flag stoppage

**Decision:** A Red Flag pauses the race in a distinct stoppage state. Active regulations determine legal repairs and tyre changes, the player receives a strategy review, and the race follows the regulation-defined restart or race-ending procedure.

**Rationale:** Red Flags create a genuine strategic reset while remaining governed by the active sporting rules.

**Consequence:** Red-Flag simulation needs stoppage state, service legality, shared-crew handling, strategy review, and restart or termination rules.

## Current question

### Q-335 — Two-car Red-Flag service planning

During a Red-Flag stoppage, both cars may need tyres, repairs, setup attention, or fuel-related service where legal. The team still has one shared pit-crew setup, so service order and simultaneous work need a clear rule.

**Question:** Should Red-Flag stoppages create one shared service-planning window for both cars with visible crew, time, and regulation constraints?

**Recommendation:** Yes. Plan both cars in one Red-Flag service window. Show legal services, shared-crew sequencing, time limits, and any queue or priority consequence before confirming the restart setup.

### D-337 — Shared Red-Flag service planning

**Decision:** Red-Flag stoppages provide one shared service-planning window for both cars. The plan shows legal services, shared-crew sequencing, time limits, and queue or priority consequences before the restart setup is confirmed.

**Rationale:** The team can use the stoppage strategically without bypassing the shared pit-crew structure or active regulations.

**Consequence:** Red-Flag service planning needs two-car coordination, legality checks, service sequencing, time limits, and restart confirmation.

## Current question

### Q-336 — Regulation-defined Red-Flag restart procedure

After a Red Flag, the race can restart from a standing grid, a rolling restart, or end under the active regulations. A restart may require a new pre-grid and formation phase, or use a shorter controlled procedure depending on the interruption and tier rules.

**Question:** Should the active regulations define whether a Red-Flag restart is standing, rolling, or race-ending, including the required preparation sequence?

**Recommendation:** Yes. Store restart type, preparation requirements, service limits, and race-ending thresholds in the active regulations. Use the relevant procedure without assuming every Red Flag repeats the original race start.

### D-338 — Regulation-defined Red-Flag restarts

**Decision:** Active regulations define whether a Red-Flag restart is standing, rolling, or race-ending, along with preparation requirements, service limits, and race-ending thresholds. The relevant procedure is applied without assuming every Red Flag repeats the original race start.

**Rationale:** Race interruptions remain consistent with the governing rules and can evolve through future regulation changes.

**Consequence:** Race control needs active regulation access, restart-type selection, service legality, preparation rules, and termination thresholds.

## Current question

### Q-337 — Race-control authority

Safety Cars, Red Flags, restarts, and race-ending decisions can be direct player choices, random outcomes, or authoritative race-control decisions based on incident severity, track conditions, and regulations. The player should respond strategically without choosing a sporting control outcome that the team would not control.

**Question:** Should race control determine Safety-Car, Red-Flag, restart, and race-ending outcomes from incidents, conditions, and regulations, with the player responding rather than choosing the outcome?

**Recommendation:** Yes. Treat race control as authoritative. The player can anticipate, prepare, and respond to the decision, but cannot directly declare a Safety Car, Red Flag, restart type, or race end.

### D-339 — Authoritative race-control outcomes

**Decision:** Race control authoritatively determines Safety-Car, Red-Flag, restart, and race-ending outcomes from incident severity, conditions, and active regulations. The player can prepare and respond but cannot directly choose the sporting outcome.

**Rationale:** Sporting control remains outside team influence while strategic response remains a meaningful player responsibility.

**Consequence:** Race control needs authoritative event resolution, regulation access, incident inputs, and player-response windows.

## Current question

### Q-338 — Race-control decision reporting

Race-control decisions can be presented as a simple status change, or include the reason, affected track sectors, expected duration or review point, restart procedure, and confidence where the final duration is uncertain.

**Question:** Should race-control announcements include the decision reason, affected track state, expected duration or review point, and next required player action?

**Recommendation:** Yes. Report the control decision, reason, affected sectors or field state, expected duration or review point, applicable procedure, and next action. Use ranges or confidence when duration is uncertain.

### D-340 — Detailed race-control announcements

**Decision:** Race-control announcements include the decision, reason, affected sectors or field state, applicable procedure, expected duration or review point, and next player action. Duration uses ranges or confidence when uncertain.

**Rationale:** The player understands what changed, why it changed, and what response is available without controlling the sporting decision.

**Consequence:** Race-control events need structured announcements, affected-state data, procedure references, review timing, and response actions.

## Current question

### Q-339 — Retirement as a terminal race outcome

A car can suffer severe damage but continue with penalties, or reach a Retirement state that ends its race. If a car retires, the player may receive a report and strategy consequence, but the car should not return to competition in the same race.

**Question:** Should Retirement be terminal for that race, clearly distinct from severe damage that allows the car to continue?

**Recommendation:** Yes. Retirement ends the car’s race permanently. Severe damage can continue only when the car remains within safe operating limits; the decision and resulting performance risk should be reported clearly.

### D-341 — Terminal retirement state

**Decision:** Retirement permanently ends a car’s race. Severe damage may continue only within safe operating limits, with performance risk reported clearly.

**Rationale:** The game distinguishes recoverable performance loss from a terminal race outcome and prevents retired cars from returning unrealistically.

**Consequence:** Race simulation needs terminal retirement state, safe-operating checks, performance-risk reporting, and championship classification handling.

## Current question

### Q-340 — Voluntary retirement decisions

A player may want to retire a damaged car to protect the power unit, avoid worsening damage, reduce safety risk, or preserve parts for the next event. Retirement can be forced by race control, or also be available as a player action with an explicit confirmation.

**Question:** Should players be able to voluntarily retire a car when continued running is unsafe, strategically wasteful, or likely to worsen damage?

**Recommendation:** Yes. Allow voluntary retirement through a clearly confirmed decision window. Show the expected safety, damage, financial, and championship consequences before applying it; race control can still force retirement when limits are exceeded.

### D-342 — Confirmed voluntary retirement

**Decision:** Players may voluntarily retire a car through a confirmed decision window when continued running is unsafe, strategically wasteful, or likely to worsen damage. The decision shows safety, damage, financial, and championship consequences. Race control can still force retirement when limits are exceeded.

**Rationale:** The player can protect the team from compounding harm while understanding the permanent race and championship consequences.

**Consequence:** Voluntary retirement needs confirmation, consequence projection, terminal state application, and separate handling from forced retirement.

## Current question

### Q-341 — Incident and race-control scope

The launch incident model now covers compact severity levels, contextual outcomes, immediate decision windows, Safety-Car phases, Red-Flag stoppages, regulation-defined restarts, authoritative race control, detailed announcements, severe damage, forced retirement, and voluntary retirement.

**Question:** Should we lock the incident and race-control model now and move to race completion and classification?

**Recommendation:** Yes. Lock the current incident and race-control model and defer additional edge cases until race-weekend simulation testing identifies a real gap.

### D-343 — Incident and race-control scope locked

**Decision:** The launch incident and race-control model is locked around compact severity levels, contextual outcomes, immediate decision windows, Safety-Car phases, Red-Flag stoppages, regulation-defined restarts, authoritative race control, detailed announcements, severe damage, forced retirement, and voluntary retirement. Additional edge cases are deferred until testing identifies a need.

**Rationale:** Race interruptions have enough structure to support strategy without creating an unbounded race-control subsystem.

**Consequence:** Future incident work should validate and balance this scope before adding new interruption types.

## Current question

### Q-342 — Race finish and classification sequence

Race completion can be treated as an instant result, or use a short sequence: Chequered Flag, remaining cars complete their race status, classifications are calculated, and points/results are published. The sequence needs to account for laps completed, retirements, classification thresholds, penalties, and race-control outcomes.

**Question:** Should every race use a distinct finish and classification phase after the Chequered Flag?

**Recommendation:** Yes. Use Chequered Flag, finish-status resolution, classification, penalties, points, and results publication as a distinct sequence. Preserve official order, laps completed, retirements, classifications, and applied penalties in the final report.

### D-344 — Post-race scrutineering

**Decision:** Post-race scrutineering is part of the finish and classification sequence. Cars are checked against active technical and sporting regulations before results become final, and non-compliance can alter classification, penalties, points, or disqualification status.

**Rationale:** Race results should reflect both on-track performance and compliance with the rules governing the championship.

**Consequence:** Race completion needs scrutineering checks, pending-result state, violation severity, penalties, disqualification, and final-results publication.

## Current question

### Q-343 — Scrutineering coverage

Scrutineering can check every classified car after every race, inspect only selected cars, or use a hybrid with mandatory checks for specific components and random or targeted checks for others. Complete coverage is more predictable; sampling adds uncertainty and investigative strategy.

**Question:** Should every classified car receive mandatory post-race scrutineering before the result becomes official?

**Recommendation:** Yes. Perform mandatory baseline checks on every classified car, with additional targeted or random checks for higher-risk components, protests, unusual performance, or regulation changes.

### D-345 — Mandatory post-race scrutineering coverage

**Decision:** Every classified car receives mandatory baseline post-race scrutineering before results become official. Additional targeted or random checks can be triggered by higher-risk components, protests, unusual performance, or regulation changes.

**Rationale:** Compliance is checked consistently while preserving deeper investigation for situations that warrant it.

**Consequence:** Scrutineering needs baseline checks, additional-check triggers, compliance records, and final-result gating.

## Current question

### Q-344 — Provisional and final race results

Scrutineering can complete immediately, or some checks can take time and leave the classification provisional. A provisional result gives immediate feedback while allowing later penalties, disqualifications, and points changes when checks finish.

**Question:** Should races publish provisional results immediately, with final classification and points confirmed after scrutineering completes?

**Recommendation:** Yes. Show provisional order and provisional points after the finish, then publish final results once scrutineering is complete. Clearly identify pending cars and update championship standings when the official result changes.

### D-346 — Provisional results pending scrutineering

**Decision:** Races publish provisional order and points after the finish. Final classification and points are published after scrutineering, with pending cars clearly identified and championship standings updated if an official result changes.

**Rationale:** Players receive immediate race feedback without treating unverified results as final.

**Consequence:** Results need provisional state, pending-car markers, finalization events, points correction, and standings update history.

## Current question

### Q-345 — Scrutineering violation severity

Scrutineering findings can produce no action, a warning, a time or grid penalty, a result exclusion, or a championship-level sanction. A compact severity ladder keeps compliance outcomes understandable while allowing regulations to define exact penalties.

**Question:** Should scrutineering violations use a compact severity model from warning through sporting penalty and disqualification?

**Recommendation:** Yes. Use Warning, Minor Sporting Penalty, Major Sporting Penalty, and Disqualification outcomes. Let active regulations define the exact consequence, timing, and points adjustment for each violation.

### D-347 — Compact scrutineering violation outcomes

**Decision:** Scrutineering violations use Warning, Minor Sporting Penalty, Major Sporting Penalty, and Disqualification outcomes. Active regulations define the exact consequence, timing, and points adjustment.

**Rationale:** Compliance results remain understandable while regulations retain control over detailed sporting consequences.

**Consequence:** Scrutineering needs violation severity, regulation-linked penalties, points changes, and final-result integration.

## Current question

### Q-346 — Protests and appeals

Teams can accept scrutineering and race-control decisions, or lodge a protest or appeal within a regulation-defined window. Protests add cost and administrative time but create strategic value when evidence suggests another team or car breached the rules.

**Question:** Should teams be able to lodge regulation-governed protests or appeals against provisional results and scrutineering decisions?

**Recommendation:** Yes. Allow time-limited protests or appeals with financial and administrative costs, evidence requirements, and a bounded chance of success. Regulations define eligible decisions, deadlines, review authority, and outcomes.

### D-348 — Regulation-governed protests and appeals

**Decision:** Teams may file time-limited protests or appeals against eligible provisional results and scrutineering decisions. Actions have financial and administrative costs, evidence requirements, bounded success chances, and regulation-defined review authority and outcomes.

**Rationale:** The player can challenge suspected rule breaches without turning every result into an automatic dispute.

**Consequence:** The governance system needs eligible decisions, deadlines, costs, evidence, success probability, reviewers, and outcomes.

## Current question

### Q-347 — Evidence before filing a protest

The player can file a protest with limited information, or receive an evidence summary first showing the suspected breach, confidence, potential result impact, cost, deadline, and likely counterarguments. Better staff and scouting may improve the quality of that assessment.

**Question:** Should the player receive an evidence and confidence summary before deciding whether to file a protest or appeal?

**Recommendation:** Yes. Show the suspected issue, supporting evidence, confidence, likely outcome impact, cost, deadline, and main uncertainty before filing. Do not guarantee success even when confidence is high.

### D-349 — Pre-filing protest evidence review

**Decision:** Before filing a protest or appeal, the player receives the suspected issue, supporting evidence, confidence, likely outcome impact, cost, deadline, and main uncertainty. High confidence does not guarantee success.

**Rationale:** Protests become informed strategic choices rather than blind attempts to alter results.

**Consequence:** Protest decisions need evidence summaries, confidence, impact estimates, filing costs, deadlines, and uncertainty reporting.

## Current question

### Q-348 — Deeper protest review

The team can file based on its current evidence, or spend additional time and money on engineering, scouting, or staff review before the deadline. Deeper review should improve evidence quality and confidence without guaranteeing a successful protest.

**Question:** Should teams be able to commission a deeper review before filing a protest or appeal?

**Recommendation:** Yes. Allow optional deeper review with a time and money cost. It can improve evidence, identify counterarguments, and refine success confidence, but cannot guarantee the ruling.

### D-350 — Optional deeper protest review

**Decision:** Teams may commission deeper engineering, scouting, or staff review before filing a protest or appeal. Review consumes time and money, improves evidence and confidence, and cannot guarantee a favorable ruling.

**Rationale:** Investigation becomes a deliberate investment rather than a free information upgrade.

**Consequence:** Protest review needs eligible reviewers, duration, cost, evidence improvement, confidence updates, and deadline tracking.

## Current question

### Q-349 — Protest filing authority

After review, the team can file automatically when confidence exceeds a threshold, or a department lead can recommend filing while the player retains final approval. Player approval preserves control over costs, relationships, and governance risk.

**Question:** Should a qualified department lead recommend whether to file a protest, with the player retaining final approval?

**Recommendation:** Yes. Let the relevant lead summarize evidence, costs, risks, and likely impact, then recommend filing or declining. Require player approval before the protest or appeal is submitted.

### D-351 — Player-approved protest filing

**Decision:** A qualified department lead recommends filing or declining a protest or appeal after reviewing evidence, costs, risks, and likely impact. The player must approve before submission.

**Rationale:** Expert advice informs governance decisions while the player retains control over spending, relationships, and strategic risk.

**Consequence:** Protest workflows need recommendations, player approval, filing state, deadlines, and submission records.

## Current question

### Q-350 — Protest outcomes and consequences

A successful protest can change penalties, classification, points, or regulations. An unsuccessful good-faith protest may lose its filing and review costs, while repeated frivolous protests could damage team relationships or governance reputation.

**Question:** Should unsuccessful good-faith protests mainly lose their costs, while frivolous or abusive protest patterns create additional reputation or governance consequences?

**Recommendation:** Yes. Apply the intended ruling and result changes when successful. Charge costs for unsuccessful good-faith actions without severe punishment, but apply bounded reputation, relationship, or access consequences to clearly frivolous or abusive patterns.

### D-352 — Proportionate protest consequences

**Decision:** Successful protests change the relevant ruling, classification, penalties, or points. Unsuccessful good-faith actions primarily lose filing and review costs. Clearly frivolous or abusive patterns can create bounded reputation, relationship, or access consequences.

**Rationale:** Teams can challenge decisions in good faith without being punished for uncertainty, while repeated misuse of governance systems has meaningful consequences.

**Consequence:** Protest resolution needs ruling changes, cost outcomes, good-faith assessment, repeat-pattern tracking, and bounded governance consequences.

## Current question

### Q-351 — Protest status and decision timing

Protests and appeals may resolve immediately, or remain pending while evidence and review occur. A visible status timeline can show submitted, under review, decision expected, resolved, and result-impact states while the championship standings remain provisional.

**Question:** Should every protest or appeal have a visible status timeline and expected decision window?

**Recommendation:** Yes. Track submission, review, expected decision, ruling, and result-impact states. Show an estimated decision window and update provisional standings when the ruling changes an official result.

### D-353 — Tracked protest and appeal timelines

**Decision:** Every protest or appeal has visible submission, review, expected-decision, ruling, and result-impact states. The system shows an estimated decision window and updates provisional standings when a ruling changes an official result.

**Rationale:** Governance actions remain understandable while results are pending and can be followed through to their championship consequences.

**Consequence:** Governance records need status history, decision estimates, ruling updates, provisional standings, and result-impact links.

## Current question

### Q-352 — Appeal stage limits

An initial protest ruling can be final, or the team can receive one additional appeal stage with a new deadline, cost, evidence threshold, and reviewing authority. Unlimited appeals would delay results and create repetitive administration.

**Question:** Should eligible initial rulings allow one additional appeal stage before becoming final?

**Recommendation:** Yes. Allow one regulation-governed appeal stage with its own deadline and cost. After the appeal ruling, the decision becomes final for that case.

### D-354 — Single appeal stage

**Decision:** Eligible initial protest rulings allow one additional regulation-governed appeal stage with its own deadline and cost. After the appeal ruling, the decision becomes final for that case.

**Rationale:** Teams have a meaningful review path without allowing governance disputes to delay results indefinitely.

**Consequence:** Appeal handling needs eligibility, one-stage limits, deadlines, costs, reviewing authority, and finality rules.

## Current question

### Q-353 — Race completion and governance scope

The launch finish model now includes the Chequered Flag, classification, mandatory scrutineering, provisional and final results, violation outcomes, protests, appeals, evidence review, player approval, status timelines, and championship corrections.

**Question:** Should we lock the race-completion and governance model now and move to post-race review and championship updates?

**Recommendation:** Yes. Lock the current model and defer further governance edge cases until race-weekend testing shows a clear need.

### D-355 — Race-completion and governance scope locked

**Decision:** The launch race-completion and governance model is locked around the Chequered Flag, classification, mandatory scrutineering, provisional and final results, violation outcomes, protests, appeals, evidence review, player approval, status timelines, and championship corrections. Further governance edge cases are deferred until testing identifies a need.

**Rationale:** Results and compliance have enough structure to support a credible championship without creating an unbounded legal simulation.

**Consequence:** Future race-completion work should validate and balance this scope before adding new governance mechanics.

## Current question

### Q-354 — Post-race review sequence

After final results, the game can show only a result screen, or provide a structured review covering race performance, driver debriefs, car and tyre analysis, pit-crew performance, incidents, finances, championship standings, and recommended follow-up actions.

**Question:** Should every completed race produce a structured post-race review with performance reports and actionable follow-up recommendations?

**Recommendation:** Yes. Use a concise post-race review with sections for results, drivers, car performance, tyres, pit crew, incidents, finances, championship impact, and recommended actions. Apply changes only after player approval.

### D-356 — Structured post-race review

**Decision:** Every completed race produces a concise post-race review covering results, drivers, car performance, tyres, pit crew, incidents, finances, championship impact, and recommended actions. Changes apply only after player approval.

**Rationale:** The player receives one coherent review of the weekend rather than disconnected reports from every department.

**Consequence:** Post-race review needs sectioned reports, evidence, recommendations, approval state, and integration with final results.

## Current question

### Q-355 — Layered post-race review timing

The review can arrive once immediately after the Chequered Flag, or in layers: an immediate provisional recap, then a final post-scrutineering review with deeper analysis, financial updates, championship changes, and department recommendations.

**Question:** Should post-race review be layered, with an immediate recap followed by a final comprehensive review after scrutineering and governance decisions?

**Recommendation:** Yes. Show an immediate provisional recap, then deliver the final comprehensive review when results and scrutineering are settled. Refresh affected sections if a later protest or appeal changes the official result.

### D-357 — Layered post-race reviews

**Decision:** Post-race review provides an immediate provisional recap and a final comprehensive review after results and scrutineering are settled. A later protest or appeal refreshes only the affected sections.

**Rationale:** The player gets timely race feedback while final analysis and governance outcomes remain accurate.

**Consequence:** Review delivery needs provisional and final states, delayed analysis, section refreshes, and result-change notifications.

## Current question

### Q-356 — Consolidated post-weekend review inbox

Driver, engineering, pit-crew, finance, championship, and governance departments can send separate messages, or combine their findings into one post-weekend review with sections and independent actions. Consolidation reduces inbox noise while preserving department ownership.

**Question:** Should department findings arrive as one consolidated post-weekend review with separate actionable sections?

**Recommendation:** Yes. Use one review with sections for performance, drivers, car/R&D, pit crew, finance, championship, incidents, and governance. Each section retains its own evidence, recommendation, and approval state.

### D-358 — Consolidated post-weekend review inbox

**Decision:** Department findings arrive in one post-weekend review with sections for performance, drivers, car/R&D, pit crew, finance, championship, incidents, and governance. Each section retains its own evidence, recommendation, and approval state.

**Rationale:** The player gets a coherent management review without losing department-specific context or action control.

**Consequence:** Post-weekend review needs section ownership, evidence, recommendations, independent actions, and approval tracking.

## Current question

### Q-357 — Shared recommendation framework

Pit-crew recommendations already use evidence, confidence, priority, player approval, editable proposals, persistence, refresh, and dismissal cooldowns. Other departments can use separate recommendation behavior, or the same framework for consistency and predictable inbox management.

**Question:** Should all post-race department recommendations use the same evidence, confidence, priority, approval, persistence, and cooldown framework?

**Recommendation:** Yes. Reuse the same recommendation framework across departments, with department-specific evidence and actions. Require approval for changes, preserve unresolved threads, refresh evidence, and support dismissal cooldowns.

### D-359 — Shared post-race recommendation framework

**Decision:** All post-race department recommendations use shared evidence, confidence, priority, approval, persistence, refresh, and dismissal-cooldown behavior, with department-specific evidence and actions.

**Rationale:** The player learns one predictable inbox workflow while each department retains meaningful specialist analysis.

**Consequence:** Recommendation infrastructure needs shared state handling, department adapters, evidence links, priority, approval, persistence, refresh, and cooldowns.

## Current question

### Q-358 — Session reviews versus weekend review

Practice and qualifying produce useful findings before the race, while the final post-weekend report should include the completed sprint or main race, scrutineering, championship, finance, and governance outcomes. Reviews can arrive after every session, or only once after the entire weekend.

**Question:** Should practice and qualifying produce lightweight session reviews, followed by one comprehensive post-weekend review after the final race session?

**Recommendation:** Yes. Provide concise practice and qualifying reviews for immediate learning, then consolidate the full weekend—including race, scrutineering, championship, finance, and governance—into the final post-weekend review.

### D-360 — Session reviews plus final weekend review

**Decision:** Practice and qualifying produce concise session reviews for immediate learning. A final post-weekend review consolidates the race, scrutineering, championship, finance, and governance outcomes.

**Rationale:** The player can adapt before the race while receiving one complete record after the weekend.

**Consequence:** Session review delivery needs lightweight summaries, immediate findings, delayed detail, and final-weekend aggregation.

## Current question

### Q-359 — Interim review blocking

Practice and qualifying reviews can require the player to process every section before advancing, or remain non-blocking while the player continues preparing for the next session. Safety-critical or invalid-plan issues may still require acknowledgement.

**Question:** Should normal practice and qualifying reviews be non-blocking, with only safety-critical or invalid-plan issues requiring acknowledgement?

**Recommendation:** Yes. Let the player continue the weekend without reading every interim review. Block only for safety-critical issues, invalid plans, or decisions that must be resolved before the next session.

### D-361 — Non-blocking interim session reviews

**Decision:** Normal practice and qualifying reviews do not block race-weekend progression. Safety-critical issues, invalid plans, and decisions required before the next session can require acknowledgement.

**Rationale:** The player can keep preparing for the next session without being forced through every report, while important operational risks remain visible.

**Consequence:** Review delivery needs blocking severity, acknowledgement rules, and non-blocking report access.

## Current question

### Q-360 — Between-session analysis capacity

Deeper engineering analysis can happen instantly, use shared staff capacity between sessions, or wait until after the weekend. Shared capacity makes analysis a race-weekend tradeoff, especially when both cars generate competing findings.

**Question:** Should deeper practice and qualifying analysis use shared engineering capacity and time between sessions?

**Recommendation:** Yes. Use a limited between-session analysis window and shared engineering capacity. Let players prioritize findings, while immediate basic feedback remains available regardless of analysis capacity.

### D-362 — Shared between-session analysis capacity

**Decision:** Deeper practice and qualifying analysis uses limited time and shared engineering capacity between sessions. Players prioritize findings, while immediate basic feedback remains available regardless of analysis capacity.

**Rationale:** Analysis becomes a meaningful race-weekend resource without hiding basic information needed for immediate decisions.

**Consequence:** Analysis needs queue capacity, staff availability, durations, priorities, and immediate-versus-deep feedback states.

## Current question

### Q-361 — Analysis priorities between sessions

Both cars may generate competing analysis tasks, such as setup correlation, tyre behavior, part comparison, qualifying preparation, and race preparation. Players can rank tasks, lock critical analyses, or let engineering staff choose automatically.

**Question:** Should players rank and optionally lock between-session analysis tasks, using the same priority model as practice planning?

**Recommendation:** Yes. Support primary, secondary, optional, and limited locked analysis tasks. Engineering staff fills remaining capacity according to those priorities and reports what was completed or deferred.

### D-363 — Prioritized between-session analysis

**Decision:** Between-session analysis supports primary, secondary, optional, and limited locked tasks. Engineering staff fills remaining capacity according to those priorities and reports completed, partial, and deferred work.

**Rationale:** Players can protect critical findings while allowing the department to use remaining capacity efficiently.

**Consequence:** Analysis queues need priority levels, locked tasks, capacity allocation, completion states, and deferral reporting.

## Current question

### Q-362 — Delegated analysis-plan generation

The player can manually order every analysis task, or ask the engineering lead to generate a valid queue from priorities, staff capacity, session deadlines, and required follow-up tests. Automation should propose a queue without silently changing race strategy.

**Question:** Should the engineering lead be able to generate an analysis queue from player-defined priorities and constraints?

**Recommendation:** Yes. Generate a valid proposed queue that respects deadlines, staff capacity, locked tasks, and test requirements. Let the player approve or edit the queue before the analysis window begins.

### D-364 — Approved delegated analysis queues

**Decision:** The engineering lead may generate a proposed analysis queue from player-defined priorities and constraints. The queue respects deadlines, staff capacity, locked tasks, and test requirements and requires player approval or edits before analysis begins.

**Rationale:** Delegation reduces scheduling work without allowing analysis resources to be committed against the player’s priorities silently.

**Consequence:** Analysis planning needs generated queues, validation, approval, editing, and execution states.

## Current question

### Q-363 — Incomplete analysis at session transition

An analysis task may not finish before the next practice, qualifying, or race session. It can be discarded, completed with partial confidence, or remain queued and finish later. Discarding loses useful work; partial conclusions risk overconfidence.

**Question:** Should incomplete analysis remain queued across session transitions, with partial results clearly marked until the work is complete?

**Recommendation:** Yes. Preserve incomplete work, show partial or pending confidence, and let the player reprioritize it. Do not promote incomplete analysis to validated team knowledge.

### D-365 — Persistent incomplete analysis

**Decision:** Incomplete analysis persists across session transitions with partial or pending confidence. Players may reprioritize it, but incomplete work cannot become validated team knowledge.

**Rationale:** Valuable engineering work is not discarded, while uncertain conclusions remain clearly provisional.

**Consequence:** Analysis tasks need persistence, partial-result states, confidence limits, reprioritization, and completion promotion rules.

## Current question

### Q-364 — Practice and qualifying review scope

The launch review model now includes lightweight session reviews, immediate and delayed feedback, shared engineering capacity, prioritized analysis, delegated queue generation, locked tasks, incomplete-work persistence, confidence, validation, and post-weekend consolidation.

**Question:** Should we lock the practice and qualifying review/analysis model now and move to team orders and race strategy?

**Recommendation:** Yes. Lock the current review and analysis model and defer further reporting detail until race-weekend testing identifies a clear gap.

### D-366 — Practice and qualifying review scope locked

**Decision:** The launch practice and qualifying review/analysis model is locked around lightweight session reviews, immediate and delayed feedback, shared engineering capacity, prioritized analysis, delegated queue generation, locked tasks, incomplete-work persistence, confidence, validation, and post-weekend consolidation. Further reporting detail is deferred until testing identifies a need.

**Rationale:** The review loop supports learning and preparation without becoming a separate analytics-management game.

**Consequence:** Future review work should validate and balance this scope before adding more reporting detail.

## Current question

### Q-365 — Team-orders system

Team orders can be issued only manually during a race, defined in advance as conditional policies, or omitted in favor of independent drivers. Conditional orders let the player define priorities for position swaps, defence, pit sequencing, and championship context while preserving event-window agency.

**Question:** Should players define conditional team-order policies before the race and issue or override them at consequential race decision windows?

**Recommendation:** Yes. Support pre-race policies with conditions such as championship position, gap, tyre state, damage, safety-car status, and race phase. Allow event-window overrides and show the expected benefit, risk, and driver-compliance impact.

### D-367 — Conditional team-order policies

**Decision:** Players can define pre-race team-order policies using championship position, gaps, tyre state, damage, Safety-Car status, and race phase. Orders can be issued or overridden at consequential race decision windows with benefit, risk, and compliance impact shown.

**Rationale:** Team orders become planned strategic tools rather than arbitrary mid-race commands.

**Consequence:** Race strategy needs conditional policy rules, event-window overrides, order consequences, and driver-compliance handling.

## Current question

### Q-366 — Explicit team-order types

Team orders can be represented as free-form priorities, or a small set of clear commands: Hold Position, Let Teammate Pass, Defend Team Position, Attack Target, Conserve, Pit Priority, and Swap Back. Explicit types make consequences and driver expectations easier to simulate.

**Question:** Should team orders use a small set of explicit commands rather than free-form instructions?

**Recommendation:** Yes. Use explicit commands for position control, swaps, defence, attack, conservation, pit priority, and swap-back conditions. Let context and driver roles modify the response rather than creating unlimited order types.

### D-368 — Explicit team-order commands

**Decision:** Team orders use explicit commands for position control, swaps, defence, attack, conservation, pit priority, and swap-back conditions. Context and driver roles modify responses instead of creating unlimited order types.

**Rationale:** The player receives understandable choices with predictable categories and enough flexibility for common race situations.

**Consequence:** Team-order data needs command types, conditions, priority, context modifiers, and response outcomes.

## Current question

### Q-367 — Graded driver compliance

A driver can fully comply, comply after a delay, partially comply, or refuse a team order. Compliance should depend on role expectations, trust, driver personality, championship context, order fairness, prior treatment, and immediate safety or race circumstances.

**Question:** Should driver response to team orders use graded compliance outcomes rather than a guaranteed yes/no result?

**Recommendation:** Yes. Use Full Compliance, Delayed Compliance, Partial Compliance, and Refusal outcomes. Resolve them from driver role, trust, personality, context, fairness, prior decisions, and safety, then report the main cause.

### D-369 — Graded team-order compliance

**Decision:** Driver responses to team orders use Full Compliance, Delayed Compliance, Partial Compliance, or Refusal outcomes. Results depend on role, trust, personality, context, fairness, prior decisions, and safety, with the main cause reported.

**Rationale:** Team orders remain strategically useful while driver agency and relationship context continue to matter.

**Consequence:** Team-order resolution needs compliance factors, outcome grades, cause reporting, and relationship-state updates.

## Current question

### Q-368 — Long-term team-order effects

Team orders can resolve only the immediate race situation, or also affect driver trust, morale, role expectations, future compliance, contract satisfaction, and willingness to remain with the team. Repeated unfair or unexplained orders should be more damaging than fair, well-supported instructions.

**Question:** Should team orders affect long-term driver trust, morale, role satisfaction, and future compliance?

**Recommendation:** Yes, with bounded effects. Fair and well-explained orders can build trust; repeated, inconsistent, or role-violating orders can reduce morale, satisfaction, and future compliance. Keep effects gradual rather than letting one order decide a relationship.

### D-370 — Bounded long-term team-order effects

**Decision:** Team orders affect driver trust, morale, role satisfaction, and future compliance gradually. Fair and well-explained orders can improve trust; repeated, inconsistent, or role-violating orders can reduce morale, satisfaction, and future compliance.

**Rationale:** Team orders shape relationships over time without allowing one isolated decision to determine a driver’s entire attitude.

**Consequence:** Driver relationship state needs team-order history, fairness context, explanation quality, gradual changes, and future-compliance modifiers.

## Current question

### Q-369 — Team-order communication

Drivers can receive only the command, or also the rationale, urgency, expected benefit, risk, and whether the order is temporary or permanent. Clear communication can improve compliance and make later relationship effects more understandable.

**Question:** Should every team order include a concise rationale and expected consequence for the driver?

**Recommendation:** Yes. Communicate the order, reason, urgency, expected benefit, risk, and duration. Better explanation should improve compliance when time and radio conditions permit, without guaranteeing agreement.

### D-371 — Rationale-based team-order communication

**Decision:** Team orders communicate the command, reason, urgency, expected benefit, risk, and duration. Clear explanation can improve compliance when time and radio conditions permit but does not guarantee agreement.

**Rationale:** Drivers understand the intended tradeoff and the relationship system can distinguish clear, fair communication from unexplained commands.

**Consequence:** Team-order messages need rationale, urgency, expected effects, duration, communication quality, and driver-response context.

## Current question

### Q-370 — Team-order duration and release

An order can remain active indefinitely, last until a lap or event condition, or end automatically once its purpose is met. Temporary orders should not silently become permanent operating rules.

**Question:** Should every team order include an explicit duration or release condition?

**Recommendation:** Yes. Orders should end after a defined lap, event, gap, pit sequence, or objective completion. Allow the player to issue a clear release or replacement order when circumstances change.

### D-372 — Explicit team-order duration and release

**Decision:** Every team order has a defined duration or release condition based on a lap, event, gap, pit sequence, or objective completion. Players can issue a clear release or replacement order when circumstances change.

**Rationale:** Temporary instructions do not silently become permanent behavior, and changing race conditions can be handled explicitly.

**Consequence:** Team-order policies need duration, release conditions, objective completion, replacement, and active-order state.

## Current question

### Q-371 — Conflicting team orders

Two cars may receive orders that conflict, such as both being told to hold position while one must pit first, or separate attack and conservation instructions that compete for the same team priority. The game needs a deterministic hierarchy rather than allowing contradictory commands to resolve arbitrarily.

**Question:** Should conflicting team orders resolve through an explicit priority hierarchy based on safety, legality, hard strategy rules, driver roles, and issue time?

**Recommendation:** Yes. Resolve conflicts in this order: safety and legality, hard fuel or damage limits, active pit and race strategy, explicit team priority, driver role, then most recent valid order. Report which order was superseded and why.

### D-373 — Deterministic team-order conflict resolution

**Decision:** Conflicting team orders resolve through safety and legality, hard fuel or damage limits, active pit and race strategy, explicit team priority, driver role, and then most recent valid order. Superseded orders and the reason are reported.

**Rationale:** Contradictory instructions produce predictable outcomes and remain understandable to the player.

**Consequence:** Team-order resolution needs priority layers, conflict detection, supersession reporting, and active-order history.

## Current question

### Q-372 — Delegated team-order authority

The player can issue every team order manually, or delegate routine orders to the chief mechanic under player-defined limits. Delegation should never override safety, legality, hard fuel or damage rules, role expectations, or explicit player locks.

**Question:** Should the chief mechanic be able to recommend or execute team orders within player-defined policies and hard limits?

**Recommendation:** Yes. Allow optional constrained delegation for routine hold, conserve, pit-priority, and swap-back orders. Require player approval for high-impact position swaps, championship-sensitive orders, or any order outside the defined policy.

### D-374 — Engineer-led team-order recommendations

**Decision:** Team-order recommendations come from the Driver Race Engineer and Strategy Engineer rather than the chief mechanic. The Driver Race Engineer focuses on car- and driver-specific needs; the Strategy Engineer focuses on cross-car priorities, race context, and team-level strategy. Player-defined policies and hard safety, legality, fuel, damage, and role limits still apply.

**Rationale:** Team orders are primarily a race-engineering and strategy responsibility, while the pit crew chief mechanic remains focused on pit operations and lineup execution.

**Consequence:** Team-order systems need separate engineer roles, recommendation ownership, cross-car conflict handling, and player-approval rules.

## Current question

### Q-373 — Engineer responsibility split

The Driver Race Engineer can recommend car-specific orders such as conserve, attack, defend, or pit timing. The Strategy Engineer can recommend cross-car priorities, swaps, pit sequencing, and championship-sensitive orders. High-impact conflicts may still require player approval.

**Question:** Should the Driver Race Engineer own car-specific recommendations while the Strategy Engineer owns team-level recommendations?

**Recommendation:** Yes. Give each role clear ownership: Driver Race Engineer for individual car condition and driver execution; Strategy Engineer for cross-car priorities, race context, and team strategy. Require player approval for major conflicts or policy exceptions.

### D-375 — Split engineer ownership for team orders

**Decision:** The Driver Race Engineer owns car-specific condition and driver-execution recommendations. The Strategy Engineer owns cross-car priorities, race context, pit sequencing, championship considerations, and team strategy. Major conflicts and policy exceptions require player approval.

**Rationale:** Recommendation ownership matches each engineer’s operational responsibility and prevents the pit-crew chief mechanic from becoming the default race-strategy authority.

**Consequence:** Team-order recommendations need role ownership, cross-car context, conflict escalation, and player approval rules.

## Current question

### Q-374 — Engineer conflict resolution

The two engineers may disagree, such as when the Driver Race Engineer prioritizes protecting a damaged car while the Strategy Engineer wants a position swap or aggressive pit sequence. The game can treat both recommendations equally, or give team-level strategy priority while preserving safety and car-condition overrides.

**Question:** Should the Strategy Engineer have priority for team-level decisions while the Driver Race Engineer can override for safety or immediate car-condition concerns?

**Recommendation:** Yes. Strategy Engineer leads cross-car and championship decisions; Driver Race Engineer can override for safety, damage, mechanical limits, or immediate driver execution risks. Escalate unresolved high-impact conflicts to the player.

### D-376 — Engineer conflict hierarchy

**Decision:** The Strategy Engineer leads cross-car, championship, and team-level decisions. The Driver Race Engineer can override for safety, damage, mechanical limits, or immediate execution risks. Unresolved high-impact conflicts escalate to the player.

**Rationale:** Team strategy has a clear owner while immediate car safety and driver execution remain protected.

**Consequence:** Team-order resolution needs engineer priority, safety overrides, conflict escalation, and player decision windows.

## Current question

### Q-375 — Driver-facing race communication

Both engineers can communicate directly with a driver, or the Driver Race Engineer can remain the driver’s single communication channel while relaying Strategy Engineer recommendations. A single channel reduces contradictory radio instructions and preserves the engineer-driver relationship.

**Question:** Should the Driver Race Engineer be the driver’s primary communication channel, relaying Strategy Engineer recommendations?

**Recommendation:** Yes. The Driver Race Engineer communicates orders and context to the driver, while the Strategy Engineer advises through the race-engineering channel. This preserves one clear voice and lets the Driver Race Engineer explain car-specific implications.

### D-377 — Single driver-facing race-engineering channel

**Decision:** The Driver Race Engineer is the driver’s primary communication channel and relays Strategy Engineer recommendations. The Strategy Engineer advises through the race-engineering channel rather than issuing contradictory direct instructions.

**Rationale:** One clear radio voice preserves the engineer-driver relationship and reduces conflicting instructions.

**Consequence:** Race communication needs channel ownership, relayed recommendations, engineer context, and driver-facing message state.

## Current question

### Q-376 — Engineer communication quality

Team-order clarity and compliance can be fixed, or influenced by the Driver Race Engineer’s communication, expertise, relationship with the driver, radio conditions, and available time. Communication should matter without making a single poor message decide a race.

**Question:** Should Driver Race Engineer communication quality affect order clarity, compliance, and driver trust in a bounded way?

**Recommendation:** Yes. Apply modest effects from communication skill, engineering expertise, driver relationship, radio conditions, and time pressure. Report misunderstandings or reduced confidence without making communication the sole cause of major outcomes.

### D-378 — Bounded race-engineering communication effects

**Decision:** Driver Race Engineer communication quality affects order clarity, compliance, and driver trust modestly through communication skill, engineering expertise, driver relationship, radio conditions, and time pressure. Misunderstandings or reduced confidence are reported without making communication the sole cause of major outcomes.

**Rationale:** Communication matters as part of team-order execution while driver, car, strategy, and race context remain the dominant factors.

**Consequence:** Team-order communication needs bounded modifiers, relationship inputs, radio/time context, and explanation of communication-related effects.

## Current question

### Q-377 — Team-orders launch scope

The launch team-orders model now covers conditional policies, explicit commands, graded compliance, long-term relationship effects, rationale-based communication, order duration and release, conflict hierarchy, engineer ownership, player approval, and driver-facing communication.

**Question:** Should we lock the team-orders model now and move to the next race-strategy system?

**Recommendation:** Yes. Lock the current team-orders model and defer further radio and relationship detail until race-weekend testing identifies a clear need.

### D-379 — Team-orders launch scope locked

**Decision:** The launch team-orders model is locked around conditional policies, explicit commands, graded compliance, long-term relationship effects, rationale-based communication, order duration and release, conflict hierarchy, engineer ownership, player approval, and driver-facing communication. Further radio and relationship detail is deferred until testing identifies a need.

**Rationale:** Team orders provide enough strategic and interpersonal depth without expanding into an unbounded radio-management system.

**Consequence:** Future team-order work should validate and balance this scope before adding new communication mechanics.

## Current question

### Q-378 — Per-car race strategy plans

Each car can use a fixed race strategy, or a pre-race plan covering tyre stints, fuel targets, pace, engine modes, pit packages, weather contingencies, and event triggers. A per-car plan creates a baseline that can be adjusted through decision windows while preserving driver-specific priorities.

**Question:** Should each car have a pre-race strategy plan with conditional tyre, fuel, pace, engine, pit, and weather decisions?

**Recommendation:** Yes. Build a per-car plan before the race with stint goals, tyre and fuel targets, pace and engine modes, pit packages, safety contingencies, and event triggers. Allow the plan to adapt at decision windows without losing its original intent.

### D-380 — Per-car conditional race strategy plans

**Decision:** Each car has a pre-race strategy plan covering stint goals, tyre and fuel targets, pace and engine modes, pit packages, safety contingencies, and event triggers. Plans adapt at decision windows while preserving their original intent.

**Rationale:** Strategy becomes a prepared operating plan rather than a sequence of disconnected emergency choices.

**Consequence:** Race strategy needs per-car plans, conditional rules, adaptation, original-intent tracking, and event-window overrides.

## Current question

### Q-379 — Shared baseline and driver refinements

The team can build two completely independent race plans, or establish one shared strategy baseline and allow each driver to receive refinements for style, tyre management, risk, and role. A shared baseline improves coordination while preserving meaningful driver differences.

**Question:** Should race strategy use one shared team baseline with driver-specific refinements?

**Recommendation:** Yes. Create a shared baseline for tyres, fuel, pit timing, pace, and team priorities, then apply driver-specific refinements for style, confidence, tyre behavior, risk, and role. Report conflicts between the baseline and refinements.

### D-381 — Shared race-strategy baseline with driver refinements

**Decision:** Race strategy uses one shared team baseline for tyres, fuel, pit timing, pace, and team priorities, with driver-specific refinements for style, confidence, tyre behavior, risk, and role. Conflicts between baseline and refinements are reported.

**Rationale:** Both cars operate from a coordinated team plan while preserving driver-specific execution and strategy needs.

**Consequence:** Strategy planning needs shared baseline fields, driver refinements, conflict reporting, and override rules.

## Current question

### Q-380 — Hard and soft strategy overrides

Driver refinements can freely replace the shared baseline, or remain within hard team limits. Safety, legality, minimum fuel range, tyre availability, and required pit coverage should remain protected; pace, risk, stint length, and preferred timing can vary within those limits.

**Question:** Should driver-specific refinements be allowed to override soft team preferences but never hard safety, legality, fuel, tyre, or coverage constraints?

**Recommendation:** Yes. Treat safety, legality, minimum fuel, tyre availability, and required coverage as hard limits. Let driver refinements change soft pace, risk, stint, and timing preferences within those boundaries.

### D-382 — Constrained driver strategy refinements

**Decision:** Driver-specific strategy refinements may override soft team preferences for pace, risk, stint length, and timing, but never hard safety, legality, minimum fuel, tyre availability, or required coverage constraints.

**Rationale:** Drivers retain meaningful strategic individuality without creating unsafe or impossible race plans.

**Consequence:** Strategy validation needs hard-limit checks, soft-preference overrides, driver refinements, and conflict reporting.

## Current question

### Q-381 — Strategy Engineer plan generation

The player can build the shared race baseline manually, or ask the Strategy Engineer to generate a proposal from weather, tyre data, fuel projections, grid positions, championship context, car performance, and team priorities. The proposal should remain editable and require approval.

**Question:** Should the Strategy Engineer be able to generate a shared race-strategy baseline from player-defined goals and constraints?

**Recommendation:** Yes. Generate a valid baseline using available data and player priorities, then let the player approve or edit it before applying driver-specific refinements.

### D-383 — Approved Strategy Engineer baseline

**Decision:** The Strategy Engineer may generate a valid shared race-strategy baseline from available data and player priorities. The player approves or edits it before driver-specific refinements are applied.

**Rationale:** Strategic delegation reduces planning work while preserving player ownership of the race plan.

**Consequence:** Baseline generation needs data inputs, goal constraints, validity checks, proposal review, approval, and editing.

## Current question

### Q-382 — Alternative race strategies

The Strategy Engineer can provide one recommended baseline, or present a primary plan plus alternatives such as aggressive, conservative, undercut, overcut, or weather-contingent strategies. Alternatives help the player understand tradeoffs without requiring manual construction of every possibility.

**Question:** Should the Strategy Engineer present a primary race plan plus a small number of alternative strategies with tradeoffs?

**Recommendation:** Yes. Provide a primary plan, one or two meaningful alternatives, and an emergency fallback. Show expected pace, pit timing, tyre/fuel risk, uncertainty, and the conditions that make each option preferable.

### D-384 — Primary, alternative, and emergency race plans

**Decision:** The Strategy Engineer presents a primary race plan, one or two meaningful alternatives, and an emergency fallback. Each option includes expected pace, pit timing, tyre and fuel risk, uncertainty, and preferred conditions.

**Rationale:** The player can compare strategic tradeoffs before the race rather than discovering alternatives only after the original plan fails.

**Consequence:** Strategy proposals need option comparison, tradeoff data, preferred conditions, emergency validity, and selection state.

## Current question

### Q-383 — Conditional strategy switching

Alternative strategies can remain manual choices, or be attached to conditions such as weather, tyre degradation, Safety-Car status, fuel range, damage, gap, or championship context. Conditional switching preserves player intent when the race changes quickly.

**Question:** Should alternative race strategies be selectable as conditional triggers that can activate at decision windows?

**Recommendation:** Yes. Let players attach alternatives to explicit conditions and priorities. The plan can recommend or switch at a valid decision window, subject to hard limits and player-defined approval or delegation rules.

### D-385 — Player-controlled strategy selection and switching

**Decision:** Alternative race strategies never activate automatically. Before the weekend or race, the player selects the active strategy and may keep alternatives available for review. During the race, the Chief and Race Engineers can recommend changes, but the player must accept the recommendation or make a different change manually.

**Rationale:** Race strategy is a core player decision. Staff provide expertise and timely recommendations without silently taking control of the race plan.

**Consequence:** Strategy switching needs player approval, recommendation state, manual alternative selection, hard-limit validation, and no automatic activation path.

This supersedes the automatic activation portion of Q-383’s prior recommendation.

## Current question

### Q-384 — Approval for mid-race strategy changes

The player may select a strategy before the race and manually change it at decision windows. The Chief and Race Engineers can propose a switch with evidence, expected impact, and urgency, but the change should not apply until the player accepts it or chooses another action.

**Question:** Should every mid-race strategy change require explicit player approval?

**Recommendation:** Yes. Staff can recommend and explain changes, but only the player can approve or manually issue a new strategy. Hard safety or legality limits can invalidate a current plan, but the replacement still requires a player decision whenever the race state allows one.

### D-386 — Explicit approval for strategy changes

**Decision:** Every mid-race strategy change requires player approval or a manual player-issued change. The Chief and Race Engineers may recommend and explain changes, but cannot activate them automatically. Hard safety or legality limits can invalidate the current plan, while replacement still requires a player decision whenever the race state allows one.

**Rationale:** The player retains ownership of race strategy while staff expertise remains useful at time-sensitive decision windows.

**Consequence:** Strategy recommendations need proposal, evidence, accept, edit, reject, defer, invalidation, and expiry states.

## Current question

### Q-385 — Strategy recommendation actions

When staff recommend a strategy change, the player can accept it exactly, edit it, reject it, or defer it. A recommendation may become stale when tyre, weather, damage, traffic, or championship conditions change.

**Question:** Should strategy recommendations support Accept, Edit, Reject, and Defer actions, with stale recommendations expiring or refreshing when conditions change?

**Recommendation:** Yes. Provide all four actions. Recalculate or expire recommendations when their assumptions change materially, and preserve the evidence and reason for the update.

### D-387 — Actionable and refreshable strategy recommendations

**Decision:** Strategy recommendations support Accept, Edit, Reject, and Defer actions. Recommendations recalculate or expire when assumptions change materially, while preserving the evidence and reason for the update.

**Rationale:** The player can control recommendations precisely without acting on stale race information.

**Consequence:** Strategy recommendation state needs action handling, assumption tracking, refresh/expiry, evidence history, and player decisions.

## Current question

### Q-386 — Per-car and team-level strategy recommendations

The Driver Race Engineer’s recommendation normally applies to one car, while the Strategy Engineer may recommend a team-wide change such as synchronized pit timing, a shared tyre response, or a team-order policy. Applying team-level advice to both cars automatically would bypass player control.

**Question:** Should team-level strategy recommendations require separate player approval for each affected car, even when the Strategy Engineer proposes the same change for both?

**Recommendation:** Yes. Show the Strategy Engineer’s team-level proposal as one grouped recommendation, but let the player accept, edit, reject, or defer it per car. This preserves shared context without forcing identical execution.

### D-388 — Per-car approval of team-level recommendations

**Decision:** Strategy Engineer team-level recommendations appear as grouped proposals for shared context, but the player accepts, edits, rejects, or defers them separately for each affected car.

**Rationale:** Team strategy remains coordinated without forcing identical execution when the cars have different conditions or priorities.

**Consequence:** Strategy UI and state need grouped recommendations, per-car action state, shared evidence, and divergent-plan tracking.

## Current question

### Q-387 — Active strategy visibility

During a race, the player needs to distinguish the active plan, pending staff recommendations, accepted changes, deferred proposals, and deviations caused by hard constraints or race events. Hiding this state makes strategy difficult to audit and can cause accidental duplicate changes.

**Question:** Should each car always show its active strategy, pending recommendations, accepted changes, and deviations from the original plan?

**Recommendation:** Yes. Keep a clear per-car strategy state visible during the race, including active plan, current stint, next trigger, pending recommendations, recent changes, and any deviation reason.

### D-389 — Visible per-car strategy state

**Decision:** During the race, each car shows its active plan, current stint, next trigger, pending recommendations, recent changes, and any deviation reason.

**Rationale:** The player can understand what each car is doing now, what will happen next, and why the plan differs from the original strategy.

**Consequence:** Race strategy state needs per-car active plans, triggers, recommendation status, change history, and deviation explanations.

## Current question

### Q-388 — Strategy-change history

Strategy changes can overwrite the previous plan, or preserve a concise history showing the time, initiator, reason, approved action, and resulting state. History helps evaluate staff recommendations and player decisions after the race.

**Question:** Should every strategy change retain a concise history entry showing when, why, and by whom it was made?

**Recommendation:** Yes. Record the timestamp or race phase, initiator, evidence or reason, approved change, affected car, and resulting strategy state. Keep it concise and available in post-race review.

### D-390 — Auditable strategy-change history

**Decision:** Every strategy change retains a concise history entry containing race phase, initiator, evidence or reason, approved change, affected car, and resulting strategy state. History is available in post-race review.

**Rationale:** Players can evaluate decisions and staff recommendations without needing a full raw telemetry log.

**Consequence:** Strategy state needs change events, initiator identity, rationale, affected car, resulting state, and review access.

## Current question

### Q-389 — Race-strategy launch scope

The launch race-strategy model now includes per-car plans, a shared baseline, driver refinements, hard and soft constraints, Strategy Engineer proposals, alternatives, manual player switching, recommendation actions, per-car approval, active-state visibility, and change history.

**Question:** Should we lock the current race-strategy model and move to tyre and fuel execution details?

**Recommendation:** Yes. Lock the current model and defer additional strategy-management detail until race-weekend testing identifies a clear gap.

### D-391 — Race-strategy launch scope locked

**Decision:** The launch race-strategy model is locked around per-car plans, shared baseline, driver refinements, hard and soft constraints, Strategy Engineer proposals, alternatives, manual player switching, recommendation actions, per-car approval, active-state visibility, and auditable change history. Further strategy-management detail is deferred until testing identifies a need.

**Rationale:** Strategy has enough player agency and staff support without allowing automation to take control or creating an unbounded plan-management layer.

**Consequence:** Future race-strategy work should validate and balance this scope before adding new management mechanics.

## Current question

### Q-390 — Tyre and fuel stint execution

For each planned stint, the player can select the tyre compound, starting fuel target, pace, and engine mode while the simulation executes the stint automatically. The game should show projected stint length, degradation, fuel range, pit timing, and risk before the stint begins.

**Question:** Should each stint use explicit tyre and fuel choices with projected duration, degradation, range, and pit consequences before automatic execution?

**Recommendation:** Yes. Select tyre compound, fuel target, pace, and engine mode per stint. Show projected range, degradation, pit window, and risk, then execute automatically until a decision window or hard threshold changes the plan.

### D-392 — Explicit tyre and fuel stint execution

**Decision:** Each stint uses explicit tyre compound, fuel target, pace, and engine-mode choices. The game shows projected range, degradation, pit window, and risk before automatic execution, which continues until a decision window or hard threshold changes the plan.

**Rationale:** Stint planning becomes a clear strategic commitment with understandable projected consequences.

**Consequence:** Stint simulation needs tyre, fuel, pace, engine, projection, threshold, and automatic-execution state.

## Current question

### Q-391 — Continuous tyre degradation inputs

Tyre degradation can use a simple age curve, or respond continuously to compound, track temperature, weather, setup, driver style, pace, traffic, fuel load, and damage. Contextual degradation makes tyre management strategic but should remain explainable.

**Question:** Should tyre degradation update continuously from compound, track and weather state, setup, driver management, pace, traffic, fuel load, and damage?

**Recommendation:** Yes. Use a continuous degradation model driven by those factors, with bounded and explainable effects. Show current condition, projected degradation, grip loss, and failure or pit-risk thresholds.

### D-393 — Continuous contextual tyre degradation

**Decision:** Tyre degradation updates continuously from compound, track and weather state, setup, driver management, pace, traffic, fuel load, and damage. Effects remain bounded and explainable, with current condition, projected degradation, grip loss, and pit-risk thresholds visible.

**Rationale:** Tyre strategy reflects how the car and driver use the tyre rather than only elapsed laps.

**Consequence:** Tyre simulation needs contextual degradation inputs, condition state, projection, grip effects, and threshold evaluation.

## Current question

### Q-392 — Dynamic tyre temperature

Tyre temperature can be static, or update from compound, track temperature, weather, pace, traffic, setup, driver style, and preparation. Temperature should affect grip, degradation, warm-up, and overheating risk, with different compounds having distinct operating behavior.

**Question:** Should tyre temperature update dynamically during stints and affect grip, degradation, warm-up, and overheating risk?

**Recommendation:** Yes. Track dynamic tyre temperature with compound-specific operating ranges. Show warm-up, optimum window, overheating, cooling, and crossover effects without exposing unnecessary raw telemetry.

### D-394 — Dynamic compound-specific tyre temperature

**Decision:** Tyre temperature updates dynamically with compound-specific operating ranges. The simulation tracks warm-up, optimum window, overheating, cooling, and crossover effects while presenting only decision-relevant information by default.

**Rationale:** Tyre temperature becomes a strategic state rather than a hidden modifier or static compound label.

**Consequence:** Tyre compounds need operating ranges, temperature response, grip effects, degradation interaction, and readable state reporting.

## Current question

### Q-393 — Compound tradeoffs

Dry compounds can differ in peak pace, durability, warm-up speed, operating window, and sensitivity to temperature. Intermediate and wet compounds can have separate crossover behavior for damp and wet conditions.

**Question:** Should each tyre compound have distinct pace, durability, warm-up, operating-window, and weather tradeoffs?

**Recommendation:** Yes. Give every compound a clear tradeoff profile. Dry compounds should differ in speed and life; intermediate and wet compounds should have distinct crossover ranges and wet-weather strengths.

### D-395 — Distinct tyre-compound tradeoffs

**Decision:** Every tyre compound has distinct pace, durability, warm-up, operating-window, and weather tradeoffs. Dry compounds differ in speed and life; intermediate and wet compounds have distinct crossover ranges and wet-weather strengths.

**Rationale:** Compound selection remains a strategic choice instead of a simple ordered ladder of better and worse tyres.

**Consequence:** Tyre data needs compound profiles, operating ranges, crossover behavior, weather response, and strategy projections.

## Current question

### Q-394 — Weather and tyre crossover

Weather and track state can determine the best compound through fixed rules, or use forecast ranges and crossover thresholds that change as rain intensity, standing water, drying line, temperature, and track evolution change. The player should receive a recommendation but choose the actual compound.

**Question:** Should tyre crossover decisions use evolving weather/track thresholds with player-selected compound choices?

**Recommendation:** Yes. Use evolving rain intensity, standing water, drying line, temperature, and track-state thresholds. The engineers recommend a crossover window, but the player decides when to change unless safety or regulations make the current tyre invalid.

### D-396 — Player-controlled tyre crossover

**Decision:** Tyre crossover uses evolving rain intensity, standing water, drying line, temperature, and track-state thresholds. Engineers recommend a crossover window, but the player chooses when to change unless safety or regulations make the current tyre invalid.

**Rationale:** Weather strategy remains a high-agency decision with informed engineering support rather than automatic compound switching.

**Consequence:** Weather and tyre strategy need crossover thresholds, recommendations, player decisions, safety invalidation, and track-state updates.

## Current question

### Q-395 — Finite weekend tyre allocations

Tyre sets can be unlimited, or finite per driver and entry with compound, condition, and heat-cycle state. Finite allocations make practice, qualifying, sprint, and race choices compete for the same weekend inventory.

**Question:** Should each driver and entry have finite tyre allocations tracked by compound, condition, and heat cycles across the race weekend?

**Recommendation:** Yes. Use finite per-driver/per-entry allocations. Track compound, condition, and heat cycles, show what remains before each session, and prevent plans from using unavailable sets.

### D-397 — Tier 1 compound-return policies

**Decision:** Tier 1 uses finite per-driver/per-entry tyre allocations and may include F1-style compound-return policies. Active regulations define which sets or compounds must be returned, when they must be returned, and how returned sets become unavailable for later sessions.

**Rationale:** Tier 1 gains an additional allocation-management layer that rewards planning across practice, qualifying, sprint, and race sessions.

**Consequence:** Tier 1 tyre regulations need return requirements, deadlines, set eligibility, inventory updates, and invalid-plan handling.

## Current question

### Q-396 — Known and enforced Tier 1 tyre returns

Compound-return rules can be revealed only as sessions occur, or published before the weekend so teams can plan their allocations. The selected sets must then be returned at the regulation-defined deadline and cannot be reused afterward.

**Question:** Should Tier 1 tyre-return requirements be published before the weekend and enforced when each return deadline is reached?

**Recommendation:** Yes. Publish return requirements and deadlines before the weekend. Validate plans against them, enforce returns after the relevant session, and clearly show which sets are no longer available.

### D-398 — Published Tier 1 tyre-return enforcement

**Decision:** Tier 1 tyre-return requirements and deadlines are published before the weekend. Plans are validated against them, returns are enforced after the relevant session, and returned sets become unavailable with clear inventory updates.

**Rationale:** Teams can plan around known allocation rules while the return requirement remains a meaningful strategic constraint.

**Consequence:** Tyre allocation needs pre-weekend regulations, deadline enforcement, inventory transitions, and plan-validation feedback.

## Current question

### Q-397 — Choosing physical sets for return

Regulations can specify the compound and number of sets to return while allowing the player to choose which physical sets. Choosing a worn set preserves a fresher set for later, while returning a fresher set may preserve a better current inventory mix.

**Question:** When regulations allow a choice, should the player select which physical tyre sets to return?

**Recommendation:** Yes. Let the player choose among eligible sets, showing condition, heat cycles, future availability, and the strategic tradeoff before confirming the return.

### D-399 — Player-selected physical tyre returns

**Decision:** When Tier 1 regulations allow a choice, the player selects which eligible physical tyre sets to return. The game shows condition, heat cycles, future availability, and the strategic tradeoff before confirmation.

**Rationale:** Return rules create a real allocation decision instead of a hidden inventory deduction.

**Consequence:** Tyre-return decisions need eligible-set selection, condition comparison, future-inventory projections, and confirmation.

## Current question

### Q-398 — Tyre allocation transfer between cars

Tyre allocations can remain strictly per driver and entry, or allow sets to move between team cars when compound and regulation rules permit. Strict ownership preserves sporting and inventory clarity; transferability adds flexibility but can undermine the intended allocation constraint.

**Question:** Should tyre allocations remain locked to the assigned driver and entry for the entire weekend?

**Recommendation:** Yes. Keep sets assigned to their driver and entry. Do not transfer physical sets between cars at launch; preserve clear per-driver allocation and regulation compliance.

### D-400 — Driver-locked tyre allocations

**Decision:** Tyre sets remain assigned to their driver and entry for the entire weekend. Physical sets cannot transfer between team cars at launch, preserving per-driver allocation and regulation compliance.

**Rationale:** Tyre inventory remains clear and strategically constrained across all race-weekend sessions.

**Consequence:** Tyre allocation state needs driver ownership, entry ownership, session carryover, and transfer validation.

## Current question

### Q-399 — Tyre allocation across sprint weekends

On sprint weekends, tyre sets can reset between sessions, or carry through practice, qualifying, sprint, and main-race sessions under one weekend allocation. Carryover makes early tyre decisions affect later races and supports tier-specific regulation differences.

**Question:** Should finite tyre allocations and set condition carry across every session of a sprint weekend?

**Recommendation:** Yes. Carry allocations, condition, and heat cycles through practice, qualifying, sprint, and main race. Let active regulations define any sprint-specific exceptions or additional return requirements.

### D-401 — Cross-session tyre allocation carryover

**Decision:** Finite tyre allocations, condition, and heat cycles carry through practice, qualifying, sprint, and main-race sessions on sprint weekends. Active regulations define sprint-specific exceptions and additional return requirements.

**Rationale:** Early weekend tyre decisions meaningfully affect later sessions and races.

**Consequence:** Weekend tyre state needs session carryover, condition updates, heat cycles, return exceptions, and regulation validation.

## Current question

### Q-400 — Tyre-model launch scope

The launch tyre model now includes finite driver-locked allocations, condition and heat cycles, dynamic temperature, compound tradeoffs, contextual degradation, weather crossover, Tier 1 return policies, sprint-weekend carryover, and player-controlled tyre decisions.

**Question:** Should we lock the current tyre model and move to fuel execution details?

**Recommendation:** Yes. Lock the current tyre model and defer additional tyre-inventory detail until race-weekend testing identifies a clear gap.

### D-402 — F1-style weekend dry-compound selection

**Decision:** The dry-tyre family uses a C1–C6 compound ladder. For Tier 1, three compounds are selected for each weekend and mapped to Hard, Medium, and Soft. Lower tiers use two selected compounds with regulation-defined mappings: Soft/Medium, Soft/Hard, or Medium/Hard. Intermediate and Wet compounds remain separate dedicated wet-weather options.

**Rationale:** The model captures the strategic difference between the full tyre family and the limited compounds available at a specific weekend, while lower tiers receive simpler allocation choices.

**Consequence:** Weekend tyre regulations need compound selection, Hard/Medium/Soft mapping, tier-specific two-compound mappings, allocation generation, and advance publication.

## Current question

### Q-401 — Authority for weekend compound selection

The weekend’s dry compounds can be selected by the tyre supplier or governing body before the event, chosen by the team from the C1–C6 family, or generated through tier regulations. A shared selection across teams best matches the F1-style model and makes preparation begin before the weekend.

**Question:** Should the governing body or tyre supplier select and publish the weekend’s available dry compounds before the event?

**Recommendation:** Yes. The governing body or supplier selects the compounds from the C1–C6 family and publishes them before the weekend. Teams then plan allocations and strategies within that shared selection rather than choosing their own compounds.

### D-403 — Published shared weekend compounds

**Decision:** The governing body or tyre supplier selects the weekend’s dry compounds from the C1–C6 family and publishes them before the event. All teams plan allocations and strategies within the same shared selection.

**Rationale:** Teams can prepare deliberately while the compound choice remains a championship-level sporting variable rather than a team-specific advantage.

**Consequence:** The calendar and weekend setup need published compound selections, tier mappings, advance visibility, and allocation generation.

## Current question

### Q-402 — Compound-selection publication timing

Weekend compounds can be published when the calendar is created, during the pre-weekend management phase, or only when the race weekend begins. Earlier publication supports long-term planning; late publication creates uncertainty but can make event preparation more reactive.

**Question:** Should the weekend compound selection be published before the race weekend’s Pre-session Planning phase, with no ordinary late change?

**Recommendation:** Yes. Publish the selection before Pre-session Planning so teams can prepare allocation and strategy. Change it only through an exceptional regulation or safety decision, never as a routine mid-weekend adjustment.

### D-404 — Compounds published weeks before each race

**Decision:** The governing body or tyre supplier publishes each race weekend’s dry-compound selection several weeks before that race. Teams receive the selection before the weekend’s Pre-session Planning phase, and ordinary late changes are not allowed.

**Rationale:** Teams have enough time to prepare allocation, car setup expectations, driver training, and race strategy without knowing the entire season’s tyre choices years in advance.

**Consequence:** The calendar needs compound-announcement dates, advance notifications, weekend mappings, and exception handling for extraordinary regulation or safety changes.

## Current question

### Q-403 — Fixed compound-announcement lead time

Compound selections can be announced on a consistent lead time, such as three weeks before each race, or vary by event and be published only within a broad “several weeks” window. A fixed lead time is easier for teams to plan around and for the calendar to communicate.

**Question:** Should regulations define a fixed compound-announcement lead time, with three weeks as the launch default?

**Recommendation:** Yes. Use a fixed three-week lead time at launch, publish the date in the calendar, and allow future regulation votes to change the lead time for all eligible events.

### D-405 — Fixed three-week compound announcement

**Decision:** The launch tyre regulations use a fixed three-week lead time for publishing each race weekend’s dry compounds. The announcement date appears in the calendar, and future regulation votes may change the lead time for eligible events.

**Rationale:** Teams have a predictable planning window while the championship retains the ability to revise the process later.

**Consequence:** Calendar and regulation systems need announcement dates, event notifications, compound mappings, and future lead-time configuration.

## Current question

### Q-404 — Lower-tier compound-pair selection

Lower tiers can receive two compounds selected from the C1–C6 family and mapped as Soft/Medium, Soft/Hard, or Medium/Hard. The tyre supplier or governing body can choose the pair and mapping, or teams can choose among approved pairs.

**Question:** Should the tyre supplier or governing body choose and publish each lower-tier compound pair and its Soft/Medium/Hard mapping?

**Recommendation:** Yes. Use a shared published pair selected by the supplier or governing body. Teams plan within that pair, while regulations define which mappings and combinations are eligible for each tier.

### D-406 — Published lower-tier compound pairs

**Decision:** The tyre supplier or governing body selects and publishes a shared lower-tier compound pair and its weekend mapping. Teams plan within that pair, while regulations define eligible combinations and mappings for each tier.

**Rationale:** Lower-tier tyre strategy remains common across the field while using a simpler allocation structure than Tier 1.

**Consequence:** Lower-tier weekend regulations need pair selection, mapping, announcement, eligibility, and allocation generation.

## Current question

### Q-405 — Relative Soft/Medium/Hard labels

The Soft, Medium, and Hard labels can represent a global compound identity, or be relative weekend labels applied to the selected compounds. The underlying C1–C6 compound retains its actual pace, durability, and temperature characteristics even when the weekend label changes.

**Question:** Should Soft, Medium, and Hard labels be relative to the compounds selected for that weekend, while the underlying C1–C6 characteristics remain persistent?

**Recommendation:** Yes. Treat weekend labels as relative strategic labels. Preserve each compound’s C1–C6 identity and underlying behavior so the same compound remains consistent across different selections and tiers.

### D-407 — Persistent C1–C6 compound identity

**Decision:** Soft, Medium, and Hard are relative weekend labels applied to the selected compounds. Each compound retains persistent C1–C6 identity and underlying pace, durability, temperature, and degradation behavior across different events and tiers.

**Rationale:** Weekend labels remain readable while the underlying tyre family remains consistent and learnable.

**Consequence:** Tyre data needs persistent compound identity, weekend label mapping, tier eligibility, and context-aware strategy display.

## Current question

### Q-406 — Tier-specific weekend compound selections

The supplier or governing body can publish one compound selection shared by all tiers at an event, or select different compounds for each tier. Tier-specific selection better reflects different championship needs and regulations while keeping each tier’s field on a common set.

**Question:** Should each tier receive its own published weekend compound selection rather than sharing one selection across all tiers?

**Recommendation:** Yes. Select compounds independently for each tier, subject to that tier’s regulations. All teams within a tier use the same published selection, while different tiers can receive different combinations and mappings.

### D-408 — Tier-specific published compound selections

**Decision:** Each tier receives its own published weekend compound selection under that tier’s regulations. All teams within a tier use the same selection, while different tiers can receive different combinations and mappings.

**Rationale:** Tyre strategy can reflect each tier’s sporting identity without creating team-specific tyre advantages.

**Consequence:** Event regulations need tier-specific compound announcements, mappings, allocations, and return policies.

## Current question

### Q-407 — Compound consistency across sprint weekends

The selected compounds can remain fixed across practice, qualifying, sprint, and main race, or change between the sprint and main race. Keeping one selection across the weekend makes allocation and return planning meaningful and avoids introducing a second compound announcement.

**Question:** Should each tier’s published compound selection remain fixed across every session of a sprint weekend?

**Recommendation:** Yes. Keep the tier’s selected compounds and mappings fixed through practice, qualifying, sprint, and main race. Only regulation-defined allocation or return rules change how sets are used.

### D-409 — Fixed compounds across sprint weekends

**Decision:** Each tier’s published dry compounds and mappings remain fixed through practice, qualifying, sprint, and main race. Regulation-defined allocation and return rules determine how sets are used across those sessions.

**Rationale:** One weekend compound selection creates a coherent allocation strategy from the first practice session through the final race.

**Consequence:** Sprint-weekend tyre state needs fixed compound mapping, cross-session inventory, allocation rules, and return enforcement.

## Current question

### Q-408 — Intermediate and Wet allocations

Intermediate and Wet tyres can be treated as unlimited emergency options, or as finite dedicated allocations with compound, condition, and heat-cycle state like dry tyres. Finite wet allocations preserve the broader tyre-management model while regulations can define quantities appropriate to each tier.

**Question:** Should Intermediate and Wet tyres also use finite, regulation-defined allocations with condition and heat-cycle tracking?

**Recommendation:** Yes. Track finite Intermediate and Wet allocations by driver and entry, including condition and heat cycles. Let regulations define quantities and return rules, while wet-weather demand determines when those sets become strategically valuable.

### D-410 — Finite Intermediate and Wet allocations

**Decision:** Intermediate and Wet tyres use finite, regulation-defined allocations by driver and entry, with condition and heat-cycle tracking. Regulations define quantities and return rules; wet-weather demand determines when those sets become strategically valuable.

**Rationale:** Wet tyres remain part of the same allocation and condition economy without being treated as unlimited emergency equipment.

**Consequence:** Wet-weather tyre rules need quantities, ownership, condition, heat cycles, return policies, and crossover availability.

## Current question

### Q-409 — Wet-compound availability

Intermediate and Wet compounds can be selected from the same weekend dry-compound process, or remain dedicated options available at every event when conditions require them. Keeping them always available avoids a dry-weather announcement from making a wet race impossible to service.

**Question:** Should Intermediate and Wet compounds be available every weekend independently of the selected dry compounds?

**Recommendation:** Yes. Make dedicated Intermediate and Wet compounds available every weekend, with finite quantities and regulation-defined return rules. Weather determines whether they become usable and strategically valuable.

### D-411 — Dedicated wet compounds every weekend

**Decision:** Dedicated Intermediate and Wet compounds are available every weekend independently of the selected dry compounds. Quantities remain finite, regulations define return rules, and weather determines when the sets become usable and strategically valuable.

**Rationale:** A dry-compound announcement cannot make a wet race impossible to service, while wet tyres still require deliberate allocation and crossover decisions.

**Consequence:** Weekend tyre setup needs dry selection, dedicated wet availability, finite inventories, condition, heat cycles, and weather-triggered usability.

## Current question

### Q-410 — Expanded tyre-model launch scope

The tyre model now includes the C1–C6 family, tier-specific weekend selections, Soft/Medium/Hard mappings, three-week announcements, finite driver-locked allocations, Tier 1 return policies, sprint carryover, dynamic temperature and degradation, weather crossover, and dedicated Intermediate/Wet sets.

**Question:** Should we lock this expanded tyre model now and move to fuel execution details?

**Recommendation:** Yes. Lock the expanded tyre model and defer additional compound and inventory edge cases until race-weekend testing identifies a clear gap.

### D-412 — Expanded tyre-model scope locked

**Decision:** The launch tyre model is locked around the C1–C6 family, tier-specific weekend selections, relative Soft/Medium/Hard mappings, three-week announcements, finite driver-locked allocations, Tier 1 return policies, sprint carryover, dynamic temperature and degradation, weather crossover, and dedicated Intermediate/Wet compounds. Additional tyre and inventory edge cases are deferred.

**Rationale:** The tyre system has sufficient strategic depth and regulation flexibility without requiring further compound-management complexity before testing.

**Consequence:** Future tyre work should validate and balance this scope rather than expand it by default.

## Current question

### Q-411 — Continuous per-car fuel state

Fuel can be a fixed pre-race choice, or a continuous per-car state affected by starting load, engine mode, driver behavior, weather, traffic, damage, and pit decisions. A continuous model makes fuel part of the race strategy and supports live range projections.

**Question:** Should each car track fuel continuously through the race with live range, consumption, reserve, and pit projections?

**Recommendation:** Yes. Track fuel per car continuously. Let starting load, engine mode, driver behavior, weather, traffic, damage, and strategy affect consumption, and show projected range, reserve margin, and fuel-related decision windows.

### D-413 — Continuous per-car fuel tracking

**Decision:** Each car tracks fuel continuously through the race. Starting load, engine mode, driver behavior, weather, traffic, damage, and strategy affect consumption, with projected range, reserve margin, and fuel-related decision windows visible.

**Rationale:** Fuel becomes a live strategic state that influences pace, pit timing, and risk rather than a static starting number.

**Consequence:** Fuel simulation needs per-car load, consumption, range, reserve, engine-mode effects, and decision-window integration.

## Current question

### Q-412 — Engine-mode fuel tradeoffs

Engine modes can be automatic, or provide selectable pace and consumption levels such as Conserve, Balanced, Push, and Maximum Attack. Higher modes should improve pace or defensive capability while increasing fuel use, heat, wear, and possible reliability risk.

**Question:** Should players choose bounded engine modes that trade pace and race capability against fuel use, heat, wear, and reliability risk?

**Recommendation:** Yes. Offer Conserve, Balanced, Push, and Maximum Attack modes. Apply clear, bounded effects to pace, fuel consumption, heat, wear, overtaking/defence capability, and reliability risk.

### D-414 — Bounded engine-mode choices

**Decision:** Players choose Conserve, Balanced, Push, or Maximum Attack engine modes. Each mode has bounded effects on pace, fuel consumption, heat, wear, overtaking and defence capability, and reliability risk.

**Rationale:** Engine mode becomes a controllable race lever with clear performance and reliability tradeoffs.

**Consequence:** Engine modes need per-car state, effect profiles, thresholds, temporary overrides, and reliability integration.

## Current question

### Q-413 — Engine-mode duration and changes

Engine mode can remain fixed for an entire race, be set per stint, or change at any valid race decision window. Per-stint planning supports strategy while temporary event-window changes allow responses to battles, fuel needs, weather, and damage.

**Question:** Should engine modes be planned per stint and changeable at consequential race decision windows?

**Recommendation:** Yes. Set a baseline mode per stint, allow temporary event-window overrides, and return to the planned mode when the override expires. Hard heat, wear, fuel, and reliability limits must always take priority.

### D-415 — Practice-only engine-mode changes

**Decision:** Engine modes may be changed during practice. Once a car enters qualifying in a tier that uses qualifying, or enters the race in a tier without qualifying, its engine-mode setting is locked for the rest of the weekend. This supersedes the race-time engine-mode override portion of Q-413’s prior recommendation.

**Rationale:** Practice allows experimentation and preparation, while qualifying and race engine settings become a meaningful weekend commitment with performance, fuel, heat, wear, and reliability consequences.

**Consequence:** Engine-mode state needs practice flexibility, qualifying/race lock timing, weekend persistence, and no ordinary post-lock changes.

## Current question

### Q-414 — Tier-specific engine-mode lock point

Tier 1 and Tier 2 use qualifying, while Tier 3 begins its engine-mode lock when the race begins because it has no qualifying session. The lock should occur at the start of the first competitive session that uses the setting.

**Question:** Should engine modes lock at the start of qualifying for tiers with qualifying, and at the start of the race for Tier 3?

**Recommendation:** Yes. Lock the setting at qualifying start for Tier 1 and Tier 2, and at race start for Tier 3. Keep the locked setting through the rest of the weekend unless an exceptional regulation or safety rule permits a change.

### D-416 — Tier-specific engine-mode lock timing

**Decision:** Engine modes lock at qualifying start for Tier 1 and Tier 2, and at race start for Tier 3. The locked setting remains unchanged through the rest of the weekend unless an exceptional regulation or safety rule permits a change.

**Rationale:** Every tier locks engine configuration at the first competitive session that uses it, while Tier 3’s no-qualifying format receives the appropriate later lock.

**Consequence:** Weekend state needs tier-aware lock timing, competitive-session detection, persistence, and exceptional-change validation.

## Current question

### Q-415 — One engine mode for the remaining weekend

Once the lock occurs, the player can choose one engine mode per car for all remaining qualifying, sprint, and main-race sessions, or choose separate settings for each competitive session. One locked setting makes the weekend commitment meaningful and preserves the impact of practice preparation.

**Question:** Should one selected engine mode per car govern all remaining qualifying and race sessions for that weekend?

**Recommendation:** Yes. Select one engine mode per car at the lock point. That setting carries through qualifying, sprint, and main race for the remainder of the weekend.

### D-417 — One locked engine mode per car

**Decision:** Each car selects one engine mode at its tier-specific lock point. That setting carries through all remaining qualifying, sprint, and main-race sessions for the rest of the weekend.

**Rationale:** The mode becomes a meaningful weekend commitment informed by practice rather than a setting that can be optimized after every session.

**Consequence:** Engine-mode selection needs per-car commitment, weekend persistence, lock confirmation, and post-lock enforcement.

## Current question

### Q-416 — Engine-mode commitment preview

Before locking an engine mode, the player can receive only the mode label, or see projected effects across remaining sessions: pace, fuel consumption, heat, wear, reliability risk, qualifying impact, race range, and engineer confidence.

**Question:** Should the engine-mode lock screen show projected qualifying and race effects before the player commits?

**Recommendation:** Yes. Show projected pace, fuel use, heat, wear, reliability risk, qualifying impact, race range, and confidence for each mode. Include Driver Race Engineer and Strategy Engineer recommendations without applying one automatically.

### D-418 — Engine-mode lock commitment preview

**Decision:** Before locking engine mode, the player sees projected pace, fuel use, heat, wear, reliability risk, qualifying impact, race range, and confidence for each option. Driver Race Engineer and Strategy Engineer recommendations are advisory and never apply automatically.

**Rationale:** The player can make an informed weekend commitment based on both performance and reliability consequences.

**Consequence:** Engine-mode selection needs comparative projections, confidence, engineer recommendations, player confirmation, and lock enforcement.

## Current question

### Q-417 — Emergency engine-mode safety override

The selected mode may create an unsafe heat, wear, or reliability condition during the weekend. The game can let the car continue until failure, permit a player-approved emergency reduction, or force a safety fallback when operating limits are exceeded.

**Question:** Should a hard safety limit permit an emergency engine-mode reduction after the weekend lock?

**Recommendation:** Yes, but only as a safety override. Warn the player first when possible, require acknowledgement, and apply the lowest safe mode when limits are exceeded. Do not allow emergency overrides for ordinary pace or strategic optimization.

### D-419 — Safety-only engine-mode override

**Decision:** A hard heat, wear, or reliability limit can trigger an emergency engine-mode reduction after the weekend lock. The player is warned and asked to acknowledge when possible; if limits are exceeded, the lowest safe mode is applied. Strategic optimization cannot override the lock.

**Rationale:** Safety can supersede the weekend commitment without turning the lock into an ordinary mid-race tuning option.

**Consequence:** Engine-mode state needs emergency override, acknowledgement, forced-safe fallback, and post-event reporting.

## Current question

### Q-418 — Persistence of emergency engine-mode reduction

After a safety override, the car can return to the locked mode once conditions improve, or remain in the reduced mode for the rest of the weekend. Returning could recreate the risk; remaining reduced makes the consequence of the safety event meaningful.

**Question:** Should an emergency engine-mode reduction remain active for the rest of the weekend unless a later safety check explicitly clears it?

**Recommendation:** Yes. Keep the reduced mode active for the remainder of the weekend. Only an explicit safety clearance can restore the locked mode, and the change should appear in active strategy state and post-race history.

### D-420 — Persistent emergency engine-mode reduction

**Decision:** An emergency engine-mode reduction remains active for the rest of the weekend. Only an explicit safety clearance can restore the locked mode, and the change appears in active strategy state and post-race history.

**Rationale:** A safety event has a lasting operational consequence and cannot be casually reversed for short-term pace.

**Consequence:** Engine-mode recovery needs safety state, clearance criteria, authorization, restored-mode validation, and history.

## Current question

### Q-419 — Engine-mode safety clearance

Safety clearance can be automatic after conditions improve, issued by the Driver Race Engineer, or recommended by engineering and approved by the player. Restoring the locked mode should require evidence that heat, wear, and reliability risk are back within safe limits.

**Question:** Should the Driver Race Engineer recommend safety clearance while the player makes the final decision to restore the locked engine mode?

**Recommendation:** Yes. The Driver Race Engineer evaluates car-specific safety and recommends clearance; the Strategy Engineer can provide context; the player approves restoration. If the player does not approve, the reduced mode remains active.

### D-421 — Player-approved engine-mode safety clearance

**Decision:** The Driver Race Engineer evaluates car-specific safety and recommends restoring the locked engine mode. The Strategy Engineer can provide strategic context, but the player approves restoration. Without approval, the reduced mode remains active.

**Rationale:** Safety expertise informs the decision while the player retains control over a high-impact weekend change.

**Consequence:** Clearance decisions need safety evidence, engineer recommendations, player approval, restoration, and refusal states.

## Current question

### Q-420 — Engine-mode launch scope

The launch engine-mode model now includes practice flexibility, tier-specific lock points, one locked mode per car for the remaining weekend, comparative projections, safety-only emergency reduction, persistent fallback, and player-approved restoration.

**Question:** Should we lock the engine-mode model now and move to refueling and fuel-strategy details?

**Recommendation:** Yes. Lock the current engine-mode model and defer additional engine-mode edge cases until race-weekend testing identifies a clear gap.

### D-422 — Engine-mode model locked

**Decision:** The launch engine-mode model is locked around practice-only changes, tier-specific lock points, one locked mode per car for the remaining weekend, comparative commitment projections, safety-only emergency reduction, persistent reduced mode, and player-approved safety clearance. Additional engine-mode edge cases are deferred until race-weekend testing identifies a clear gap.

**Rationale:** The system provides meaningful preparation and commitment decisions while keeping the launch scope bounded.

**Consequence:** Future engine-mode work should validate and balance this model rather than expand it by default.

## Current question

### Q-421 — Refueling as a planned pit-stop action

Tier 2 and Tier 3 allow refueling, while Tier 1 does not. Refueling can be an automatic amount chosen by the simulation, or an explicit player decision within each car's legal pit-stop plan. The decision needs to account for current fuel, tank capacity, projected consumption, desired range, pit-stop time, and the active pit-crew refueling capability.

**Question:** Should the player explicitly choose the refueling amount or target range for each planned stop in tiers where refueling is legal?

**Recommendation:** Yes. Let the player choose a refueling amount or target range for each car's pit-stop plan. Show the resulting range, reserve margin, added pit time, and strategic tradeoff; the chief mechanic executes the legal plan using the shared crew setup.

### D-423 — Player-planned refueling amounts

**Decision:** In tiers where refueling is legal, the player explicitly chooses a refueling amount or target range for each car's planned pit stop. The game shows resulting range, reserve margin, added pit time, and strategic tradeoffs, while the chief mechanic executes the legal plan using the shared crew setup.

**Rationale:** Fuel becomes a deliberate strategic choice without requiring the player to manually calculate every lap of consumption.

**Consequence:** Refueling plans need per-car targets, projected range, reserve calculations, pit-time estimates, legality checks, and execution reporting.

## Current question

### Q-422 — Tier-specific fuel capacity and refueling limits

Refueling should not allow unlimited fuel to be added or make every tier behave identically. Capacity, refueling rate, and any minimum or maximum stop quantity can be defined by the active tier's regulations and changed for a future season. A player's plan would be rejected or revised if it exceeds the tank's remaining capacity or the legal pit-stop limits.

**Question:** Should each tier use regulation-defined fuel capacity, refueling rate, and legal per-stop limits that constrain the player's refueling plan?

**Recommendation:** Yes. Give each tier a regulation-defined tank capacity, refueling rate, and legal per-stop limits. Validate the player's plan before the stop, show the exact constraint causing any invalid plan, and allow future regulation changes to modify those values starting the next season.

### D-424 — Regulation-defined refueling constraints

**Decision:** Each tier uses regulation-defined tank capacity, refueling rate, and legal per-stop limits. The game validates refueling plans before execution, explains the constraint behind any invalid plan, and allows future regulation changes to modify these values starting the next season.

**Rationale:** Refueling remains strategically meaningful while preserving tier identity, legality, and predictable pit-stop planning.

**Consequence:** Fuel rules need tier-aware capacity, rate, quantity, validation, explanation, and next-season regulation support.

## Current question

### Q-423 — Fuel planning across sessions

Fuel needs are different in practice, qualifying, sprint races, and main races. Practice benefits from flexible loads between stints; qualifying needs enough fuel for planned runs and cool-down or in-lap requirements; and the race needs a legal starting load based on whether refueling is available. A final race load could be locked at the pre-grid decision window, while legal pit stops can change the remaining fuel plan later.

**Question:** Should fuel planning be session-specific, with practice loads adjustable between stints, qualifying loads planned per run, and the race starting load locked at pre-grid?

**Recommendation:** Yes. Use a separate fuel plan for each session. Allow practice adjustments during changeovers, plan qualifying fuel around each run, and lock the race starting load at pre-grid after showing projected range and reserve. Lower-tier refueling remains available during legal race stops; Tier 1 must start with enough fuel for the no-refueling race plus the required reserve.

### D-425 — Session-specific fuel planning

**Decision:** Fuel planning is session-specific. Practice loads can be adjusted during changeovers, qualifying fuel is planned around each run, and the race starting load locks at pre-grid after projected range and reserve are shown. Lower-tier refueling remains available during legal race stops, while Tier 1 must start with enough fuel for the no-refueling race plus the required reserve.

**Rationale:** Each session creates a different fuel decision without allowing a practice or qualifying load to silently determine the race plan.

**Consequence:** Fuel state needs session boundaries, run-level qualifying plans, pre-grid locking, race projections, and tier-specific refueling behavior.

## Current question

### Q-424 — Fuel reserve targets and critical warnings

A car can carry a regulation-required minimum reserve, a larger player-chosen strategic buffer, or only the amount needed to reach the projected finish. A reserve target creates a meaningful tradeoff between lighter fuel and protection against traffic, weather, damage, engine mode, and changing consumption. The game also needs a clear response when the projection falls below the target or below the legal minimum.

**Question:** Should regulations define a minimum finish reserve while the player chooses a higher strategic reserve target for each car and race plan?

**Recommendation:** Yes. Define a tier-specific minimum reserve for legality and safety, then let the player set a higher target reserve. Show target and minimum separately; warn when projections fall below either threshold, have engineers recommend conservation or refueling when legal, and treat actual fuel exhaustion as a serious race consequence rather than silently correcting the load.

### D-426 — Fuel reserve thresholds

**Decision:** Each tier defines a minimum finish reserve for legality and safety, while the player can set a higher strategic reserve target for each car and race plan. The game shows both thresholds, warns when projections fall below either one, and lets engineers recommend conservation or legal refueling. Actual fuel exhaustion remains a serious race consequence.

**Rationale:** Separate legal and strategic thresholds create meaningful fuel risk without hiding the difference between an unsafe plan and a conservative preference.

**Consequence:** Fuel projections need minimum and target reserve states, threshold warnings, engineer recommendations, and fuel-exhaustion outcomes.

## Current question

### Q-425 — Dedicated fuel-saving control

Fuel consumption is already influenced by engine mode, stint pace, driver behavior, weather, traffic, damage, and strategy. Adding a separate Fuel Save command could provide more precision, but it would create another control alongside pace, engine mode, tyre management, pit timing, and refueling decisions. The existing strategy model already allows pace changes at decision windows.

**Question:** Should fuel management remain integrated into the existing pace, engine-mode, stint, and pit strategy controls instead of adding a separate fuel-saving mode at launch?

**Recommendation:** Yes. Keep the control set focused: let the player adjust pace, stint length, pit timing, and refueling where legal, while engine mode follows its locked-weekend rules. Engineers can recommend pace or pit changes when fuel projections deteriorate, without adding another fuel-specific toggle.

### D-427 — Integrated fuel-management controls

**Decision:** Fuel management remains integrated into pace, stint length, pit timing, legal refueling, and the locked engine-mode system. No separate fuel-saving mode is added at launch. Engineers can recommend pace or pit changes when fuel projections deteriorate.

**Rationale:** Existing strategy controls provide fuel agency without adding another overlapping command layer.

**Consequence:** Fuel responses use current strategy decision windows, engineer recommendations, legal refueling, and engine-mode constraints.

## Current question

### Q-426 — Fuel-projection confidence

Fuel consumption can be shown as an exact prediction, or as an estimate with a confidence range. The range could account for known conditions such as weather, traffic, damage, driver behavior, engine mode, and pace. Practice and early race data can make the estimate more reliable, while unexpected conditions can widen it again.

**Question:** Should fuel projections show an expected value with a confidence range that improves as the team gathers practice and race data?

**Recommendation:** Yes. Show expected consumption, projected finish fuel, and a bounded confidence range. Let practice findings, live race data, driver feedback, and engineer quality improve confidence, while weather, traffic, damage, and changing pace can widen the range. Keep the uncertainty explainable rather than using arbitrary hidden variance.

### D-428 — Confidence-ranged fuel projections

**Decision:** Fuel projections show expected consumption, projected finish fuel, and a bounded confidence range. Practice findings, live race data, driver feedback, and engineer quality improve confidence, while weather, traffic, damage, and changing pace can widen the range. Uncertainty remains explainable rather than arbitrary hidden variance.

**Rationale:** Fuel planning rewards preparation and data quality while preserving uncertainty from changing race conditions.

**Consequence:** Fuel telemetry needs expected values, confidence bounds, contributing factors, confidence updates, and engineer interpretation.

## Current question

### Q-427 — Refueling within a pit-stop service package

Where refueling is legal, a stop may include fuel, tyres, repairs, or several of these together. Refueling can always add a separate full-duration step, or it can run in parallel with tyre work when the tier's crew and regulations allow it. The final stop time should reflect the critical path of the active service tasks, plus entry, stabilization, and release.

**Question:** Should legal refueling be an optional part of a combined pit-stop package, with its work overlapping tyre changes or repairs when the tier and crew setup allow it?

**Recommendation:** Yes. Let the player combine refueling with tyres and repairs in one legal service package. Run compatible tasks in parallel according to the tier template and crew skills, and calculate total stop time from the critical path rather than automatically adding every task end-to-end.

### D-429 — Combined refueling pit-stop execution

**Decision:** Legal refueling is an optional part of a combined pit-stop package with tyres and repairs. Compatible work runs in parallel according to the tier template and crew skills, and total stop time is calculated from the critical path rather than adding every task end-to-end.

**Rationale:** Refueling becomes part of meaningful service-package planning while preserving the differences between tier regulations and crew capability.

**Consequence:** Pit-stop simulation needs fuel, tyre, repair, task-overlap, crew-skill, legality, and critical-path validation.

## Current question

### Q-428 — Fuel target units

Players need to plan fuel without manually converting every value into a race distance. A plan can use exact fuel quantity, projected laps, or a target finish reserve as its primary input, while the simulation still tracks precise fuel internally. A distance-based target is easier to reason about when consumption changes with pace, weather, traffic, and engine mode.

**Question:** Should players primarily set fuel targets in understandable race units such as laps or projected range, with exact fuel quantity shown as a secondary detail?

**Recommendation:** Yes. Make projected range and laps the primary planning language, while showing exact fuel quantity, expected consumption, and reserve as supporting details. Let advanced players choose an exact quantity when desired, but keep the default strategy decision distance-based.

### D-430 — Range-first fuel planning

**Decision:** Players primarily plan fuel using projected range and laps. Exact fuel quantity, expected consumption, and reserve remain visible as supporting details, with advanced players able to choose an exact quantity when desired.

**Rationale:** Distance-based planning is easier to understand while retaining precise simulation data and advanced control.

**Consequence:** Fuel strategy needs range and lap projections, exact quantity visibility, reserve calculations, and optional advanced quantity input.

## Current question

### Q-429 — Fuel-system launch scope

The launch fuel model now covers continuous per-car fuel state, engine-mode and pace effects, explicit legal refueling plans, tier-specific capacity and refueling limits, session-specific planning, reserve thresholds, confidence-ranged projections, combined pit-stop execution, and range/lap-based player controls.

**Question:** Should we lock the fuel model now and move to the next major game system?

**Recommendation:** Yes. Lock the current fuel model and defer additional fuel edge cases until race-weekend simulation exposes a clear gap.

### D-431 — Fuel-system scope locked

**Decision:** The launch fuel model is locked around continuous per-car state, engine-mode and pace effects, explicit legal refueling plans, tier-specific capacity and limits, session-specific planning, reserve thresholds, confidence-ranged projections, combined pit-stop execution, and range/lap-based controls. Additional fuel edge cases are deferred until race-weekend simulation exposes a clear gap.

**Rationale:** Fuel has sufficient strategic depth and tier differentiation without continuing to expand the launch ruleset.

**Consequence:** Future fuel work should validate and balance this model rather than add complexity by default.

## Current question

### Q-430 — Weather forecast model

Weather can be a fixed session condition known in advance, or an evolving forecast with confidence, timing windows, and uncertainty. An evolving model creates planning decisions around practice, qualifying, tyre allocations, fuel, setup, and crossover timing while still giving the player useful information before committing a plan.

**Question:** Should weather use an evolving forecast with precipitation probability, timing windows, track-condition projections, and confidence that updates during the weekend?

**Recommendation:** Yes. Provide forecast windows and confidence rather than exact hidden certainty. Update precipitation, temperature, wind, track wetness, and drying projections as new data arrives, and have engineers explain how the forecast affects tyre, fuel, setup, and session plans without making decisions automatically.

### D-432 — Evolving weather forecasts

**Decision:** Weather uses evolving forecasts with precipitation probability, timing windows, track-condition projections, and confidence. Precipitation, temperature, wind, wetness, and drying projections update as new data arrives. Engineers explain effects on tyres, fuel, setup, and session plans without making decisions automatically.

**Rationale:** Forecast uncertainty creates preparation and response decisions while preserving player control.

**Consequence:** Weather data needs forecast windows, confidence, updates, engineer interpretation, and downstream effects across race-weekend systems.

## Current question

### Q-431 — Track-condition state transitions

Rain intensity alone does not describe the racing surface. The track can move through dry, damp, wet, standing-water, and drying-line conditions, with transitions affected by rainfall, drainage, temperature, wind, rubber, traffic, and cars circulating. These states determine tyre crossover, grip, aquaplaning risk, lap times, and whether a session remains safe to run.

**Question:** Should track condition be a continuous state with meaningful transitions between dry, damp, wet, standing-water, and drying-line conditions rather than a simple dry-or-wet flag?

**Recommendation:** Yes. Model track condition continuously and expose clear state transitions. Let rainfall, drainage, temperature, wind, rubber, traffic, and session activity move the surface between states, with visible effects on grip, lap time, tyre crossover, aquaplaning risk, and session safety.

### D-433 — Continuous track-condition transitions

**Decision:** Track condition is modeled continuously with transitions between dry, damp, wet, standing-water, and drying-line states. Rainfall, drainage, temperature, wind, rubber, traffic, and session activity affect the state, which changes grip, lap time, tyre crossover, aquaplaning risk, and session safety.

**Rationale:** A changing surface creates meaningful weather strategy without reducing conditions to a binary flag.

**Consequence:** Weather simulation needs state transitions, contributing factors, visible condition effects, and safety validation.

## Current question

### Q-432 — Launch weather geography

Weather can be simulated as one shared circuit-wide condition, or vary independently by sector with local rain and drying. Sector-level weather is more detailed but adds complexity to forecasts, tyre decisions, lap-time modeling, and player interpretation. A circuit-wide model can still change continuously during a session.

**Question:** Should launch weather use one shared circuit-wide condition that evolves over time, with sector-specific weather deferred until a later expansion?

**Recommendation:** Yes. Use one shared circuit-wide weather and track state at launch, updated throughout the session. Keep the forecast and player decisions clear, then defer sector-specific weather until the core race-weekend model proves it needs more granularity.

### D-434 — Circuit-wide launch weather

**Decision:** Launch weather uses one shared circuit-wide weather and track state that evolves throughout each session. Sector-specific weather is deferred until the core race-weekend model proves it needs more granularity.

**Rationale:** A shared evolving state preserves strategic weather changes without making forecasts and tyre decisions unnecessarily difficult to interpret.

**Consequence:** Weather updates are circuit-wide at launch, with sector-level variation explicitly outside the initial scope.

## Current question

### Q-433 — Weather safety authority

Extreme rain, standing water, visibility loss, lightning, or other conditions can make a session unsafe. The game can leave the player responsible for continuing, or race control can enforce delays, red flags, safety-car periods, tyre restrictions, and session stoppages based on published thresholds. The player should still control strategy whenever the session is allowed to run.

**Question:** Should race control automatically enforce weather-related safety restrictions and stoppages when conditions cross authoritative thresholds?

**Recommendation:** Yes. Race control should own legality and safety: it can delay a session, stop running, deploy a safety car, require wet-weather tyres, or end a session when thresholds are crossed. The player controls tyres, pace, fuel, and pit decisions whenever race control permits the cars to run.

### D-435 — Race-control weather safety authority

**Decision:** Race control owns weather-related safety and legality. It can delay or stop a session, deploy a safety car, require wet-weather tyres, or end a session when authoritative thresholds are crossed. The player controls tyres, pace, fuel, and pit decisions whenever running is permitted.

**Rationale:** Dangerous conditions must have consistent rules, while normal crossover decisions remain under player control.

**Consequence:** Weather rules need race-control thresholds, session-state changes, safety-car integration, wet-tyre requirements, and player decision windows.

## Current question

### Q-434 — Mandatory wet-weather tyre thresholds

During a transition from dry to wet or back to dry, the player should decide when to pit for the best compound. However, extreme conditions may make a dry tyre or an Intermediate no longer legal or safe. Regulations can define thresholds that require an Intermediate or Wet tyre, while the player retains choice within the legal set.

**Question:** Should race control require Intermediate or Wet tyres only when published safety or legality thresholds are crossed, while leaving normal crossover timing to the player?

**Recommendation:** Yes. Keep normal dry-to-damp and damp-to-dry crossover decisions with the player. When published thresholds are crossed, race control can require the appropriate wet-weather compound or prohibit an unsafe tyre, with a clear rule explanation and a legal pit decision window.

### D-436 — Threshold-based wet-tyre requirements

**Decision:** Players control normal dry-to-damp and damp-to-dry crossover timing. When published safety or legality thresholds are crossed, race control can require the appropriate wet-weather compound or prohibit an unsafe tyre, with a clear rule explanation and a legal pit decision window.

**Rationale:** Weather strategy remains high-agency until safety or sporting rules require a consistent intervention.

**Consequence:** Tyre legality needs threshold checks, compound requirements, prohibition states, explanations, and pit decision windows.

## Current question

### Q-435 — Weather information cadence

The player can receive a forecast only at scheduled planning phases, receive continuous live weather data, or receive scheduled updates plus urgent alerts when conditions materially change. Constant exact information reduces uncertainty, while no timely update would make weather strategy feel arbitrary.

**Question:** Should the player receive weather updates at planning windows and major condition changes, with urgent alerts for safety or tyre-crossover events rather than a constant exact forecast?

**Recommendation:** Yes. Provide forecast updates during pre-session planning, session transitions, and meaningful decision windows. Trigger urgent alerts for major precipitation changes, drying or flooding transitions, safety thresholds, and tyre-legality changes, while preserving forecast uncertainty between updates.

### D-437 — Weather information cadence

**Decision:** The player receives weather updates during pre-session planning, session transitions, and meaningful decision windows. Urgent alerts occur for major precipitation changes, drying or flooding transitions, safety thresholds, and tyre-legality changes, while forecast uncertainty remains between updates.

**Rationale:** The player receives actionable information without eliminating the uncertainty that makes weather strategy meaningful.

**Consequence:** Weather communication needs scheduled updates, urgent alerts, confidence state, threshold events, and engineer interpretation.

## Current question

### Q-436 — Weather effects on performance

Weather should change how the car and driver perform without rewriting the underlying car attribute values or driver ratings. Air and track temperature, wind, wetness, visibility, and drying conditions can affect grip, aero efficiency, braking, cooling, tyre operating windows, fuel consumption, setup suitability, and driver confidence. These effects should remain bounded and explainable.

**Question:** Should weather apply temporary, explainable performance modifiers while leaving the underlying car attributes, driver ratings, and developed upgrade values unchanged?

**Recommendation:** Yes. Apply bounded weather effects to grip, aero efficiency, braking, cooling, tyre behavior, fuel consumption, setup suitability, and driver confidence. Keep the underlying ratings and upgrade values unchanged so the player can distinguish car capability from environmental conditions.

### D-438 — Bounded weather performance effects

**Decision:** Weather applies bounded, explainable temporary effects to grip, aero efficiency, braking, cooling, tyre behavior, fuel consumption, setup suitability, and driver confidence. Underlying car attributes, driver ratings, and developed upgrade values remain unchanged.

**Rationale:** Environmental conditions change how capability is expressed without permanently modifying the team's assets or people.

**Consequence:** Weather effects need bounded modifiers, contributing conditions, visible explanations, and separation from persistent ratings and upgrade values.

## Current question

### Q-437 — Setup changes during changing weather

The player can prepare a dry setup, wet setup, or compromise setup before a session. Allowing structural setup changes during a live session would remove the cost of preparation and create unrealistic instant optimization. Weather contingencies can instead be handled through tyre choice, pace, fuel, and pit decisions once the session is underway.

**Question:** Should structural car setup remain locked once a session begins, with weather changes handled through tyres, pace, fuel, and pit strategy until the next permitted setup window?

**Recommendation:** Yes. Let the player select and prepare the setup before the session, then lock structural changes when running begins. If weather shifts, respond through legal tyre choices, pace, fuel, and pit decisions; apply setup changes only between sessions or during an explicitly permitted garage window.

### D-439 — Setup lock during live weather changes

**Decision:** Players select and prepare structural setup before the session, and setup locks when running begins. Weather shifts are handled through legal tyre choices, pace, fuel, and pit decisions. Setup changes occur only between sessions or during an explicitly permitted garage window.

**Rationale:** Preparation has value, and changing weather creates strategy rather than an instant setup optimization action.

**Consequence:** Session locks need setup state, permitted garage windows, weather contingencies, and strategy controls that remain available after setup is locked.

## Current question

### Q-438 — Weather-aware setup preparation

Before a session, the player can choose a dry-focused, wet-focused, or compromise setup based on the forecast and expected track evolution. Engineers can compare the expected performance and confidence of each option, but the player should decide which setup to commit before the structural lock.

**Question:** Should the pre-session setup screen present weather-aware dry, wet, and compromise options with projected performance and confidence for the player to choose from?

**Recommendation:** Yes. Offer dry-focused, wet-focused, and compromise setup options when relevant. Show expected grip, tyre behavior, pace, stability, and confidence against the forecast, then let the player choose the setup before the session locks.

### D-440 — Weather-aware setup options

**Decision:** Before a session, the player can choose dry-focused, wet-focused, or compromise setup options when relevant. The game shows expected grip, tyre behavior, pace, stability, and confidence against the forecast before the setup locks.

**Rationale:** Setup preparation becomes an informed weather decision without allowing automatic optimization.

**Consequence:** Setup preparation needs weather profiles, forecast comparison, projected effects, confidence, and player commitment before the session lock.

## Current question

### Q-439 — Weather effects on pit-stop execution

Wet conditions can affect pit-lane grip, visibility, worker movement, tyre handling, refueling safety, and the likelihood of small execution delays. These effects can be ignored, or modeled as bounded changes to stop duration and execution risk that interact with the locked pit-crew skills and service package.

**Question:** Should weather apply bounded pit-lane modifiers to pit-stop duration and execution risk when conditions are wet or visibility is poor?

**Recommendation:** Yes. Let wet or low-visibility conditions modestly affect stop duration and execution risk. Apply the effect to the existing pit-crew and service model, report the cause of any delay, and avoid adding new pit-crew roles solely for weather.

### D-441 — Weather-modified pit execution

**Decision:** Wet or low-visibility conditions apply modest pit-lane modifiers to stop duration and execution risk through the existing pit-crew and service model. Delays report their weather cause, and no weather-specific pit-crew roles are added.

**Rationale:** Conditions matter to operational execution without expanding the pit-crew structure beyond its task-based design.

**Consequence:** Pit-stop outcomes need weather modifiers, visibility state, execution-risk reporting, and integration with existing crew skills.

## Current question

### Q-440 — Driver attributes in wet conditions

The driver model already includes Wet Pace, Adaptability, Consistency, and Feedback. Wet Pace can represent speed on a stable wet surface; Adaptability can represent responding to changing grip and crossover conditions; Consistency can affect error risk; and Feedback can improve setup and tyre decisions. A separate hidden rain stat would duplicate these attributes.

**Question:** Should wet-weather driver performance use the existing Wet Pace, Adaptability, Consistency, and Feedback attributes instead of adding another weather-specific driver stat?

**Recommendation:** Yes. Use Wet Pace as the primary wet-performance attribute, with Adaptability influencing changing conditions, Consistency influencing error risk, and Feedback improving weather-related setup and tyre understanding. Keep the same 0–100 rating scale used across drivers, staff, and pit crew.

### D-442 — Existing driver attributes for wet weather

**Decision:** Wet-weather driver performance uses the existing Wet Pace, Adaptability, Consistency, and Feedback attributes. Wet Pace is primary for wet performance; Adaptability influences changing conditions; Consistency influences error risk; and Feedback improves weather-related setup and tyre understanding. The shared 0–100 rating scale applies.

**Rationale:** Weather creates driver differentiation using the established attribute model instead of adding a redundant hidden stat.

**Consequence:** Wet-weather simulation needs attribute-specific effects, explainable error risk, setup and tyre feedback, and consistent rating semantics.

## Current question

### Q-441 — Weather-system launch scope

The launch weather model now includes evolving forecasts, confidence and update windows, continuous circuit-wide track states, race-control safety authority, threshold-based wet-tyre requirements, weather-aware setup preparation, bounded car and pit-stop effects, and existing driver-attribute responses. Sector-specific weather and additional weather edge cases remain possible future expansions.

**Question:** Should we lock the current weather model now and defer sector-level weather and additional weather edge cases until race-weekend testing identifies a clear gap?

**Recommendation:** Yes. Lock the current weather model and validate it through practice, qualifying, and race simulations before adding more granularity.

### D-443 — Weather-system scope locked

**Decision:** The launch weather model is locked around evolving forecasts, confidence and update windows, continuous circuit-wide track states, race-control safety authority, threshold-based wet-tyre requirements, weather-aware setup preparation, bounded car and pit-stop effects, and existing driver-attribute responses. Sector-level weather and additional weather edge cases are deferred until testing identifies a clear gap.

**Rationale:** Weather has meaningful strategic and operational depth without requiring sector-level simulation at launch.

**Consequence:** Future weather work should validate and balance the current model before expanding its granularity.

## Current question

### Q-442 — Dedicated post-weekend review phase

After a race weekend, the player needs to understand what happened and decide what to change before advancing the calendar. A review can be scattered across result screens, or presented as a dedicated phase with official results, strategy execution, driver and car performance, tyre and fuel outcomes, pit stops, incidents, damage, scrutineering, and actionable recommendations.

**Question:** Should every race weekend end with a dedicated post-weekend review phase that consolidates results, evidence, recommendations, and player-approved follow-up decisions before normal time advancement resumes?

**Recommendation:** Yes. Use a dedicated review phase with team and per-car summaries, confidence-aware findings, engineer recommendations, and clear follow-up actions. The player can approve, edit, reject, or defer recommendations; nothing changes automatically except authoritative results and consequences already resolved by race control.

### D-444 — Dedicated post-weekend review

**Decision:** Every race weekend ends with a dedicated review phase containing team and per-car summaries, confidence-aware findings, engineer recommendations, and follow-up actions. The player can approve, edit, reject, or defer recommendations. Authoritative results and already-resolved race consequences are not changed by the review.

**Rationale:** A distinct review phase turns race data into understandable management decisions without hiding changes in scattered screens or automatic actions.

**Consequence:** The review phase needs official results, evidence summaries, recommendation ownership, player actions, and deferred-item tracking.

## Current question

### Q-443 — Persistent consequences in the review

Race weekends can change more than championship points. The review may need to finalize car damage and wear, part availability, driver and staff fatigue, tyre inventory, fuel and repair costs, knowledge and confidence gains, R&D findings, contracts or morale, sponsor outcomes, and regulation or governance consequences. If these changes are not consolidated, the player may not understand the team's true state before planning the next event.

**Question:** Should the post-weekend review explicitly show and finalize all persistent car, people, inventory, financial, knowledge, and championship consequences before the player advances time?

**Recommendation:** Yes. Show each persistent consequence with its before-and-after state, cause, confidence where applicable, and any required player action. Finalize the resolved state before time advances, while keeping optional recommendations separate from facts that the simulation has already applied.

### D-445 — Persistent consequence finalization

**Decision:** The post-weekend review shows and finalizes persistent car, people, inventory, financial, knowledge, and championship consequences before time advances. Each consequence includes before-and-after state, cause, confidence where applicable, and required action. Optional recommendations remain separate from already-applied simulation facts.

**Rationale:** The player can start the next planning cycle with a complete and trustworthy team state.

**Consequence:** Review processing needs persistent-state diffs, cause attribution, confidence, required-action flags, and separation between facts and recommendations.

## Current question

### Q-444 — Required versus optional review actions

Some post-weekend outcomes may require a decision before the team can safely continue, such as an unsafe car, a missing legal part, an unresolved driver seat, or a regulation compliance issue. Other recommendations, such as training priorities, setup analysis, or development focus, can wait. Treating every recommendation as a blocker would create friction; treating required decisions as optional could produce invalid future states.

**Question:** Should review items be split into required decisions that block time advancement and optional recommendations that can be approved, edited, rejected, deferred, or left for later?

**Recommendation:** Yes. Block advancement only for safety, legality, roster, resource, or other decisions needed to create a valid next state. Keep strategic and developmental recommendations optional, with their urgency, expiry, and consequences clearly shown.

### D-446 — Required and optional review actions

**Decision:** Review items are split into required decisions that can block time advancement and optional recommendations that can be approved, edited, rejected, deferred, or left for later. Blocking applies only to safety, legality, roster, resource, or other validity issues; strategic and developmental recommendations remain optional with urgency and consequences shown.

**Rationale:** The review protects the next simulation state without turning every useful recommendation into mandatory administration.

**Consequence:** Review items need action type, blocking status, urgency, expiry, consequence preview, and deferred-state handling.

## Current question

### Q-445 — Staff ownership of post-weekend recommendations

Recommendations are more useful when the player knows who produced them and why. The Driver Race Engineer can own driver- and car-specific findings; the Strategy Engineer can own team strategy and cross-car findings; the Chief Mechanic can own pit-crew execution, service, and operational findings; and development or facility staff can own longer-term technical recommendations. Multiple staff may contribute evidence, but ownership should remain clear.

**Question:** Should post-weekend recommendations be owned by the staff role closest to the decision, with supporting evidence from other staff and clear player approval required for changes?

**Recommendation:** Yes. Assign each recommendation a primary owner: Driver Race Engineer for car and driver execution, Strategy Engineer for team strategy, Chief Mechanic for pit operations, and relevant technical or development staff for R&D and facilities. Show supporting evidence and conflicts, but require the player to approve or edit the action.

### D-447 — Staff-owned post-weekend recommendations

**Decision:** Each post-weekend recommendation has a primary owner closest to the decision: Driver Race Engineer for car and driver execution, Strategy Engineer for team strategy, Chief Mechanic for pit operations, and relevant technical or development staff for R&D and facilities. Supporting evidence and conflicts are visible, and the player approves or edits the action.

**Rationale:** Clear ownership makes recommendations understandable and preserves the distinct responsibilities of the team staff.

**Consequence:** Recommendations need an owner, evidence contributors, conflict state, approval action, edit path, and audit history.

## Current question

### Q-446 — Post-weekend recommendation delivery

Recommendations can appear as forced popups immediately after the result, be buried in separate management screens, or arrive as a structured post-weekend inbox or debrief queue. The player should first receive the official result and then review actionable recommendations at their own pace, with required items still visible as blockers.

**Question:** Should post-weekend recommendations be delivered through a structured inbox or debrief queue that the player can review and resolve after the official results are shown?

**Recommendation:** Yes. Show official results first, then create a structured recommendation queue grouped by urgency, car, department, and owner. Allow the player to open, approve, edit, reject, defer, or archive each item without forced popups, while required blockers remain clearly surfaced.

### D-448 — Structured post-weekend recommendation queue

**Decision:** Official results are shown first, followed by a structured recommendation queue grouped by urgency, car, department, and owner. The player can open, approve, edit, reject, defer, or archive recommendations without forced popups. Required blockers remain clearly surfaced.

**Rationale:** The player gets a calm, auditable handoff from race results to management actions without losing important required decisions.

**Consequence:** The post-weekend inbox needs grouping, urgency, ownership, action states, blocker visibility, and recommendation history.

## Current question

### Q-447 — Post-weekend review launch scope

The launch post-weekend review now includes official results, persistent before-and-after consequences, required versus optional actions, staff-owned recommendations, evidence and conflicts, player approval or editing, and a structured inbox or debrief queue. Additional presentation details can be refined during UI planning.

**Question:** Should we lock the post-weekend review model now and move to the next major management system?

**Recommendation:** Yes. Lock the current review model and defer additional inbox and debrief edge cases until the broader management loop is implemented and tested.

### D-449 — Post-weekend review scope locked

**Decision:** The launch post-weekend review is locked around official results, persistent before-and-after consequences, required versus optional actions, staff-owned recommendations, evidence and conflicts, player approval or editing, and a structured inbox or debrief queue. Additional inbox and debrief edge cases are deferred until the broader management loop is implemented and tested.

**Rationale:** The review provides a complete handoff from race results to the next management cycle without expanding into unnecessary presentation detail.

**Consequence:** Future review work should validate and balance this scope before adding new recommendation or debrief mechanics.

## Group 1 — Energy / ERS

### Q-448 — Energy-system core boundary

Energy recovery and deployment can be omitted, represented as a hidden pace modifier, or modeled as an explicit per-car state. An explicit system would track battery charge, energy harvesting, deployment, and reserve through practice, qualifying, and racing. It would give the player another strategic lever, but it should use meaningful planning and decision windows rather than requiring lap-by-lap micromanagement.

**Question:** Should ERS be an explicit per-car energy system with visible charge, harvesting, deployment, and reserve, controlled through pre-session or stint plans and meaningful race decision windows?

**Recommendation:** Yes. Make ERS an explicit per-car system with a continuous energy state and player-visible projections. Control it through session or stint plans and consequential race windows, while deferring exact deployment modes, harvesting rules, and tier regulations until this boundary is accepted.

### D-450 — Regulation-controlled ERS availability

**Decision:** ERS is an explicit, continuous, visible per-car energy system. It is active by default in Tier 1 at launch, while lower tiers do not use ERS unless a future regulation change enables it. ERS availability is regulation data and changes take effect through the established next-season regulation process.

**Rationale:** ERS creates top-tier identity without forcing the same technical system into every championship, and regulation changes can reshape the ladder over time.

**Consequence:** Tier regulations need ERS availability, activation timing, and next-season effective-date fields. Cars in tiers without ERS do not generate or consume ERS state.

## Current question

### Q-449 — ERS deployment control granularity

ERS can be controlled as an exact energy amount every lap, managed automatically by the simulation, or exposed through a small set of bounded deployment profiles. Exact lap-by-lap control would add heavy micromanagement; fully automatic behavior would hide an important Tier 1 strategic lever. The existing game direction favors plans and meaningful decision windows.

**Question:** Should players choose bounded ERS deployment profiles per stint, with temporary overrides at consequential race decision windows while the simulation handles exact lap-level energy flow?

**Recommendation:** Yes. Use a small set of clearly differentiated deployment profiles selected in session or stint plans. Allow temporary race-window overrides, show charge and projected depletion, and keep exact harvesting and consumption calculations inside the simulation rather than requiring lap-by-lap input.

### D-451 — Planned ERS deployment profiles

**Decision:** Players select a small set of bounded ERS deployment profiles in session or stint plans. Temporary overrides are available at consequential race decision windows, while the simulation handles exact lap-level energy flow, harvesting, and consumption.

**Rationale:** ERS provides meaningful strategic agency without turning every lap into a manual energy-allocation task.

**Consequence:** ERS planning needs profile definitions, per-stint selection, temporary override state, charge projections, and race-window validation.

## Current question

### Q-450 — Automatic ERS harvesting

Energy harvesting can be directly commanded by the player, tied to a separate harvesting mode, or resolved automatically from braking, lift-and-coast behavior, track layout, driver technique, car systems, and the active regulations. Direct harvesting control would add another overlapping command layer beside deployment and pace.

**Question:** Should ERS harvesting be simulated automatically from braking, lift-and-coast behavior, track conditions, driver ability, car systems, and regulation limits rather than manually commanded each lap?

**Recommendation:** Yes. Resolve harvesting automatically and show its expected contribution to the energy projection. Let pace, deployment profile, driver attributes, track characteristics, car capability, and regulations influence the result, while keeping the player focused on deployment and strategy decisions.

### D-452 — Automatic ERS harvesting

**Decision:** ERS harvesting is resolved automatically from braking, lift-and-coast behavior, track conditions, driver ability, car systems, and regulation limits. Its expected contribution is visible in energy projections, while the player controls deployment and strategy rather than manual harvesting commands.

**Rationale:** Harvesting remains an understandable consequence of driving and car behavior without creating a second set of lap-by-lap controls.

**Consequence:** ERS simulation needs automatic harvesting inputs, regulation limits, driver and car modifiers, projected recovery, and explainable telemetry.

## Current question

### Q-451 — ERS charge lifecycle between sessions

ERS charge can carry physically from one session into the next, or the team can recharge and initialize the battery for each session. Carrying charge would make the previous session’s final laps affect the next session, while session initialization keeps practice, qualifying, sprint, and race planning distinct. Regulations can define starting charge, usable capacity, and any restrictions.

**Question:** Should ERS charge be a continuous state within a session but be reinitialized at the start of each session according to preparation and regulation rules rather than carrying actual charge from practice into qualifying or from qualifying into the race?

**Recommendation:** Yes. Track charge continuously during each active session, then reinitialize it during the between-session preparation window. Let regulations define starting charge, usable capacity, and restrictions so session plans remain distinct while the battery still matters continuously during practice, qualifying, sprint, and race running.

### D-453 — Session-based ERS charge lifecycle

**Decision:** ERS charge is tracked continuously during each active session and reinitialized during the between-session preparation window. Regulations define starting charge, usable capacity, and restrictions for practice, qualifying, sprint, and race sessions.

**Rationale:** The battery remains strategically meaningful during every session without allowing an incidental practice state to determine a later competitive session.

**Consequence:** ERS state needs active-session continuity, between-session initialization, preparation effects, regulation inputs, and session-specific projections.

## Current question

### Q-452 — Regulation-defined ERS performance limits

Once ERS is enabled for a tier, its strategic identity can still vary through rules. The regulations may define usable battery capacity, maximum deployment, harvesting ceilings, per-lap or per-session energy limits, deployment duration, and reserve requirements. Hard-coding these values would make future regulation changes unable to reshape the system.

**Question:** Should ERS capacity, maximum deployment, harvesting ceilings, energy-use limits, and reserve requirements all be regulation-defined values that can change for a future season?

**Recommendation:** Yes. Store the core ERS limits in tier regulation data, including usable capacity, deployment and harvesting ceilings, per-lap or per-session limits, and required reserve. Apply approved changes starting the next season, with no mid-weekend rule changes.

### D-454 — Regulation-defined ERS limits

**Decision:** Core ERS limits are stored in tier regulation data, including usable capacity, deployment and harvesting ceilings, per-lap or per-session energy limits, and required reserve. Approved changes take effect the next season, with no mid-weekend rule changes.

**Rationale:** ERS can evolve with the technical regulations without requiring a separate simulation model for every tier or season.

**Consequence:** ERS rules need versioned tier parameters, effective dates, validation, session initialization, and next-season transition handling.

## Current question

### Q-453 — ERS deployment tradeoffs

ERS deployment should provide a clear reason to spend stored energy. It can affect only short-term lap pace, or also influence overtaking and defence opportunities, battery depletion, heat, component wear, and reliability risk. The effects should remain distinct from engine-mode tradeoffs so the player can understand which system created the result.

**Question:** Should ERS deployment provide bounded short-term pace and overtaking or defence benefits while increasing energy depletion and, at high use, modest heat, wear, or reliability risk?

**Recommendation:** Yes. Make deployment improve short-term pace and battle capability, especially overtaking and defence, while consuming stored charge. Higher-use profiles can add bounded heat, wear, and reliability pressure, with each effect shown separately from engine-mode consequences.

### D-455 — Bounded ERS deployment tradeoffs

**Decision:** ERS deployment provides bounded short-term pace and overtaking or defence benefits while consuming stored charge. Higher-use profiles can add bounded heat, wear, and reliability pressure, and the game reports these effects separately from engine-mode consequences.

**Rationale:** ERS creates a meaningful performance decision with visible costs rather than functioning as a free pace bonus.

**Consequence:** ERS profiles need pace, battle, energy, heat, wear, and reliability effect fields with separate projections and post-session reporting.

## Current question

### Q-454 — Existing attributes in ERS execution

ERS execution can use a hidden technical modifier, add a new ERS-specific driver statistic, or draw from the existing driver and staff model. Adaptability can help a driver respond to changing energy needs, Consistency can reduce waste or execution variance, Feedback can improve reporting and setup understanding, and engineering quality can improve projections and recommendations.

**Question:** Should ERS execution use existing driver and staff attributes rather than adding a new ERS-specific driver stat?

**Recommendation:** Yes. Use existing Adaptability, Consistency, Feedback, relevant car capability, and engineering quality to influence execution, confidence, and recommendations. Do not add another driver attribute solely for ERS at launch.

### D-456 — Existing attributes for ERS execution

**Decision:** ERS execution uses existing Adaptability, Consistency, Feedback, relevant car capability, and engineering quality to influence execution, confidence, and recommendations. No ERS-specific driver attribute is added at launch.

**Rationale:** ERS integrates with the established personnel and car models without creating a redundant stat category.

**Consequence:** ERS outcomes need attribute mappings, engineering confidence, driver feedback, car capability, and explainable recommendation inputs.

## Current question

### Q-455 — ERS recommendation ownership

ERS decisions affect one car’s energy state but can also affect team-level race strategy. The existing communication model gives the Driver Race Engineer ownership of car-specific recommendations and the Strategy Engineer ownership of cross-car or championship-level strategy. Recommendations should inform the player without changing the active plan automatically.

**Question:** Should Driver Race Engineers recommend car-specific ERS changes while the Strategy Engineer recommends team-level ERS priorities, with player approval required for changes?

**Recommendation:** Yes. The Driver Race Engineer should recommend deployment changes based on that car's charge, battle, reliability, and driver context. The Strategy Engineer should recommend cross-car priorities and championship tradeoffs. The player approves, edits, rejects, or defers any change.

### D-457 — Split ERS recommendation ownership

**Decision:** The Driver Race Engineer owns car-specific ERS recommendations based on charge, battles, reliability, and driver context. The Strategy Engineer owns cross-car ERS priorities and championship tradeoffs. The player approves, edits, rejects, or defers every change.

**Rationale:** ERS follows the established communication hierarchy while preserving player control over a high-impact race decision.

**Consequence:** ERS recommendations need car-specific and team-level scopes, evidence, ownership, action states, and player approval.

## Current question

### Q-456 — Shared and car-specific ERS plans

The team can create one identical ERS plan for both cars, or create a shared baseline with car-specific refinements. Cars may have different drivers, starting positions, battery projections, reliability conditions, battle situations, and championship priorities, so identical deployment would not always be appropriate.

**Question:** Should ERS use one shared team baseline with independent per-car refinements for driver, battery, race-position, and championship context?

**Recommendation:** Yes. Build a shared ERS baseline for the team, then allow each car to refine deployment profiles, reserve targets, and event priorities independently. Show deviations from the baseline and require player approval for changes that materially affect the other car or team objective.

### D-458 — Shared baseline with per-car ERS refinements

**Decision:** ERS uses a shared team baseline with independent per-car refinements for deployment profiles, reserve targets, and event priorities. Deviations from the baseline are visible, and changes that materially affect the other car or team objective require player approval.

**Rationale:** The team can coordinate energy strategy without forcing identical decisions on cars with different races, drivers, and battery states.

**Consequence:** ERS plans need team and car scopes, deviation tracking, cross-car impact warnings, and approval rules.

## Current question

### Q-457 — ERS changes after competitive sessions begin

Engine mode becomes a weekend commitment at a tier-specific lock point, but ERS is a dynamic energy resource whose charge and race context change continuously. The player could lock ERS at the same time as engine mode, or keep ERS adjustable through legal decision windows after qualifying and race start.

**Question:** Should ERS remain adjustable after qualifying or race start through approved decision windows, unlike the locked engine mode, with practice changes between stints and qualifying profiles selectable per run?

**Recommendation:** Yes. Allow practice changes between stints, choose an ERS profile for each qualifying run, and adjust race deployment at consequential decision windows. Keep ERS subject to regulation, safety, charge, and reserve limits rather than applying the engine mode's full-weekend lock.

### D-459 — Flexible ERS lock timing

**Decision:** ERS can change between practice stints, be selected per qualifying run, and be adjusted during consequential race decision windows. It is not subject to the engine mode's full-weekend lock, but remains constrained by regulation, safety, charge, and reserve limits.

**Rationale:** ERS is a dynamic resource whose value depends on changing charge, battles, and race context, so it should remain strategically responsive.

**Consequence:** ERS needs session-specific plans, run-level qualifying choices, race-window overrides, and validation against charge, reserve, safety, and regulation limits.

## Current question

### Q-458 — ERS reserve and depletion behavior

The player can spend all available energy for immediate pace, protect a regulation-required minimum, or maintain a higher strategic reserve. A reserve target creates a tradeoff between attacking now and preserving future deployment. The system also needs a clear outcome when charge reaches the target or falls to zero.

**Question:** Should the player set a strategic ERS reserve above any regulation minimum, with warnings as charge approaches it and automatic prevention of deployment below the hard minimum?

**Recommendation:** Yes. Show the regulation minimum and player target separately. Warn when projected deployment would breach either threshold, prevent deployment below the hard legal or safety minimum, and allow the car to resume deployment only as charge is harvested back above the permitted threshold.

### D-460 — ERS reserve enforcement

**Decision:** The player can set a strategic ERS reserve above the regulation minimum. The game shows both thresholds, warns before projected deployment breaches either one, prevents deployment below the hard legal or safety minimum, and resumes deployment only when harvesting restores sufficient charge.

**Rationale:** ERS spending becomes a visible risk decision while hard limits protect legality and prevent impossible energy states.

**Consequence:** ERS execution needs player reserve targets, regulation minimums, warnings, hard-deployment limits, and charge-recovery validation.

## Current question

### Q-459 — ERS hardware and car development

ERS performance can be treated as a fixed Tier 1 rule modifier, or the car can have technical capability that improves through the existing Powertrain and Reliability attributes and the Concept Design → CFD → Wind Tunnel → Manufacturing pipeline. Hardware capability could influence capacity, harvesting efficiency, deployment efficiency, heat tolerance, and reliability, while the strategy profiles determine how the player uses it.

**Question:** Should ERS hardware capability be part of the existing car attribute and R&D systems, with upgrades improving capacity, harvesting, deployment efficiency, heat tolerance, or reliability where regulations permit?

**Recommendation:** Yes. Treat ERS hardware as part of the existing car categories and development pipeline rather than a separate upgrade system. Let active regulations define the legal ceiling, while designs and upgrades improve bounded ERS capability within that ceiling; keep deployment profiles as the strategic control layer.

### D-461 — ERS hardware in the car-development pipeline

**Decision:** ERS hardware is part of the existing car categories and Concept Design → CFD → Wind Tunnel → Manufacturing pipeline. Active regulations define the legal ceiling, designs and upgrades improve bounded ERS capability within that ceiling, and deployment profiles remain the strategic control layer.

**Rationale:** ERS strengthens the existing car identity and R&D loop without introducing a separate technical progression system.

**Consequence:** ERS designs need category mapping, regulation ceilings, stage progression, capability effects, manufacturing, installation, and strategy-facing projections.

## Current question

### Q-460 — ERS upgrade tradeoffs

ERS upgrades can be pure improvements, or trade capacity, harvesting efficiency, deployment efficiency, weight, heat tolerance, reliability, and manufacturing cost against one another. The existing car model already supports fixed-point gains, secondary effects, and upgrades that improve one sub-item while harming another.

**Question:** Should ERS upgrades use the existing fixed-point tradeoff model, allowing stronger capacity or efficiency to come with bounded costs such as weight, heat, reliability, manufacturing time, or another powertrain effect?

**Recommendation:** Yes. Use the existing fixed-point tradeoff model. Make each ERS project's primary benefit and secondary costs visible before approval, and prevent upgrades from exceeding the active regulation ceiling.

### D-462 — ERS upgrade tradeoffs

**Decision:** ERS upgrades use the existing fixed-point tradeoff model. Each project shows its primary benefit and secondary costs before approval, and no upgrade can exceed the active regulation ceiling.

**Rationale:** ERS development has meaningful engineering choices without creating a separate progression philosophy.

**Consequence:** ERS projects need primary and secondary effects, regulation validation, cost and time projections, and integration with powertrain and reliability totals.

## Current question

### Q-461 — ERS wear, damage, and failure handling

ERS can be treated as a reliable abstract bonus, or it can have condition, heat, wear, damage, and failure states like other critical car systems. A failure should create a clear performance consequence—such as reduced deployment or disabled recovery—without automatically retiring the car unless operating limits make continued running unsafe.

**Question:** Should ERS wear, damage, and failure use the existing reliability model, with warnings and degraded or disabled energy functions before race control considers forced retirement?

**Recommendation:** Yes. Integrate ERS condition, heat, wear, damage, and failure with the existing powertrain and reliability model. Warn the player, reduce or disable affected functions when necessary, and reserve forced retirement for cases where continued operation is unsafe.

### D-463 — ERS reliability integration

**Decision:** ERS condition, heat, wear, damage, and failure use the existing powertrain and reliability model. The player receives warnings, affected energy functions can degrade or become disabled, and forced retirement occurs only when continued operation is unsafe.

**Rationale:** ERS failures create meaningful consequences while remaining part of the established car reliability and race-control systems.

**Consequence:** ERS reliability needs condition state, warning thresholds, degraded functions, failure outcomes, repair implications, and safety validation.

## Current question

### Q-462 — ERS launch scope

The launch ERS model now covers Tier 1 availability by default, next-season regulation control, continuous per-session charge, automatic harvesting, bounded deployment profiles, race-window changes, shared and per-car plans, reserve enforcement, existing attribute effects, R&D integration, upgrade tradeoffs, and reliability or failure consequences.

**Question:** Should we lock the ERS model now and move to supplier, customer, and constructor progression?

**Recommendation:** Yes. Lock the current ERS model and defer additional energy edge cases until Tier 1 race-weekend simulation identifies a clear gap.

### D-464 — ERS launch scope locked

**Decision:** The launch ERS model is locked around Tier 1 availability by default, next-season regulation control, continuous per-session charge, automatic harvesting, bounded deployment profiles, race-window changes, shared and per-car plans, reserve enforcement, existing attribute effects, R&D integration, upgrade tradeoffs, and reliability or failure consequences. Additional energy edge cases are deferred until Tier 1 race-weekend simulation identifies a clear gap.

**Rationale:** ERS has a complete strategic boundary and can now be validated as a Tier 1 technical system without further design expansion.

**Consequence:** Future ERS work should validate and balance this scope before adding new energy mechanics.

## Group 2 — Supplier, customer, and constructor progression

### Q-463 — Customer-to-constructor progression boundary

When a team reaches Tier 1, it can begin as a customer that purchases engines or technical packages from an established supplier, or immediately receive a full in-house constructor operation. A customer start creates a meaningful promotion challenge and lets HQ, R&D, finances, and supplier relationships matter. Constructor conversion should be a deliberate long-term progression rather than an automatic promotion reward.

**Question:** Should a newly promoted Tier 1 team begin as a customer operation, with in-house constructor capability unlocked later through HQ development, R&D readiness, finances, and explicit player approval?

**Recommendation:** Yes. Begin promoted teams as customers with supplier-dependent engines and technical packages. Make constructor conversion a gated strategic project requiring sufficient HQ capability, technical readiness, finances, and player approval rather than an automatic status change.

### D-465 — Customer-start constructor progression

**Decision:** A team promoted into Tier 1 begins as a customer operation with supplier-dependent engines and technical packages. In-house constructor conversion is a gated strategic project requiring HQ capability, technical readiness, finances, and explicit player approval.

**Rationale:** Promotion opens access to the top tier without instantly granting the development depth of an established constructor.

**Consequence:** Tier progression needs customer status, supplier dependencies, constructor-readiness gates, conversion projects, financial checks, and approval states.

## Current question

### Q-464 — Supplier package tiers

A supplier can provide one standardized package to every customer, or offer packages with different ceilings and obligations. A small number of clear tiers would let a customer choose between cost, immediate performance, future upgrade access, reliability support, and supplier leverage without requiring the player to compare dozens of hidden technical variables.

**Question:** Should suppliers offer a small set of clearly named package tiers—such as Factory Parity and Customer Spec—with visible differences in performance ceiling, cost, rollout timing, reliability support, and upgrade access?

**Recommendation:** Yes. Start with a small number of transparent package tiers. Factory Parity should offer a high ceiling at substantial cost and leverage; Customer Spec should be more affordable but carry a lower ceiling, slower access, or reduced support. The active tier regulations still determine what packages are legal.

### D-466 — Transparent supplier package tiers

**Decision:** Suppliers offer a small number of transparent package tiers. Factory Parity provides a high ceiling at substantial cost and leverage; Customer Spec is more affordable but has a lower ceiling, slower access, or reduced support. Active tier regulations determine package legality.

**Rationale:** Customers can make a readable technical and financial choice without comparing hidden supplier variables.

**Consequence:** Supplier packages need named tiers, visible performance and cost effects, support levels, delivery rules, upgrade access, and regulation validation.

## Current question

### Q-465 — Supplier agreement lifecycle

Supplier access can be purchased ad hoc for each event, or secured through structured agreements that define package tier, term, price, delivery timing, support, exclusivity, upgrade access, renewal, and exit conditions. A contract model creates meaningful long-term leverage and planning pressure, but it should use the existing negotiation-window approach rather than interrupting race weekends.

**Question:** Should supplier packages be managed through structured multi-event or multi-season agreements with defined renewal windows, rather than being purchased independently for each race weekend?

**Recommendation:** Yes. Use supplier agreements with clear term, price, package tier, delivery, support, exclusivity, upgrade, renewal, and exit terms. Handle normal renewals during established contract windows, with emergency changes limited to genuine supplier failure or regulatory events.

### D-467 — Season-long supplier agreements

**Decision:** Supplier agreements are season-long at minimum and may use multi-season commitments. Packages are not purchased independently for individual race weekends. Agreements define term, price, package tier, delivery, support, exclusivity, upgrade, renewal, and exit terms. Normal renewals occur during contract windows, while active-season terms remain stable except for genuine supplier failure or regulatory events.

**Rationale:** A season-long commitment makes supplier selection a meaningful strategic decision without creating repetitive race-by-race administration.

**Consequence:** Supplier contracts need season and multi-season terms, active-period stability, renewal windows, exit rules, and exceptional-event handling.

## Current question

### Q-466 — Supplier leverage at renewal

An established supplier can treat every customer identically, or adjust renewal terms based on championship performance, competitive threat, supplier relationship, demand, and the customer’s financial position. Supplier leverage is most useful when it creates off-season planning pressure without changing a signed package unpredictably during a season.

**Question:** Should suppliers be able to raise prices, reduce support, delay upgrade access, or refuse renewal during the renewal window when a customer becomes a competitive threat or otherwise changes the relationship?

**Recommendation:** Yes. Let supplier leverage operate primarily at season or multi-season renewal. Suppliers can raise prices, reduce support, delay future upgrade access, or refuse renewal based on visible relationship and competitive factors, with advance notice and alternative supplier options. Do not alter signed terms mid-season except under explicit failure or regulation rules.

### D-468 — Renewal-based supplier leverage

**Decision:** Supplier leverage operates primarily at season or multi-season renewal. Suppliers may raise prices, reduce support, delay future upgrade access, or refuse renewal based on visible relationship and competitive factors. Signed terms remain stable during the season except under explicit failure or regulation rules, and customers receive advance notice and alternative options.

**Rationale:** Supplier relationships create meaningful long-term pressure without making contracted technical performance unpredictable during an active championship.

**Consequence:** Supplier renewals need relationship factors, competitive threat evaluation, advance warnings, alternative options, and stable active-season terms.

## Current question

### Q-467 — Competing supplier offers

At a renewal window, a team can be limited to its current supplier, receive a small set of alternatives, or actively solicit competing offers. Comparing suppliers creates strategic choice around package performance, price, reliability support, upgrade access, relationship risk, and switching cost. Switching should still require preparation time and must be legal for the next season.

**Question:** Should teams be able to solicit and compare competing supplier offers during renewal windows before choosing to renew, switch suppliers, or pursue constructor conversion?

**Recommendation:** Yes. Provide a bounded supplier market during renewal windows. Let teams compare a current offer with a small number of alternatives across performance, price, support, upgrades, reliability, relationship risk, switching cost, and next-season readiness. The player makes the final choice.

### D-469 — Bounded competing supplier market

**Decision:** During renewal windows, teams receive a bounded market of competing supplier offers. Offers are compared across performance, price, support, upgrades, reliability, relationship risk, switching cost, and next-season readiness. The player chooses whether to renew, switch, or pursue constructor conversion.

**Rationale:** Supplier selection becomes a meaningful strategic choice without becoming an unrestricted procurement simulation.

**Consequence:** Supplier markets need offer generation, comparison data, availability limits, switching consequences, and player selection states.

## Current question

### Q-468 — Supplier-switch transition work

Changing suppliers can be instant, or require a transition period to adapt mounting, software, cooling, integration, reliability procedures, and technical knowledge. A transition cost makes switching meaningful, but it should not erase unrelated R&D or force the team to rebuild its entire car from zero.

**Question:** Should switching suppliers require a pre-season transition project with time, money, compatibility work, testing, and temporary confidence loss while preserving unrelated team engineering knowledge and completed designs?

**Recommendation:** Yes. Require a season-transition project covering compatibility, installation, integration, testing, and staff knowledge transfer. Apply visible time, cost, readiness, and confidence effects, but preserve unrelated R&D knowledge and completed work that remains technically compatible.

### D-470 — Supplier-switch transition projects

**Decision:** Switching suppliers requires a season-transition project covering compatibility, installation, integration, testing, and staff knowledge transfer. Time, cost, readiness, and confidence effects are visible, while unrelated compatible R&D knowledge and completed work are preserved.

**Rationale:** Switching creates a real preparation cost without invalidating the team’s entire technical history.

**Consequence:** Supplier changes need transition tasks, compatibility checks, testing, knowledge transfer, readiness state, cost, and confidence effects.

## Current question

### Q-469 — Staged constructor conversion

Constructor conversion can be one instant unlock after reaching a single gate, or a staged project that moves through readiness assessment, architecture and design, validation, manufacturing capability, supplier transition, and final operational approval. A staged path makes HQ, staff, R&D, and finances matter over time while allowing the team to prepare before leaving customer support.

**Question:** Should constructor conversion use a staged, multi-phase project with technical, facility, staffing, financial, and validation gates before the team can operate as an in-house constructor?

**Recommendation:** Yes. Use a staged conversion project with explicit technical, HQ, staff, financial, manufacturing, and validation gates. Let the player begin preparation before full readiness, show the remaining blockers and risk, and require final player approval before ending the customer relationship.

### D-471 — Staged constructor conversion

**Decision:** Constructor conversion uses a staged project with explicit technical, HQ, staff, financial, manufacturing, and validation gates. The player can prepare before full readiness, sees remaining blockers and risk, and gives final approval before ending the customer relationship.

**Rationale:** Conversion becomes a long-term management objective rather than a single unlock screen.

**Consequence:** Constructor progression needs staged project state, gate validation, risk reporting, preparation work, final approval, and customer-exit handling.

## Current question

### Q-470 — Reusing the existing R&D pipeline for constructors

Constructor conversion could introduce a separate technical-development system, or reuse the existing car categories, sub-items, design history, Concept Design → CFD → Wind Tunnel → Manufacturing stages, physical parts, installation, and reliability rules. Reuse keeps customer and constructor development understandable while constructor capability changes what work the team is legally and practically able to perform.

**Question:** Should constructor conversion reuse the existing car-attribute, R&D, manufacturing, physical-part, installation, and reliability systems rather than creating a separate constructor-only development model?

**Recommendation:** Yes. Reuse the existing technical pipeline and add only constructor capability, supplier-dependency, and regulation-ceiling checks. Constructor status should expand what the team can design and manufacture, not replace the established R&D model.

### D-472 — Constructor conversion reuses existing technical systems

**Decision:** Constructor conversion reuses the existing car categories, sub-items, design history, Concept Design → CFD → Wind Tunnel → Manufacturing stages, physical parts, installation, and reliability rules. It adds constructor capability, supplier-dependency, and regulation-ceiling checks rather than a separate technical-development model.

**Rationale:** Customer and constructor teams share one understandable engineering language while differing in capability and legal access.

**Consequence:** Constructor status needs capability gates and supplier-dependency checks layered onto the existing R&D and car systems.

## Current question

### Q-471 — Constructor activation and customer fallback

An in-house constructor project can activate immediately when its final gate completes, activate only at the next season, or be allowed to remain incomplete while the team continues as a customer. Mid-season activation would disrupt technical legality and car planning; forced conversion would create unnecessary failure spirals if a project misses its target.

**Question:** Should a team prepare constructor capability while its supplier agreement remains active, activate in-house status only at the next season transition, and retain the option to renew or extend customer supply if the project is not ready?

**Recommendation:** Yes. Allow constructor preparation during the active supplier agreement, but activate in-house status only at the next season transition after final validation. If readiness is missed, let the team renew or extend customer supply rather than forcing an incomplete conversion or an illegal mid-season change.

### D-473 — Season-boundary constructor activation

**Decision:** A team may prepare constructor capability while its supplier agreement remains active, but in-house status activates only at the next season transition after final validation. If readiness is missed, the team may renew or extend customer supply rather than being forced into an incomplete conversion or an illegal mid-season change.

**Rationale:** Technical status changes occur at a stable planning boundary and always leave the team with a valid legal fallback.

**Consequence:** Constructor activation needs season-transition validation, final approval, supplier fallback, contract extension, and no-mid-season-change enforcement.

## Current question

### Q-472 — Customer R&D boundaries

A customer team should retain meaningful engineering agency, but it should not be able to reproduce or improve supplier-owned hardware without permission. Supplier packages can define which components are supplied, which customer-specific integration work is allowed, and which upgrades are available. The team can still develop independent permitted components, setup knowledge, reliability practices, and integration work within the package limits.

**Question:** Should customer status restrict direct R&D on supplier-owned components to approved supplier upgrades and integration work, while allowing independent development of permitted components and setup or reliability improvements?

**Recommendation:** Yes. Treat supplier-owned hardware as bounded by the package contract and regulation. Allow approved supplier upgrades, compatibility work, setup discovery, and reliability improvements, while preventing direct in-house redesign of supplied components until constructor capability is active.

### D-474 — Season-boundary customer R&D limits

**Decision:** Supplier-owned customer hardware is bounded by the package contract and regulations. Customer teams may use approved supplier upgrades, compatibility work, setup discovery, and reliability improvements, but cannot directly redesign supplied components until constructor capability is active.

**Rationale:** Customer teams retain meaningful work while supplier ownership and constructor progression remain mechanically clear.

**Consequence:** Customer R&D needs component ownership, package permissions, approved upgrade paths, compatibility work, and constructor-status validation.

## Current question

### Q-473 — Supplier upgrade delivery

Supplier upgrades can arrive as instant package changes, follow an external supplier development schedule, or use the team’s normal R&D pipeline. An external schedule preserves the distinction between customer and constructor work, but the team still needs lead time for compatibility, installation, validation, and setup adaptation before the upgrade can race.

**Question:** Should supplier-provided upgrades follow a supplier-controlled delivery schedule, with visible lead time and a team-side compatibility, installation, and validation process before they become race-legal?

**Recommendation:** Yes. Suppliers control development and delivery timing within the agreement. The team receives advance visibility, then schedules compatibility, installation, validation, and setup work through existing systems before activating the upgrade. Supplier upgrades should not consume the team’s full in-house design pipeline.

### D-475 — Previous-season supplier hardware with team-owned upgrades

**Decision:** Suppliers provide customer teams with previous-season base hardware through the supplier agreement. The customer team is responsible for designing, developing, manufacturing, installing, and validating its own upgrades to that supplied base. This supersedes the supplier-controlled upgrade-delivery portion of D-474 and Q-473’s recommendation.

**Rationale:** Supplier relationships provide a legal and competitive starting point, while the team’s own R&D remains responsible for creating its performance gains.

**Consequence:** Customer technical state needs supplied base-part identity, season age, ownership, compatibility limits, team-owned upgrade projects, and regulation validation.

## Current question

### Q-474 — Customer-owned upgrades to supplied hardware

The supplied previous-season part can be treated as a fixed ceiling that customers may only operate, or as a starting platform that the customer can improve through the normal Concept Design → CFD → Wind Tunnel → Manufacturing pipeline. Team-owned upgrades preserve R&D agency, but the purchased base may still have regulation, compatibility, supplier-package, or constructor-status limits.

**Question:** Should customer teams be able to develop their own upgrades to the supplied previous-season hardware through the existing R&D pipeline, subject to regulation and compatibility limits?

**Recommendation:** Yes. Treat the previous-season supplier part as the customer’s technical starting platform. Let the team run its own upgrades through the established pipeline, while regulations and the supplier package define what modifications are legal and technically compatible. Constructor status should raise the ceiling and expand the designable scope, not be required for every upgrade.

### D-476 — Customer-owned upgrades to previous-season hardware

**Decision:** Customer teams can develop their own upgrades to supplied previous-season hardware through the existing R&D pipeline. Regulations and the supplier package define legal and technical compatibility limits. Constructor status raises the ceiling and expands the designable scope but is not required for every customer upgrade.

**Rationale:** Teams receive a meaningful technical foundation from suppliers while retaining ownership of the development work that creates their identity.

**Consequence:** Customer upgrades need base-part compatibility, package restrictions, regulation ceilings, team-owned R&D projects, and constructor-capability modifiers.

## Current question

### Q-475 — Package tier and base-part age

Supplier package tiers can provide the same previous-season part to every customer, or determine which prior-season design, specification, or completeness level a team receives. This gives Factory Parity and Customer Spec a concrete starting difference before the team begins its own upgrade work.

**Question:** Should supplier package tiers determine the age and specification of the previous-season base hardware a customer receives, while the customer remains responsible for all later upgrades?

**Recommendation:** Yes. Every customer package should provide previous-season hardware, but Factory Parity should offer the most recent and complete prior-season specification, while Customer Spec can provide an older or more restricted version. The team then owns all subsequent upgrade work.

### D-477 — Package-tier base hardware

**Decision:** Every customer package provides previous-season hardware. Factory Parity offers the most recent and complete prior-season specification, while Customer Spec can provide an older or more restricted version. The customer team owns all subsequent upgrade work.

**Rationale:** Package tiers create a concrete starting-performance difference without replacing the team’s own R&D responsibility.

**Consequence:** Supplier packages need base-part age, specification, restrictions, starting values, and customer-owned upgrade eligibility.

## Current question

### Q-476 — Supplied hardware as physical part units

Supplier hardware can remain an abstract performance modifier, or enter the existing physical-part model as actual units with quantity, cost, lead time, installation, mileage, condition, wear, repair, and replacement history. Treating it as physical hardware makes customer supply relevant to race preparation and reliability while keeping it consistent with team-manufactured parts.

**Question:** Should supplier-provided base hardware enter the existing physical-part system as individual units with quantity, installation, condition, wear, replacement cost, and delivery timing?

**Recommendation:** Yes. Treat supplied engines and technical parts as physical units in the same system as team-manufactured parts. Track delivery, installation, mileage, condition, wear, repair, replacement, and cost, while using the supplier agreement to govern availability and lead time.

### D-478 — Supplied hardware as physical units

**Decision:** Supplied engines and technical parts enter the same physical-part system as team-manufactured parts. The game tracks delivery, installation, mileage, condition, wear, repair, replacement, and cost, while the supplier agreement governs availability and lead time.

**Rationale:** Customer hardware has real operational consequences and remains consistent with the team’s existing part and reliability model.

**Consequence:** Supplier inventory needs physical unit identity, quantity, delivery, installation, condition, wear, repair, replacement, cost, and agreement validation.

## Current question

### Q-477 — Hybrid constructor sourcing

Constructor status can require every technical component to be designed and manufactured in-house, or allow the team to mix in-house development with purchased supplier components. A hybrid model lets the team retain a supplier for a difficult or expensive component while developing other categories itself, making constructor conversion a gradual capability expansion rather than an all-or-nothing switch.

**Question:** Should a constructor team be allowed to use a hybrid sourcing model, designing and manufacturing some components in-house while continuing to purchase selected components from suppliers?

**Recommendation:** Yes. Allow component-level sourcing after constructor conversion. The team can design and build components it is ready to support while continuing supplier contracts for selected engines or parts. Each component remains subject to regulation, compatibility, capacity, and reliability validation.

### D-479 — Real-world-style hybrid supplier and constructor model

**Decision:** Constructor teams use component-level sourcing. They may design and manufacture supported components in-house while continuing supplier contracts for selected engines or parts. The supplier/customer dynamic should model a real-world manufacturer and customer relationship as closely as the fictional regulations and game scope allow, with each component subject to regulation, compatibility, capacity, and reliability limits.

**Rationale:** A hybrid model creates the strategic distinction between a customer team and a manufacturer without forcing constructor conversion to be all-or-nothing.

**Consequence:** The technical rules need component ownership, supplier eligibility, customer permissions, in-house capability, package restrictions, and regulation-controlled sourcing boundaries.

## Current question

### Q-478 — Supplier and customer component boundary

A real-world-style relationship needs a clear split between components normally supplied by a manufacturer and components the customer team is expected to design. The launch can use a broad supplier-provided powertrain and selected technical package, while the customer owns chassis, aero, setup, and other permitted development. The exact split should remain regulation data so future seasons can change which components are supplied, standardized, or open for customer design.

**Question:** Should the game define an F1-inspired component split in which suppliers provide powertrain and selected regulated components, while customer teams own chassis, aero, setup, and all other permitted in-house development?

**Recommendation:** Yes. Establish a regulation-defined component ownership map inspired by real manufacturer/customer structures. Supplier-provided components remain contract-bound, while customer teams own chassis, aero, setup, integration, and permitted upgrades. Keep the exact component list configurable for future regulation changes.

### D-480 — Regulation-defined supplier/customer component map

**Decision:** The game uses a regulation-defined component ownership map inspired by real manufacturer/customer structures. Suppliers provide powertrain and selected regulated components; customer teams own chassis, aero, setup, integration, and permitted upgrades. The exact component list remains configurable for future regulation changes.

**Rationale:** A clear ownership map makes supplier relationships legible and gives regulation changes a meaningful way to reshape technical competition.

**Consequence:** Component rules need supplier ownership, customer ownership, permitted upgrade scope, package eligibility, and future regulation fields.

## Current question

### Q-479 — Supplier technical support

A supplier relationship can provide only physical parts, or also include technical documentation, integration guidance, software or calibration support, reliability analysis, spare-part support, and trackside or remote engineering assistance. Better support should improve installation confidence, issue diagnosis, and reliability without allowing the supplier to perform the customer’s own chassis or aero development.

**Question:** Should supplier agreements include tier-dependent technical support—such as documentation, integration, calibration, reliability, and spare-part assistance—with stronger support increasing cost but improving confidence and operational reliability?

**Recommendation:** Yes. Make technical support part of the supplier package. Let support tiers improve documentation, integration, calibration, diagnosis, spares, and reliability confidence, while keeping customer-owned design and upgrade work fully under the team’s control.

### D-481 — Tiered supplier technical support

**Decision:** Supplier agreements include tier-dependent technical support covering documentation, integration, calibration, diagnosis, spares, and reliability confidence. Stronger support increases cost, while customer-owned design and upgrade work remains under the team’s control.

**Rationale:** Support becomes a strategic package choice without allowing suppliers to replace the customer’s own engineering department.

**Consequence:** Supplier packages need support levels, cost effects, confidence modifiers, reliability assistance, spare support, and customer-owned development boundaries.

## Current question

### Q-480 — Transparent package performance

Customers purchasing the same supplier specification can receive identical base performance, or suppliers can quietly provide different hardware to favored teams. Hidden differences would make scouting and engineering conclusions unreliable; visible package differences preserve strategic choice while keeping the market fair. Team-specific outcomes should come from integration, upgrades, setup, reliability, and driver or staff quality rather than secret supplier modifiers.

**Question:** Should all teams purchasing the same supplier package receive the same defined base performance and hardware specification, with differences coming from support, integration, upgrades, setup, reliability, and staff execution rather than hidden supplier favoritism?

**Recommendation:** Yes. Make package specifications and base performance consistent for all teams on that package. Let real differentiation come from support level, integration quality, team-owned upgrades, setup, reliability, drivers, and staff, with any exceptional supplier action disclosed as an explicit contract or relationship event.

### D-482 — Transparent supplier package performance

**Decision:** All teams purchasing the same supplier package receive the same defined base performance and hardware specification. Differentiation comes from support level, integration quality, team-owned upgrades, setup, reliability, drivers, and staff. Exceptional supplier actions must be disclosed as explicit contract or relationship events.

**Rationale:** The customer market remains fair and legible while still allowing meaningful operational and relationship differences.

**Consequence:** Supplier package data needs shared specifications, support modifiers, integration effects, relationship events, and no hidden team-specific performance adjustments.

## Current question

### Q-481 — Supplier works-team structure

A supplier can exist only as a technical manufacturer, or also operate its own factory or works team that uses the supplier’s newest development. A works team creates a natural competitive tension: customer packages remain defined and fair, but customers may face a higher renewal price, a wider development gap, or more difficult relationship decisions when they challenge the supplier’s own team.

**Question:** Should major suppliers be allowed to operate a factory or works team while also selling defined packages to customer teams?

**Recommendation:** Yes. Allow suppliers to operate works teams and customer programs simultaneously. Customer package specifications remain consistent and disclosed, while the works team’s stronger integration, support, current development, and supplier relationship can create a fair strategic challenge rather than hidden customer penalties.

### D-483 — Supplier works-team structure

**Decision:** Suppliers may operate works teams while selling defined packages to customer teams. Customer package specifications remain consistent and disclosed, while works teams can benefit from stronger integration, support, current development, and supplier relationship without hidden customer penalties.

**Rationale:** The supplier can have a genuine factory operation while customer teams retain a fair, understandable path to compete.

**Consequence:** Supplier ecosystems need works-team status, customer package definitions, integration effects, support relationships, current-development access, and disclosed competitive differences.

## Current question

### Q-482 — Works-team development advantage

To reflect the supplier/customer relationship, the works team can receive the supplier’s current-season development while customer teams receive previous-season base hardware and develop their own upgrades. Customer teams should not silently receive the works team’s current design, but they should be able to close part of the gap through their own R&D and integration.

**Question:** Should works teams receive current supplier development while customers receive previous-season base hardware, with customer-owned R&D providing the legitimate path to reduce—not automatically erase—the development gap?

**Recommendation:** Yes. Give works teams current supplier development and customers the contracted previous-season base. Let customer R&D, setup, integration, and reliability work narrow the gap within regulation and capability limits, without granting customers automatic access to current works-team designs.

### D-484 — Works-team current-development advantage

**Decision:** Works teams receive current supplier development, while customer teams receive contracted previous-season base hardware. Customer R&D, setup, integration, and reliability work can narrow the gap within regulation and capability limits, but customers do not receive automatic access to current works-team designs.

**Rationale:** The works team has a meaningful manufacturer advantage while customer teams retain an achievable development path.

**Consequence:** Supplier development needs current and previous-season design identity, customer access rules, upgrade-gap projections, and team-owned gap-closing work.

## Current question

### Q-483 — Component-level supplier contracts

One supplier relationship can control the entire purchased technical package, or teams can hold separate agreements for different component families. Component-level sourcing better matches a manufacturer/customer ecosystem and supports gradual constructor conversion, but each supplier boundary creates compatibility, delivery, renewal, and technical-support work.

**Question:** Should supplier relationships be managed per regulation-defined component family, allowing a team to use different suppliers for different components when the combination is legal and technically compatible?

**Recommendation:** Yes. Use component-level supplier agreements where regulations permit. Track one active supplier, package, contract, transition state, and compatibility profile per component family, while preventing combinations that are illegal, unsupported, or technically incompatible.

### D-485 — Component-level supplier agreements

**Decision:** Supplier relationships are managed per regulation-defined component family where permitted. Each family tracks one active supplier, package, contract, transition state, and compatibility profile. Illegal, unsupported, or technically incompatible combinations are prevented.

**Rationale:** The technical ecosystem supports realistic supplier specialization and a gradual move toward in-house capability.

**Consequence:** Supplier management needs component-specific contracts, package eligibility, compatibility validation, transition planning, and per-family renewal state.

## Current question

### Q-484 — Constructor capability granularity

Constructor conversion can unlock every in-house component at once, or grant capability by component family as the team completes the relevant HQ, staff, R&D, manufacturing, and validation gates. Component-level capability supports the hybrid sourcing model and lets a team become strong in one area while remaining dependent on suppliers elsewhere.

**Question:** Should constructor capability unlock by component family, with regulations defining the minimum in-house capability required for the team to be recognized as a constructor?

**Recommendation:** Yes. Track constructor readiness per component family and allow staged capability unlocks. Let regulations define the minimum self-supported component set for constructor status, while the team may continue purchasing other components from suppliers.

### D-486 — Component-level constructor readiness

**Decision:** Constructor readiness is tracked per component family, allowing staged capability unlocks. Regulations define the minimum self-supported component set required for constructor status, while the team may continue purchasing other components from suppliers.

**Rationale:** Constructor progression can reflect real capability development instead of forcing an artificial all-at-once technical transformation.

**Consequence:** Constructor state needs per-family readiness, gates, unlocks, regulation-defined minimums, and continued supplier dependencies.

## Current question

### Q-485 — Explicit supplier failure and breach events

Supplier relationships can be perfectly reliable, or suppliers can create visible operational events such as late deliveries, defective hardware, reduced support, missed specifications, or contract breaches. These events should be uncommon and explainable, with player responses such as accepting a delay, requesting remediation, using an emergency replacement, or changing suppliers at the next legal window.

**Question:** Should supplier failures and contract breaches be explicit, bounded events with warnings, affected components, consequences, remediation options, and relationship history rather than hidden random penalties?

**Recommendation:** Yes. Model rare supplier failures as explicit events tied to contract obligations, supplier capability, and relationship state. Show the cause and affected component, offer legal remediation or emergency options, and record the outcome for renewal, reputation, and future supplier decisions.

### D-487 — Explicit supplier failure events

**Decision:** Rare supplier failures and contract breaches are explicit events tied to contract obligations, supplier capability, and relationship state. The game shows the cause and affected component, offers legal remediation or emergency options, and records the outcome for renewals, reputation, and future supplier decisions.

**Rationale:** Supplier risk creates readable management consequences without relying on unexplained hidden penalties.

**Consequence:** Supplier events need obligation checks, failure causes, affected components, warnings, remediation choices, emergency options, and relationship history.

## Current question

### Q-486 — Emergency supplier replacement

A serious supplier breach can leave a team without legal or safe hardware before the next normal renewal window. The game can forbid mid-season changes entirely, or allow an emergency replacement when the supplier fails, provided the player accepts compatibility work, cost, performance uncertainty, regulation checks, and possible championship consequences.

**Question:** Should a verified supplier failure permit an emergency component-level replacement before the normal renewal window, with explicit cost, time, compatibility, performance, legality, and championship consequences?

**Recommendation:** Yes, but only for verified failure, safety, or regulatory necessity. Require player confirmation, emergency sourcing, compatibility and scrutineering validation, and clear sporting and financial consequences. Ordinary competitive preference should not bypass the season-long commitment.

### D-488 — Emergency supplier replacement

**Decision:** Verified supplier failure, safety, or regulatory necessity can permit an emergency component-level replacement before the normal renewal window. The player confirms the action, and emergency sourcing requires compatibility and scrutineering validation with explicit cost, time, performance, legality, sporting, and financial consequences. Competitive preference alone cannot bypass a season-long commitment.

**Rationale:** Teams have a recoverable response to genuine supplier failure without making contracts strategically meaningless.

**Consequence:** Emergency sourcing needs eligibility, verification, player approval, replacement options, validation, consequence projections, and contract history.

## Current question

### Q-487 — Supplier/customer/constructor launch scope

The launch model now includes Tier 1 customer starts, season-long or multi-season supplier agreements, transparent package tiers, previous-season supplier hardware, team-owned upgrades, physical supplied parts, regulation-defined component ownership, works teams, current-development advantages, component-level contracts, staged constructor readiness, supplier support and leverage, explicit failures, and emergency replacement.

**Question:** Should we lock the supplier/customer/constructor model now and move to promotion, relegation, and season-transition rules?

**Recommendation:** Yes. Lock the current supplier/customer/constructor model and defer additional supplier edge cases until the long-term career loop exposes a clear gap.

### D-489 — Supplier/customer/constructor scope locked

**Decision:** The launch supplier/customer/constructor model is locked around Tier 1 customer starts, season-long or multi-season supplier agreements, transparent package tiers, previous-season supplier hardware, team-owned upgrades, physical supplied parts, regulation-defined component ownership, works teams, current-development advantages, component-level contracts, staged constructor readiness, supplier support and leverage, explicit failures, and emergency replacement. Additional supplier edge cases are deferred until the long-term career loop exposes a clear gap.

**Rationale:** The technical ecosystem now has a complete strategic boundary that can be tested through promotion and long-term career progression.

**Consequence:** Future supplier work should validate and balance this model before adding new procurement or manufacturer mechanics.

## Group 3 — Promotion, relegation, and season transitions

### Q-488 — Promotion and relegation core structure

The three-tier ladder can use fixed promotion and relegation places, playoffs, or purely eligibility-based movement. Fixed movement makes the championship consequences clear, while eligibility gates prevent a team from entering a higher tier without the facilities, budget, staff, or technical readiness required to operate there.

**Question:** Should each adjacent tier exchange two teams per season based on team championship results, subject to promotion eligibility gates and with no promotion or relegation playoffs at launch?

**Recommendation:** Yes. Promote the highest two eligible teams and relegate the lowest two eligible teams between adjacent tiers. If a sporting qualifier fails the required gates, move to the next eligible team and provide the blocked team a visible sporting and financial consolation.

### D-490 — Single champion promotion and single relegation

**Decision:** Between adjacent tiers, only the winning Constructor Championship team can earn promotion, and it must pass the promotion eligibility gates. Only one team is relegated from each tier per season. This supersedes D-489 and Q-488’s prior two-promotion and two-relegation recommendation.

**Rationale:** A single promotion place makes climbing the ladder substantially harder and gives the Constructor Championship winner exceptional importance.

**Consequence:** Promotion and relegation need one-place movement, champion-only promotion eligibility, gate validation, relegation classification, and a fallback when the champion cannot move.

## Current question

### Q-489 — Ineligible champion fallback

If the Constructor Championship winner fails the promotion gates, the game can promote the next-highest team, deny promotion for the season, or use a special emergency entry. Promoting the runner-up preserves full grids but weakens the champion-only rule; denying promotion preserves the difficulty but may require a field-size fallback if one team is still relegated.

**Question:** If the championship-winning constructor fails the promotion gates, should promotion be denied for that season rather than automatically passing to the runner-up?

**Recommendation:** Yes. Deny automatic promotion when the champion fails the gates. To preserve valid field sizes, also suspend relegation for that transition unless a regulation-defined emergency replacement is available; the blocked champion receives a clear preparation path for the next season.

### D-491 — No-substitute promotion failure

**Decision:** If the Constructor Championship winner fails promotion gates, promotion is denied for that season rather than passing automatically to the runner-up. Relegation is suspended for that transition unless regulations provide an emergency replacement, preserving valid field sizes while the blocked champion prepares for the following season.

**Rationale:** The championship winner remains the only sporting qualifier, and eligibility failure has a meaningful consequence without creating an invalid grid.

**Consequence:** Ladder transitions need final gate validation, promotion denial, relegation suspension, emergency-replacement rules, and next-season preparation tracking.

## Current question

### Q-490 — Explicit promotion eligibility gates

Promotion eligibility can be calculated as a hidden readiness score, or checked through visible minimum requirements. The gates may cover financial viability, HQ and facility readiness, staffing and pit-crew capacity, technical legality, car and supplier readiness, and required sporting or licensing standards. Visible gates let the player prepare before the championship is decided.

**Question:** Should promotion use an explicit checklist of published minimum gates, with early warnings during the season and final validation after the Constructor Championship is settled?

**Recommendation:** Yes. Publish the gate categories and current status: finances, HQ and facilities, staff and pit crew, technical and supplier readiness, legality, and licensing. Recalculate progress during the season, provide early warnings, and perform final validation after the championship result is known.

### D-492 — Explicit promotion eligibility checklist

**Decision:** Promotion uses a published checklist covering finances, HQ and facilities, staff and pit crew, technical and supplier readiness, legality, and licensing. The game recalculates status during the season, provides early warnings, and performs final validation after the Constructor Championship result is known.

**Rationale:** The player can prepare for promotion requirements instead of discovering a hidden failure after winning the championship.

**Consequence:** Eligibility state needs gate categories, current values, thresholds, warnings, final validation, and failure explanations.

## Current question

### Q-491 — Tier-specific promotion requirements

Promotion into a higher tier can use one universal checklist, or each destination tier can define different thresholds and requirements. Tier 1 should demand greater financial, facility, staff, technical, and licensing readiness than Tier 2. These requirements may change through regulation decisions, but changes should not surprise teams after the season has already begun.

**Question:** Should promotion gates be destination-tier-specific regulation values, with advance notice and changes taking effect in the next season?

**Recommendation:** Yes. Store gate categories and thresholds by destination tier. Make Tier 1 requirements stricter than Tier 2 where appropriate, publish changes in advance, and apply approved gate changes only from the next season.

### D-493 — Tier-specific regulation promotion gates

**Decision:** Promotion gate categories and thresholds are destination-tier-specific regulation values. Tier 1 requirements can be stricter than Tier 2, changes are published in advance, and approved gate changes take effect only from the next season.

**Rationale:** The ladder has distinct operational demands, and teams have time to prepare for known requirements.

**Consequence:** Promotion regulations need destination-tier thresholds, effective dates, advance notices, status calculations, and final-validation rules.

## Current question

### Q-492 — Financial promotion readiness

A team can qualify for promotion while lacking the cash flow to operate in the higher tier. Financial readiness could be based only on current balance, or on a forward-looking next-season forecast that includes cash, committed revenue, payroll, operating costs, entry costs, debt, and insolvency status.

**Question:** Should financial promotion eligibility use a forward-looking next-season budget test rather than only the team’s current cash balance?

**Recommendation:** Yes. Require a destination-tier budget forecast covering available cash, committed revenue, payroll, operating costs, entry costs, debt obligations, and insolvency status. Show the shortfall early and allow the player to improve readiness through sponsors, savings, financing, or controlled spending before final validation.

### D-494 — Forward-looking financial promotion gate

**Decision:** Financial promotion eligibility uses a destination-tier next-season budget forecast covering available cash, committed revenue, payroll, operating costs, entry costs, debt obligations, and insolvency status. Shortfalls appear early, and the player can improve readiness through sponsors, savings, financing, or controlled spending before final validation.

**Rationale:** Promotion requires the ability to operate a full higher-tier season, not merely the cash balance recorded on championship-closing day.

**Consequence:** Financial eligibility needs destination-tier forecasts, committed-income recognition, cost projections, debt and insolvency checks, warnings, and final validation.

## Current question

### Q-493 — HQ and facility promotion readiness

A team can have the budget for a higher tier but lack the facilities to operate there. The destination tier can require minimum HQ building levels, manufacturing and R&D capacity, garage or pit operations, technical support, and other infrastructure. These requirements should be visible during the season and should use the existing HQ upgrade and construction systems.

**Question:** Should promotion require destination-tier minimum HQ and facility levels plus sufficient operational capacity, validated through the existing building and construction systems?

**Recommendation:** Yes. Define destination-tier minimums for relevant HQ buildings and operational capacity. Show progress and construction completion dates early, and let the player prepare through the existing shared HQ construction queue rather than adding a separate promotion-only upgrade system.

### D-495 — HQ and facility promotion gate

**Decision:** Promotion requires destination-tier minimum HQ and facility levels plus sufficient operational capacity. Progress and construction completion dates are visible during the season, and preparation uses the existing shared HQ construction queue rather than a promotion-only upgrade system.

**Rationale:** A higher-tier entry requires infrastructure that can be prepared and verified before the transition.

**Consequence:** Facility eligibility needs destination-tier thresholds, capacity checks, construction progress, completion deadlines, and final validation.

## Current question

### Q-494 — Staff and pit-crew promotion readiness

A team may meet financial and facility gates but lack the people required to operate at the destination tier. The gate can require minimum staff roles, technical leadership, driver and reserve coverage, and the tier-specific active and reserve pit-crew structure. Readiness should account for signed contracts, eligibility, availability, and onboarding time rather than only current ratings.

**Question:** Should promotion require a valid destination-tier staff, driver, reserve, and pit-crew roster with required roles, contracts, eligibility, availability, and onboarding readiness?

**Recommendation:** Yes. Validate the actual roster against destination-tier requirements, including key staff roles, driver and reserve coverage, pit-crew template capacity, contracts, eligibility, availability, and preparation time. Let the player close gaps through recruitment, promotion, training, and contract planning before final validation.

### D-496 — Staff and pit-crew promotion gate

**Decision:** Promotion requires a valid destination-tier roster covering key staff roles, driver and reserve seats, pit-crew template capacity, contracts, eligibility, availability, and onboarding readiness. Gaps can be addressed through recruitment, promotion, training, and contract planning before final validation.

**Rationale:** The team must be operationally staffed for the higher tier rather than qualifying on sporting results alone.

**Consequence:** Roster eligibility needs destination-tier role requirements, contract and availability checks, pit-crew capacity, onboarding deadlines, and final validation.

## Current question

### Q-495 — Technical and supplier promotion readiness

A promoted team may have the people and money to enter a higher tier but lack a legal technical path. The requirement can be satisfied by a valid supplier agreement, compatible previous-season hardware, an approved constructor-readiness state, required parts and spares, and enough R&D or manufacturing capacity to support the destination tier.

**Question:** Should promotion require a validated destination-tier technical path covering supplier or constructor status, legal hardware, compatibility, required parts and spares, and sufficient R&D or manufacturing readiness?

**Recommendation:** Yes. Require a legal and operational technical plan using the existing supplier, constructor, R&D, manufacturing, physical-part, and scrutineering systems. Show missing hardware, contracts, compatibility, capacity, or readiness requirements early so the player can resolve them before final validation.

### D-497 — Technical and supplier promotion gate

**Decision:** Promotion requires a validated destination-tier technical plan using the existing supplier, constructor, R&D, manufacturing, physical-part, and scrutineering systems. The plan must cover legal hardware, compatibility, supplier or constructor status, required parts and spares, and sufficient technical capacity. Missing requirements are shown early for resolution before final validation.

**Rationale:** A promotion must produce a legal, supportable car rather than only a qualifying entry on paper.

**Consequence:** Technical eligibility needs supplier and constructor status, hardware legality, compatibility, parts and spares, R&D capacity, manufacturing readiness, and scrutineering checks.

## Current question

### Q-496 — Licensing and regulatory promotion approval

A team can satisfy operational gates but still lack the sporting license or regulatory approval required to enter the destination tier. The final gate may include entry paperwork, safety and scrutineering compliance, required deposits or bonds, license points, and any destination-tier sporting requirements. These should be explicit and known before the season ends.

**Question:** Should promotion require final destination-tier licensing and regulatory approval, including entry eligibility, safety and scrutineering compliance, required financial deposits, and sporting-license requirements?

**Recommendation:** Yes. Treat licensing and regulatory approval as a hard final gate. Publish the requirements in advance, show outstanding documents or compliance issues during the season, and prevent promotion until the governing body confirms the team is legally eligible for the next tier.

### D-498 — Licensing and regulatory promotion gate

**Decision:** Licensing and regulatory approval is a hard final promotion gate. Requirements are published in advance, outstanding documents and compliance issues are visible during the season, and promotion is blocked until the governing body confirms destination-tier eligibility.

**Rationale:** A team cannot enter a higher championship without meeting its sporting, safety, financial, and regulatory obligations.

**Consequence:** Promotion validation needs licensing, entry eligibility, safety and scrutineering compliance, deposits or bonds, sporting-license requirements, deadlines, and governing-body approval.

## Current question

### Q-497 — Promotion financial transition support

Promotion creates immediate costs: destination-tier entry requirements, staffing, facilities, supplier or constructor preparation, parts, travel, and operating scale. The team can be expected to fund all of this from existing cash, or receive a defined transition package such as promotion sponsor bonuses and a league or prize-money advance during the winter window.

**Question:** Should an eligible promoted team receive a defined, visible promotion-transition package that helps fund destination-tier entry and preparation costs without removing the need for disciplined budgeting?

**Recommendation:** Yes. Provide destination-tier transition support through promotion-linked sponsor bonuses and a regulated league or prize-money advance during the winter preparation window. Show the amount, eligible costs, timing, and future revenue implications; keep the team responsible for any remaining shortfall.

### D-499 — Promotion financial transition support

**Decision:** An eligible promoted team receives a visible destination-tier transition package through promotion-linked sponsor bonuses and a regulated league or prize-money advance during the winter preparation window. Amounts, eligible costs, timing, and future revenue implications are shown, and the team remains responsible for any remaining shortfall.

**Rationale:** Promotion is financially possible but still requires the player to manage the higher tier’s ongoing costs.

**Consequence:** Promotion transitions need support eligibility, sponsor bonuses, league advances, timing, cost categories, future-revenue effects, and shortfall warnings.

## Current question

### Q-498 — Relegation financial protection

A relegated team may retain higher-tier payroll, facilities, supplier, and contract costs after its revenue falls. The game can provide no protection, a one-season payment, or a multi-year tapering parachute that gives the team time to resize while preserving the consequences of relegation.

**Question:** Should relegated teams receive multi-year, tapering financial support or cost relief after dropping a tier?

**Recommendation:** Yes. Provide a regulation-defined parachute that is strongest in the first season and tapers over multiple seasons. Show the payment or cost relief, duration, obligations, and declining schedule, while requiring the player to restructure the team for the lower tier.

### D-500 — Relegation financial protection

**Decision:** Relegated teams receive a regulation-defined parachute strongest in the first season and tapering over multiple seasons. The game shows payment or cost relief, duration, obligations, and the declining schedule, while the player restructures the team for the lower tier.

**Rationale:** Relegation is consequential without forcing an otherwise viable team into immediate financial collapse.

**Consequence:** Relegation support needs tier rules, payment or cost-relief schedules, obligations, duration, eligibility, and restructuring consequences.

## Current question

### Q-499 — Contract effects of promotion and relegation

Promotion or relegation can automatically cancel contracts, or preserve them while activating clauses and normal negotiation consequences. Existing drivers, staff, pit crew, and suppliers may have tier clauses covering salary, role, release, buyout, performance expectations, or renewal rights. Preserving contracts protects planning history, while explicit clauses allow the roster and suppliers to react to a tier change.

**Question:** Should promotion and relegation preserve existing contracts by default while activating any pre-agreed tier clauses and opening the normal negotiation or exit windows?

**Recommendation:** Yes. Keep contracts valid unless they contain an explicit tier, role, salary, release, buyout, or supplier clause. Apply those clauses transparently, then let the player use normal negotiation and replacement windows to reshape the team.

### D-501 — Contract continuity across tier changes

**Decision:** Promotion and relegation preserve existing contracts by default. Explicit tier, role, salary, release, buyout, or supplier clauses activate transparently, after which the player can use normal negotiation and replacement windows to reshape the team.

**Rationale:** Tier movement changes the team’s situation without erasing its contractual history or creating unexplained automatic departures.

**Consequence:** Season transitions need contract clause evaluation, role and salary changes, release or buyout actions, negotiation windows, and replacement planning.

## Current question

### Q-500 — Technical asset continuity across tiers

A team’s cars, physical parts, designs, manufacturing history, and engineering knowledge can carry into the next season unchanged, be automatically recalculated for the new tier, or require a regulation and legality review. Carrying assets preserves history, while the destination tier’s regulations may make some parts obsolete, restricted, or in need of adaptation.

**Question:** Should technical assets carry into the next season, with destination-tier regulations determining which parts remain legal, require adaptation, or become obsolete rather than silently rewriting their values?

**Recommendation:** Yes. Preserve designs, physical parts, condition, wear, knowledge, and history. Run a transparent destination-tier legality and compatibility review that marks assets as legal, adaptation-required, restricted, or obsolete, with no hidden stat rewrite.

### D-502 — Technical asset continuity across tiers

**Decision:** Designs, physical parts, condition, wear, knowledge, and history carry into the next season. A transparent destination-tier legality and compatibility review marks assets as legal, adaptation-required, restricted, or obsolete without silently rewriting values.

**Rationale:** Tier movement changes technical rules while preserving the team’s engineering history and making adaptation a visible management task.

**Consequence:** Season transitions need asset carryover, destination-tier legality, compatibility review, adaptation work, restriction states, obsolescence, and history preservation.

## Current question

### Q-501 — Single relegation classification

The single relegation place can be assigned to the lowest finishing Constructor Championship team automatically, or be subject to a second eligibility test. Applying another gate could let a poorly prepared team avoid relegation, while automatic relegation makes the sporting result decisive. The previously defined exception remains a transition where no eligible champion is promoted and the field must remain valid.

**Question:** Should the lowest classified Constructor Championship team be the single relegated team automatically, with the only exception being a regulation-defined suspension when no promotion occurs above it?

**Recommendation:** Yes. Relegate the lowest classified team automatically based on the final Constructor Championship, without a separate readiness gate. Suspend that relegation only when the defined no-promotion fallback is required to preserve a valid field.

### D-503 — Automatic single-team relegation

**Decision:** The lowest classified team is relegated automatically based on the final Constructor Championship, without a separate readiness gate. Relegation is suspended only when the defined no-promotion fallback is required to preserve a valid field.

**Rationale:** Sporting performance determines relegation clearly, while the single exception prevents an invalid tier field when no eligible champion can move up.

**Consequence:** Season resolution needs final constructor standings, relegation classification, no-promotion fallback, field-size validation, and transition reporting.

## Current question

### Q-502 — Deterministic season-transition order

Promotion, relegation, contracts, finances, technical assets, and new regulations can resolve in different orders, producing contradictory states. A fixed transition sequence can first finalize the official season, then determine movement, apply eligibility and fallback, settle financial support, activate contract clauses, review technical assets, and finally prepare the new season.

**Question:** Should every season transition use a fixed order: official results and appeals, final standings, promotion and relegation, eligibility and fallback, financial support, contract clauses, technical legality review, then new-season regulations and calendar setup?

**Recommendation:** Yes. Use that deterministic order and record each phase in the season history. Do not apply new-tier rules, contract changes, or asset legality outcomes until the preceding movement and eligibility phases are final.

### D-504 — Deterministic season-transition order

**Decision:** Season transitions resolve in a fixed order: official results and appeals, final standings, promotion and relegation, eligibility and fallback, financial support, contract clauses, technical legality review, then new-season regulations and calendar setup. Each phase is recorded in season history, and later changes wait for preceding movement and eligibility phases to finalize.

**Rationale:** A stable order prevents contract, financial, technical, and regulatory systems from resolving against an outdated tier assignment.

**Consequence:** Season transitions need ordered phases, completion state, history entries, dependency checks, and delayed application of downstream effects.

## Current question

### Q-503 — Provisional promotion and relegation status

The championship may be decided before scrutineering, protests, appeals, and eligibility validation are complete. Movement can be announced immediately as final, or shown as provisional while the formal process completes. Provisional status lets the player plan without applying irreversible tier changes too early.

**Question:** Should promotion and relegation be shown as provisional after the sporting result, becoming final only after official results, appeals, and eligibility validation are complete?

**Recommendation:** Yes. Show provisional movement immediately with the reason and remaining checks. Finalize tier status only after results, appeals, promotion gates, and fallback rules are resolved; allow preparation during the provisional window without applying irreversible changes early.

### D-505 — Provisional movement status

**Decision:** Promotion and relegation are shown as provisional after the sporting result and become final only after official results, appeals, promotion gates, and fallback rules are resolved. Teams may prepare during the provisional window, but irreversible tier changes are not applied early.

**Rationale:** The player can plan for likely movement without the simulation committing to a result that a later ruling could change.

**Consequence:** Movement state needs provisional and final statuses, outstanding checks, preparation permissions, finalization events, and downstream-effect locks.

## Current question

### Q-504 — Promotion and relegation preparation window

After movement becomes final, the team needs time to satisfy destination-tier requirements or resize after relegation. The preparation window can be an informal gap before the first race, or a defined offseason phase with dated deadlines for finances, contracts, facilities, suppliers, technical assets, staff, and roster readiness.

**Question:** Should every finalized promotion or relegation create a defined offseason preparation window with dated requirements, progress tracking, and deadlines before the new season begins?

**Recommendation:** Yes. Create a visible transition window with deadlines for each required gate. Let the player recruit, negotiate, build, switch suppliers, adapt technical assets, and restructure the team during that window, while unresolved mandatory items trigger the previously defined safe fallback rather than silently disappearing.

### D-506 — Promotion and relegation preparation window

**Decision:** Every finalized promotion or relegation creates a visible offseason transition window with dated requirements, progress tracking, and deadlines. The player can recruit, negotiate, build, switch suppliers, adapt technical assets, and restructure the team during the window. Unresolved mandatory items trigger the defined safe fallback.

**Rationale:** Tier movement becomes a meaningful preparation period rather than an instantaneous label change at the end of the season.

**Consequence:** Transition windows need deadlines, requirement progress, available actions, blockers, fallback outcomes, and new-season readiness validation.

## Current question

### Q-505 — Promotion and relegation launch scope

The launch ladder now includes one champion-only promotion place, one automatic relegation place, no-substitute promotion failure, field-size protection, explicit destination-tier gates, financial and facility readiness, roster and technical readiness, licensing approval, promotion support, relegation parachutes, contract and asset continuity, deterministic transition ordering, provisional movement, and a defined offseason preparation window.

**Question:** Should we lock the promotion, relegation, and season-transition model now and move to finances, sponsors, board confidence, and career security?

**Recommendation:** Yes. Lock the current ladder-transition model and defer additional promotion or relegation edge cases until multi-season career simulation identifies a clear gap.

### D-507 — Promotion, relegation, and season-transition scope locked

**Decision:** The launch ladder-transition model is locked around one champion-only promotion place, one automatic relegation place, no-substitute promotion failure, field-size protection, explicit destination-tier gates, financial and facility readiness, roster and technical readiness, licensing approval, promotion support, relegation parachutes, contract and asset continuity, deterministic transition ordering, provisional movement, and a defined offseason preparation window. Additional ladder-transition edge cases are deferred until multi-season career simulation identifies a clear gap.

**Rationale:** Tier movement now has a complete sporting, operational, financial, and seasonal boundary that can be tested as part of the career loop.

**Consequence:** Future promotion and relegation work should validate and balance this model before adding new movement mechanics.

## Group 4 — Finances, sponsors, board confidence, and career security

The planning log already defines the unified cash balance, core revenue sources, sponsor contracts, payroll, debt recovery, contract windows, free-agent markets, and negotiation foundations. We will preserve those decisions and focus this group on the remaining management layer: board expectations, job security, career continuity, and how financial and sporting outcomes affect the player’s position.

### Q-506 — Board-confidence core boundary

Board confidence can be hidden behind occasional messages, represented as an explicit persistent state, or replaced by immediate objective failures. A visible confidence state gives the player a readable relationship with ownership and creates room for warnings, recovery plans, and career consequences before dismissal becomes possible.

**Question:** Should board confidence be an explicit persistent state influenced by sporting results, finances, objectives, major decisions, and narrative events, with clear warnings before job-security consequences?

**Recommendation:** Yes. Track board confidence explicitly with visible expectations, current status, trend, causes, and review windows. Let it change gradually from sporting and financial performance, objective progress, major decisions, and narrative events, with warnings and recovery opportunities before dismissal is considered.

### D-508 — Explicit board confidence state

**Decision:** Board confidence is an explicit persistent state with visible expectations, current status, trend, causes, and review windows. It changes gradually based on sporting and financial performance, objective progress, major decisions, and narrative events, with warnings and recovery opportunities before dismissal is considered.

**Rationale:** The player can understand ownership sentiment and respond to problems before the career is threatened.

**Consequence:** Board state needs confidence value or bands, expectations, trend history, contributing events, warning thresholds, review windows, and recovery actions.

## Current question

### Q-507 — Board objective setting

The board can give one simple championship target, or a structured set of expectations covering sporting position, financial control, development, facilities, driver or staff decisions, and reputation. Objectives should be established before the season, visible throughout it, and reviewed at defined windows rather than changing arbitrarily after every result.

**Question:** Should the board set explicit primary and secondary objectives before each season, with visible success thresholds, priorities, review dates, and consequences?

**Recommendation:** Yes. Set a primary sporting or career objective plus a small number of secondary financial, development, facility, or reputation objectives. Show their thresholds and priority, review progress at defined windows, and explain how success or failure affects board confidence.

### D-509 — Explicit board objectives

**Decision:** Before each season, the board sets one primary sporting or career objective plus a small number of secondary financial, development, facility, or reputation objectives. Thresholds, priorities, review dates, progress, and effects on board confidence are visible.

**Rationale:** Ownership expectations become concrete management targets rather than an opaque post-result judgment.

**Consequence:** Board objectives need categories, thresholds, priority, review dates, progress state, completion outcomes, and confidence effects.

## Current question

### Q-508 — Negotiated and context-adjusted board objectives

Objectives can be fixed by the board, generated from the team’s actual strength and finances, or offered as a negotiable set where the player accepts greater pressure for better support or requests a more realistic target with reduced upside. A fair system should account for car performance, tier, budget, roster, facilities, and recent results before assigning expectations.

**Question:** Should board objectives be context-adjusted and negotiable during the pre-season planning window, with visible tradeoffs between target difficulty, support, confidence, and consequences?

**Recommendation:** Yes. Generate objectives from team strength, budget, tier, roster, facilities, reputation, and recent performance. Let the player negotiate within a bounded pre-season window, showing how each option changes support, confidence expectations, rewards, and dismissal risk.

### D-510 — Context-adjusted board objectives

**Decision:** Board objectives are generated from team strength, budget, tier, roster, facilities, reputation, and recent performance. The player can negotiate within a bounded pre-season window, with visible changes to support, confidence expectations, rewards, and dismissal risk.

**Rationale:** The player has agency over the career contract while the board retains meaningful expectations based on the team’s actual context.

**Consequence:** Objective negotiation needs context inputs, offer alternatives, tradeoff projections, acceptance state, support effects, reward effects, and job-security consequences.

## Current question

### Q-509 — Stability of board objectives

The board can change objectives after any poor result, keep them fixed for the season, or allow changes only during defined review windows or exceptional events such as ownership changes, major regulation shifts, or a significant team transformation. Stable objectives prevent arbitrary moving goalposts; controlled updates keep the career model responsive.

**Question:** Should accepted board objectives remain stable for the season, with changes allowed only during defined review windows or clearly documented exceptional events?

**Recommendation:** Yes. Lock accepted objectives for the season. Permit changes only during scheduled review windows or exceptional documented events, show the reason and tradeoff, and require player acknowledgement before applying the revised target.

### D-511 — Stable seasonal board objectives

**Decision:** Accepted board objectives remain stable for the season. Changes are allowed only during scheduled review windows or clearly documented exceptional events. The reason, tradeoff, and revised target are shown, and the player acknowledges the change before it applies.

**Rationale:** The player can plan against reliable expectations while the board retains a controlled response to genuine changes in circumstances.

**Consequence:** Objective state needs seasonal locking, review windows, exceptional-event rules, revision history, acknowledgement, and target comparison.

## Current question

### Q-510 — Contextual board-confidence updates

Board confidence can update directly from each result, or use bounded review-window changes based on objective progress, performance relative to expectations, financial health, major decisions, and significant events. A contextual model should distinguish a bad result with a weak car from a bad result caused by poor management, while preserving the existing context-adjusted performance reports.

**Question:** Should board confidence update primarily at defined review windows using context-adjusted objective progress rather than reacting fully to every individual race result?

**Recommendation:** Yes. Update confidence mainly at scheduled reviews using objective progress, result relative to expected performance, financial health, major decisions, and documented events. Allow urgent changes for severe financial, legal, or relationship crises, but keep ordinary race-to-race effects bounded and explainable.

### D-512 — Contextual board-confidence updates

**Decision:** Board confidence updates mainly at scheduled reviews using objective progress, performance relative to expectations, financial health, major decisions, and documented events. Severe financial, legal, or relationship crises can trigger urgent changes, while ordinary race-to-race effects remain bounded and explainable.

**Rationale:** Ownership responds to the total management context rather than treating every isolated result as a career-defining event.

**Consequence:** Confidence reviews need context inputs, review cadence, bounded updates, crisis triggers, causes, trend history, and explanation.

## Current question

### Q-511 — Staged job-security consequences

Low board confidence can trigger an immediate dismissal, remain a warning only, or move through a staged process. A staged path can include concern, formal warning, performance-improvement period, final review, and dismissal, with exceptions for severe misconduct, insolvency, or legal failure. This gives the player a chance to recover while preserving real career risk.

**Question:** Should job-security consequences use a staged warning and review process before dismissal, except for severe financial, legal, or conduct failures?

**Recommendation:** Yes. Use visible states such as Stable, At Risk, Formal Warning, Final Review, and Dismissal Pending. Provide recovery targets and deadlines, preserve player agency through corrective actions, and allow immediate escalation only for severe documented failures.

### D-513 — Staged job-security process

**Decision:** Job security uses visible states such as Stable, At Risk, Formal Warning, Final Review, and Dismissal Pending. The player receives recovery targets and deadlines, with immediate escalation allowed only for severe documented financial, legal, or conduct failures.

**Rationale:** Career risk is real but legible, giving the player a chance to recover rather than ending the save after an opaque threshold.

**Consequence:** Job security needs states, warning triggers, recovery plans, deadlines, escalation rules, dismissal outcomes, and confidence history.

## Current question

### Q-512 — Career continuity after dismissal or resignation

The player can be dismissed or resign voluntarily and immediately lose the save, or enter an unemployed career state where teams may offer roles based on reputation, results, finances, relationships, and recent history. Career continuity supports the long-term management fantasy and allows a failed rebuild to become part of the player’s story.

**Question:** Should dismissal or resignation place the player into an unemployed career state with a bounded job market, rather than ending the save automatically?

**Recommendation:** Yes. Preserve the career and open a bounded job market after dismissal or resignation. Let team reputation, objectives, results, financial history, relationships, and the reason for departure affect available offers, while allowing the player to wait, accept a role, or voluntarily retire.

### D-514 — Career continuity after dismissal or resignation

**Decision:** Dismissal or resignation places the player into an unemployed career state and opens a bounded job market. Team reputation, objectives, results, financial history, relationships, and departure reason affect available offers. The player can wait, accept a role, or voluntarily retire.

**Rationale:** A failed team tenure becomes part of the career history rather than an automatic game-over state.

**Consequence:** Career state needs unemployment, job offers, reputation effects, departure reasons, waiting, acceptance, retirement, and history continuity.

## Current question

### Q-513 — Board authority versus player control

The board can act as an evaluator that sets objectives and job-security consequences, or directly veto ordinary sporting, staffing, R&D, and financial decisions. Frequent vetoes would reduce the player’s role as team principal; ignoring the board would make confidence and objectives cosmetic. Hard legality and insolvency rules already constrain invalid actions independently.

**Question:** Should the board primarily evaluate performance, set objectives, provide support or pressure, and control job security, while leaving ordinary team decisions to the player unless hard legal or financial rules block them?

**Recommendation:** Yes. Keep the board as an oversight and career-security system rather than a second player. Let it set objectives, approve exceptional funding or recovery plans, provide support or pressure, and decide job security, while the player retains ordinary control over race strategy, staffing, R&D, facilities, and contracts within hard constraints.

### D-515 — Board oversight without ordinary vetoes

**Decision:** The board serves as an oversight and career-security system rather than a second player. It sets objectives, can approve exceptional funding or recovery plans, provides support or pressure, and controls job security. The player retains ordinary control over race strategy, staffing, R&D, facilities, and contracts within hard legal and financial constraints.

**Rationale:** Board involvement matters to the career without undermining the player’s role as team principal.

**Consequence:** Board interactions need objective setting, support and pressure, exceptional approvals, job-security decisions, and separation from ordinary player actions.

## Current question

### Q-514 — Finance, sponsor, and career launch scope

The finance and commercial foundations already cover unified cash, revenue sources, sponsors, payroll, debt recovery, contract windows, and negotiation markets. The remaining career layer now covers explicit board confidence, contextual and negotiable objectives, stable seasonal targets, staged job security, unemployment after dismissal, and board oversight without ordinary vetoes.

**Question:** Should we lock the finance, sponsor, board-confidence, and career-security model now and move to world simulation and narrative systems?

**Recommendation:** Yes. Lock the current model and defer additional commercial or board edge cases until multi-season career testing identifies a clear gap.

### D-516 — Board, finance, sponsor, and career scope locked

**Decision:** The finance and commercial foundation remains centered on unified cash, revenue sources, sponsors, payroll, debt recovery, contract windows, and negotiation markets. The career layer is locked around explicit board confidence, contextual and negotiable objectives, stable seasonal targets, staged job security, unemployment after dismissal, and board oversight without ordinary vetoes. Additional commercial and board edge cases are deferred until multi-season career testing identifies a clear gap.

**Rationale:** The player has a complete economic and career-management boundary without turning ownership into a second management interface.

**Consequence:** Future finance and board work should validate and balance this scope before adding new commercial or oversight mechanics.

## Group 5 — World simulation and narrative systems

### Q-515 — Persistent world-simulation boundary

The player’s team can exist in an isolated simulation, or operate inside a persistent world where rival teams, drivers, staff, suppliers, sponsors, regulations, and championships continue changing in the background. A living world creates the long-term history, career opportunities, rivalries, and market pressure required by the management-simulation vision.

**Question:** Should the game run a persistent background world simulation in which AI teams, drivers, staff, suppliers, sponsors, championships, and career markets continue progressing even when the player is not directly interacting with them?

**Recommendation:** Yes. Make the world persistent and active. Advance AI teams, people, markets, supplier relationships, championships, and news through the existing daily resolution pipeline, while keeping outcomes summarized and decision-relevant rather than simulating every rival action at full player-facing detail.

### D-517 — Persistent background world simulation

**Decision:** The world is persistent and active. AI teams, people, markets, supplier relationships, championships, and news progress through the daily resolution pipeline, with outcomes summarized and decision-relevant rather than fully simulated at player-facing detail.

**Rationale:** The career produces history and changing opportunities even when the player is focused on their own team.

**Consequence:** World simulation needs persistent entities, daily progression, summarized outcomes, history, market updates, supplier states, championship updates, and news generation.

## Current question

### Q-516 — Shared rules for AI teams

AI teams can receive simplified hidden outcomes, or operate under the same tier regulations, budgets, staffing limits, R&D rules, supplier relationships, race-weekend constraints, and promotion gates as the player. Shared rules make the world fair and explainable; AI decision-making can still use strategic archetypes and lower-detail execution when the player is not observing it.

**Question:** Should AI teams use the same core sporting, financial, technical, staffing, supplier, and promotion rules as the player, with strategic archetypes and summarized off-screen execution rather than hidden advantages?

**Recommendation:** Yes. Use the same authoritative rules and constraints for AI teams. Give each team an archetype and priorities that influence decisions, then summarize off-screen execution while preserving the same legality, budget, technical, staffing, supplier, and championship consequences.

### D-518 — Shared AI rules without hidden advantages

**Decision:** AI teams use the same authoritative sporting, financial, technical, staffing, supplier, and promotion rules as the player. Strategic archetypes and priorities influence their decisions, while off-screen execution is summarized without granting hidden advantages.

**Rationale:** Rival success remains understandable and comparable to the player’s own management decisions.

**Consequence:** AI simulation needs shared rule validation, archetype priorities, summarized execution, consequence logging, and no-cheat checks.

## Current question

### Q-517 — Persistent AI team identities

Rival teams can make isolated decisions without a lasting identity, or maintain persistent profiles covering budget behavior, development philosophy, driver preferences, supplier strategy, risk tolerance, board expectations, and competitive priorities. Stable identities make rivals recognizable, while gradual evolution allows teams to respond to success, failure, ownership changes, and leadership turnover.

**Question:** Should each AI team have a persistent strategic identity that influences its spending, R&D, staffing, supplier, driver, and race-strategy decisions while evolving gradually over time?

**Recommendation:** Yes. Give every team a visible or discoverable identity built from strategic priorities, budget behavior, technical philosophy, talent preferences, supplier relationships, and risk tolerance. Let identity evolve through results, finances, ownership, leadership, and major events rather than changing randomly between races.

### D-519 — Persistent AI team identities

**Decision:** Each AI team has a persistent strategic identity influencing spending, R&D, staffing, suppliers, drivers, and race strategy. Identity evolves gradually through results, finances, ownership, leadership, and major events rather than changing randomly between races.

**Rationale:** Rivals become recognizable organizations with histories and tendencies instead of interchangeable background opponents.

**Consequence:** AI team profiles need priorities, behavior tendencies, evolution triggers, history, ownership and leadership links, and decision effects.

## Current question

### Q-518 — Rival identity visibility

The player can see exact AI priorities and internal states, receive only broad labels, or discover rival identities through scouting, race observation, staff reports, news, and repeated behavior. Exact information would remove uncertainty; complete opacity would make rival behavior feel arbitrary.

**Question:** Should rival team identities be revealed progressively through scouting, race observation, staff reports, news, and repeated behavior, with confidence levels rather than exact omniscient data?

**Recommendation:** Yes. Show broad initial signals, then improve confidence through scouting, observation, engineering comparison, staff reports, and history. Keep internal priorities and changes partially uncertain so the player must interpret evidence rather than read the AI’s full decision state.

### D-520 — Progressive rival identity visibility

**Decision:** Rival team identities are revealed progressively through scouting, observation, engineering comparison, staff reports, news, and repeated behavior. The player sees broad initial signals and confidence levels rather than the AI’s complete internal priorities.

**Rationale:** Rival analysis becomes a management activity while preserving uncertainty and discovery.

**Consequence:** Rival intelligence needs evidence sources, confidence, dated observations, identity summaries, hidden internal state, and confidence updates.

## Current question

### Q-519 — AI driver and staff career progression

The world can keep rival drivers and staff static, or run them through the same development, fatigue, contracts, transfers, promotions, performance arcs, and retirement rules as the player’s personnel. Persistent people create a living market and make academy development, free agents, rivalries, and succession matter beyond the player’s own roster.

**Question:** Should AI drivers and staff use the same core development, contract, market, promotion, availability, and retirement systems as player-controlled personnel?

**Recommendation:** Yes. Run AI personnel through the same attributes, development, contracts, fatigue, performance, transfers, promotions, injuries or availability, and retirement rules. Use summarized off-screen resolution, but preserve the same career consequences and market history.

### D-521 — Shared AI personnel career systems

**Decision:** AI drivers and staff use the same attributes, development, contracts, fatigue, performance, transfers, promotions, injuries or availability, and retirement rules as player-controlled personnel. Off-screen resolution is summarized, while career consequences and market history are preserved.

**Rationale:** The personnel market remains a genuine career ecosystem rather than a static pool created only for the player.

**Consequence:** AI personnel simulation needs shared progression, contract, availability, transfer, retirement, and history systems with summarized off-screen outcomes.

## Current question

### Q-520 — AI personnel-market competition

AI teams can receive automatic roster changes, or compete for personnel through the same bounded market and contract windows as the player. Their offers should reflect team identity, budget, tier, role needs, facilities, reputation, development opportunity, and relationships, while respecting contract terms and eligibility.

**Question:** Should AI teams compete for drivers and staff through the same contract windows, market availability, scouting uncertainty, eligibility, and offer rules as the player?

**Recommendation:** Yes. Use the same market and contract rules for AI teams. Let their identities, budgets, roster needs, tier, facilities, reputation, development opportunities, and relationships shape offers, while preserving contract, eligibility, and negotiation constraints.

### D-522 — Shared AI personnel-market competition

**Decision:** AI teams compete for drivers and staff through the same market and contract rules as the player. Their identities, budgets, roster needs, tier, facilities, reputation, development opportunities, and relationships shape offers within contract, eligibility, and negotiation constraints.

**Rationale:** Rival roster changes remain understandable and create a genuine market rather than automatic background substitutions.

**Consequence:** AI recruitment needs market availability, scouting uncertainty, offer generation, contract windows, eligibility, negotiation, and identity-driven priorities.

## Current question

### Q-521 — Off-screen race simulation

Rival race weekends can use arbitrary summarized results, or resolve through the same tier regulations, car and driver attributes, tyres, fuel, weather, incidents, strategy, reliability, and race classifications used for the player. Off-screen execution can run at lower detail while preserving the authoritative standings and major events.

**Question:** Should off-screen race weekends use the same authoritative race systems and regulations at a lower-detail simulation level, preserving classifications, points, incidents, reliability, and major strategic outcomes?

**Recommendation:** Yes. Use the same race rules and core inputs, with lower-detail execution for off-screen events. Preserve official classifications, points, retirements, penalties, major incidents, weather effects, and reliability outcomes so the world remains consistent with the player’s races.

### D-523 — Shared-rule off-screen race simulation

**Decision:** Off-screen race weekends use the same authoritative race rules and core inputs at a lower-detail execution level. Official classifications, points, retirements, penalties, major incidents, weather effects, reliability outcomes, and significant strategic results are preserved.

**Rationale:** The wider championship remains consistent with the player’s races without requiring full player-facing simulation for every event.

**Consequence:** Off-screen racing needs shared rule inputs, lower-detail execution, official result generation, major-event capture, and history persistence.

### D-524 — Visible competing personnel interest

**Decision:** Driver and staff scouting and contact-negotiation views show which other teams are targeting the person when that information is known or inferable. Competing interest becomes part of the player’s recruitment context rather than remaining hidden until an offer is completed.

**Rationale:** The player can make informed recruitment decisions and understand why a candidate’s availability, demands, or deadline is changing.

**Consequence:** Personnel-market intelligence needs target-team visibility, interest state, evidence source, confidence, timing, and negotiation-context integration.

## Current question

### Q-522 — Certainty of competing personnel interest

Other-team interest can be confirmed only after a formal offer, shown as a strong signal when contact or scouting evidence exists, or presented as an exact list of every interested team. Exact omniscience would remove negotiation uncertainty, while hiding all interest would make the market feel arbitrary.

**Question:** Should the scouting and negotiation UI distinguish confirmed offers, confirmed contact, and inferred interest, with confidence and last-known evidence shown for each targeting team?

**Recommendation:** Yes. Show the targeting team when evidence supports it, label the interest as confirmed offer, confirmed contact, or inferred interest, and include confidence and last-known evidence. Do not reveal private offers or internal motives that the player has no basis to know.

### D-525 — Evidence-based competing personnel interest

**Decision:** Scouting and negotiation views show targeting teams when evidence supports it, label interest as confirmed offer, confirmed contact, or inferred interest, and include confidence and last-known evidence. Private offers and internal motives remain hidden without a basis for knowing them.

**Rationale:** Recruitment competition becomes readable and strategic without making the player omniscient.

**Consequence:** Personnel intelligence needs interest states, evidence sources, confidence, timestamps, target-team visibility, private-information boundaries, and negotiation integration.

## Current question

### Q-523 — AI personnel-market launch scope

The AI personnel market now includes shared progression and contract rules, identity-driven team offers, bounded off-screen resolution, visible competing target teams, and confidence-based scouting and negotiation information.

**Question:** Should we lock the AI personnel and scouting-market model now and move to news, rivalries, and narrative events?

**Recommendation:** Yes. Lock the current personnel-market model and defer additional recruitment-information edge cases until multi-season career testing identifies a clear gap.

### D-526 — AI personnel and scouting-market scope locked

**Decision:** The AI personnel market is locked around shared progression and contract rules, identity-driven team offers, bounded off-screen resolution, visible competing target teams, and confidence-based scouting and negotiation information. Additional recruitment-information edge cases are deferred until multi-season career testing identifies a clear gap.

**Rationale:** The personnel ecosystem now supports a living market without requiring further information-surface detail before testing.

**Consequence:** Future personnel-market work should validate and balance the current model before adding new recruitment mechanics.

## Current question

### Q-524 — Actionable world-news boundary

World news can be a cosmetic feed of flavor text, or a structured layer that reports meaningful events involving races, teams, drivers, staff, suppliers, sponsors, regulations, and the market. Actionable news should connect to evidence, confidence, reputation, relationships, opportunities, risks, or player decisions rather than existing only as decoration.

**Question:** Should world news be an event-driven simulation layer that reports meaningful facts, rumors, opportunities, and risks affecting the player’s decisions?

**Recommendation:** Yes. Build news from authoritative world events and separate confirmed facts from rumors or interpretation. Let relevant news influence scouting, reputation, relationships, negotiations, board context, supplier decisions, and narrative opportunities without automatically making player decisions.

### D-527 — Actionable event-driven world news

**Decision:** World news is built from authoritative events and distinguishes confirmed facts from rumors or interpretation. Relevant news can affect scouting, reputation, relationships, negotiations, board context, supplier decisions, and narrative opportunities without making player decisions automatically.

**Rationale:** News becomes a useful management information layer while preserving player agency.

**Consequence:** News events need sources, evidence, confidence, timing, affected entities, action links, rumor states, and player-facing consequences.

## Current question

### Q-525 — News sources and confidence

News can arrive as an official governing-body notice, team or supplier statement, verified journalist report, staff briefing, public observation, or rumor. Different sources have different authority, timing, detail, and accuracy. Showing source and confidence lets the player decide whether to act, investigate, or wait for confirmation.

**Question:** Should every news item show its source, publication timing, confidence or certainty, and whether it is confirmed, reported, inferred, or rumor?

**Recommendation:** Yes. Label official notices, verified reports, staff intelligence, observations, and rumors distinctly. Show timing and confidence, preserve updates or corrections, and let the player act on uncertain information with clearly communicated risk.

### D-528 — Source-based news confidence

**Decision:** Every news item identifies its source, publication timing, confidence or certainty, and state as confirmed, reported, inferred, or rumor. Official notices, verified reports, staff intelligence, observations, and rumors are distinct, with updates or corrections preserved and uncertainty communicated.

**Rationale:** The player can judge whether to trust, investigate, or wait on information instead of treating every headline as equally reliable.

**Consequence:** News records need source, timestamp, confidence, evidence state, corrections, affected entities, and uncertainty presentation.

## Current question

### Q-526 — News urgency and player actions

News can be informational only, create optional actions, or block the calendar until resolved. A useful system should let the player investigate, respond, accept an opportunity, acknowledge a risk, ignore, archive, or defer items, while reserving blocking status for deadlines, legality, contracts, safety, or other consequential decisions.

**Question:** Should news items have urgency and action states, with optional stories handled through the inbox and only genuinely time-critical or legally required stories pausing the calendar?

**Recommendation:** Yes. Classify news as informational, actionable, urgent, or blocking. Provide actions such as investigate, respond, accept, reject, defer, ignore, and archive; pause time only for defined deadlines, safety, legality, contract, or other validity decisions.

### D-529 — News urgency and action states

**Decision:** News is classified as informational, actionable, urgent, or blocking. Items provide actions such as investigate, respond, accept, reject, defer, ignore, and archive. Time pauses only for defined deadlines, safety, legality, contract, or other validity decisions.

**Rationale:** News remains readable and actionable without turning every headline into a forced interruption.

**Consequence:** News needs urgency, action states, deadlines, blocking rules, inbox handling, and consequence previews.

## Current question

### Q-527 — Emergent and authored narrative events

Narrative can be generated entirely from simulation data, written as a fixed sequence of authored stories, or combine both. Emergent events make each save different; authored chains provide stronger characters, themes, and memorable turning points. Authored content should still use conditions and player choices rather than forcing the same story into every career.

**Question:** Should the narrative layer combine simulation-driven emergent events with a limited set of authored event chains that activate only when their conditions are met?

**Recommendation:** Yes. Use simulation events for the majority of news and stories, then add a small number of authored chains with clear prerequisites, branching choices, outcomes, and cooldowns. Keep them optional and context-sensitive so they enrich the career without overriding the simulation.

### D-530 — Hybrid emergent and authored narrative

**Decision:** The narrative layer combines simulation-driven events with a limited set of authored chains. Authored chains use prerequisites, branching choices, outcomes, and cooldowns, remain optional and context-sensitive, and do not override the underlying simulation.

**Rationale:** The world feels unique to each save while still supporting memorable, deliberately written career moments.

**Consequence:** Narrative chains need prerequisites, activation state, branches, cooldowns, outcomes, persistence, and simulation-safe integration.

## Current question

### Q-528 — Persistent narrative consequences

Authored events can resolve as one-time flavor, or change persistent relationships, reputation, morale, board confidence, supplier trust, sponsor support, contracts, finances, or future event availability. Persistent consequences make choices matter, but they should be bounded, visible after the decision, and recorded in career history.

**Question:** Should meaningful narrative choices create bounded persistent consequences across relationships, reputation, board confidence, sponsors, suppliers, contracts, finances, or future event availability?

**Recommendation:** Yes. Let major choices create visible, bounded changes to relevant systems and future narrative conditions. Show the immediate and likely long-term effects before confirmation when possible, and record the choice and consequences in the player’s career history.

### D-531 — Persistent narrative consequences

**Decision:** Major narrative choices create visible, bounded changes to relevant relationships, reputation, board confidence, sponsors, suppliers, contracts, finances, and future narrative conditions. Effects are shown before confirmation when possible, and choices and consequences are recorded in career history.

**Rationale:** Narrative choices become meaningful parts of the career without overriding the underlying simulation or producing unbounded effects.

**Consequence:** Narrative outcomes need consequence mappings, previews, persistence, history, future-event conditions, and bounded effect ranges.

## Current question

### Q-529 — World simulation and narrative launch scope

The launch world model now includes persistent AI teams and personnel, shared authoritative rules, strategic team identities, confidence-based rival intelligence, off-screen race simulation, competitive personnel markets, actionable source-based news, urgency and player actions, emergent events, authored chains, and bounded persistent narrative consequences.

**Question:** Should we lock the world simulation and narrative model now and move to a final cross-system audit rather than continuing with individual subsystem questions?

**Recommendation:** Yes. Lock the current world and narrative model, then perform one integration audit across the five groups for contradictions, missing handoffs, and launch-scope conflicts instead of opening another long sequence of overlapping questions.

### D-532 — World simulation and narrative scope locked

**Decision:** The launch world and narrative model is locked around persistent AI teams and personnel, shared authoritative rules, strategic team identities, confidence-based rival intelligence, off-screen race simulation, competitive personnel markets, actionable source-based news, urgency and player actions, emergent events, authored chains, and bounded persistent narrative consequences. The next step is a single cross-system audit across the five groups.

**Rationale:** The five planning groups have defined their major boundaries; further design should focus on integration and contradiction removal rather than continued subsystem expansion.

**Consequence:** Future world and narrative work should validate the current model through the integration audit and multi-season testing before adding new mechanics.

## Current question

### Q-530 — Personnel rating scale handoff

The design decision for drivers, staff, and pit crew uses a shared 0–100 rating scale, but the current data schema and race-simulation contract still describe personnel inputs on a 1–20 scale.

**Question:** Should 0–100 be the authoritative persisted and player-facing scale for all personnel, with any 1–20 race-engine inputs treated only as an explicit boundary normalization if the simulation formulas still require them?

**Recommendation:** Yes. Keep one authoritative 0–100 personnel scale across drivers, staff, and pit crew. If the race engine retains 1–20 inputs temporarily, convert them explicitly at the integration boundary and document that as normalization rather than a second rating system.

### D-533 — Universal personnel rating scale

**Decision:** All driver, staff, pit-crew, persisted simulation, and player-facing ratings use the same 0–100 scale. No 1–20 conversion or parallel rating scale is used.

**Rationale:** A single scale keeps personnel comparison, progression, formulas, UI, and saved data consistent across every game system.

**Consequence:** The data schema and race-simulation contract must be updated to use 0–100 directly; any existing 1–20 references are stale and must not become compatibility behavior.

## Current question

### Q-531 — Stale ERS driver attribute

The ERS decision already says execution should use existing driver and staff attributes rather than adding a dedicated ERS statistic, but the current data schema still lists `ersManagement` as a driver ability.

**Question:** Should `ersManagement` be removed from the driver attribute model and schema, with ERS using the existing attributes already approved for it?

**Recommendation:** Yes. Remove `ersManagement`; use Adaptability, Consistency, Feedback, relevant car capability, and engineering quality for ERS execution and recommendations.

### D-534 — ERS attribute model corrected

**Decision:** The dedicated `ersManagement` driver attribute is removed. ERS execution and recommendations use the existing approved attributes, relevant car capability, and engineering quality.

**Rationale:** ERS should deepen the existing personnel and engineering model without introducing a redundant driver statistic.

**Consequence:** The data schema must remove `ersManagement`; ERS formulas, reports, and UI use the universal 0–100 ratings and existing attribute meanings.

### D-535 — Weather contract launch boundary reaffirmed

**Audit resolution:** Launch weather remains one shared circuit-wide atmospheric and track state that evolves through each session. The weather contract’s independent per-`TrackSegment` surface state, mini-sector update cadence, and localized surface variation are future expansion scope, not launch behavior.

**Consequence:** The weather contract must be marked or revised so deferred segment-level behavior cannot silently become part of the launch simulation.

## Current question

### Q-532 — Shared ruleset authority

The five groups all depend on tier regulations: race format, refueling, ERS, technical ownership, supplier access, promotion gates, licensing, and season transitions. These rules can be duplicated inside each system or read from one immutable season ruleset snapshot.

**Question:** Should one immutable, versioned season ruleset be the authoritative source for every tier-specific rule across simulation, technical systems, eligibility, and season transitions?

**Recommendation:** Yes. Every system should consume the same season ruleset snapshot, with regulation changes creating a new version effective next season. Avoid hardcoded or independently interpreted tier rules in individual systems.

### D-536 — Shared season ruleset authority

**Decision:** One immutable, versioned season ruleset snapshot is authoritative for all tier-specific rules across race formats, refueling, ERS, technical ownership, supplier access, promotion gates, licensing, and season transitions. Regulation changes create a new version effective the following season.

**Rationale:** A shared ruleset prevents systems from drifting into contradictory interpretations of the same championship regulations.

**Consequence:** Race simulation, management systems, technical systems, eligibility checks, and season-transition logic must consume the same ruleset snapshot rather than duplicating tier rules.

## Current question

### Q-533 — Race-engine result handoff

The race engine resolves sporting and physical weekend outcomes, while the management simulation must apply points, finances, fatigue, form, wear, damage, reliability, board effects, news, and narrative consequences. Direct writes from multiple systems could resolve the same weekend twice or produce conflicting state.

**Question:** Should the race engine produce one immutable official weekend-result package, with the management layer applying all downstream career, financial, personnel, technical, and narrative consequences exactly once?

**Recommendation:** Yes. The race engine owns sporting and physical outcomes; the management layer consumes one idempotent result package to update standings, resources, personnel state, contracts, board confidence, news, and history.

### D-537 — Official weekend-result handoff

**Decision:** The race engine is the sole owner of sporting and physical weekend outcomes. It produces one immutable, idempotent official weekend-result package, and the management layer applies the downstream standings, financial, personnel, technical, board, news, narrative, and history consequences exactly once.

**Rationale:** One authoritative handoff prevents duplicate resolution and keeps race outcomes separate from management consequences while preserving a deterministic career state.

**Consequence:** Weekend settlement needs a stable result-package identity, complete input and output versions, downstream application status, retry safety, and a clear boundary between engine facts and management effects.

## Current question

### Q-534 — Weekend settlement boundary

The result package can be settled session-by-session, or held until the complete race weekend has finished and then applied as one management resolution. Applying it too early could expose incomplete points, costs, fatigue, or narrative outcomes; applying it too late could delay valid post-session information.

**Question:** Should the final management settlement occur after the weekend’s final official session, aggregating all session results before applying weekend-level consequences and allowing the calendar to advance?

**Recommendation:** Yes. Preserve live and session-level results for the race-weekend UI, but apply weekend-level standings, finances, personnel state, technical state, board effects, news, narrative consequences, and calendar advancement through one final settlement after the last official session.

### D-538 — Weekend settlement timing

**Decision:** Session results remain available to the race-weekend UI, but weekend-level standings, finances, personnel state, technical state, board effects, news, narrative consequences, and calendar advancement are applied through one final settlement after the last official session.

**Rationale:** The player gets timely session feedback without exposing incomplete weekend consequences or advancing the career before the event is officially complete.

**Consequence:** Weekend settlement needs a complete-session gate, aggregation across the weekend format, one finalization transaction, and clear handling for cancelled, abandoned, or invalid sessions.

## Current question

### Q-535 — Shared result format for all teams

Player-controlled weekends and off-screen AI weekends can use separate result formats, or both can emit the same official result package at different execution detail levels. A shared package keeps standings, personnel history, championship records, news, and narrative consequences consistent across the entire world.

**Question:** Should player-controlled and off-screen weekends both produce the same official result-package format, with only the simulation detail and player-facing telemetry differing?

**Recommendation:** Yes. Use one official result contract for every team and weekend. Player events receive full interactive detail; off-screen events use lower-detail execution but still produce the same classifications, points, penalties, retirements, reliability, major incidents, and settlement inputs.

### D-539 — Shared official result contract

**Decision:** Player-controlled and off-screen weekends use the same official result-package contract. Player events receive full interactive detail, while off-screen events use lower-detail execution but preserve classifications, points, penalties, retirements, reliability, major incidents, and all required settlement inputs.

**Rationale:** One result format keeps the championship, career history, world simulation, and narrative layer consistent regardless of where a weekend was simulated.

**Consequence:** The result contract needs execution-detail metadata without changing the meaning or completeness of official sporting outcomes.

## Current question

### Q-536 — Player approval boundary at settlement

Weekend settlement can directly activate staff changes, setup or strategy changes, training, recruitment, supplier actions, or other recommendations, or it can apply only deterministic consequences and create recommendations for the player to review. Existing decisions require player approval for operational changes and prohibit automatic activation.

**Question:** Should settlement apply only deterministic consequences and generate recommendation threads, with no operational recommendation becoming active until the player approves or edits it?

**Recommendation:** Yes. Settlement updates facts and consequences only. It creates post-weekend recommendation threads that the player can approve, edit, reject, defer, or leave unresolved; only explicitly defined safety, legality, or validity failures may block calendar progress.

### D-540 — Settlement preserves player agency

**Decision:** Weekend settlement applies deterministic facts and consequences only. It creates post-weekend recommendation threads that the player can approve, edit, reject, defer, or leave unresolved. Operational recommendations never activate automatically; only explicitly defined safety, legality, or validity failures may block calendar progress.

**Rationale:** The settlement pipeline can be authoritative without becoming a second player or silently changing the team’s plans.

**Consequence:** Recommendation records need pending states, evidence, action history, approval ownership, edit support, unresolved persistence, and defined blocking conditions.

## Current question

### Q-537 — Persistent world-state boundary

The world model now includes persistent AI teams and personnel, markets, supplier relationships, board confidence, news, narrative threads, and bounded consequences. The save contract currently describes core world state but does not yet explicitly define the persistence boundary for all of these systems.

**Question:** Should all persistent world and narrative state live inside the save database and survive save/load exactly, with only disposable telemetry and presentation artifacts stored outside it?

**Recommendation:** Yes. Persist world date and RNG, AI state, personnel and contract history, markets, supplier relationships, board and career state, news threads, narrative state, and consequences in the save. Keep only disposable telemetry or caches outside the authoritative save.

### D-541 — Persistent world-state boundary

**Decision:** All persistent world and narrative state lives inside the save database and survives save/load exactly. This includes world date and RNG, AI state, personnel and contract history, markets, supplier relationships, board and career state, news threads, narrative state, and bounded consequences. Only disposable telemetry or caches may live outside the authoritative save.

**Rationale:** A career save must preserve the actual evolving world rather than reconstructing important relationships, opportunities, and consequences from presentation data.

**Consequence:** Persistence must define first-class or versioned state for world simulation, markets, board and career systems, news, narrative, and their histories, with migrations and integrity checks.

## Current question

### Q-538 — Authoritative calendar pipeline

Daily world simulation, race-weekend sessions, weekend settlement, contract dates, regulation effective dates, and promotion transitions all depend on the in-game calendar. Separate systems advancing time independently could skip deadlines, double-resolve AI activity, or apply a regulation change at the wrong time.

**Question:** Should one authoritative calendar pipeline advance the world date, run daily simulation, start and settle race weekends, process deadlines, and apply next-season changes, with idempotent save transactions around each transition?

**Recommendation:** Yes. Use one serialized calendar pipeline as the only time authority. It should process each date and transition once, pause for required player decisions, and commit checkpoints so save/load cannot duplicate or skip world activity.

### D-542 — Authoritative calendar pipeline

**Decision:** One serialized calendar pipeline is the only time authority. It advances the world date, runs daily simulation, starts and settles race weekends, processes deadlines, applies next-season changes, pauses for required player decisions, and commits idempotent checkpoints so save/load cannot duplicate or skip activity.

**Rationale:** A single time pipeline keeps world simulation, race weekends, contracts, regulation timing, and season transitions in the same chronological state.

**Consequence:** Calendar transitions need ordered phases, transition identities, committed checkpoints, pause states, and recovery-safe retry behavior.

## Current question

### Q-539 — Failed transition behavior

A calendar transition can fail because of persistence, invalid state, a missing required decision, or a domain rule that needs a defined fallback. Silently advancing, partially applying changes, or inventing a generic fallback could corrupt the career state.

**Question:** Should non-recoverable transition failures fail closed, preserving the last committed state, showing the blocking reason, and allowing a safe retry or defined domain fallback before time advances?

**Recommendation:** Yes. Commit transitions atomically; on failure, keep the prior valid state, pause the calendar, expose the reason and recovery action, and retry only after the issue is resolved. Use fallback outcomes only when the game rules explicitly define them.

## Current question

### Q-540 — Planning-contract reconciliation

The audit identified accepted decisions that are not yet reflected in the older implementation contracts: the universal 0–100 rating scale, removal of `ersManagement`, circuit-wide launch weather, shared ruleset authority, weekend settlement, persistent world and narrative state, and the official result handoff.

**Question:** Should we reconcile `DATA_SCHEMA.md`, `RACE_SIMULATION_CONTRACT.md`, `WEATHER_SIMULATION_CONTRACT.md`, and `DATABASE_PERSISTENCE_CONTRACT.md` with the locked decisions before implementing additional game UI or simulation systems?

**Recommendation:** Yes. Make one documentation pass first, explicitly marking superseded sections and updating the contracts to the locked 0–100 scale, launch boundaries, authoritative handoffs, persistence requirements, and transition behavior. Then use those reconciled contracts as the implementation baseline.

### D-543 — Planning-contract reconciliation

**Decision:** The planning contracts will be reconciled with the locked game-design decisions before additional UI or simulation implementation. Superseded sections will be marked, and the contracts will be updated for the universal 0–100 scale, ERS attribute model, launch weather boundary, shared ruleset authority, official result handoff, weekend settlement, persistent world state, and fail-closed transitions.

**Rationale:** Implementation should follow one consistent set of current contracts rather than stale assumptions from earlier prototypes.

**Consequence:** The next work item is a documentation-only reconciliation pass across the schema, race, weather, and persistence contracts. No new gameplay scope is introduced by this pass.

## Cross-system audit complete

The five groups are now integrated around shared rating semantics, one season ruleset, one calendar authority, one race-result handoff, one weekend settlement, persistent save state, player-approved recommendations, and explicit failure behavior. Remaining work is contract reconciliation and later implementation validation, not additional subsystem definition.
