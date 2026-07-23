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
