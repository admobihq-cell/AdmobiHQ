# Database — full schema reference

One Postgres database (Neon), one Prisma schema file, shared by `apps/web`, `apps/api`, and `apps/ops`: [`apps/web/prisma/schema.prisma`](../../apps/web/prisma/schema.prisma). Payload CMS lives in the same database by default, in its own tables. This doc catalogs **every table** and what it's for. For the Prisma-vs-Payload split, migration rules, and env vars, see [DATA-LAYER.md](./DATA-LAYER.md) first — this doc assumes that context and doesn't repeat it.

Prisma clients: [`apps/web/lib/prisma.ts`](../../apps/web/lib/prisma.ts), [`apps/api/lib/prisma.ts`](../../apps/api/lib/prisma.ts), [`apps/ops/lib/prisma.ts`](../../apps/ops/lib/prisma.ts) — same schema, three thin wrappers.

## Conventions used across the schema

- **Soft delete, two flavors.** Public lead tables (`Lead`, `FleetPartner`, `Driver`, `WaitlistEntry`, `MediaKitRequest`) and `AnnouncementBroadcast` use `deleted_at` / `deleted_by_email`. Membership tables (`AdvertiserMember`) use `removed_at` instead, so activity history can still resolve a name for someone no longer in the org. Never hard-delete a row that's referenced from `audit_events` or a notification.
- **Status lifecycles are plain strings, not enums.** e.g. `Campaign.status` (`draft → submitted → approved/rejected/changes_requested → cancelled`), `DriverProfile.status` (same shape), `SafetyIncident.status` (`new → acknowledged → in_progress → resolved/cancelled`). Valid values are documented as inline comments in the schema, not a Postgres enum — keeps additive migrations to one column, no `ALTER TYPE`.
- **Derived state is never stored.** `Campaign` has no `live` column — scheduled/live/completed is computed from `starts_on`/`ends_on` at read time (`apps/api/lib/campaign-dto.ts`). Don't add a stored phase/status field that a cron would have to keep in sync with a date.
- **Snapshot fields.** `SafetyIncident.driver_name` / `driver_phone` are copied from `DriverProfile` at creation time, not joined live — ops needs a callable number in the first 30 seconds regardless of whether the profile still exists or has since changed.
- **Private media never exposes its storage id.** `cloudinary_public_id` (on `SafetyIncidentPhoto`, `DriverDocument`, `CampaignCreative`) uses Cloudinary's `authenticated` delivery type and is only ever served through an authenticated proxy route — never returned raw to a client.
- **Per-app push tokens + per-app notification inbox tables**, not one shared table: `OpsPushToken`/`CustomerPushToken`/`DriverPushToken`, and `CustomerNotification`/`DriverNotification`/`AnnouncementDelivery`. Each audience's inbox is filtered and merged client-side, not queried across apps.
- **`org_id` is nullable on purpose** wherever a table predates multi-tenant advertiser orgs (`Campaign`, `SupportCase`, `CustomerNotification`) — pre-org rows stay `null` rather than being backfilled into a solo org.
- **`@@map`** gives every model its snake_case table name — use the table name (right column below) when working in `psql` or Neon's SQL editor; use the model name in Prisma code.

## Public lead capture

Written by unauthenticated marketing forms (`apps/api` public routes), read by ops.

| Model | Table | Purpose |
|---|---|---|
| `Lead` | `leads` | Campaign brief inquiries (`POST /v1/public/leads`, audience `campaign`) |
| `FleetPartner` | `fleet_partners` | Fleet partnership inquiries (`POST /v1/public/leads`, audience `fleet`) |
| `Driver` | `drivers` | Driver interest/lead capture (`POST /v1/public/drivers`) — **not** the authenticated driver account; see `DriverProfile` below |
| `WaitlistEntry` | `waitlist_entries` | Homepage/landing waitlist signups |
| `MediaKitRequest` | `media_kit_requests` | Media kit download requests |

## Push notifications & broadcasts

