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
] as const
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

/** Ops-controlled visibility switches — see PlatformFlag in the Prisma schema. */
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
