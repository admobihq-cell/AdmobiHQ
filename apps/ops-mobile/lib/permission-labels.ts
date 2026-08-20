import type { OpsPermission } from "@workspace/ops-contracts"

/** Mirrors apps/ops/components/roles-view.tsx's PERMISSION_LABELS so role copy matches web exactly. */
export const PERMISSION_LABELS: Record<OpsPermission, string> = {
  leads: "Campaign Leads",
  fleet: "Fleet Partners",
  drivers: "Drivers",
  waitlist: "Waitlist",
  media_kit: "Media Kit",
  announcements: "Announcements",
  support: "Support",
  finances: "Finances",
  content: "Content (CMS)",
  flags: "Settings",
  activity: "Activity",
  driver_applications: "Driver Applications",
}
