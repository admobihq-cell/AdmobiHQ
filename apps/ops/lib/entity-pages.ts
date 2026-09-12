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

export const DRIVER_APPLICATIONS_PAGE: EntityPageMeta = {
  title: "Driver Applications",
  description:
    "Profile-completion submissions from signed-in drivers — personal info, National ID, KRA PIN, and payout details — awaiting review.",
  columns: ["Submitted", "Name", "Phone", "City", "Status"],
}

export const CAMPAIGNS_PAGE: EntityPageMeta = {
  title: "Campaigns",
  description:
    "Campaigns submitted by signed-in advertisers — brief, flight window, budget, and creative — awaiting review.",
  columns: [
    "Submitted",
    "Campaign",
    "Advertiser",
    "Market",
    "Flight",
    "Budget",
    "Creative",
    "Status",
  ],
}

export const ADVERTISER_ORGS_PAGE: EntityPageMeta = {
  title: "Advertiser orgs",
  description:
    "Advertiser organizations — team members, campaigns, and activity for shared accounts.",
  columns: ["Name", "Members", "Campaigns", "Created"],
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

export const ANNOUNCEMENTS_PAGE: EntityPageMeta = {
  title: "Announcements",
  description: "Broadcast a message to every installed customer app.",
  columns: ["Sent", "Title", "Message", "Delivered", "Status"],
}
