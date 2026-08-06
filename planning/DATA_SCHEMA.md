# Data Schema — Fifth Pass (Entity Model for Race Sim)

**Status:** Freeze candidate — persistence/DDL contract accepted\
**Supersedes:** All prior passes (this document is **self-contained**)\
**Spelling:** British **tyre** in all persisted names\
**Time:** IANA timezones on circuits; all persisted datetimes are **UTC**\
**Scale:** Personnel abilities, traits, relationships, and player-facing capability ratings use **0–100**. CA/PA are **derived** from current abilities + latent ceilings.\
**Design baseline:** Reconciled with `GAME_DESIGN_DECISIONS.md` through D-543. Earlier 1–20 personnel-rating references are superseded.\
**JSON policy:** Typed JSON is allowed only for map/geometry, immutable versioned rules, and atomic schema-versioned simulation payloads whose internal shape is consumed as one value (part performance, safety-car/weather state, sector timing, penalties, damage effects). Every JSON column has an adjacent or explicitly shared schema version. Everything else is relational.\
**Enums:** lowercase `snake_case` (`dns`, `dnf`, `dsq`, …)

---

## 0. Separation rules

| Concern                                      | Lives on                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Save identity / versions / world clock / RNG | `SaveGame`, `SaveMigrationHistory`                                         |
| Series regulations                           | `ChampionshipSeasonRuleset` + `RulesetPartCategoryRule`                    |
| Weekend shape (immutable)                    | `WeekendFormatTemplate` + `WeekendFormatSessionSlot`                       |
| Instantiated sessions (authoritative)        | `EventSessionDefinition` → `WeekendSession`                                |
| Physical tub                                 | `ChassisInstance` (`chassisDesignVersionId`)                               |
| Bolt-on hardware                             | `PartInstance` / `PartInstallation` (no chassis slot)                      |
| Season participation                         | `TeamSeasonEntry` + `SeatAssignment`                                       |
| Weekend binding                              | `EventEntry`                                                               |
| Per-session grid / start / live link         | `SessionEntry`                                                             |
| Final session classification (authoritative) | `SessionResult` (practice, qualifying, sprint, feature, race)              |
| Race-only result details                     | `RaceResultDetail`                                                         |
| Setup                                        | `CarSetup`                                                                 |
| Resume                                       | Latest `SessionCheckpoint` + `SessionCarCheckpoint` only (one transaction) |
| Compact session history                      | `SessionEvent` (filtered player-visible events only)                       |
| Telemetry retention                          | `SessionTelemetryArchive` metadata; payload is outside the primary save    |
| Tyres                                        | `TyreCompound` → `TyreCompoundSpec`; sets / usage / stints                 |
| Circuit geography                            | `Circuit` + `CircuitLayoutVersion`                                         |
| Career history                               | Effective-dated contracts, assignments, license awards; result tables      |
| Weekend settlement                           | Management-layer official weekend-result package and idempotent settlement |
| Current championship standings               | `Championship*Standing` + finish-count rows                                |
| World and narrative state                    | Persistent management-layer entities and history inside the save           |

---

## 1. Save & versioning

### 1.1 SaveGame

| Attribute            | Type         | Notes                                     |
| -------------------- | ------------ | ----------------------------------------- |
| `id`                 | ID           |                                           |
| `displayName`        | string       |                                           |
| `schemaVersion`      | int          | DB/migration generation                   |
| `gameVersion`        | string       | App/sim build                             |
| `contentDataVersion` | string       | Seed/content pack                         |
| `worldDate`          | date         | Current in-game calendar day              |
| `rngAlgorithm`       | string       | e.g. `xoshiro256ss`                       |
| `rngState`           | blob         | Global save RNG when not inside a session |
| `createdAt`          | datetime UTC |                                           |
| `updatedAt`          | datetime UTC |                                           |

### 1.2 SaveMigrationHistory

| Attribute           | Type         | Notes |
| ------------------- | ------------ | ----- |
| `id`                | ID           |       |
| `saveId`            | ID           |       |
| `fromSchemaVersion` | int          |       |
| `toSchemaVersion`   | int          |       |
| `appliedAt`         | datetime UTC |       |
| `notes`             | string?      |       |

### 1.3 Save storage topology (locked)

- Each user save is one self-contained SQLite database file.
- `SaveGame` is a singleton metadata row in that file; world-owned tables do **not** carry `saveId`.
- Seeded championships, rules, templates, points systems, tyre specifications, and other content definitions are copied into the save at creation and pinned by `contentDataVersion`.
- Later content-pack changes do not mutate existing saves; migrations must update the copied data explicitly when required.
- The application-level save picker/catalog lives outside the save database and stores only file metadata needed to discover and open saves.

### 1.4 CalendarTransition

Calendar transitions are the idempotency and failure boundary for serialized world-time changes.
The first implementation supports one-day transitions and records blocked attempts without changing
`SaveGame.worldDate`.

| Attribute        | Type     | Notes                                                |
| ---------------- | -------- | ---------------------------------------------------- |
| `id`             | ID       | Deterministic transition identity                    |
| `transitionKind` | enum     | `day` \| `weekend_settlement` at launch              |
| `fromWorldDate`  | date     | Expected committed source date                       |
| `toWorldDate`    | date     | Candidate next date                                  |
| `status`         | enum     | `blocked` \| `committed`                             |
| `blockCode`      | enum?    | Weekend, season-transition, or future domain blocker |
| `blockReason`    | string?  | Player-facing recovery context                       |
| `createdAt`      | datetime | First attempt                                        |
| `updatedAt`      | datetime | Last attempt                                         |
| `completedAt`    | datetime | Set only after `SaveGame.worldDate` commits          |

Unique on `(transitionKind, fromWorldDate, toWorldDate)`. A replay of a committed transition is
idempotent; a blocked transition may be retried after its blocker is resolved.

### 1.5 DailyPhaseExecution

Daily phases are persisted inside the same transaction as the day transition. Maintenance applies
passive driver recovery and injury countdowns, and records effective-date contract and seat changes
for later recommendation/inbox consumers.

| Attribute             | Type       | Notes                                                                 |
| --------------------- | ---------- | --------------------------------------------------------------------- |
| `id`                  | ID         | Deterministic save/date/phase key                                     |
| `worldDate`           | date       | Date being resolved                                                   |
| `phase`               | enum       | `maintenance`, `research_development`, `finance`, `ai_world`, `inbox` |
| `status`              | enum       | `completed`                                                           |
| `resultPayload`       | typed JSON | Phase result summary                                                  |
| `resultSchemaVersion` | string     | Phase-specific schema version                                         |
| `createdAt`           | datetime   | First execution                                                       |
| `completedAt`         | datetime   | Successful phase completion                                           |

Unique on `(worldDate, phase)`. A committed calendar transition cannot exist without its completed
daily phase.

### 1.6 FinanceAccount and FinanceTransaction

Each team-season entry receives one finance account when a save is created or opened. The account
stores the current non-negative balance; every change is an immutable signed transaction with a
unique idempotency key and the resulting balance snapshot.

