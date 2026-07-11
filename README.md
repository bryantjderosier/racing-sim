# Racing Manager

Desktop app scaffold: Electron, SvelteKit, Vite, DuckDB, and Drizzle ORM.

## Stack

- **Frontend:** SvelteKit (SPA) + Vite
- **Desktop:** Electron
- **Database:** DuckDB via `@duckdb/node-api`
- **ORM:** Drizzle via `@duckdbfan/drizzle-duckdb`
- **Package manager:** pnpm

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev              # SvelteKit only
pnpm dev:electron     # Electron + DuckDB (recommended)
```

## Database

- Schema: `electron/db/schema.ts`
- Migrations: `drizzle/` (applied on app startup or via `pnpm db:migrate`)
- DB file: `~/.config/racing-manager/racing-manager.duckdb`

```sh
pnpm db:generate
pnpm db:reset
pnpm db:migrate
```

## Layout

```
electron/     main process, preload, DuckDB + Drizzle
src/          SvelteKit UI
drizzle/      SQL migrations
```
