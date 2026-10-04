import fs from "node:fs"
import path from "node:path"

/**
 * The endpoint catalogue behind the landing page (app/page.tsx).
 *
 * Paths and methods are read from the route files under app/v1, so the page
 * cannot drift from what is deployed. Only the one-line notes are written by
 * hand; route-catalog.test.ts fails when a route has no note, which is the
 * prompt to describe a new endpoint here.
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
export type AudienceId = "public" | "ops" | "customer" | "driver" | "system"

export type Endpoint = { path: string; methods: HttpMethod[]; note?: string }
export type ResourceGroup = { name: string; endpoints: Endpoint[] }
export type AudienceGroup = {
  id: AudienceId
  title: string
  auth: string
  description: string
  resources: ResourceGroup[]
  count: number
}

const METHOD_ORDER: HttpMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"]

const AUDIENCES: Omit<AudienceGroup, "resources" | "count">[] = [
  {
    id: "public",
    title: "Public",
    auth: "No session",
    description:
      "Marketing forms, app launch config and support. CORS-enabled and rate-limited; a few accept an identity or push token in the body.",
  },
  {
    id: "ops",
    title: "Ops console",
    auth: "Ops Clerk session",
    description:
      "The internal console and ops mobile app. Each route checks the caller's role permission for the resource it touches.",
  },
  {
    id: "customer",
    title: "Advertiser app",
    auth: "Customer Clerk session",
    description:
      "Self-service for advertisers on web and mobile. Scoped to the caller's organization and their role within it.",
  },
  {
    id: "driver",
    title: "Driver app",
    auth: "Driver Clerk session",
    description: "Self-service for drivers: profile, documents, inboxes and SOS incidents.",
  },
  {
    id: "system",
    title: "System",
    auth: "None or cron secret",
    description: "Uptime probes and scheduled jobs.",
  },
]

const SYSTEM_PATHS = new Set(["/v1/health", "/v1/push-receipts/check"])

/** Section titles by first path segment. Key order is display order; unlisted segments follow, title-cased. */
const RESOURCE_LABELS: Record<string, string> = {
  me: "Session",
  stats: "Dashboard",
  leads: "Leads",
  fleet: "Fleet",
  drivers: "Drivers",
  waitlist: "Waitlist",
  "media-kit": "Media kit",
  campaigns: "Campaigns",
  "advertiser-orgs": "Advertiser organizations",
  "driver-applications": "Driver applications",
  "safety-incidents": "Safety incidents",
  support: "Support",
  notifications: "Notifications",
  announcements: "Announcements",
  "mobile-announcements": "Mobile announcements",
  "push-tokens": "Push tokens",
  "driver-push-tokens": "Push tokens",
  team: "Team",
  roles: "Roles",
  users: "Platform users",
  flags: "Platform flags",
  audit: "Activity log",
  ops: "Document export",
  org: "Organization",
  profile: "Profile",
  documents: "Documents",
  sos: "SOS",
  config: "Config",
  health: "Health",
  "push-receipts": "Push receipts",
}

