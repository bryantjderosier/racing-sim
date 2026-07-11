# Racing Manager

Desktop app built with Electron, SvelteKit, Vite, DuckDB, and Drizzle ORM.

## Stack

- **Frontend:** SvelteKit (SPA) + Vite
- **Desktop:** Electron
- **Database:** DuckDB via `@duckdb/node-api`
- **ORM:** Drizzle via `@duckdbfan/drizzle-duckdb`
- **Tooling:** TypeScript, ESLint, Prettier

## Development

Browser-only SvelteKit dev server:

```sh
npm run dev
```

Full Electron app with DuckDB (recommended):

```sh
npm run dev:electron
```

## Build

```sh
npm run build
npm run start
```

## Database

- Schema: `electron/db/schema.ts`
- Migrations: `drizzle/` (applied on app startup)
- DB file: `{userData}/racing-manager.duckdb`

Generate a new migration after schema changes:

```sh
npm run db:generate
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

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | SvelteKit dev server only                |
| `npm run dev:electron` | SvelteKit + Electron with live reload    |
| `npm run build`        | Build frontend and Electron main/preload |
| `npm run start`        | Run production Electron app              |
| `npm run lint`         | ESLint + Prettier check                  |
| `npm run format`       | Format with Prettier                     |
| `npm run check`        | Svelte/TS type check                     |
