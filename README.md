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
pnpm db:reset
pnpm db:migrate
```

## Layout

```
electron/     main process, preload, SQLite + Drizzle
src/          SvelteKit UI
drizzle/      SQL migrations
```
