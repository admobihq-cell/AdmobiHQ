# Database migrations

Two ORMs share one Postgres database:

- **Prisma** (`schema.prisma`) owns the app tables — leads, drivers, support, ops,
  audit, etc. — in the `public` schema.
- **Payload CMS** (blog/help) owns its own tables in the `cms` schema (see
  `payload.config.ts`'s `schemaName: "cms"`). Payload manages its own migrations
  in `apps/web/migrations/`, independently of everything below.

Because Payload's tables now live outside `public`, Prisma's migration engine
(which only ever looks at `public`) can no longer see them and can't propose
dropping them. That's what makes it safe to use real `prisma migrate` here
instead of hand-written additive SQL.

## One-time cutover (per environment, already done once you've run it)

Only needed the first time this lands in a given environment, and only if that
environment's Payload tables still live in `public`:

```
npm run db:isolate-payload-schema -w web          # dev (.env.local)
npm run env:pull:staging -w web && npm run db:isolate-payload-schema -w web   # staging
npm run env:pull:prod -w web && npm run db:isolate-payload-schema:prod -w web # prod
```

Run it, *then* deploy the `payload.config.ts` change that adds `schemaName: "cms"`
— the two need to land close together since the running app can't see its own
tables in between.

The very first `prisma/migrations` folder was generated as a **baseline** from
the schema that was already live everywhere (it was kept in sync by hand via
`prisma db push` / the old `prisma/scripts/*-additive.sql` files, which are now
historical/reference only). Baselines aren't executed — they're recorded as
already-applied so future migrations have a starting point:

```
npm run db:migrate:resolve-baseline -w web         # dev/staging (whichever is in .env.local)
npm run db:migrate:resolve-baseline:prod -w web    # prod (.env.production.local)
```

Run that once per environment too, before the first real `migrate deploy`. After
it, `npm run db:migrate:status -w web` should print "Database schema is up to
date!" with no pending migrations.

## Day to day (local/dev)

```
npm run db:migrate -w web           # prisma migrate dev — edit schema.prisma, then run this
```

This creates a new timestamped folder under `prisma/migrations/` with the SQL
diff and applies it to your dev DB. Commit the generated folder.

## Applying migrations to staging or production

There's no CI step for this by design — it's a deliberate, local, manual action:

```
npm run env:pull:prod -w web              # pulls Infisical's `prod` environment into .env.production.local
npm run db:migrate:status:prod -w web     # see what's pending first
npm run db:migrate:deploy:prod -w web     # applies pending migrations only, never generates new ones
npm run payload:migrate:prod -w web       # Payload's own migrations, if any are pending
```

Note: `vercel env pull` does **not** work for this — any env var marked "Sensitive"
in the Vercel dashboard (which includes `DATABASE_URL`) comes back as the literal
string `[SENSITIVE]`, not the real value. That's a deliberate, permanent
Vercel restriction (even project owners can't retrieve it via CLI/API after
creation), not something to work around — Infisical is the real source of
truth for these secrets, so `env:pull:prod` uses that instead.

`.env.production.local` is git-ignored and kept separate from `.env.local` on
purpose, so a stray `npm run dev` right after pulling prod secrets can't
accidentally point your local app at production.

`prisma migrate deploy` only ever applies migrations that already exist in
`prisma/migrations/` — it never generates SQL from a diff, so there's no
risk of it deciding to drop anything on its own. Always create and review the
migration locally with `db:migrate` first, commit it, then deploy it.
