# Neon Compute (CU‑hrs) High Usage — Root Cause & Remediation Plan

**Date:** 2026-08-30
**Status:** Investigation complete; remediation not started
**Neon project:** `restless-bird-04726977` (`Admobihq`, org `org-withered-hall-51934373`, **Free plan**, 100 CU‑hr/mo)
**Default branch / compute:** `br-curly-firefly-aq7tqwko` (production) / `ep-winter-rain-aqnirs36` (0.25–2 CU autoscale, 300s suspend)

---

## TL;DR

A **self‑hosted n8n instance shares this Neon database** and queries it every ~7 seconds, 24/7. Neon bills `compute‑active‑hours × CU size` with a **0.25 CU floor whenever the compute is awake**, and the compute only scale‑to‑zeros after **300s of zero activity**. n8n's heartbeat means that timer never fires.

At the time of investigation the production compute had been **continuously awake for 20 hours** (`pg_postmaster_start_time` = 20.0h; started 2026‑08‑29 10:06 UTC, still `active`). That is ~5 CU‑hrs/day ≈ **~150 CU‑hrs/month just to keep the compute powered on for n8n** — before a single real user request. This exceeds the entire 100 CU‑hr free allowance.

The Admobi application code is in good shape. Marketing pages serve from the Vercel CDN (`X‑Vercel‑Cache: HIT`), API auth is per‑isolate cached, DB pools are capped at 1–2 and use the Neon pooler endpoint. App‑side items exist but are secondary and only matter once n8n stops pinning the compute.

---

## How Neon Free‑tier billing works (the mechanism)

- **CU‑hr = (hours the compute is active) × (CU size while active).** Minimum CU size is **0.25**.
- An **idle‑but‑awake** compute still bills at 0.25 CU. Query cost is almost irrelevant at this scale.
- The compute suspends (bills nothing) only after **`suspend_timeout_seconds` with no client connections/queries**. This project: `0` = Neon default **300s**. Free plan cannot lower it.
- Therefore: **anything that touches the DB more often than every 5 minutes keeps the compute awake permanently.**
- Vercel Fluid "active CPU" depletes in lockstep for the same reason — one poller hitting an app route that does real work (Payload init + Prisma/Payload queries) on a timer bills both meters.

---

## Root cause: shared self‑hosted n8n instance

### Evidence

| Fact | Source |
|---|---|
| n8n's full table set lives in this DB's `public` schema (`execution_entity`, `workflow_entity`, `workflow_statistics_delta`, `insights_raw/by_period/metadata`, `workflow_history`, `credentials_entity`, `user`, `role`, `scope`, `project`, `auth_identity`, `installed_packages`, …) | `pg_stat_user_tables`, `information_schema` |
| n8n is **not** in the `AdmobiHQ` repo — no code, no `docker-compose`, no Vercel project, no deploy config | repo search |
| n8n version is recent — **239 migrations**, latest `AddSetupCompletedAtToAgents1785500832626` (Agents/Insights‑era build) | `public.migrations` |
| n8n owner account: **`admobihq@gmail.com`**, created 2026‑07‑17 | `public."user"` |
| One active workflow: **"My workflow"** (`id ZN8RYPWTN4xuFSHm`), a single **webhook** node (`GET /webhook/33ff90e8-2984-4d53-9309-2e43fb315c1b`), not wired to anything | `public.workflow_entity` |
| **0 executions ever**, **0 credentials**, `installed_packages` empty | `public.execution_entity`, `credentials_entity`, `installed_packages` |
| Workflow `updatedAt` = 2026‑08‑30 06:17 UTC → instance is **live and was touched hours ago** | `public.workflow_entity` |
| n8n Cloud manages its own DB and never writes to a customer's Neon → this is **definitely self‑hosted** | deduction |

### What n8n is doing to the DB (measured)

| n8n subsystem | Table(s) | Observed | Default cadence |
|---|---|---|---|
| **Workflow‑statistics buffer/flush** | `workflow_statistics_delta` | **~242,000 sequential scans** lifetime; ~8/min steady + bursts to ~1,200/min; **0 index scans** (full scan every call); table holds 0 live rows | tight timer loop |
| Execution pruning | `execution_entity`, `execution_data`, `execution_metadata` | ~23,700 index scans | soft‑delete hourly, hard‑delete every 15 min |
| Insights module | `insights_raw` → `insights_by_period`, `insights_metadata` | ~1,500 scans + periodic INSERT/DELETE | event flush (short) + compaction hourly |
| Workflow‑history pruning | `workflow_history` | ~840 scans | ~daily |
| Active‑workflow + RBAC re‑reads | `workflow_entity`, `shared_workflow`, `user`, `role`, `scope`, `role_scope`, `project`, `auth_identity` | `user`: 3,577 seq / 0 idx; `role`: 4,723 seq; `scope`: 1,447 seq | startup + periodic |
| Telemetry / license / version check | `settings` + outbound HTTP | low | ~daily |
| TypeORM connection pool | — | persistent open connections (blocks suspend on their own) | always |

