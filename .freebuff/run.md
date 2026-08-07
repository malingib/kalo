# Preview Run Doc — Cal.diy (Kalo) monorepo

Yarn 4 / Turbo monorepo. Web app lives in `apps/web` (Next.js 16, Turbopack). Yarn is not on
PATH — always invoke the repo-pinned release at `.yarn/releases/yarn-4.12.0.cjs`.

## Reproduce the uncommitted artifacts

1. **Environment file (repo root `.env`)** — `apps/web/next.config.ts` loads it itself via
   `dotenvConfig({ path: "../../.env" })`. It must exist or the dev server refuses to boot:
   - `DATABASE_URL` + `DATABASE_DIRECT_URL` — Neon Postgres pooler/direct URLs (copy from the
     main checkout's `.env`).
   - `NEXT_PUBLIC_WEBAPP_URL` + `NEXTAUTH_URL` — `http://localhost:3000` for local dev.
   - `NEXTAUTH_SECRET` — any dev secret.
   - `CALENDSO_ENCRYPTION_KEY` — hard-required by `next.config.ts` and **not** in the checked-in
     example (`.env.example` leaves it empty). Generate a 32-byte base64 value:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - Optional (this project): `DARAJA_ENVIRONMENT`, `DARAJA_CALLBACK_URL` (M-Pesa sandbox).
2. **Dependencies** — cold checkout has an empty `node_modules` and no Yarn cache, so:
   ```bash
   node .yarn/releases/yarn-4.12.0.cjs install
   ```
   This downloads the entire dependency tree from the network (takes 10–30+ min cold).

## Run the server

```bash
# From repo root (equivalent of `cd apps/web && yarn dev`):
node .yarn/releases/yarn-4.12.0.cjs workspace @calcom/web dev
```

- The `dev` script runs `turbo run copy-app-store-static && next dev --turbopack`.
- Default port: **3000** (must match `NEXT_PUBLIC_WEBAPP_URL` in `.env`).
- DB-dependent pages hit the Neon Postgres instance from `.env`; the app shell renders without
  any extra services. First compile of a page is slow (large monorepo).
