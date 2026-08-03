# Database Persistence Contract — Pre-UI Boundary

**Status:** Accepted implementation contract; reconciled design boundary through D-543
**Depends on:** `DATA_SCHEMA.md`, `RACE_SIMULATION_CONTRACT.md`, `WEATHER_SIMULATION_CONTRACT.md`
**Scope:** SQLite save files, simulation persistence, migrations, and renderer IPC

This contract turns the entity schema into an executable persistence boundary. The renderer must
consume typed read models and commands; it must not know table names or open SQLite directly.

## 1. Save-file boundary

- Each save is one self-contained SQLite file, as locked in `DATA_SCHEMA.md`.
- The external save catalog stores only file path, display name, schema version, game/content
  versions, and last-opened metadata. It never becomes a second source of world state.
- A save is opened only after migrations and integrity checks succeed. A failed migration leaves the
  original file untouched and reports a typed error.
- New save creation writes a temporary file, applies the complete migration set, seeds copied content,
  inserts the singleton `SaveGame` row, runs integrity checks, then atomically renames the file.

## 2. SQLite representation

The following DDL mapping is accepted:

| Schema type                       | SQLite representation                                               |
| --------------------------------- | ------------------------------------------------------------------- |
| `ID`                              | UUID text; opaque to the UI                                         |
| `datetime UTC`                    | ISO-8601 UTC text                                                   |
| `date`                            | ISO-8601 calendar-date text                                         |
| `bool`                            | integer `0`/`1` with a check constraint                             |
| enum                              | lowercase `snake_case` text with a check constraint where practical |
| `money`                           | integer minor units plus an explicit currency code                  |
| basis points / fixed-point values | integer in the documented unit                                      |
| typed JSON                        | text with an adjacent schema-version column                         |

Every connection enables foreign keys, a busy timeout, and WAL mode. Migrations run in a transaction
and are applied before any repository query. Destructive migrations require an explicit migration
step and a recoverable backup of the save file.

## 3. Authoritative write transactions

Repositories own transactions; UI handlers never compose partial writes.

### Save creation

1. Create the save file and apply migrations.
2. Copy the selected content pack into the save and pin `contentDataVersion`.
3. Insert one `SaveGame` row and initial world state.
4. Commit only after foreign-key and invariant checks pass.

Before a session can run, the world/session materializer writes an immutable, schema-versioned
resolved `RaceInput` snapshot to `WeekendSession.simulationInputPayload`. The session resolver
validates that payload before constructing the pure engine input; it never reads relational tables
from inside the simulation step.

### Session checkpoint

One transaction replaces the latest checkpoint state: `SessionCheckpoint`, all
`SessionCarCheckpoint` rows, mutable tyre sets, active stints, tyre usage, damage, and
`strategyStatePayload`. `weatherStatePayload` and `strategyStatePayload` are both required for a
weather/controller-enabled resume. The previous complete checkpoint remains valid until commit.

### Session finalization

One transaction writes authoritative `SessionResult` rows, race-only details, point awards, stints,
tyre usage, and the final checkpoint cleanup/update. The operation is idempotent on the session ID.

The engine remains pure: repositories adapt relational rows into `RaceInput` and adapt
`RaceRunResult` back into persistence records. No engine step reads SQLite.

### Weekend settlement

After the weekend’s final official session, one idempotent settlement operation aggregates the
session results into an immutable official weekend-result package. The management layer applies
standings, finances, personnel state, technical state, board effects, news, narrative consequences,
and career history exactly once. Session-level results remain available to the race-weekend UI.

Settlement applies deterministic consequences only. Operational recommendations are persisted as
pending threads and never activate automatically; the player must approve, edit, reject, defer, or
leave them unresolved. Safety, legality, or validity blockers may pause calendar progress.

### World-state and calendar persistence

The save database is the authoritative home for world date and RNG, AI teams and personnel,
contracts, markets, supplier relationships, board and career state, news, narrative state, and
bounded consequences. Disposable telemetry and presentation caches may remain outside the save but
must never be required to resume or settle a career.

One serialized calendar pipeline advances daily simulation, race weekends, settlement, deadlines,
regulation effective dates, and season transitions. Each transition has an identity and commits
atomically. A failure preserves the last valid state, pauses the calendar, and exposes a retry or
explicit game-rule fallback; it never silently advances or partially applies the transition.