| Attribute                      | Type            | Notes                                      |
| ------------------------------ | --------------- | ------------------------------------------ |
| `FinanceAccount.id`            | ID              | Deterministic team-season finance identity |
| `teamSeasonEntryId`            | ID              | FK → `TeamSeasonEntry`, unique             |
| `currencyCode`                 | string          | Explicit account currency                  |
| `openingBalanceMinor`          | money           | Initial account balance                    |
| `currentBalanceMinor`          | money           | Non-negative current balance               |
| `budgetCapMinor`               | money           | Team budget reference                      |
| `createdAt` / `updatedAt`      | datetime        | UTC audit timestamps                       |
| `FinanceTransaction.id`        | ID              | Immutable ledger row                       |
| `accountId`                    | ID              | FK → `FinanceAccount`                      |
| `worldDate` / `postedAt`       | date / datetime | In-game date and UTC posting time          |
| `transactionType` / `category` | enum / string   | Income, expense, opening balance, etc.     |
| `amountMinor`                  | money           | Signed; non-zero                           |
| `sourceType` / `sourceId`      | enum / ID?      | Originating system and entity              |
| `idempotencyKey`               | string          | Unique replay protection                   |
| `description`                  | string          | Audit/read-model text                      |
| `balanceAfterMinor`            | money           | Non-negative post-transaction balance      |

Daily finance is part of the serialized calendar transaction. It currently posts recurring supplier
and active driver-contract charges plus R&D stage/completion costs. Weekend prize, sponsor, and
settlement-linked entries remain future finance inputs rather than invented defaults.

### 1.7 AITeamProfile and AIWorldDecision

Every team-season entry receives a deterministic AI identity. The profile describes strategic
priorities and behavioral tendencies; it is not an omniscient player-facing scouting result. The
daily AI world phase evaluates the profile against current team state and records one summarized
decision per team and world date. The bounded action resolver may start deterministic rival R&D
projects when the team can preserve its cash reserve; supplier and personnel decisions remain
deferred intents, and player-controlled decisions are never altered automatically.

| Attribute                         | Type      | Notes                                      |
| --------------------------------- | --------- | ------------------------------------------ |
| `AITeamProfile.id`                | ID        | Deterministic profile identity             |
| `teamSeasonEntryId`               | ID        | FK → `TeamSeasonEntry`, unique             |
| `archetype`                       | enum      | Stable strategic identity                  |
| `developmentPriority`             | enum      | Preferred car category                     |
| `driverStrategy`                  | enum      | Talent, stability, experience, or balanced |
| `supplierStrategy`                | enum      | Parity, value, or independence             |
| `riskTolerance`                   | 0–100     | Decision tendency                          |
| `spendingDiscipline`              | 0–100     | Reserve-preservation tendency              |
| `talentFocus`                     | 0–100     | Personnel-development tendency             |
| `createdAt` / `updatedAt`         | datetime  | UTC audit timestamps                       |
| `AIWorldDecision.id`              | ID        | Save/date/team deterministic identity      |
| `teamSeasonEntryId` / `worldDate` | ID / date | One decision summary per team/date         |
| `decisionType`                    | enum      | Cash, development, supplier, or planning   |
| `priority`                        | 0–100     | Relative urgency                           |
| `reasonCode` / `summary`          | string    | Deterministic explanation                  |
| `createdAt`                       | datetime  | UTC audit timestamp                        |

### 1.8 AIWorldAction

AI actions are persisted separately from decisions so the world can distinguish intent from a
bounded result. Rival teams may start deterministic R&D projects when funding and state allow it;
supplier and personnel actions remain deferred until their market systems are implemented. The
player team is excluded from automatic AI actions.

| Attribute                | Type     | Notes                                  |
| ------------------------ | -------- | -------------------------------------- |
| `id`                     | ID       | Deterministic decision action identity |
| `decisionId`             | ID       | FK → `AIWorldDecision`, unique         |
| `teamSeasonEntryId`      | ID       | Rival team-season owner                |
| `worldDate`              | date     | Date the action resolved               |
| `actionType`             | enum     | Decision type being resolved           |
| `status`                 | enum     | Applied, deferred, or skipped          |
| `reasonCode` / `summary` | string   | Deterministic outcome explanation      |
| `developmentProjectId`   | ID?      | FK → `DevelopmentProject` when started |
| `createdAt`              | datetime | UTC audit timestamp                    |

### 1.9 InboxMessage

Inbox messages are player-facing, persisted summaries generated after the AI/world phase. They are
prioritized and source-linked, but do not apply management actions automatically. Blocking messages
must also require a decision; ordinary world updates remain non-blocking and can be reviewed later.

| Attribute                 | Type       | Notes                                         |
| ------------------------- | ---------- | --------------------------------------------- |
| `id`                      | ID         | Deterministic save/date/source identity       |
| `worldDate`               | date       | Date that produced the message                |
| `category`                | enum       | World, development, or finance                |
| `severity`                | enum       | Informational, actionable, urgent, blocking   |
| `status`                  | enum       | Unread, read, deferred, resolved, or archived |
| `priority`                | 0–100      | Queue ordering                                |
| `title` / `body`          | string     | Rendered summary text                         |
| `sourceType` / `sourceId` | string/ID? | Originating system and entity                 |
| `dedupeKey`               | string     | Unique daily generation key                   |
| `requiresDecision`        | bool       | Whether player action is required             |
| `isBlocking`              | bool       | Whether unresolved state can pause time       |
| `deadlineWorldDate`       | date?      | Optional consequence deadline                 |
| `deferredUntilWorldDate`  | date?      | Optional future reappearance date             |
| `createdAt` / `readAt`    | datetime   | UTC audit and read timestamps                 |
| `resolvedAt`              | datetime   | Action completion timestamp                   |

### 1.10 InboxMessageAction

Every inbox mutation is an immutable action record. The message row stores current lifecycle state;
the action history preserves the player’s decisions and makes retries safe through a unique
idempotency key. Blocking messages may be read, but must be resolved before calendar advancement.

| Attribute                       | Type     | Notes                            |
| ------------------------------- | -------- | -------------------------------- |
| `id`                            | ID       | Deterministic action identity    |
| `inboxMessageId`                | ID       | FK → `InboxMessage`              |
| `actionType`                    | enum     | Read, defer, resolve, or archive |
| `previousStatus` / `nextStatus` | enum     | Lifecycle transition             |
| `deferredUntilWorldDate`        | date?    | Set for defer actions            |
| `actionWorldDate`               | date     | In-game date of the action       |
| `note`                          | string?  | Optional player context          |
| `idempotencyKey`                | string   | Unique retry protection          |
| `createdAt`                     | datetime | UTC audit timestamp              |

---

## 2. Championship & rules

### 2.1 Championship

| Attribute     | Type   | Notes                                                     |
| ------------- | ------ | --------------------------------------------------------- |
| `id`          | ID     |                                                           |
| `code`        | string | Persisted code: `apex` \| `challenger` \| `academy`       |
| `displayName` | string | Approved player-facing championship name                  |
| `ladderRank`  | int    | Display order only; never for capability/eligibility math |

Approved championship display names:

| Persisted code | Player-facing name                 | Short code |
| -------------- | ---------------------------------- | ---------- |
| `apex`         | World Formula Championship         | `WFC`      |
| `challenger`   | International Formula Championship | `IFC`      |
| `academy`      | Formula Development Championship   | `FDC`      |

### 2.2 ChampionshipSeason

| Attribute        | Type | Notes                            |
| ---------------- | ---- | -------------------------------- |
| `id`             | ID   |                                  |
| `championshipId` | ID   |                                  |
| `seasonYear`     | int  |                                  |
| `rulesetId`      | ID   | FK → `ChampionshipSeasonRuleset` |

### 2.3 ChampionshipSeasonRuleset

