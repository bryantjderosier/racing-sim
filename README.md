# Racing Manager

Desktop app built with Electron, SvelteKit, Vite, DuckDB, and Drizzle ORM.

## Stack

- **Frontend:** SvelteKit (SPA) + Vite
- **Desktop:** Electron
- **Database:** DuckDB via `@duckdb/node-api`
- **ORM:** Drizzle via `@duckdbfan/drizzle-duckdb`
- **Package manager:** pnpm
- **Tooling:** TypeScript, ESLint, Prettier

## Setup

```sh
pnpm install
```

## Development

Browser-only SvelteKit dev server:

```sh
pnpm dev
```

Full Electron app with DuckDB (recommended):

```sh
pnpm dev:electron
```

## Build

```sh
pnpm build
pnpm start
```

## Database

- Schema: `electron/db/schema.ts`
- Migrations: `drizzle/` (applied on app startup or via `pnpm db:migrate`)
- DB file: `{userData}/racing-manager.duckdb`

```sh
pnpm db:generate   # after schema changes
pnpm db:reset      # delete local DuckDB file
pnpm db:migrate    # apply drizzle/ migrations
```

## Project layout

```
electron/          Electron main process, preload, DuckDB + Drizzle
src/               SvelteKit frontend
drizzle/           SQL migrations
dist-electron/     Built main/preload (gitignored)
build/             Built SvelteKit static output (gitignored)
```

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | SvelteKit dev server only                |
| `pnpm dev:electron` | SvelteKit + Electron with live reload    |
| `pnpm build`        | Build frontend and Electron main/preload |
| `pnpm start`        | Run production Electron app              |
| `pnpm lint`         | ESLint + Prettier check                  |
| `pnpm format`       | Format with Prettier                     |
| `pnpm check`        | Svelte/TS type check                     |
| `pnpm db:reset`     | Delete local DuckDB file                 |
| `pnpm db:migrate`   | Apply migrations                         |
| `pnpm db:studio`    | Open DuckDB UI for the local DB file     |
| `pnpm db:generate`  | Generate Drizzle migration               |