| Model | Table | Purpose |
|---|---|---|
| `OpsPushToken` | `ops_push_tokens` | Expo push tokens for ops staff devices |
| `CustomerPushToken` | `customer_push_tokens` | Expo push tokens for customer-web/mobile, keyed by Clerk user or anonymous device id |
| `DriverPushToken` | `driver_push_tokens` | Same shape, driver apps |
| `AnnouncementBroadcast` | `announcement_broadcasts` | An ops-authored broadcast sent to one or more target apps |
| `AnnouncementDelivery` | `announcement_deliveries` | One row per (broadcast, recipient) resolved **at send time** — this is what a signed-in user's inbox reads, so a new account never sees history from before they joined |
| `PushTicket` | `push_tickets` | One row per push message handed to Expo; a ticket only means Expo queued it — the delivery receipt (fetched later) proves FCM/APNs took it |

## Support

| Model | Table | Purpose |
|---|---|---|
| `Customer` | `customers` | Dormant scaffold for real customer auth — nullable everywhere it's referenced today; not the primary customer identity (Clerk is) |
| `SupportCase` | `support_cases` | A support ticket, opened by web/mobile/anonymous visitor, optionally tied to an `AdvertiserOrg` or a driver |
| `SupportIdentity` | `support_identities` | Email-level access token minted the first time an email opens a case, so a device can list all of that email's cases without a bare email query param |
| `SupportMessage` | `support_messages` | One message/reply in a case's thread; `internal_note` hides ops-only notes from the customer |

## Safety / SOS (driver)

| Model | Table | Purpose |
|---|---|---|
| `SafetyIncident` | `safety_incidents` | A driver-reported SOS — accident, harassment, theft, etc. Deliberately **not** a `SupportCase` category: measured by acknowledgement latency, always from an authenticated driver, never buried behind billing questions in the helpdesk inbox |
| `SafetyIncidentPhoto` | `safety_incident_photos` | Photo evidence attached to an incident |
| `SafetyIncidentUpdate` | `safety_incident_updates` | One entry in the incident thread; `author_type: "system"` records lifecycle events (acknowledged/resolved/cancelled) in the same feed as human messages |

See [SAFETY-SOS.md](./SAFETY-SOS.md) for the full flow.

## Platform-wide

| Model | Table | Purpose |
|---|---|---|
| `PlatformFlag` | `platform_flags` | Ops-controlled visibility toggles (e.g. the `deliveries` placeholder screens). Public and unauthenticated to **read** — flags are visibility switches, never secrets — Clerk ops JWT required to write |
| `AuditEvent` | `audit_events` | Cross-app "who did what, when" trail — ops, public forms, customer apps. Write path is API route handlers only; client apps never insert directly |
| `Integration` | `integrations` | A third-party tool/service the business pays for, managed at ops → Settings → Integrations. See [ops-integrations.html](./ops-integrations.html) |

## Ops staff RBAC

| Model | Table | Purpose |
|---|---|---|
| `OpsRole` | `ops_roles` | A named permission set for ops staff |
| `OpsRoleAssignment` | `ops_role_assignments` | One custom role per Clerk org member — `org:admin` (Clerk org role) bypasses this entirely |

## Advertiser orgs & RBAC

A tenancy layer over advertiser accounts. Every advertiser gets an `AdvertiserOrg` automatically at sign-up (a solo advertiser is an org of one and never sees org UI).

| Model | Table | Purpose |
|---|---|---|
| `AdvertiserOrg` | `advertiser_orgs` | The tenant: name, billing email, KRA PIN |
| `AdvertiserMember` | `advertiser_members` | One row per advertiser user. `clerk_user_id` is globally unique — that's how "one org per user in v1" is enforced, as a DB constraint rather than app code |
| `AdvertiserRole` | `advertiser_roles` | A permission set. `org_id = null` rows are shared starter roles (**Admin**, **Member**); a non-null `org_id` is a custom role belonging to one org |
| `AdvertiserInvitation` | `advertiser_invitations` | A pending invite by email + role |
| `AdvertiserAdminRequest` | `advertiser_admin_requests` | A member asking to be made an Admin, with their reason, for the owner (or an existing Admin) to review |