### Checkpoint cadence and shutdown

The accepted cadence writes a checkpoint after every completed lap and immediately on session start,
pause, manual save, and session finish. Closing a live save first pauses simulation and flushes a
checkpoint; a failed flush keeps the save open and returns `CHECKPOINT_FAILED`. A crashed process
resumes from the latest committed checkpoint, and no simulation work runs while its save is closed.

## 4. Retention and visibility

- Career state, standings, session results, race summaries, stints, tyre usage, and milestone data
  remain in the primary save.
- Only the latest checkpoint is retained in the primary save.
- Lap-by-lap telemetry is never stored in the primary save. It is written to a separately versioned
  compressed archive identified by the session ID, retaining the latest 10 completed race sessions
  by default. Older archives are purged only after the replacement archive passes integrity checks.
- A compact session event history retains pit transitions and tyre changes, successful overtakes,
  penalties, incidents, DRS/weather and unsafe-condition changes, player-issued strategy commands,
  and finish/classification events. Failed/attempted overtakes, segment/lap completion events, and
  telemetry samples are not persisted. Hidden weather truth is never exposed to the renderer; only
  the team-visible forecast snapshot and observed state may be persisted for UI history.

## 5. Version and integrity metadata

Every finalized session and checkpoint records the simulation `formulaVersion`, `engineVersion`, RNG
algorithm/state, seed, and input hash. Any output-changing engine or serialized-state change bumps the
corresponding version before migration or replay support is claimed.

Content definitions copied into a save are immutable. A new content pack creates a new save or an
explicit migration; it never silently mutates an existing save.

### Content-pack bootstrap

Content packs are versioned typed modules with a manifest containing `contentDataVersion`, pack schema
version, required game version, and a content hash. Seed records use deterministic fixed IDs. Save
creation inserts the complete pack in one transaction; seeding an already-pinned version is a no-op,
while a different version requires an explicit migration.

## 6. Renderer IPC boundary

The preload exposes a typed API backed by main-process repositories. The accepted initial API surface
is:

- `save.list`, `save.create`, `save.open`, `save.close`, `save.backup`, `save.delete`
- `weekend.getCurrent`
- `session.getState`, `session.start`, `session.pause`, `session.resume`,
  `session.issueStrategy`, `session.checkpoint`, `session.finalize`
- `session.subscribe` for throttled live updates
- `results.get`

Commands return stable error codes and are serialized through one queue per save/session. The initial
error codes are `SAVE_NOT_FOUND`, `SAVE_LOCKED`, `MIGRATION_FAILED`, `INVALID_COMMAND`,
`SESSION_NOT_LIVE`, `CHECKPOINT_FAILED`, `FINALIZATION_FAILED`, and `CONFLICT`. Live race updates use
a throttled event stream; the UI does not poll SQLite for every segment. DTOs contain no Drizzle types,
table names, or hidden weather truth.

## 7. Accepted championship naming

Persisted codes remain stable while display names are stored and rendered as follows:

| Persisted code | Player-facing name                 | Short code |
| -------------- | ---------------------------------- | ---------- |
| `apex`         | World Formula Championship         | `WFC`      |
| `challenger`   | International Formula Championship | `IFC`      |
| `academy`      | Formula Development Championship   | `FDC`      |

## 8. Implementation order

1. Replace the placeholder Drizzle schema with grouped tables, constraints, indexes, and migrations. **Implemented.**
2. Implement content seeding and save-file lifecycle checks. **Foundation pack implemented.**
3. Implement repositories and the simulation persistence adapter, including checkpoint round-trip
   tests and final-result idempotency. **Repositories, typed adapters, and lifecycle checkpoint/
   finalization orchestration and database resume wiring implemented.**
4. Implement the typed preload/main-process IPC surface and read-model queries. **Save catalog,
   typed preload/main IPC, current-weekend and finalized-results DTO queries, validated live
   strategy-command checkpointing, resolver-driven session factory wiring, and persisted `RaceInput`
   validation implemented. Session materialization now creates or reuses an unstarted scheduled
   `WeekendSession`, persists the immutable input snapshot transactionally, and only then resolves
   the session for the race UI.**
5. Build database UI layers against DTOs only, then add live-session streaming.

The calibration JSON outputs are review artifacts, not runtime content. They live under
`planning/calibration/` and are documented by its README.