| Attribute                       | Type       | Notes                                                                    |
| ------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `id`                            | ID         |                                                                          |
| `entriesPerTeam`                | int        | Race seats entered (2 for the launch FDC field)                          |
| `weekendFormatTemplateId`       | ID         |                                                                          |
| `refuelingEnabled`              | bool       |                                                                          |
| `ersEnabled`                    | bool       |                                                                          |
| `drsEnabled`                    | bool       |                                                                          |
| `constructorConversionAllowed`  | bool       |                                                                          |
| `supplyContractTiersAllowed`    | enum[]     | `factory_parity`, `customer_spec`                                        |
| `ageCapMax`                     | int?       | Seasonal; null = none                                                    |
| `personnelLimitsPayload`        | typed JSON | Immutable versioned rules payload                                        |
| `personnelLimitsSchemaVersion`  | string     |                                                                          |
| `testingLimitsPayload`          | typed JSON | Immutable versioned rules payload                                        |
| `testingLimitsSchemaVersion`    | string     |                                                                          |
| `raceDistanceRulePayload`       | typed JSON | How sessions resolve laps/time                                           |
| `raceDistanceRuleSchemaVersion` | string     |                                                                          |
| `gridPolicyPayload`             | typed JSON | Regulation-defined qualifying absence, grid source, and opening fallback |
| `gridPolicySchemaVersion`       | string     |                                                                          |

Part procurement/upgrade → `RulesetPartCategoryRule` only.

### 2.3.1 RulesetSupplyContractTier

Relational membership rows for the `supplyContractTiersAllowed` set; this is not stored as JSON.

| Attribute   | Type | Notes                               |
| ----------- | ---- | ----------------------------------- |
| `rulesetId` | ID   | FK → `ChampionshipSeasonRuleset`    |
| `tier`      | enum | `factory_parity` \| `customer_spec` |

Unique on `(rulesetId, tier)`.

### 2.4 RulesetPartCategoryRule

Allows **World Formula Championship factory and customer teams** to differ on the same category.

| Attribute           | Type | Notes                                                  |
| ------------------- | ---- | ------------------------------------------------------ |
| `id`                | ID   |                                                        |
| `rulesetId`         | ID   |                                                        |
| `partCategory`      | enum | Installable categories + `chassis` design rules        |
| `participantStatus` | enum | `junior` \| `customer` \| `factory_constructor`        |
| `procurementMode`   | enum | `league_spec` \| `team_developed` \| `customer_supply` |
| `upgradeMode`       | enum | `locked` \| `reliability_only` \| `unrestricted`       |

Unique on `(rulesetId, partCategory, participantStatus)`.

### 2.5 WeekendFormatTemplate (immutable)

| Attribute     | Type   | Notes                                     |
| ------------- | ------ | ----------------------------------------- |
| `id`          | ID     |                                           |
| `code`        | string | e.g. `challenger_sprint_feature`          |
| `version`     | int    | Bump on any change; old versions retained |
| `displayName` | string |                                           |

Session-specific rules live on **slots**, not the template header.

### 2.6 WeekendFormatSessionSlot (immutable)

| Attribute                 | Type | Notes                                                                           |
| ------------------------- | ---- | ------------------------------------------------------------------------------- |
| `id`                      | ID   |                                                                                 |
| `templateId`              | ID   |                                                                                 |
| `sequence`                | int  | Order within weekend                                                            |
| `sessionKind`             | enum | `fp1` \| `fp2` \| `fp3` \| `qualifying` \| `sprint` \| `feature` \| `race` \| … |
| `targetLaps`              | int? |                                                                                 |
| `targetMinutes`           | int? |                                                                                 |
| `isScored`                | bool |                                                                                 |
| `gridSourceSlotId`        | ID?  | FK to another slot in same template (safer than kind matching)                  |
| `reverseGridCount`        | int  | 0 = none; applies to **this** session’s grid build                              |
| `mandatoryPitStops`       | int  |                                                                                 |
| `requiredCompoundRuleId`  | ID?  | FK → `RequiredCompoundRule`                                                     |
| `pointsSystemId`          | ID?  | Null if unscored                                                                |
| `fastestLapPointEligible` | bool |                                                                                 |
| `parcFermeFromPrevious`   | bool |                                                                                 |

### 2.7 RequiredCompoundRule (immutable)

| Attribute              | Type       | Notes                                  |
| ---------------------- | ---------- | -------------------------------------- |
| `id`                   | ID         |                                        |
| `code`                 | string     |                                        |
| `version`              | int        |                                        |
| `payload`              | typed JSON | e.g. must use N distinct dry compounds |
| `payloadSchemaVersion` | string     |                                        |

### 2.8 PointsSystem (immutable, versioned)

| Attribute                           | Type    | Notes                                                     |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `id`                                | ID      |                                                           |
| `code`                              | string  |                                                           |
| `version`                           | int     |                                                           |
| `polePoints`                        | number  | 0 if none                                                 |
| `fastestLapPoints`                  | number  |                                                           |
| `fastestLapMinFinishPosition`       | int?    | e.g. must finish top 10; null = no gate                   |
| `fastestLapRequiresClassified`      | bool    |                                                           |
| `shortenedRaceAllocationMode`       | enum    | `full` \| `half_if_below_pct` \| `none_if_below_pct` \| … |
| `shortenedRaceDistancePctThreshold` | number? | e.g. 75                                                   |
| `classificationRequirePctDistance`  | number? | Min % race distance to score                              |
| `notes`                             | string? |                                                           |

### 2.9 PointsSystemPlacePoint

| Attribute        | Type   | Notes |
| ---------------- | ------ | ----- |
| `pointsSystemId` | ID     |       |
| `position`       | int    |       |
| `points`         | number |       |

---

## 3. People, teams & drivers

### 3.0 Nationality

| Attribute     | Type   | Notes               |
| ------------- | ------ | ------------------- |
| `id`          | ID     |                     |
| `code`        | string | Stable content code |
| `displayName` | string |                     |

### 3.0.1 Team identity

Team identity is persisted here so season entries, contracts, suppliers, and event entries have
relational owners. Staff, facilities, and organization detail remain management-layer contracts.

| Attribute       | Type         | Notes               |
| --------------- | ------------ | ------------------- |
| `id`            | ID           |                     |
| `code`          | string       | Stable content code |
| `name`          | string       |                     |
| `shortName`     | string       |                     |
| `nationalityId` | ID?          | FK → `Nationality`  |
| `createdAt`     | datetime UTC |                     |

### 3.1 Driver

| Attribute                           | Type    | Notes                                                                                                                                                                         |
| ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | ID      |                                                                                                                                                                               |
| `firstName`                         | string  |                                                                                                                                                                               |
| `lastName`                          | string  |                                                                                                                                                                               |
| `displayName`                       | string? |                                                                                                                                                                               |
| `dateOfBirth`                       | date    |                                                                                                                                                                               |
| `nationalityId`                     | ID      |                                                                                                                                                                               |
| `portraitId`                        | string  |                                                                                                                                                                               |
| `biographySeed`                     | string  |                                                                                                                                                                               |
| `preferredNumber`                   | int?    |                                                                                                                                                                               |
| `careerStartYear`                   | int     |                                                                                                                                                                               |
| `retiredAt`                         | date?   | Null = not retired                                                                                                                                                            |
| `reputation`                        | 0–100   |                                                                                                                                                                               |
| `ambition`                          | 0–100   |                                                                                                                                                                               |
| `loyalty`                           | 0–100   |                                                                                                                                                                               |
| `temperament`                       | 0–100   |                                                                                                                                                                               |
| `leadership`                        | 0–100   |                                                                                                                                                                               |
| `mediaHandling`                     | 0–100   |                                                                                                                                                                               |
| `developmentRate`                   | 0–100   |                                                                                                                                                                               |
| `peakAgeStart`                      | int     |                                                                                                                                                                               |
| `peakAgeEnd`                        | int     |                                                                                                                                                                               |
| `declineRate`                       | 0–100   |                                                                                                                                                                               |
| **Current abilities (0–100)**       |         | `pace`, `raceCraft`, `consistency`, `tyreManagement`, `fuelManagement`, `wetPace`, `qualifyingPace`, `starts`, `focus`, `feedback`, `adaptability`, `aggression`, `composure` |
| **Latent ceilings (0–100, hidden)** |         | `pacePotential`, `raceCraftPotential`, … (one per ability)                                                                                                                    |

