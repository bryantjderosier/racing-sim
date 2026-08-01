# Racing Manager

Desktop app scaffold: Electron, SvelteKit, Vite, SQLite, and Drizzle ORM.

## Stack

- **Frontend:** SvelteKit (SPA) + Vite
- **Desktop:** Electron
- **Database:** SQLite via `@libsql/client`
- **ORM:** Drizzle
- **Package manager:** pnpm

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev              # SvelteKit only
pnpm dev:electron     # Electron + SQLite (recommended)
```

## Database

- Schema: `electron/db/schema.ts`
- Migrations: `drizzle/` (applied on app startup or via `pnpm db:migrate`)
- DB file: `~/.config/racing-manager/racing-manager.sqlite`

```sh
pnpm db:generate
pnpm db:check
pnpm db:content-check
pnpm db:checkpoint-check
pnpm db:result-check
pnpm db:adapter-check
pnpm db:session-check
pnpm db:catalog-check
pnpm db:read-model-check
pnpm db:session-factory-check
pnpm db:input-resolver-check
pnpm db:session-materializer-check
pnpm db:reset
pnpm db:migrate
```

`pnpm db:check` migrates an isolated temporary SQLite file and verifies the required tables,
foreign-key enforcement, and `SaveGame` singleton constraint without touching the active save.
`pnpm db:content-check` creates an isolated temporary save, verifies foundation content seeding,
same-version idempotency, content-version pinning, and existing-target protection.
`pnpm db:checkpoint-check` verifies checkpoint header/car round-trips, monotonic sequence enforcement,
active-checkpoint linkage, and transaction rollback on a failed child write.
`pnpm db:result-check` verifies idempotent finalization, result/detail/award writes, compact event
filtering, session completion, and active-checkpoint cleanup.
`pnpm db:adapter-check` verifies the typed `SimulationSnapshot` to checkpoint mapping and rejects
incomplete per-car persistence context.
`pnpm db:session-check` verifies start/pause/resume/finish lifecycle checkpoints, lap cadence,
automatic result finalization, and closed-session protection.
`pnpm db:catalog-check` verifies atomic save-catalog upserts, lookup/order behavior, and removal.
`pnpm db:read-model-check` verifies typed current-weekend and finalized-results queries on an empty save.
`pnpm db:session-factory-check` verifies resolver-driven idle-session creation and checkpoint resume selection.
`pnpm db:input-resolver-check` is the input-resolver validation command for the same boundary.
`pnpm db:session-materializer-check` verifies idempotent session materialization persists the
validated immutable `RaceInput` snapshot before resolver-driven session creation.

## Layout

```
electron/     main process, preload, SQLite + Drizzle
src/          SvelteKit UI
drizzle/      SQL migrations
planning/     contracts and calibration artifacts
```

Generated simulator reports are stored under `planning/calibration/`.
