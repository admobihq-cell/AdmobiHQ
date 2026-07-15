export type EntityPageMeta = {
  title: string
  description: string
  columns: string[]
}

export const DRIVERS_PAGE: EntityPageMeta = {
  title: "Drivers",
  description: "Driver onboarding applications and walk-in registrations.",
  columns: ["Date", "Name", "Phone", "City", "Vehicle", "Source", "Status"],
}

export const FLEET_PAGE: EntityPageMeta = {
  title: "Fleet Partners",
  description: "Fleet operators applying to join the Admobi network.",
  columns: ["Date", "Company", "Contact", "City", "Size", "Status"],
}

export const LEADS_PAGE: EntityPageMeta = {
  title: "Campaign Leads",
  description: "Advertisers who submitted campaign briefs or were added manually.",
  columns: ["Date", "Contact", "Company", "Email", "Budget", "Status", "Brief"],
}

export const WAITLIST_PAGE: EntityPageMeta = {
  title: "Waitlist",
  description: "Early-interest emails from homepage and other CTAs.",
  columns: ["Joined", "Email", "Source"],
}

export const MEDIA_KIT_PAGE: EntityPageMeta = {
  title: "Media Kit Requests",
  description: "Marketers and agencies who requested the Admobi media kit.",
  columns: ["Date", "Name", "Email"],
}