**Derived (not authoritative columns):** `currentAbility`, `potentialAbility` rollups.
**Eligibility:** derive from `LicensePointAward` history, age vs ruleset `ageCapMax`, and championship rules — **do not** store `highestEligibleChampionshipId`.

### 3.2 LicensePointAward (effective-dated)

| Attribute    | Type   | Notes                                                 |
| ------------ | ------ | ----------------------------------------------------- |
| `id`         | ID     |                                                       |
| `driverId`   | ID     |                                                       |
| `points`     | number |                                                       |
| `sourceType` | enum   | `session_result` \| `championship` \| `wildcard` \| … |
| `sourceId`   | ID?    |                                                       |
| `awardedAt`  | date   |                                                       |
| `expiresAt`  | date?  | Null = never; supports expiry windows                 |

Current license total = sum of non-expired awards as of `worldDate`.

### 3.3 DriverHealth

| Attribute             | Type  | Notes                                    |
| --------------------- | ----- | ---------------------------------------- |
| `driverId`            | ID    | PK/FK                                    |
| `injurySeverity`      | enum  | `healthy` \| `minor` \| `major` \| `out` |
| `injuryDaysRemaining` | int   |                                          |
| `fatigue`             | 0–100 |                                          |
| `morale`              | 0–100 |                                          |
| `form`                | int   | **-10…+10**                              |

### 3.4 DriverActivity

Derived from `retiredAt`, open `SeatAssignment`, health, off-screen contracts. Optional query cache only — not source of truth.

### 3.5 DriverContract (effective-dated)

| Attribute            | Type  | Notes                            |
| -------------------- | ----- | -------------------------------- |
| `id`                 | ID    |                                  |
| `driverId`           | ID    |                                  |
| `teamId`             | ID?   | Null when virtual off-screen org |
| `offScreenSeriesId`  | ID?   |                                  |
| `isVirtualOffScreen` | bool  |                                  |
| `wagePerYear`        | money |                                  |
| `signingBonus`       | money |                                  |
| `breakClauseFee`     | money |                                  |
| `startDate`          | date  |                                  |
| `endDate`            | date  |                                  |
| `terminatedDate`     | date? |                                  |

### 3.6 DriverContractBonus

| Attribute    | Type    | Notes                                                            |
| ------------ | ------- | ---------------------------------------------------------------- |
| `id`         | ID      |                                                                  |
| `contractId` | ID      |                                                                  |
| `bonusKind`  | enum    | `race_win` \| `podium` \| `points_finish` \| `championship` \| … |
| `threshold`  | number? |                                                                  |
| `amount`     | money   |                                                                  |

### 3.7 SeatAssignment (effective-dated)

| Attribute           | Type  | Notes                                                               |
| ------------------- | ----- | ------------------------------------------------------------------- |
| `id`                | ID    |                                                                     |
| `driverId`          | ID    |                                                                     |
| `teamSeasonEntryId` | ID    | **Required**                                                        |
| `seatRole`          | enum  | `race_1` \| `race_2` \| `race_3` \| `reserve` \| `test`             |
| `carNumber`         | int?  | Season default; weekend confirms on `EventEntry`                    |
| `startDate`         | date  |                                                                     |
| `endDate`           | date? | Null = current                                                      |
| `reason`            | enum  | `signed` \| `loan` \| `injury_sub` \| `demotion` \| `released` \| … |

No `teamId` / `championshipSeasonId` / `chassisInstanceId` (derive or bind elsewhere).

### 3.8 DriverRelationship

| Attribute       | Type  | Notes                    |
| --------------- | ----- | ------------------------ |
| `id`            | ID    |                          |
| `driverId`      | ID    |                          |
| `otherDriverId` | ID    |                          |
| `kind`          | enum  | `rival` \| `mentor` \| … |
| `strength`      | 0–100 |                          |

### 3.9 DriverChampionshipExperience

| Attribute          | Type | Notes |
| ------------------ | ---- | ----- |
| `driverId`         | ID   |       |
| `championshipId`   | ID   |       |
| `starts`           | int  |       |
| `wins`             | int  |       |
| `poles`            | int  |       |
| `podiums`          | int  |       |
| `points`           | int  |       |
| `dnfs`             | int  |       |
| `championshipsWon` | int  |       |

### 3.10 ScoutingReport

| Attribute         | Type    | Notes                  |
| ----------------- | ------- | ---------------------- |
| `id`              | ID      |                        |
| `observerTeamId`  | ID      | Required               |
| `subjectDriverId` | ID      |                        |
| `scoutedCA`       | number? | Estimate of derived CA |
| `scoutedPA`       | number? | Estimate of derived PA |
| `lastScoutedAt`   | date    |                        |

### 3.11 ScoutingAttributeKnowledge

| Attribute        | Type   | Notes                               |
| ---------------- | ------ | ----------------------------------- |
| `reportId`       | ID     |                                     |
| `attributeKey`   | string | Current ability or `*Potential` key |
| `estimatedValue` | number |                                     |
| `confidence`     | 0–100  |                                     |

---

## 4. Hardware, supply, entries

### 4.1 TeamSeasonEntry

| Attribute              | Type    | Notes                                           |
| ---------------------- | ------- | ----------------------------------------------- |
| `id`                   | ID      |                                                 |
| `teamId`               | ID      |                                                 |
| `championshipSeasonId` | ID      |                                                 |
| `constructorStatus`    | enum    | `junior` \| `customer` \| `factory_constructor` |
| `entryName`            | string? |                                                 |

Maps to `RulesetPartCategoryRule.participantStatus` (`junior` for Formula Development Championship /
International Formula Championship non-constructor paths).

### 4.2 SupplyContract

| Attribute                   | Type  | Notes                               |
| --------------------------- | ----- | ----------------------------------- |
| `id`                        | ID    |                                     |
| `customerTeamSeasonEntryId` | ID    |                                     |
| `supplierTeamId`            | ID    |                                     |
| `partCategory`              | enum  |                                     |
| `contractTier`              | enum  | `factory_parity` \| `customer_spec` |
| `startDate`                 | date  |                                     |
| `endDate`                   | date  |                                     |
| `pricePerSeason`            | money |                                     |
| `upgradeDelayDays`          | int   |                                     |

### 4.3 PartDesignVersion (immutable design)

| Attribute                         | Type       | Notes                                                                                                                                    |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                              | ID         |                                                                                                                                          |
| `category`                        | enum       | `chassis` \| `powerUnit` \| `gearbox` \| `frontWing` \| `rearWing` \| `floor` \| `sidepods` \| `suspension` \| `brakes` \| `electronics` |
| `name`                            | string     |                                                                                                                                          |
| `origin`                          | enum       | `league_spec` \| `team_developed` \| `supplier`                                                                                          |
| `designerTeamId`                  | ID?        |                                                                                                                                          |
| `designYear`                      | int        |                                                                                                                                          |
| `version`                         | int        |                                                                                                                                          |
| `performancePayload`              | typed JSON | Versioned combiner inputs                                                                                                                |
| `performancePayloadSchemaVersion` | string     |                                                                                                                                          |
| `baseReliability`                 | 0–100      |                                                                                                                                          |
| `weightKg`                        | number     |                                                                                                                                          |
| `formulaVersion`                  | string     |                                                                                                                                          |

