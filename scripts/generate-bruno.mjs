/**
 * One-shot generator for the Admobi Bruno collection.
 * Run: node scripts/generate-bruno.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const ROOT = join(process.cwd(), "bruno")

function write(rel, content) {
  const path = join(ROOT, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content.trimStart().replace(/\n$/, "") + "\n", "utf8")
}

function http({ name, seq, method, url, headers = {}, body, auth, docs }) {
  // Bruno requires body + auth INSIDE the method block or requests are ignored.
  const bodyMode = body === undefined ? "none" : "json"
  let authMode = "none"
  let tokenVar = null
  if (auth === "bearer") {
    authMode = "bearer"
    tokenVar = "clerk_jwt"
  } else if (auth === "cron") {
    authMode = "bearer"
    tokenVar = "cron_secret"
  } else if (auth === "inherit") {
    authMode = "inherit"
  }

  const lines = [
    `meta {`,
    `  name: ${name}`,
    `  type: http`,
    `  seq: ${seq}`,
    `}`,
    ``,
    `${method} {`,
    `  url: ${url}`,
    `  body: ${bodyMode}`,
    `  auth: ${authMode}`,
    `}`,
  ]

  if (tokenVar) {
    lines.push(``, `auth:bearer {`, `  token: {{${tokenVar}}}`, `}`)
  }

  const headerEntries = Object.entries(headers)
  if (headerEntries.length) {
    lines.push(``, `headers {`)
    for (const [k, v] of headerEntries) lines.push(`  ${k}: ${v}`)
    lines.push(`}`)
  }

  if (body !== undefined) {
    lines.push(``, `body:json {`, `  ${JSON.stringify(body, null, 2).replace(/\n/g, "\n  ")}`, `}`)
  }

  if (docs) {
    lines.push(``, `docs {`, `  ${docs}`, `}`)
  }

  return lines.join("\n") + "\n"
}

function folder(name, seq, extra = "") {
  return `meta {
  name: ${name}
  seq: ${seq}
}
${extra}`.trimEnd() + "\n"
}

// --- root ---
write(
  "bruno.json",
  JSON.stringify(
    {
      version: "1",
      name: "Admobi HQ",
      type: "collection",
      ignore: ["node_modules", ".git"],
    },
    null,
    2,
  ),
)

write(
  "collection.bru",
  `meta {
  name: Admobi HQ
}

headers {
  Accept: application/json
  Content-Type: application/json
}

docs {
  Git-friendly API collection for the Admobi monorepo.

  Primary: Business API (apps/api) under {{API_URL}}/v1
  Optional: Payload CMS (apps/web) under {{WEB_URL}}/api
  Health: customer-web under {{APP_URL}}/api/health

  Auth:
  - Public routes: none
  - Admin routes: Clerk JWT in secret var clerk_jwt (must be @admobihq.com)
  - Cron: secret var cron_secret for push-receipts check

  Sources of truth: docs/api/API.md, packages/ops-contracts, apps/api/app/v1/
}
`,
)

const envs = [
  ["local", { API_URL: "http://localhost:3003", WEB_URL: "http://localhost:3000", OPS_URL: "http://localhost:3001", APP_URL: "http://localhost:3002" }],
  ["staging", { API_URL: "https://api.staging.admobihq.com", WEB_URL: "https://staging.admobihq.com", OPS_URL: "https://ops.staging.admobihq.com", APP_URL: "https://app.staging.admobihq.com" }],
  ["production", { API_URL: "https://api.admobihq.com", WEB_URL: "https://admobihq.com", OPS_URL: "https://ops.admobihq.com", APP_URL: "https://app.admobihq.com" }],
]

for (const [name, vars] of envs) {
  write(
    `environments/${name}.bru`,
    `vars {
${Object.entries(vars)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}
  resource_id: 1
}

vars:secret [
  clerk_jwt
  cron_secret
]
`,
  )
}

// --- business-api ---
write("business-api/folder.bru", folder("Business API", 1))

write("business-api/public/folder.bru", folder("Public", 1))

write(
  "business-api/public/health.bru",
  http({
    name: "Health",
    seq: 1,
    method: "get",
    url: "{{API_URL}}/v1/health",
    auth: "none",
    docs: "Smoke check for apps/api.",
  }),
)

write(
  "business-api/public/create-campaign-lead.bru",
  http({
    name: "Create Campaign Lead",
    seq: 2,
    method: "post",
    url: "{{API_URL}}/v1/public/leads",
    auth: "none",
    body: {
      audience: "campaign",
      name: "Jane Doe",
      email: "jane@example.com",
      company: "Acme Ads",
      phone: "+254700000000",
      cities: ["Nairobi"],
      adFormats: ["taxi_top"],
      duration: "1_month",
      budget: "50k_150k",
      brief: "Launch Q3 brand campaign",
      consent: true,
    },
  }),
)

write(
  "business-api/public/create-fleet-lead.bru",
  http({
    name: "Create Fleet Lead",
    seq: 3,
    method: "post",
    url: "{{API_URL}}/v1/public/leads",
    auth: "none",
    body: {
      audience: "fleet",
      fleetOrCompanyName: "City Cabs Ltd",
      primaryContactName: "John Kamau",
      email: "ops@citycabs.example",
      phone: "+254711000000",
      city: "Nairobi",
      fleetTypes: ["taxi"],
      vehicleCount: 25,
      vehiclesActive: "yes",
      notes: "Interested in rooftop ads",
      consent: true,
    },
  }),
)

write(
  "business-api/public/create-driver.bru",
  http({
    name: "Create Driver",
    seq: 4,
    method: "post",
    url: "{{API_URL}}/v1/public/drivers",
    auth: "none",
    body: {
      name: "Mary Wanjiku",
      phone: "+254722000000",
      email: "mary@example.com",
      city: "Nairobi",
      vehicleType: "taxi",
      daysPerWeek: "daily",
      heardAbout: "whatsapp",
      consent: true,
    },
  }),
)

write(
  "business-api/public/create-waitlist.bru",
  http({
    name: "Create Waitlist Entry",
    seq: 5,
    method: "post",
    url: "{{API_URL}}/v1/public/waitlist",
    auth: "none",
    body: { email: "waitlist@example.com" },
  }),
)

write(
  "business-api/public/create-media-kit.bru",
  http({
    name: "Create Media Kit Request",
    seq: 6,
    method: "post",
    url: "{{API_URL}}/v1/public/media-kit",
    auth: "none",
    body: { name: "Press Contact", email: "press@example.com" },
  }),
)

write(
  "business-api/public/list-announcements.bru",
  http({
    name: "List Announcements",
    seq: 7,
    method: "get",
    url: "{{API_URL}}/v1/public/announcements",
    auth: "none",
  }),
)

write(
  "business-api/public/register-push-token.bru",
  http({
    name: "Register Customer Push Token",
    seq: 8,
    method: "post",
    url: "{{API_URL}}/v1/public/push-tokens",
    auth: "none",
    body: {
      expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "android",
    },
  }),
)

// --- admin folder (Clerk JWT) ---
write(
  "business-api/admin/folder.bru",
  folder(
    "Admin",
    2,
    `
docs {
  Requires Clerk session JWT for an @admobihq.com user.
  Set secret env var clerk_jwt in Bruno before running these requests.
}
`,
  ),
)

function crudFolder(resource, apiPath, createBody, updateBody, bulkBody, listQuery = "page=1&pageSize=20") {
  const base = `business-api/admin/${resource}`
  write(`${base}/folder.bru`, folder(resource.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), 1))

  let seq = 1
  write(
    `${base}/list.bru`,
    http({
      name: `List ${resource}`,
      seq: seq++,
      method: "get",
      url: `{{API_URL}}/v1/${apiPath}?${listQuery}`,
      auth: "bearer",
    }),
  )
  write(
    `${base}/get.bru`,
    http({
      name: `Get ${resource}`,
      seq: seq++,
      method: "get",
      url: `{{API_URL}}/v1/${apiPath}/{{resource_id}}`,
      auth: "bearer",
    }),
  )
  write(
    `${base}/create.bru`,
    http({
      name: `Create ${resource}`,
      seq: seq++,
      method: "post",
      url: `{{API_URL}}/v1/${apiPath}`,
      auth: "bearer",
      body: createBody,
    }),
  )
  write(
    `${base}/update.bru`,
    http({
      name: `Update ${resource}`,
      seq: seq++,
      method: "patch",
      url: `{{API_URL}}/v1/${apiPath}/{{resource_id}}`,
      auth: "bearer",
      body: updateBody,
    }),
  )
  write(
    `${base}/delete.bru`,
    http({
      name: `Delete ${resource}`,
      seq: seq++,
      method: "delete",
      url: `{{API_URL}}/v1/${apiPath}/{{resource_id}}`,
      auth: "bearer",
    }),
  )
  write(
    `${base}/bulk.bru`,
    http({
      name: `Bulk ${resource}`,
      seq: seq++,
      method: "post",
      url: `{{API_URL}}/v1/${apiPath}/bulk`,
      auth: "bearer",
      body: bulkBody,
    }),
  )
}

crudFolder(
  "leads",
  "leads",
  {
    contact_name: "Jane Doe",
    email: "jane@example.com",
    company_name: "Acme Ads",
    phone: "+254700000000",
    cities: ["Nairobi"],
    ad_formats: ["taxi_top"],
    duration: "1_month",
    budget_range: "50k_150k",
    additional_info: "Created from Bruno",
    status: "new",
  },
  { status: "contacted" },
  { action: "updateStatus", ids: [1], status: "qualified" },
  "page=1&pageSize=20&status=new",
)

crudFolder(
  "fleet",
  "fleet",
  {
    email: "ops@citycabs.example",
    company_name: "City Cabs Ltd",
    primary_contact_name: "John Kamau",
    phone: "+254711000000",
    city: "Nairobi",
    fleet_types: ["taxi"],
    fleet_size: "25",
    vehicles_active: "yes",
    notes: "Created from Bruno",
    status: "pending",
  },
  { status: "verified" },
  { action: "updateStatus", ids: [1], status: "active" },
  "page=1&pageSize=20&city=Nairobi",
)

crudFolder(
  "drivers",
  "drivers",
  {
    name: "Mary Wanjiku",
    phone: "+254722000000",
    email: "mary@example.com",
    city: "Nairobi",
    vehicle_type: "taxi",
    days_per_week: "daily",
    heard_about: "whatsapp",
    status: "pending",
    notes: "Created from Bruno",
  },
  { status: "verified" },
  { action: "updateStatus", ids: [1], status: "active" },
  "page=1&pageSize=20&city=Nairobi",
)

crudFolder(
  "waitlist",
  "waitlist",
  { email: "waitlist-admin@example.com", source: "bruno" },
  { source: "bruno-updated" },
  { action: "delete", ids: [1] },
)

crudFolder(
  "media-kit",
  "media-kit",
  { name: "Press Contact", email: "press@example.com" },
  { name: "Updated Press Contact" },
  { action: "delete", ids: [1] },
)

write(
  "business-api/admin/stats.bru",
  http({
    name: "Get Stats",
    seq: 10,
    method: "get",
    url: "{{API_URL}}/v1/stats?range=30d",
    auth: "bearer",
    docs: "range: 7d | 30d | 90d | all",
  }),
)

write(
  "business-api/admin/audit.bru",
  http({
    name: "List Audit Events",
    seq: 11,
    method: "get",
    url: "{{API_URL}}/v1/audit?page=1&pageSize=20",
    auth: "bearer",
  }),
)

write("business-api/admin/notifications/folder.bru", folder("Notifications", 12))

write(
  "business-api/admin/notifications/list.bru",
  http({
    name: "List Notifications",
    seq: 1,
    method: "get",
    url: "{{API_URL}}/v1/notifications?page=1&pageSize=20",
    auth: "bearer",
  }),
)

write(
  "business-api/admin/notifications/broadcast.bru",
  http({
    name: "Broadcast Notification",
    seq: 2,
    method: "post",
    url: "{{API_URL}}/v1/notifications/broadcast",
    auth: "bearer",
    body: {
      title: "System update",
      body: "We shipped a small reliability fix. No action needed.",
      category: "announcement",
    },
  }),
)

write("business-api/admin/push-tokens/folder.bru", folder("Push Tokens", 13))

write(
  "business-api/admin/push-tokens/register.bru",
  http({
    name: "Register Ops Push Token",
    seq: 1,
    method: "post",
    url: "{{API_URL}}/v1/push-tokens",
    auth: "bearer",
    body: {
      expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "ios",
    },
  }),
)

write(
  "business-api/admin/push-tokens/unregister.bru",
  http({
    name: "Unregister Ops Push Token",
    seq: 2,
    method: "delete",
    url: "{{API_URL}}/v1/push-tokens",
    auth: "bearer",
    body: {
      expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    },
  }),
)

write(
  "business-api/admin/push-receipts-check.bru",
  http({
    name: "Check Push Receipts",
    seq: 14,
    method: "post",
    url: "{{API_URL}}/v1/push-receipts/check",
    auth: "cron",
    docs: "Accepts CRON_SECRET or Clerk ops JWT. Prefer cron_secret for scheduled runs.",
  }),
)

write(
  "business-api/admin/push-receipts-check-get.bru",
  http({
    name: "Check Push Receipts (GET)",
    seq: 15,
    method: "get",
    url: "{{API_URL}}/v1/push-receipts/check",
    auth: "cron",
    docs: "Same handler as POST. Vercel Cron typically uses GET.",
  }),
)

// --- payload cms ---
write(
  "payload-cms/folder.bru",
  folder(
    "Payload CMS",
    2,
    `
docs {
  Payload 3 REST on apps/web. Auth via Payload admin session cookie when needed.
  Base: {{WEB_URL}}/api/{collection-slug}
}
`,
  ),
)

const payloadCollections = [
  ["list-users", "users"],
  ["list-media", "media"],
  ["list-help-categories", "help-categories"],
  ["list-help-articles", "help-articles"],
  ["list-blog-posts", "blog-posts"],
]

payloadCollections.forEach(([file, slug], i) => {
  write(
    `payload-cms/${file}.bru`,
    http({
      name: `List ${slug}`,
      seq: i + 1,
      method: "get",
      url: `{{WEB_URL}}/api/${slug}?limit=10`,
      auth: "none",
    }),
  )
})

// --- health ---
write("health/folder.bru", folder("App Health", 3))

write(
  "health/customer-web.bru",
  http({
    name: "Customer Web Health",
    seq: 1,
    method: "get",
    url: "{{APP_URL}}/api/health",
    auth: "none",
  }),
)

write(
  "README.md",
  `# Admobi Bruno collection

Open this folder in Bruno: **Open Collection** → select \`bruno/\`.

## Environments

| Env | API |
|-----|-----|
| \`local\` | http://localhost:3003 |
| \`staging\` | https://api.staging.admobihq.com |
| \`production\` | https://api.admobihq.com |

## Secrets (do not commit)

In Bruno → Environment → Secrets, set:

- \`clerk_jwt\` — Clerk session JWT for an \`@admobihq.com\` user (ops admin routes)
- \`cron_secret\` — value of \`CRON_SECRET\` (push-receipts check)

Optional: copy values into a gitignored \`*.local.bru\` if your Bruno version supports it.

## Quick start

1. \`npm run env:pull -w api\` then \`npm run dev -w api\`
2. Open Bruno → select **local** environment
3. Run **Business API → Public → Health**
4. Paste a Clerk JWT into \`clerk_jwt\`, then run admin requests

## Layout

- \`business-api/public\` — marketing / unauthenticated
- \`business-api/admin\` — Clerk-protected CRUD + stats/audit/notifications
- \`payload-cms\` — Payload collections on \`apps/web\`
- \`health\` — deploy smoke checks

Canonical route map: \`docs/api/API.md\`.
`,
)

console.log("Bruno collection written to", ROOT)