const NOTES: Record<string, string> = {
  // Public
  "/v1/public/leads": "Campaign and fleet-partner enquiry forms",
  "/v1/public/drivers": "Driver enrolment form",
  "/v1/public/waitlist": "Waitlist signup",
  "/v1/public/media-kit": "Media kit request",
  "/v1/public/config": "Platform flags the apps read on launch",
  "/v1/public/announcements": "Announcement poll",
  "/v1/public/support": "Open a support case; listing your own needs an identity token",
  "/v1/public/support/[id]": "Read one support case",
  "/v1/public/support/[id]/messages": "Reply on a support case",
  "/v1/public/push-tokens": "Register an advertiser device for push",
  "/v1/public/driver-push-tokens": "Register a driver device for push",

  // Ops console
  "/v1/me": "Caller's role and permissions",
  "/v1/stats": "Overview stats and submissions over time",
  "/v1/leads": "List and create leads",
  "/v1/leads/[id]": "Read, update or delete a lead",
  "/v1/leads/bulk": "Bulk delete or status change",
  "/v1/fleet": "List and create fleet partners",
  "/v1/fleet/[id]": "Read, update or delete a fleet partner",
  "/v1/fleet/bulk": "Bulk delete or status change",
  "/v1/drivers": "List and create drivers",
  "/v1/drivers/[id]": "Read, update or delete a driver",
  "/v1/drivers/bulk": "Bulk delete or status change",
  "/v1/waitlist": "List and create waitlist entries",
  "/v1/waitlist/[id]": "Read, update or delete a waitlist entry",
  "/v1/waitlist/bulk": "Bulk delete or status change",
  "/v1/media-kit": "List and create media kit requests",
  "/v1/media-kit/[id]": "Read, update or delete a media kit request",
  "/v1/media-kit/bulk": "Bulk delete or status change",
  "/v1/campaigns": "List advertiser campaigns",
  "/v1/campaigns/[id]": "Read one campaign",
  "/v1/campaigns/[id]/review": "Approve or reject a submitted campaign",
  "/v1/campaigns/[id]/creatives/[creativeId]/file": "Stream a campaign creative",
  "/v1/advertiser-orgs": "List advertiser organizations",
  "/v1/advertiser-orgs/[id]": "Read one advertiser organization",
  "/v1/driver-applications": "List driver applications",
  "/v1/driver-applications/[id]": "Read one driver application",
  "/v1/driver-applications/[id]/review": "Approve or reject a driver application",
  "/v1/driver-applications/[id]/documents/[docId]/file": "Stream an application document",
  "/v1/safety-incidents": "List SOS incidents",
  "/v1/safety-incidents/[id]": "Read an incident; acknowledge or resolve it",
  "/v1/safety-incidents/[id]/messages": "Message the driver on an incident",
  "/v1/safety-incidents/[id]/photos/[photoId]/file": "Stream an incident photo",
  "/v1/support": "List support cases",
  "/v1/support/[id]": "Read or update a support case",
  "/v1/support/[id]/messages": "Reply on a support case",
  "/v1/notifications": "List announcement broadcasts",
  "/v1/notifications/[id]": "Remove a broadcast from the feed",
  "/v1/notifications/broadcast": "Send an announcement; also callable by cron",
  "/v1/notifications/broadcast-image": "Upload an announcement image",
  "/v1/push-tokens": "Register or remove an ops device for push",
  "/v1/team": "List ops members and invite one",
  "/v1/team/[userId]": "Change a member's role or remove them",
  "/v1/team/invitations/[invitationId]": "Revoke a pending invitation",
  "/v1/roles": "List and create ops roles",
  "/v1/roles/[roleId]": "Update or delete an ops role",
  "/v1/users": "Search drivers or advertisers by account",
  "/v1/flags": "Read and set platform flags",
  "/v1/audit": "Paginated audit events",
  "/v1/ops/documents/export": "Render a table export as PDF",

  // Advertiser app
  "/v1/customer/campaigns": "List and create campaigns",
  "/v1/customer/campaigns/[id]": "Read, edit or delete a campaign",
  "/v1/customer/campaigns/[id]/submit": "Submit a campaign for review",
  "/v1/customer/campaigns/[id]/creatives": "Upload a creative",
  "/v1/customer/campaigns/[id]/creatives/[creativeId]": "Remove a creative",
  "/v1/customer/campaigns/[id]/creatives/[creativeId]/file": "Stream a creative",
  "/v1/customer/campaigns/[id]/proof-of-play": "Proof-of-play PDF for an approved campaign",
  "/v1/customer/campaigns/statement": "Statement PDF of campaigns, budgets and totals",
  "/v1/customer/org": "Read and update the organization",
  "/v1/customer/org/activity": "Organization activity feed",
  "/v1/customer/org/members": "List members and invite one",
  "/v1/customer/org/members/[id]": "Change a member's role or remove them",
  "/v1/customer/org/roles": "List and create organization roles",
  "/v1/customer/org/roles/[roleId]": "Update or delete an organization role",
  "/v1/customer/org/invitations/[invitationId]": "Revoke a pending invitation",
  "/v1/customer/org/invitations/accept/[token]": "Preview and accept an invitation",
  "/v1/customer/org/invitations/decline/[token]": "Decline an invitation",
  "/v1/customer/org/admin-requests": "List admin-access requests and file one",
  "/v1/customer/org/admin-requests/[id]": "Approve or deny an admin-access request",
  "/v1/customer/org/leave": "Leave the organization",
  "/v1/customer/org/transfer-ownership": "Hand ownership to another member",
  "/v1/customer/org/delete-organization": "Delete the organization",
  "/v1/customer/org/deletion-status": "Whether the caller can delete their account",
  "/v1/customer/notifications": "Notification inbox",
  "/v1/customer/notifications/[id]": "Mark one notification read or unread",
  "/v1/customer/notifications/read": "Mark all notifications read",
  "/v1/customer/announcements": "Announcement inbox on web",
  "/v1/customer/announcements/[id]": "Mark one announcement read or unread",
  "/v1/customer/announcements/read": "Mark all announcements read",
  "/v1/customer/mobile-announcements": "Announcement inbox on mobile",
  "/v1/customer/mobile-announcements/read": "Mark all announcements read",

  // Driver app
  "/v1/driver/profile": "Read and edit the driver profile",
  "/v1/driver/profile/submit": "Submit the profile for review",
  "/v1/driver/documents": "Upload a profile document",
  "/v1/driver/documents/[id]": "Remove a document",
  "/v1/driver/documents/[id]/file": "Stream a document",
  "/v1/driver/sos": "Raise an SOS and list your own",
  "/v1/driver/sos/[id]": "Read or cancel an SOS",
  "/v1/driver/sos/[id]/location": "Send a fresh location ping",
  "/v1/driver/sos/[id]/messages": "Message ops on an SOS",
  "/v1/driver/sos/[id]/photos": "Attach a photo to an SOS",
  "/v1/driver/notifications": "Notification inbox",
  "/v1/driver/notifications/[id]": "Mark one notification read or unread",
  "/v1/driver/notifications/read": "Mark all notifications read",
  "/v1/driver/announcements": "Announcement inbox on web",
  "/v1/driver/announcements/[id]": "Mark one announcement read or unread",
  "/v1/driver/announcements/read": "Mark all announcements read",
  "/v1/driver/mobile-announcements": "Announcement inbox on mobile",
  "/v1/driver/mobile-announcements/read": "Mark all announcements read",

  // System
  "/v1/health": "Service status JSON for uptime checks",
  "/v1/push-receipts/check": "Nightly Expo push receipt reconciliation",
}