Legality computed against ruleset + participant status; never a global `isLegal` flag.

**R&D rule:** any performance or base-reliability change creates a new immutable `PartDesignVersion`. Teams manufacture `PartInstance` rows from an exact design version; manufactured instances do not gain independent performance levels. `RulesetPartCategoryRule.upgradeMode` controls which new design projects are permitted.

### 4.3.1 DevelopmentProject

`DevelopmentProject` is the authoritative management-layer lifecycle for a team-owned design
change. A project may have one active project per team-season entry and part category at a time.
Its performance deltas use dotted paths into the existing performance payload, so a project can
improve one sub-item while reducing another. Costs are stored in minor currency units and are
posted to the team finance ledger as each stage completes and when manufacturing completes.

| Attribute                                 | Type       | Notes                                               |
| ----------------------------------------- | ---------- | --------------------------------------------------- |
| `id`                                      | ID         |                                                     |
| `teamSeasonEntryId`                       | ID         | FK → `TeamSeasonEntry`                              |
| `partCategory`                            | enum       | Category being developed                            |
| `projectKind`                             | enum       | `upgrade` \| `new_design`                           |
| `status`                                  | enum       | `active` \| `completed` \| `cancelled`              |
| `currentStage`                            | enum       | Fixed four-stage lifecycle or `completed`           |
| `baseDesignVersionId`                     | ID?        | Required for an `upgrade`; FK → `PartDesignVersion` |
| `performanceDeltaPayload`                 | typed JSON | Dotted sub-item deltas                              |
| `reliabilityDeltaPayload`                 | typed JSON | Reliability delta                                   |
| `totalCostMinor` / `spentCostMinor`       | money      | Planned and applied project cost                    |
| `startWorldDate` / `completedWorldDate`   | date?      | In-game lifecycle dates                             |
| `startedAt` / `updatedAt` / `completedAt` | datetime   | UTC audit timestamps                                |

### 4.3.2 DevelopmentProjectStage

Every project has exactly four ordered stages: `concept_design`, `cfd`, `wind_tunnel`, and
`manufacturing`. Each stage owns its duration, cost, remaining days, state, and effective dates.
Completing a stage activates the next stage; the next stage does not consume time until the next
daily tick.

### 4.3.3 DevelopmentProjectResult

Completion creates one immutable `PartDesignVersion` and exactly one physical output. Non-chassis
categories create a `PartInstance`; `chassis` creates a `ChassisInstance`. The result row links the
project, design, manufactured asset, and UTC manufacturing timestamp, with a database check that
exactly one physical asset is present.

### 4.4 ChassisInstance

| Attribute                | Type   | Notes                                                              |
| ------------------------ | ------ | ------------------------------------------------------------------ |
| `id`                     | ID     | One **physical** chassis (spares / mid-season replacement allowed) |
| `teamId`                 | ID     |                                                                    |
| `chassisDesignVersionId` | ID     | FK → `PartDesignVersion` (`category = chassis`)                    |
| `homologationYear`       | int    |                                                                    |
| `chassisCode`            | string |                                                                    |
| `overallCondition`       | 0–100  |                                                                    |
| `totalMileageKm`         | number |                                                                    |

Chassis is **not** installed via `PartInstallation`.

### 4.5 PartInstance

| Attribute         | Type   | Notes |
| ----------------- | ------ | ----- |
| `id`              | ID     |       |
| `designVersionId` | ID     |       |
| `ownerTeamId`     | ID     |       |
| `condition`       | 0–100  |       |
| `mileageKm`       | number |       |
| `manufactureDate` | date   |       |

Maintenance and session damage change instance condition; they never change the design performance represented by `designVersionId`.

### 4.6 PartInstallation (effective-dated)

| Attribute           | Type          | Notes                           |
| ------------------- | ------------- | ------------------------------- |
| `id`                | ID            |                                 |
| `chassisInstanceId` | ID            |                                 |
| `partInstanceId`    | ID            |                                 |
| `slot`              | enum          | Installable only (no `chassis`) |
| `installedAt`       | datetime UTC  |                                 |
| `removedAt`         | datetime UTC? |                                 |

### 4.7 EventEntry

| Attribute                    | Type | Notes                     |
| ---------------------------- | ---- | ------------------------- |
| `id`                         | ID   |                           |
| `championshipEventId`        | ID   |                           |
| `teamSeasonEntryId`          | ID   |                           |
| `chassisInstanceId`          | ID   |                           |
| `driverId`                   | ID   |                           |
| `carNumber`                  | int  |                           |
| `baselineResolvedSnapshotId` | ID?  | Optional weekend baseline |

### 4.8 SessionEntry

Live/session participation link — **not** authoritative final classification.

| Attribute                       | Type | Notes                                       |
| ------------------------------- | ---- | ------------------------------------------- |
| `id`                            | ID   |                                             |
| `weekendSessionId`              | ID   |                                             |
| `eventEntryId`                  | ID   |                                             |
| `gridSlot`                      | int? |                                             |
| `startStatus`                   | enum | `started` \| `dns` \| `pit_lane_start` \| … |
| `resolvedPerformanceSnapshotId` | ID   |                                             |

No `pointsSystemId` here (belongs on `EventSessionDefinition`). No final classification fields here.

### 4.9 SessionResult (authoritative classification)

Written when any practice, qualifying, sprint, feature, or race session completes or is finalized. Grid construction reads the authoritative results of `EventSessionDefinition.gridSourceSessionDefinitionId`.

| Attribute                | Type         | Notes                                        |
| ------------------------ | ------------ | -------------------------------------------- |
| `id`                     | ID           |                                              |
| `sessionEntryId`         | ID           | Unique                                       |
| `weekendSessionId`       | ID           | Denormalized for queries                     |
| `classificationPosition` | int?         |                                              |
| `classificationStatus`   | enum         | `classified` \| `dnf` \| `dsq` \| `dns` \| … |
| `lapsCompleted`          | int          |                                              |
| `bestLapTimeMs`          | int?         | Practice/qualifying/race timing              |
| `bestLapNumber`          | int?         |                                              |
| `totalTimeMs`            | int?         |                                              |
| `gapToLeaderMs`          | int?         |                                              |
| `lapsBehind`             | int          | 0 when on the leader’s lap                   |
| `finalizedAt`            | datetime UTC |                                              |

### 4.10 SessionPointAward

Auditable scoring breakdown for any scored session. A session’s points total is derived from these rows.

| Attribute         | Type   | Notes                                          |
| ----------------- | ------ | ---------------------------------------------- |
| `id`              | ID     |                                                |
| `sessionResultId` | ID     |                                                |
| `pointsSystemId`  | ID     | Scoring provenance                             |
| `awardKind`       | enum   | `finish` \| `pole` \| `fastest_lap` \| `other` |
| `points`          | number |                                                |

### 4.11 RaceResultDetail

Optional one-to-one child of `SessionResult` for race-like sessions only.

