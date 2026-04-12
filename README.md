# Drukkerij Drukmans

A Saturday frietjes (Belgian fries) ordering app for the family. Everyone picks what they want on their phone, and one person collects the order.

## What it does

- **Pick a person** — tap your name on the home screen
- **See who's collecting** — the app rotates through family members who pick up the order
- **Place your order** — choose from the menu (fries, snacks, sauces), set quantities, add notes (e.g. "lightly fried")
- **Repeat last order** — pre-fill from your previous week's order with one tap
- **Order summary** — shared view of totals per item, with per-person notes so nothing gets missed
- **Admin panel** — passcode-protected; manage the session date, set the collector, clear orders, toggle menu item availability, add new items

## Stack

- [TanStack Start](https://tanstack.com/start) — full-stack React SSR framework
- [TanStack Router](https://tanstack.com/router) — file-based routing with typed loaders and `beforeLoad` guards
- [Drizzle ORM](https://orm.drizzle.team/) + [Neon](https://neon.tech/) — Postgres on serverless/edge via the Neon HTTP driver
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- Deployed on [Vercel](https://vercel.com/) via the Nitro adapter

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable         | Description                        |
   |------------------|------------------------------------|
   | `DATABASE_URL`   | Neon Postgres connection string    |
   | `ADMIN_PASSCODE` | Password for the `/admin` route    |

3. Push the schema to your database:

   ```bash
   npm run db:push
   ```

4. Seed initial data (family members, menu items):

   ```bash
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Database commands

```bash
npm run db:push      # Push schema changes to Neon
npm run db:seed      # Re-seed all data (destructive — don't run in production)
npm run db:studio    # Open Drizzle Studio
```

## Other scripts

```bash
npm run build        # Production build (outputs to .output/)
npm run check        # Prettier + ESLint fix
npm run test         # Vitest
```
