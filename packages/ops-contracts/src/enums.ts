export const CITIES = ["Nairobi", "Mombasa", "Kisumu"] as const
export type City = (typeof CITIES)[number]

// Campaign leads can request "All" cities in addition to a specific one.
export const LEAD_CITIES = [...CITIES, "All"] as const
export type LeadCity = (typeof LEAD_CITIES)[number]

export const AD_FORMATS = ["taxi_top", "delivery_bike"] as const
export type AdFormat = (typeof AD_FORMATS)[number]

export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const BUDGET_RANGES = [
  "under_50k",
  "50k_150k",
  "150k_500k",
  "500k_plus",
  "not_sure",
] as const
export type BudgetRange = (typeof BUDGET_RANGES)[number]

export const FLEET_STATUSES = ["pending", "verified", "active"] as const
export type FleetStatus = (typeof FLEET_STATUSES)[number]

export const DRIVER_STATUSES = ["pending", "verified", "active"] as const
export type DriverStatus = (typeof DRIVER_STATUSES)[number]

/** Progression of a driver's profile-completion application — see
 * DriverProfile in the Prisma schema. Distinct from DRIVER_STATUSES above,
 * which belongs to the unrelated marketing lead-capture "drivers" table. */
export const DRIVER_PROFILE_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "changes_requested",
] as const
export type DriverProfileStatus = (typeof DRIVER_PROFILE_STATUSES)[number]

/** Review lifecycle of an advertiser campaign — mirrors
 * DRIVER_PROFILE_STATUSES, plus "cancelled" for a campaign the advertiser
 * pulls. Deliberately holds ONLY the review lifecycle: the flight phase
 * (CAMPAIGN_FLIGHT_PHASES below) is derived from dates and never stored, and
 * supplier dispatch state is a third axis that lives in neither. */
export const CAMPAIGN_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "changes_requested",
  "cancelled",
] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

/** Derived at read time from starts_on / ends_on for approved campaigns —
 * see apps/api/lib/campaign-dto.ts. Never persisted: a stored "live" goes
 * stale the moment a date passes and would need a cron to repair. */
export const CAMPAIGN_FLIGHT_PHASES = [
  "unscheduled",
  "scheduled",
  "live",
  "completed",
] as const
export type CampaignFlightPhase = (typeof CAMPAIGN_FLIGHT_PHASES)[number]

/** Which physical panel a campaign runs on. Distinct from AD_FORMATS above,
 * which belongs to the marketing lead-capture form and has no "both". */
export const CAMPAIGN_FORMATS = ["taxi_top", "delivery_bike", "both"] as const
export type CampaignFormat = (typeof CAMPAIGN_FORMATS)[number]

// Campaign objectives are NOT redeclared here — CAMPAIGN_OBJECTIVES already
// exists below for the marketing start-campaign lead form, and a real campaign
// should speak the same vocabulary a lead does (a lead becomes a campaign).

export const DRIVER_DOCUMENT_TYPES = [
  "national_id",
  "profile_photo",
  "kra_pin_certificate",
  "payout_proof",
] as const
export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number]

export const DRIVER_PAYOUT_METHODS = ["mpesa", "bank"] as const
export type DriverPayoutMethod = (typeof DRIVER_PAYOUT_METHODS)[number]

export const FLEET_TYPES = ["taxi", "delivery_bike"] as const
export type FleetType = (typeof FLEET_TYPES)[number]

export const VEHICLE_TYPES = [
  "taxi",
  "delivery_bike",
  "three_wheeler",
  "other",
] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const DAYS_PER_WEEK = ["1_2", "3_4", "5_6", "daily"] as const
export type DaysPerWeek = (typeof DAYS_PER_WEEK)[number]

export const HEARD_ABOUT = [
  "whatsapp",
  "facebook",
  "friend",
  "roadside",
  "other",
] as const
export type HeardAbout = (typeof HEARD_ABOUT)[number]

export const VEHICLE_OWNERSHIP = ["owned", "rented", "financed"] as const
export type VehicleOwnership = (typeof VEHICLE_OWNERSHIP)[number]

export const HOURS_PER_DAY = ["under_4", "4_8", "8_12", "over_12"] as const
export type HoursPerDay = (typeof HOURS_PER_DAY)[number]

/** Ride-hailing / delivery platforms a driver or fleet operates on. */
export const RIDEHAIL_PLATFORMS = [
  "uber",
  "bolt",
  "little",
  "faras",
  "independent",
] as const
export type RidehailPlatform = (typeof RIDEHAIL_PLATFORMS)[number]

export const FLEET_EV_STATUS = ["none", "some", "mostly", "all"] as const
export type FleetEvStatus = (typeof FLEET_EV_STATUS)[number]

export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "launch",
  "promo",
  "footfall",
  "other",
] as const
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number]

export const CREATIVE_STATUS = ["ready", "needs_design", "not_sure"] as const
export type CreativeStatus = (typeof CREATIVE_STATUS)[number]

export const WAITLIST_PERSONA = [
  "advertiser",
  "driver",
  "fleet",
  "other",
] as const
export type WaitlistPersona = (typeof WAITLIST_PERSONA)[number]