| Attribute          | Type  | Notes                        |
| ------------------ | ----- | ---------------------------- |
| `sessionResultId`  | ID    | PK/FK                        |
| `pitStops`         | int   |                              |
| `lapsLed`          | int   |                              |
| `positionsGained`  | int   |                              |
| `retirementReason` | enum? | Null when running/classified |

### 4.12 ResolvedPerformanceSnapshot

| Attribute              | Type            | Notes                                   |
| ---------------------- | --------------- | --------------------------------------- |
| `id`                   | ID              | Immutable once written                  |
| `rulesetId`            | ID              |                                         |
| `formulaVersion`       | string          |                                         |
| `inputsHash`           | string          |                                         |
| `createdAt`            | datetime UTC    |                                         |
| `topSpeed`             | normalized mult | Baseline 1.0; clamp e.g. `[0.85, 1.15]` |
| `acceleration`         | normalized mult | Same clamp family                       |
| `corneringHigh`        | normalized mult |                                         |
| `corneringLow`         | normalized mult |                                         |
| `brakingStability`     | normalized mult |                                         |
| `drag`                 | normalized mult | Higher = more drag                      |
| `coolingEfficiency`    | normalized mult |                                         |
| `fuelEfficiency`       | normalized mult |                                         |
| `ersDeployPower`       | normalized mult | 0 / identity if `ersEnabled = false`    |
| `ersHarvestEfficiency` | normalized mult |                                         |
| `ersBatteryCapacity`   | normalized mult |                                         |
| `reliabilityOverall`   | int 0–100       |                                         |
| `dryWeightKg`          | number          | kg, 1 decimal, round half-even          |

### 4.13 CarSetup

| Attribute             | Type   | Notes                                     |
| --------------------- | ------ | ----------------------------------------- |
| `id`                  | ID     |                                           |
| `eventEntryId`        | ID     |                                           |
| `weekendSessionId`    | ID?    | Null = event default; parc fermé may lock |
| `frontWingAngle`      | number | Ranges defined in setup schema docs       |
| `rearWingAngle`       | number |                                           |
| `rideHeightFrontMm`   | number |                                           |
| `rideHeightRearMm`    | number |                                           |
| `suspensionStiffness` | number |                                           |
| `brakeBiasPercent`    | number |                                           |
| `diffCoast`           | number |                                           |
| `diffPower`           | number |                                           |
| `teamSetupKnowledge`  | 0–100  |                                           |

Hidden optima live in sim tables — not player-visible columns on this row.

### 4.14 SessionDamageComponent

| Attribute                         | Type       | Notes                                                       |
| --------------------------------- | ---------- | ----------------------------------------------------------- |
| `id`                              | ID         |                                                             |
| `sessionEntryId`                  | ID         |                                                             |
| `component`                       | enum       | `front_wing` \| `rear_wing` \| `floor` \| `power_unit` \| … |
| `severity`                        | 0–100      |                                                             |
| `performancePenaltyPayload`       | typed JSON |                                                             |
| `performancePenaltySchemaVersion` | string     |                                                             |

---

## 5. Session resume (latest checkpoint only)

One **authoritative simulation clock** and RNG live on `SessionCheckpoint`. Only the latest checkpoint is retained; checkpoint rollback/replay is out of scope. The checkpoint header, all car rows, mutable tyre-set state, active stint/usage state, and current damage rows are written in the **same SQLite transaction**.

### 5.1 SessionCheckpoint

| Attribute                     | Type         | Notes                                                                                   |
| ----------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `id`                          | ID           |                                                                                         |
| `weekendSessionId`            | ID           | Unique “current” checkpoint per session                                                 |
| `checkpointSeq`               | int          | Monotonic                                                                               |
| `simClockMs`                  | int          | **Authoritative** session clock                                                         |
| `rngAlgorithm`                | string       |                                                                                         |
| `rngState`                    | blob         | Session RNG (overrides save RNG while active)                                           |
| `phase`                       | enum         | `pre_start` \| `green` \| `safety_car` \| `vsc` \| `red_flag` \| `chequered` \| `ended` |
| `safetyCarStatePayload`       | typed JSON   | SC/VSC/red details                                                                      |
| `safetyCarStateSchemaVersion` | string       |                                                                                         |
| `weatherStatePayload`         | typed JSON   | Evolution state (not just current sample)                                               |
| `weatherStateSchemaVersion`   | string       |                                                                                         |
| `strategyStatePayload`        | typed JSON   | Live strategy/controller state required for deterministic resume                        |
| `strategyStateSchemaVersion`  | string       |                                                                                         |
| `resumeStatePayload`          | typed JSON   | Engine resume metadata: step, applied commands, pit state, and overtake cooldowns       |
| `resumeStateSchemaVersion`    | string       |                                                                                         |
| `leaderSessionEntryId`        | ID?          |                                                                                         |
| `checkpointedAt`              | datetime UTC | Last successful checkpoint write                                                        |

### 5.2 SessionCarCheckpoint

| Attribute                      | Type       | Notes                                                                        |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| `id`                           | ID         |                                                                              |
| `checkpointId`                 | ID         |                                                                              |
| `sessionEntryId`               | ID         |                                                                              |
| `currentLap`                   | int        |                                                                              |
| `sectorIndex`                  | int        |                                                                              |
| `waypointProgress`             | number     | 0–1 within sector/path                                                       |
| `racePosition`                 | int        |                                                                              |
| `gapToLeaderMs`                | int        |                                                                              |
| `intervalAheadMs`              | int        |                                                                              |
| `currentLapTimeMs`             | int        |                                                                              |
| `lastSectorTimeMs`             | int?       |                                                                              |
| `sectorTimesMsPayload`         | typed JSON | Completed sectors this lap                                                   |
| `sectorTimesSchemaVersion`     | string     |                                                                              |
| `pitPhase`                     | enum       | `on_track` \| `pit_entry` \| `pit_box` \| `pit_exit`                         |
| `pitPhaseElapsedMs`            | int        |                                                                              |
| `fuelKg`                       | number     |                                                                              |
| `mountedTyreSetId`             | ID?        |                                                                              |
| `ersChargePercent`             | 0–100      |                                                                              |
| `engineMode`                   | enum       |                                                                              |
| `pitStopsCompleted`            | int        |                                                                              |
| `penaltyPayload`               | typed JSON | Time penalties, warnings, drive-throughs                                     |
| `penaltySchemaVersion`         | string     |                                                                              |
| `simulationStatePayload`       | typed JSON | Complete engine state for this car, including tyre states and strategy modes |
| `simulationStateSchemaVersion` | string     |                                                                              |
| `retirementState`              | enum       | `running` \| `retired` \| `stopped`                                          |
| `retirementReason`             | enum?      | `mechanical` \| `crash` \| `disqualified` \| …                               |

### 5.3 SessionEvent

Compact, player-visible events are retained; segment-completion and lap-telemetry events are not
written to the primary save.

| Attribute                | Type       | Notes                                                                                                                    |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | ID         |                                                                                                                          |
| `weekendSessionId`       | ID         |                                                                                                                          |
| `sequence`               | int        | Monotonic within the session                                                                                             |
| `simulationTimeMs`       | int        | Engine simulation time                                                                                                   |
| `lap`                    | int        |                                                                                                                          |
| `segmentId`              | ID?        | Null for session-level events                                                                                            |
| `eventType`              | enum       | `pit` \| `overtake` \| `penalty` \| `incident` \| `drs_weather` \| `unsafe_conditions` \| `strategy_command` \| `finish` |
| `sessionEntryIdsPayload` | typed JSON | Ordered IDs involved in the event                                                                                        |
| `payload`                | typed JSON | Event-specific details                                                                                                   |
| `payloadSchemaVersion`   | string     |                                                                                                                          |

