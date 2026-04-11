# Drukkerij Drukmans — Claude Guidelines

## Stack

- **Framework**: TanStack Start (React, SSR)
- **Routing**: TanStack Router (file-based)
- **Database**: Neon (Postgres) via Drizzle ORM + `drizzle-orm/node-postgres`
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Package manager**: npm

## Code style

- **No non-null assertions** (`!`). Use explicit guards: `if (!value) throw new Error(...)`.
- **No `useEffect` for navigation or redirects.** Use TanStack Router's `beforeLoad` to guard routes and throw `redirect(...)` there.
- **No `useEffect` for data that can be derived synchronously.** Read localStorage in the render body with a `typeof window !== 'undefined'` guard — always required since components run on the server during SSR.
- **No Co-Authored-By in commits.**

## Project structure

```
src/
  db/
    index.ts      # Drizzle client
    schema.ts     # All table definitions
    seed.ts       # Seed script (npm run db:seed)
  routes/         # File-based routes — one file per page
  components/     # Reusable UI components
  lib/
    utils.ts      # cn() utility
```

## Architecture principles

- **Separate UI from logic.** Route files (`src/routes/`) should be thin — they wire together server functions, components, and routing. Business logic lives in server functions or dedicated modules. UI lives in `src/components/`.
- **Server functions** (`createServerFn`) handle all DB access. Use `.inputValidator()` to type inputs.
- **Route loaders** call server functions and return data. Components consume loader data via `Route.useLoaderData()`.
- **Components** in `src/components/` are pure presentational or lightly stateful — they receive props and emit callbacks. No DB calls, no server functions.

## Database

Required env vars: `DATABASE_URL`, `ADMIN_PASSCODE`

```bash
npm run db:push      # Push schema changes to Neon
npm run db:seed      # Re-seed all data (destructive)
npm run db:studio    # Open Drizzle Studio
```

The seed clears all tables before inserting. Do not run in production.

## Running locally

```bash
npm run dev          # Start dev server on :3000
npm run build        # Production build
npm run check        # Format + lint fix
```