export const VEHICLES_ACTIVE = ["yes", "no", "some"] as const
export type VehiclesActive = (typeof VEHICLES_ACTIVE)[number]

export const DATE_RANGE_KEYS = ["7d", "30d", "90d", "all"] as const
export type DateRangeKey = (typeof DATE_RANGE_KEYS)[number]

/** Categories shown in the customer notifications filter chips. */
export const ANNOUNCEMENT_CATEGORIES = [
  "announcement",
  "campaign",
  "billing",
  "promo",
  "system",
] as const
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number]

/** Which installed app(s) an announcement/push broadcast is sent to. */
export const ANNOUNCEMENT_TARGET_APPS = [
  "customer-mobile",
  "driver-mobile",
  "customer-web",
  "driver-web",
] as const
export type AnnouncementTargetApp = (typeof ANNOUNCEMENT_TARGET_APPS)[number]

export const AUDIT_APPS = [
  "api",
  "ops",
  "ops-mobile",
  "web",
  "customer-web",
  "customer-mobile",
  "driver-web",
  "driver-mobile",
] as const
export type AuditApp = (typeof AUDIT_APPS)[number]

export const AUDIT_ACTOR_TYPES = [
  "ops_user",
  "public",
  "system",
  "customer",
  "driver_user",
] as const
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "bulk_delete",
  "bulk_status",
  "broadcast",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ENTITY_TYPES = [
  "lead",
  "fleet",
  "driver",
  "waitlist",
  "media_kit",
  "announcement",
  "support_case",
  "platform_flag",
  "team_member",
  "team_invitation",
  "ops_role",
  "driver_profile",
  "driver_document",
  "campaign",
  "campaign_creative",
  "safety_incident",
] as const
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

/** Ops console access tiers, backed by Clerk Organizations roles (org:admin / org:member). */
export const OPS_ROLES = ["admin", "member"] as const
export type OpsRole = (typeof OPS_ROLES)[number]

/** Per-section console access — org:admin always has all of these; org:member
 * users have whatever their assigned OpsRole (see packages/ops-contracts/src/team.ts) grants. */
export const OPS_PERMISSIONS = [
  "leads",
  "fleet",
  "drivers",
  "waitlist",
  "media_kit",
  "announcements",
  "support",
  "finances",
  "content",
  "flags",
  "activity",
  "driver_applications",
  "campaigns",
  "safety",
] as const
export type OpsPermission = (typeof OPS_PERMISSIONS)[number]

/** Ops-controlled visibility switches — see PlatformFlag in the Prisma schema.
 *
 * SOS is deliberately NOT here: a driver's route to reporting an accident must
 * not depend on a toggle someone can forget to turn on. */
export const PLATFORM_FLAG_KEYS = ["deliveries"] as const
export type PlatformFlagKey = (typeof PLATFORM_FLAG_KEYS)[number]

export const SUPPORT_CHANNELS = [
  "web",
  "customer-web",
  "customer-mobile",
  "driver-web",
  "driver-mobile",
] as const
export type SupportChannel = (typeof SUPPORT_CHANNELS)[number]

export const SUPPORT_CATEGORIES = [
  "general",
  "billing",
  "campaign",
  "technical",
  "driver",
] as const
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]

export const SUPPORT_STATUSES = ["open", "pending", "resolved", "closed"] as const
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]

// ---------------------------------------------------------------------------
// Driver SOS / safety incidents
// ---------------------------------------------------------------------------

export const SAFETY_INCIDENT_TYPES = [
  "accident",
  "harassment",
  "theft",
  "vehicle_damage",
  "medical",
  "breakdown",
  "other",
] as const
export type SafetyIncidentType = (typeof SAFETY_INCIDENT_TYPES)[number]

export const SAFETY_SEVERITIES = ["critical", "high", "medium"] as const
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number]

export const SAFETY_INCIDENT_STATUSES = [
  "new",
  "acknowledged",
  "in_progress",
  "resolved",
  "cancelled",
] as const
export type SafetyIncidentStatus = (typeof SAFETY_INCIDENT_STATUSES)[number]

/** Statuses that accept no further driver input and no location pings. */
export const SAFETY_TERMINAL_STATUSES = ["resolved", "cancelled"] as const

/**
 * The driver is never asked to rate their own emergency — severity is derived
 * from the incident type at create, and ops adjusts it if wrong. Asking
 * someone who has just been hit to pick "critical" vs "high" is a worse form
 * than guessing and letting a human correct it.
 */
export const SEVERITY_BY_TYPE: Record<SafetyIncidentType, SafetySeverity> = {
  accident: "critical",
  medical: "critical",
  harassment: "critical",
  theft: "high",
  vehicle_damage: "medium",
  breakdown: "medium",
  other: "high",
}

/**
 * Drives the red acknowledgement clock in the ops SOS list. There is
 * deliberately no auto-escalation attached: an escalation path nobody is
 * rota'd for is theatre.
 */
export const ACK_TARGET_SECONDS = 300