### 5.4 SessionTelemetryArchive

Optional metadata for compressed telemetry stored outside the primary save. The archive is disposable
and must never be required to resume or classify a session.

| Attribute          | Type          | Notes                                              |
| ------------------ | ------------- | -------------------------------------------------- |
| `id`               | ID            |                                                    |
| `weekendSessionId` | ID            | Unique per archive generation                      |
| `archivePath`      | string        | Path managed by the save service, not the renderer |
| `format`           | enum          | `jsonl_zstd` \| `json_gzip`                        |
| `schemaVersion`    | string        | Telemetry archive contract version                 |
| `sha256`           | string        | Integrity hash                                     |
| `byteLength`       | int           |                                                    |
| `createdAt`        | datetime UTC  |                                                    |
| `purgedAt`         | datetime UTC? | Null while retained                                |

On checkpoint:

1. Begin one SQLite transaction.
2. Insert the session’s stable `SessionCheckpoint` row on the first save, or update it in place and increment `checkpointSeq`.
3. Replace that checkpoint’s `SessionCarCheckpoint` child rows.
4. Persist current `TyreSet`, active `Stint`, `SessionTyreUsage`, and `SessionDamageComponent` state.
5. Ensure `WeekendSession.activeCheckpointId` points to the stable checkpoint row.
6. Commit all steps together; rollback preserves the previous complete checkpoint.

`SessionCarState` as a separate live table is **optional**; if used, it must mirror the latest checkpoint car row. Checkpoint tables are the source of truth for resume.

---

## 6. Tyres

### 6.1 TyreCompound (stable identity)

| Attribute     | Type   | Notes                                                   |
| ------------- | ------ | ------------------------------------------------------- |
| `id`          | ID     |                                                         |
| `code`        | string | `soft` \| `medium` \| `hard` \| `intermediate` \| `wet` |
| `displayName` | string |                                                         |

### 6.2 TyreCompoundSpec (immutable, versioned sim characteristics)

| Attribute             | Type   | Notes             |
| --------------------- | ------ | ----------------- |
| `id`                  | ID     |                   |
| `tyreCompoundId`      | ID     |                   |
| `version`             | int    |                   |
| `gripPeak`            | number | Normalized        |
| `degradationRate`     | number |                   |
| `warmUpLaps`          | number |                   |
| `operatingWindowMinC` | number |                   |
| `operatingWindowMaxC` | number |                   |
| `durability`          | number |                   |
| `wetnessCrossover`    | number | Dry↔wet behaviour |
| `isWet`               | bool   |                   |

### 6.3 EventTyreAllocation (entitlement)

| Attribute            | Type | Notes                                       |
| -------------------- | ---- | ------------------------------------------- |
| `id`                 | ID   |                                             |
| `eventEntryId`       | ID   |                                             |
| `tyreCompoundSpecId` | ID   | Applicable **spec**, not bare compound code |
| `setsEntitled`       | int  | Entitlement only — **not** issued count     |

Issued inventory = count of `TyreSet` rows for that entry/spec.

### 6.4 TyreSet

| Attribute            | Type  | Notes                                                           |
| -------------------- | ----- | --------------------------------------------------------------- |
| `id`                 | ID    |                                                                 |
| `eventEntryId`       | ID    |                                                                 |
| `tyreCompoundSpecId` | ID    |                                                                 |
| `setIndex`           | int   |                                                                 |
| `wearPercent`        | 0–100 |                                                                 |
| `status`             | enum  | `available` \| `mounted` \| `used` \| `returned` \| `destroyed` |

**`isNew`:** derived — true iff no `SessionTyreUsage` / `Stint` references exist.

### 6.5 SessionTyreUsage

| Attribute          | Type   | Notes |
| ------------------ | ------ | ----- |
| `id`               | ID     |       |
| `sessionEntryId`   | ID     |       |
| `tyreSetId`        | ID     |       |
| `laps`             | int    |       |
| `wearDeltaPercent` | number |       |

### 6.6 Stint

| Attribute        | Type    | Notes |
| ---------------- | ------- | ----- |
| `id`             | ID      |       |
| `sessionEntryId` | ID      |       |
| `tyreSetId`      | ID      |       |
| `startLap`       | int     |       |
| `endLap`         | int?    |       |
| `fuelStartKg`    | number? |       |
| `fuelEndKg`      | number? |       |

---

## 7. Circuit / event

### 7.1 Circuit

| Attribute             | Type   | Notes |
| --------------------- | ------ | ----- |
| `id`                  | ID     |       |
| `name`                | string |       |
| `shortName`           | string |       |
| `nationId`            | ID     |       |
| `timezone`            | string | IANA  |
| `firstAppearanceYear` | int    |       |

### 7.2 CircuitLayoutVersion

| Attribute                       | Type       | Notes                               |
| ------------------------------- | ---------- | ----------------------------------- |
| `id`                            | ID         |                                     |
| `circuitId`                     | ID         |                                     |
| `versionLabel`                  | string     |                                     |
| `effectiveFromYear`             | int        |                                     |
| `lengthKm`                      | number     |                                     |
| `type`                          | enum       | `permanent` \| `street` \| `hybrid` |
| `overtakingDifficulty`          | 0–100      | Player-visible                      |
| `abrasion`                      | 0–100      | Player-visible                      |
| `downforceImportance`           | 0–100      | Player-visible                      |
| `powerImportance`               | 0–100      | Player-visible                      |
| `brakingDemand`                 | 0–100      | Player-visible                      |
| `tractionDemand`                | 0–100      | Player-visible                      |
| `elevationChange`               | 0–100      | Player-visible                      |
| `wallProximity`                 | 0–100      | Player-visible                      |
| `coolingDemand`                 | 0–100      | Player-visible                      |
| `gripBaseline`                  | number     | Sim-only                            |
| `pitLossSeconds`                | number     | Sim-only                            |
| `pitLaneSpeedFactor`            | number     | Sim-only                            |
| `safetyCarLikelihood`           | number     | Sim-only                            |
| `vscLikelihood`                 | number     | Sim-only                            |
| `qualifyingLapDeltaSensitivity` | number     | Sim-only                            |
| `fuelConsumptionModifier`       | number     | Sim-only                            |
| `ersHarvestModifier`            | number     | Sim-only                            |
| `topSpeedZoneFactor`            | number     | Sim-only                            |
| `cornerCount`                   | int        |                                     |
| `possibleDrsZoneCount`          | int        | Enablement from ruleset/session     |
| `sectorsPayload`                | typed JSON |                                     |
| `waypointsPayload`              | typed JSON |                                     |
| `marshalZonesPayload`           | typed JSON |                                     |
| `climateProfilePayload`         | typed JSON |                                     |
| `geometrySchemaVersion`         | string     |                                     |
| `climateProfileSchemaVersion`   | string     |                                     |

### 7.3 ChampionshipEvent

| Attribute                | Type   | Notes |
| ------------------------ | ------ | ----- |
| `id`                     | ID     |       |
| `championshipSeasonId`   | ID     |       |
| `circuitLayoutVersionId` | ID     |       |
| `roundNumber`            | int    |       |
| `startDate`              | date   |       |
| `name`                   | string |       |

### 7.4 EventSessionDefinition (authoritative generated sessions)

Created from `WeekendFormatSessionSlot` when the event is materialized.