Worst single offender: **`workflow_statistics_delta`** — an almost‑always‑empty table getting a full sequential scan several times a minute, forever. It has **no clean env toggle** to disable.

Because the only workflow is webhook‑triggered (webhooks don't poll) and there are zero executions, **none of this DB traffic is doing useful work** — it's housekeeping for an idle instance.

### Where n8n runs — UNKNOWN (needs the account owner)

Cannot be determined from the database:
- Neon routes every client through its proxy (`c-8.us-east-1.aws.neon.tech`), so `pg_stat_activity.client_addr` only ever shows Neon‑internal `10.39.x.x` addresses (observed rotating: `.41.130`, `.15.245`, `.89.147`). n8n's real IP/host is masked.
- n8n does not persist its own `WEBHOOK_URL` / host. Checked `settings`, workflow JSON, `credentials_entity` — nothing.

**How to locate it (owner action):**
1. Log into n8n as `admobihq@gmail.com` — wherever that works is the instance.
2. Check hosting dashboards: Railway, Render, Fly.io, Hetzner, DigitalOcean, Elestio, Coolify, a Docker host, or an office/home server.
3. Search that Gmail for "n8n" (signup / billing / deploy mail).
4. If the webhook URL `…/webhook/33ff90e8-…` is saved anywhere (Postman, a caller service), its domain is the n8n host.
5. Whichever machine holds the Neon connection string with `DB_TYPE=postgresdb` in its env.

---

## Secondary contributors (app‑side — minor)

The app is largely fine. Verified 2026‑08‑30: `/`, `/blog`, `/help` all return `X‑Vercel‑Cache: HIT` with incrementing `Age`. Still worth fixing:

1. **`noStore()`‑on‑empty fallback** — `apps/web/app/(marketing)/help/page.tsx` and `apps/web/app/(marketing)/layout.tsx` call `unstable_noStore()` whenever the CMS result is empty or throws. That makes the route **permanently dynamic** (every hit → live Payload → Postgres) until the next deploy. Commit history shows this has bitten production before (`5c27ac0`, `85f820a`). Fix: on empty/error, return the empty payload with a short `revalidate` instead of `noStore()`.

2. **Uncached slug pages** — `getHelpArticleBySlug`, `getBlogPostBySlug`, `getRelatedHelpArticles`, `getRelatedBlogPosts` in `apps/web/lib/payload/*-queries.ts` are **not** wrapped in `unstable_cache`, and `dynamicParams` defaults to `true`. Bots probing `/help/<random>` or `/blog/<random>` trigger live Payload → Postgres. Fix: wrap in `unstable_cache` (tag‑invalidated by the existing revalidate hooks) or `export const dynamicParams = false` on those routes.

3. **Over‑broad cache invalidation** — `revalidateBlogAfterChange` in `apps/web/lib/payload/revalidate-blog.ts` calls `revalidatePath("/", "layout")`, nuking the entire site's cache on every blog edit and forcing a cold full‑site regen (many Payload queries). Fix: keep the `revalidateTag(...)` calls, drop the site‑wide `revalidatePath`.

4. **`cms._blog_posts_v`: ~155,000 writes for 7 posts / ~700 version rows.** Likely repeated seed/import runs against production. Add `versions.maxPerDoc` to `BlogPosts` / `HelpArticles` collection config and confirm no seed script runs on deploy.

5. **n8n's RBAC tables also account for the `user` / `role` / `scope` seq‑scan volume** previously suspected to be app auth. The app's own auth (`ops_roles`, `ops_role_assignments`) is low‑volume and per‑isolate cached (`apps/api/lib/auth.ts`). No action needed there.

---

## Remediation Plan

### Phase 1 — Stop the bleed (owner, ~30 min, do first)

- [ ] **Locate the n8n instance** (see "Where n8n runs" above). Log in as `admobihq@gmail.com`.
- [ ] **Decide n8n's fate:**
  - [ ] **Option A (recommended): move n8n to SQLite.** Set `DB_TYPE=sqlite` (or remove all `DB_POSTGRESDB_*` env vars) and restart. The instance is tiny (1 workflow, 0 executions, 0 credentials, 0 packages) — it does not need Postgres. n8n then makes **zero** Neon connections and the problem is fully resolved. Export workflows first if you want a clean re‑import.
  - [ ] **Option B: move n8n to its own Neon project.** Create a new Neon project, point `DB_POSTGRESDB_*` at it, restart, migrate data if needed. Pin that project's compute to fixed 0.25 CU and accept 24/7 — it just won't hit the Admobi app quota.
  - [ ] **Option C: if n8n is not needed at all**, pause/stop the instance. The one webhook workflow does nothing.
- [ ] **Do NOT drop the n8n tables while the instance is running** — it reconnects, re‑runs 239 migrations, recreates every table, and spikes compute. Only clean up tables *after* the instance is repointed/stopped (see Phase 3).

### Phase 2 — If n8n must stay on this Postgres temporarily

Set on the n8n instance and restart (reduces most timers, but the `workflow_statistics_delta` loop remains — this is a stopgap, not a fix):

- [ ] `N8N_DIAGNOSTICS_ENABLED=false`
- [ ] `EXECUTIONS_DATA_PRUNE=false`
- [ ] `N8N_WORKFLOW_HISTORY_ENABLED=false`
- [ ] `N8N_DISABLED_MODULES=insights`
- [ ] `DB_POSTGRESDB_POOL_SIZE=1`
- [ ] `QUEUE_HEALTH_CHECK_ACTIVE=false` (not in queue mode, harmless to set)

### Phase 3 — Clean up the shared database (after Phase 1)

- [ ] Confirm no n8n process is connected: `select count(*), array_agg(distinct coalesce(nullif(application_name,''),'(none)')) from pg_stat_activity where usename='neondb_owner';`
- [ ] Back up (Neon branch/snapshot), then drop the orphaned n8n objects from `public`. Table list to review before dropping:
  `execution_entity, execution_data, execution_metadata, execution_annotations, execution_annotation_tags, annotation_tag_entity, workflow_entity, workflow_statistics, workflow_statistics_delta, workflow_history, shared_workflow, workflows_tags, webhook_entity, insights_raw, insights_by_period, insights_metadata, credentials_entity, shared_credentials, variables, settings, installed_packages, installed_nodes, processed_data, event_destinations, auth_identity, auth_provider_sync_history, user, role, scope, role_scope, user_api_keys, project, project_relation, folder, folder_tag, tag_entity, test_run, test_case_execution, migrations, n8n_chat_history, invalid_auth_token, processed_data`
  ⚠️ Some names (`project`, `role`, `scope`, `user`, `folder`, `settings`, `tag_entity`) are generic — **verify each is n8n's and not an Admobi/Prisma/Payload table** before dropping. Prisma owns `public` for the app; Payload is isolated in schema `cms`.
- [ ] Run `graphify update .` if any app code changes land.

### Phase 4 — App‑side hardening (optional, after n8n is gone)

- [ ] Replace `noStore()`‑on‑empty with empty‑payload + short `revalidate` in `apps/web/app/(marketing)/help/page.tsx` and `layout.tsx`.
- [ ] Wrap `getHelpArticleBySlug` / `getBlogPostBySlug` / `getRelated*` in `unstable_cache`, or set `dynamicParams = false` on `/help/[slug]` and `/blog/[slug]`.
- [ ] Remove `revalidatePath("/", "layout")` from `apps/web/lib/payload/revalidate-blog.ts` (keep tag revalidation).
- [ ] Add `versions.maxPerDoc` to `apps/web/collections/BlogPosts.ts` and `HelpArticles.ts`; audit seed scripts for prod execution.

### Phase 5 — Verify

- [ ] After Phase 1, watch the compute suspend again:
  ```sql
  select round(extract(epoch from (now() - pg_postmaster_start_time()))/60) as uptime_min,
         (select count(*) from pg_stat_activity where usename='neondb_owner') as app_conns;
  ```
  `uptime_min` should reset to a low number frequently (compute suspending between traffic bursts).
- [ ] Check the Neon dashboard 24–48h later: daily CU‑hrs should drop from ~1.5/day toward a few CU‑hrs/month total.
- [ ] Optional: install `pg_stat_statements` (`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` — writes to the DB, get sign‑off) for ongoing query‑level visibility via Neon's `list_slow_queries` / `outliers` / `calls`.

---

## Expected outcome

Once n8n no longer holds the Neon compute open, the production compute returns to scale‑to‑zero between traffic bursts. Steady‑state CU‑hrs ≈ `(number of cold traffic bursts) × 5 min × 0.25 CU`. At current Admobi traffic that is a **few CU‑hrs/month**, comfortably inside the 100 CU‑hr free allowance — down from the ~150 CU‑hr/month trajectory driven by n8n.