**Owner vs Admin** — see [APP.md § Org permissions in the UI](../customer/APP.md#org-permissions-in-the-ui) for the full explanation. Short version: `AdvertiserMember.is_owner` is exactly one member per org (bypasses every permission check; the only one who can delete the org, edit roles, or transfer ownership). "Admin" is an ordinary row in `AdvertiserRole` (`role_id`) — any number of members can hold it.

## Driver profile & onboarding

Distinct from the marketing `Driver` lead table above — this is the authenticated driver's actual account, keyed by the **driver** Clerk instance's user id.

| Model | Table | Purpose |
|---|---|---|
| `DriverProfile` | `driver_profiles` | Profile-completion application: personal/vehicle/payout details, `draft → submitted → approved/rejected/changes_requested` |
| `DriverDocument` | `driver_documents` | An uploaded file for a profile step (national ID, profile photo, KRA PIN certificate, payout proof) |
| `DriverNotification` | `driver_notifications` | Per-driver inbox row (application submitted/reviewed) |

## Campaigns

The advertiser product surface — briefs, review, and creative assets.

| Model | Table | Purpose |
|---|---|---|
| `Campaign` | `campaigns` | One advertiser campaign brief. `status` holds **only** the review lifecycle (`draft → submitted → approved/rejected/changes_requested/cancelled`) — the flight phase (scheduled/live/completed) is derived from `starts_on`/`ends_on`, never stored |
| `CampaignCreative` | `campaign_creatives` | An uploaded creative asset. Only PNG/JPG/GIF/MP4 accepted — the supplier LED player can't decode anything else. `width`/`height`/`duration_seconds` are captured eagerly at upload, never backfilled |
| `CustomerNotification` | `customer_notifications` | Per-advertiser inbox row (campaign submitted/reviewed), field-for-field the same shape as `DriverNotification` plus `href` for deep-linking |

Supplier/screen-API dispatch state is deliberately **not** in this schema yet — see the "Supplier / screen-API seam" note in [DATA-LAYER.md](./DATA-LAYER.md#supplier--screen-api-seam) before adding columns for it.

## Payload CMS (separate schema surface)

Owned by Payload, not hand-edited via Prisma. Collections: [`apps/web/collections/`](../../apps/web/collections):

| Collection | Purpose |
|---|---|
| `HelpCategories`, `HelpArticles` | Help center (`/help`) — see [HELP-CMS.md](../web/HELP-CMS.md) |
| `BlogPosts` | Blog (`/blog`) — see [BLOG-CMS.md](../web/BLOG-CMS.md) |
| `Media` | Upload storage backing both |
| `Users` | Payload admin auth (`/admin`), unrelated to Clerk |

Full field-level schema for these lives in the collection config files themselves (they change independently of this doc) and in Payload's generated `payload-types.ts` — not duplicated here.

## Changing the schema

Don't `prisma db push` against the shared Neon database — see [DATA-LAYER.md § Migration rules](./DATA-LAYER.md#migration-rules-read-before-touching-the-db) and [DEV-SETUP.md](./DEV-SETUP.md) for the actual commands (additive SQL scripts under `apps/web/prisma/scripts/`, `prisma migrate deploy`, or a seed script, depending on the change). When you add a model, add its row to the matching table above in the same change.

## Related docs

- [DATA-LAYER.md](./DATA-LAYER.md) — Prisma vs Payload split, env vars, migration rules, request routing
- [ARCHITECTURE.md](./ARCHITECTURE.md) — repo layout
- [AUTH.md](./AUTH.md) — Clerk instances (ops / customer / driver) and how `clerk_user_id` maps across them
- [SAFETY-SOS.md](./SAFETY-SOS.md) — the SOS flow in detail
- [API.md](../api/API.md) — routes that read/write these tables