| Attribute                       | Type         | Notes                                   |
| ------------------------------- | ------------ | --------------------------------------- |
| `id`                            | ID           |                                         |
| `championshipEventId`           | ID           |                                         |
| `sourceSlotId`                  | ID           | Template slot provenance                |
| `sequence`                      | int          |                                         |
| `sessionKind`                   | enum         |                                         |
| `scheduledStart`                | datetime UTC |                                         |
| `scheduledLaps`                 | int?         |                                         |
| `scheduledMinutes`              | int?         |                                         |
| `drsEnabledOverride`            | bool?        | Null = inherit ruleset                  |
| `gridSourceSessionDefinitionId` | ID?          | Resolved from slot’s `gridSourceSlotId` |
| `reverseGridCount`              | int          |                                         |
| `mandatoryPitStops`             | int          |                                         |
| `requiredCompoundRuleId`        | ID?          |                                         |
| `pointsSystemId`                | ID?          |                                         |
| `fastestLapPointEligible`       | bool         |                                         |
| `parcFermeFromPrevious`         | bool         |                                         |

### 7.5 WeekendSession (runtime instance)

| Attribute                      | Type       | Notes                                                          |
| ------------------------------ | ---------- | -------------------------------------------------------------- |
| `id`                           | ID         |                                                                |
| `eventSessionDefinitionId`     | ID         |                                                                |
| `status`                       | enum       | `scheduled` \| `live` \| `paused` \| `finished` \| `abandoned` |
| `tempC`                        | number?    | Current sample                                                 |
| `rainNow`                      | number?    |                                                                |
| `rainInMinutes`                | number?    |                                                                |
| `trackWetness`                 | 0–100      |                                                                |
| `simulationInputPayload`       | typed JSON | Immutable resolved `RaceInput` snapshot for the session        |
| `simulationInputSchemaVersion` | string     | `race-input-v1` resolver contract version                      |
| `activeCheckpointId`           | ID?        | Latest `SessionCheckpoint`                                     |

Does **not** own `simClockMs` (clock is on `SessionCheckpoint`).

### 7.6 LayoutRecord

| Attribute                | Type | Notes |
| ------------------------ | ---- | ----- |
| `id`                     | ID   |       |
| `circuitLayoutVersionId` | ID   |       |
| `championshipId`         | ID   |       |
| `sessionKind`            | enum |       |
| `lapTimeMs`              | int  |       |
| `driverId`               | ID   |       |
| `seasonYear`             | int  |       |

### 7.7 OfficialWeekendResultPackage

`OfficialWeekendResultPackage` is the immutable management-layer handoff from completed session
results to weekend settlement. It is unique per championship event and contains the complete,
versioned session-result facts needed to apply standings and later deterministic management
consequences without rerunning the race engine. `inputHash` covers the ordered persisted session
input snapshots; `resultHash` covers the canonical package payload. A package cannot be created
until every event session is finished, has persisted results, and has no active checkpoint.

| Attribute                          | Type       | Notes                                                |
| ---------------------------------- | ---------- | ---------------------------------------------------- |
| `id`                               | ID         | Deterministic event-scoped package identity          |
| `championshipEventId`              | ID         | FK → `ChampionshipEvent`, unique                     |
| `championshipSeasonId`             | ID         | FK → `ChampionshipSeason`                            |
| `packageSchemaVersion`             | string     | `official-weekend-result-v1`                         |
| `executionDetail`                  | enum       | `interactive` \| `off_screen`                        |
| `formulaVersion` / `engineVersion` | string     | Versions represented by source session inputs        |
| `inputHash` / `resultHash`         | string     | SHA-256 integrity hashes                             |
| `payload`                          | typed JSON | Complete session-result facts and point-award inputs |
| `createdAt`                        | datetime   | UTC package creation time                            |

### 7.8 Championship standings and weekend settlement

`ChampionshipDriverStanding` and `ChampionshipTeamStanding` are current season snapshots. They
store points, wins, second places, third places, and normalized finish-count rows for complete
countback ordering. Driver points remain attached to the driver; constructor points remain attached
to the `TeamSeasonEntry` that operated the car.

`ChampionshipWeekendSettlement` is unique per `ChampionshipEvent` and records the package consumed
by the idempotent settlement. Its award children preserve the source `SessionPointAward`, driver,
team-season entry, and points applied by the settlement. Standalone settlement updates both
standings in one transaction and advances `SaveGame.worldDate` to the next event date. When the
authoritative daily calendar resolves a supported off-screen event, settlement records the package
without moving the clock so the enclosing day transition remains the sole time authority.
Settlement-linked financial awards, personnel updates, recommendations, and other management
consequences remain explicit follow-on consumers rather than being invented by the result handoff.

---

## 8. Shared enums

```text
championship_code: apex | challenger | academy
participant_status: junior | customer | factory_constructor
procurement_mode: league_spec | team_developed | customer_supply
upgrade_mode: locked | reliability_only | unrestricted
seat_role: race_1 | race_2 | race_3 | reserve | test
part_category: chassis | power_unit | gearbox | front_wing | rear_wing |
               floor | sidepods | suspension | brakes | electronics
installable_slot: part_category minus chassis
supply_contract_tier: factory_parity | customer_spec
start_status: started | dns | pit_lane_start
classification_status: classified | dnf | dsq | dns
pit_phase: on_track | pit_entry | pit_box | pit_exit
session_phase: pre_start | green | safety_car | vsc | red_flag | chequered | ended
retirement_state: running | retired | stopped
tyre_set_status: available | mounted | used | returned | destroyed
form: integer -10..+10
```

---

## 9. Locked decisions

| Topic                              | Decision                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Document                           | Fifth pass is self-contained                                                                 |
| World Formula Championship parts   | Rules keyed by `participantStatus`                                                           |
| Weekend rules                      | Per session slot → copied onto `EventSessionDefinition`                                      |
| Grid linkage                       | `gridSourceSessionDefinitionId` (not kind matching)                                          |
| Resume                             | Latest checkpoint only; checkpoint, cars, tyres, stints, usage, and damage commit atomically |
| Classification                     | `SessionResult` authoritative for every session; `RaceResultDetail` stores race-only fields  |
| Tyres                              | Versioned `TyreCompoundSpec`; entitlement ≠ inventory; `isNew` derived                       |
| License                            | `LicensePointAward` with optional expiry                                                     |
| Points                             | Full `PointsSystem`; not on `SessionEntry`                                                   |
| JSON                               | Geometry, immutable versioned rules, and atomic schema-versioned simulation payloads only    |
| International Formula Championship | Vision mix; R&D remains in management UI                                                     |
| Chassis                            | Physical instances + design FK; spares allowed                                               |
| Save topology                      | One self-contained SQLite file per save; `SaveGame` is singleton metadata                    |
| Part R&D                           | Every performance/reliability change creates a new immutable design version                  |

---

## 10. Series development defaults

Expressed as `RulesetPartCategoryRule` rows per `(category, participantStatus)`:

| Series       | Default                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| `academy`    | `junior`: mostly `league_spec` + `reliability_only` / `locked`                        |
| `challenger` | `junior`: few spec categories; majority `team_developed` + `unrestricted`             |
| `apex`       | `customer`: `customer_supply`; `factory_constructor`: `team_developed` (per category) |

---

## 11. Out of this document

Team organization detail, Staff, HQ buildings, the full finance policy, and `formulaVersion`
whitepaper. These remain separate management-layer contracts, but their authoritative state,
recommendation threads, world events, news, narrative state, and settlement history must be persisted
in the same save and participate in the shared calendar and result-settlement boundaries.