function audienceOf(routePath: string): AudienceId {
  if (SYSTEM_PATHS.has(routePath)) return "system"
  if (routePath.startsWith("/v1/public/")) return "public"
  if (routePath.startsWith("/v1/customer/")) return "customer"
  if (routePath.startsWith("/v1/driver/")) return "driver"
  return "ops"
}

/** First segment after /v1, skipping the audience prefix. */
function resourceOf(routePath: string, audience: AudienceId): string {
  const segments = routePath.split("/").slice(2)
  const prefixed = audience === "public" || audience === "customer" || audience === "driver"
  return segments[prefixed ? 1 : 0] ?? ""
}

const titleCase = (segment: string) =>
  segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll("-", " ")

function readMethods(file: string): HttpMethod[] {
  const source = fs.readFileSync(file, "utf8")
  return METHOD_ORDER.filter((method) =>
    new RegExp(`export\\s+(?:async\\s+function|const)\\s+${method}\\b`).test(source)
  )
}

export function discoverEndpoints(appDir = path.join(process.cwd(), "app")): Endpoint[] {
  const entries = fs.readdirSync(path.join(appDir, "v1"), { recursive: true, encoding: "utf8" })
  return entries
    .map((entry) => entry.replaceAll("\\", "/"))
    .filter((entry) => /(^|\/)route\.tsx?$/.test(entry))
    .map((entry) => {
      const routePath = `/v1/${entry.replace(/\/?route\.tsx?$/, "")}`.replace(/\/$/, "")
      return {
        path: routePath,
        methods: readMethods(path.join(appDir, "v1", entry)),
        note: NOTES[routePath],
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function buildCatalog(endpoints = discoverEndpoints()): AudienceGroup[] {
  const order = Object.keys(RESOURCE_LABELS)
  const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length)

  return AUDIENCES.map((audience) => {
    const own = endpoints.filter((endpoint) => audienceOf(endpoint.path) === audience.id)
    const keys = [...new Set(own.map((endpoint) => resourceOf(endpoint.path, audience.id)))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b)
    )
    return {
      ...audience,
      count: own.length,
      resources: keys.map((key) => ({
        name: RESOURCE_LABELS[key] ?? titleCase(key),
        endpoints: own.filter((endpoint) => resourceOf(endpoint.path, audience.id) === key),
      })),
    }
  }).filter((audience) => audience.count > 0)
}
