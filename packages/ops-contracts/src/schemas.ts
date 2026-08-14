import { z } from "zod"

import {
  AD_FORMATS,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_TARGET_APPS,
  BUDGET_RANGES,
  CITIES,
  DATE_RANGE_KEYS,
  DAYS_PER_WEEK,
  DRIVER_DOCUMENT_TYPES,
  DRIVER_PAYOUT_METHODS,
  DRIVER_PROFILE_STATUSES,
  DRIVER_STATUSES,
  FLEET_STATUSES,
  FLEET_TYPES,
  HEARD_ABOUT,
  LEAD_CITIES,
  LEAD_STATUSES,
  PLATFORM_FLAG_KEYS,
  SUPPORT_CATEGORIES,
  SUPPORT_CHANNELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  VEHICLE_TYPES,
  VEHICLES_ACTIVE,
} from "./enums"

export const leadCreateSchema = z.object({
  contact_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  cities: z.array(z.enum(LEAD_CITIES)).default([]),
  ad_formats: z.array(z.enum(AD_FORMATS)).default([]),
  duration: z.string().optional(),
  budget_range: z.enum(BUDGET_RANGES).optional(),
  additional_info: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
})

export const leadUpdateSchema = leadCreateSchema.partial()

export const fleetCreateSchema = z.object({
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  primary_contact_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  city: z.enum(CITIES),
  fleet_types: z.array(z.enum(FLEET_TYPES)).min(1, "Select at least one fleet type."),
  fleet_size: z.string().optional(),
  vehicles_active: z.enum(VEHICLES_ACTIVE).optional(),
  notes: z.string().optional(),
  status: z.enum(FLEET_STATUSES).optional(),
})

export const fleetUpdateSchema = fleetCreateSchema.partial()

export const driverCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  city: z.enum(CITIES),
  vehicle_type: z.enum(VEHICLE_TYPES).optional(),
  days_per_week: z.enum(DAYS_PER_WEEK).optional(),
  heard_about: z.enum(HEARD_ABOUT).optional(),
  status: z.enum(DRIVER_STATUSES).optional(),
  notes: z.string().optional(),
})

export const driverUpdateSchema = driverCreateSchema.partial()

export const waitlistCreateSchema = z.object({
  email: z.string().trim().email(),
  source: z.string().optional(),
})

export const waitlistUpdateSchema = waitlistCreateSchema.partial()

export const mediaKitCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
})

export const mediaKitUpdateSchema = mediaKitCreateSchema.partial()

export const platformFlagUpdateSchema = z.object({
  key: z.enum(PLATFORM_FLAG_KEYS),
  enabled: z.boolean(),
})

const bulkIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})

export const bulkDeleteSchema = bulkIdsSchema.extend({
  action: z.literal("delete"),
})

export const leadBulkSchema = z.discriminatedUnion("action", [
  bulkDeleteSchema,
  bulkIdsSchema.extend({
    action: z.literal("updateStatus"),
    status: z.enum(LEAD_STATUSES),
  }),
])

export const driverBulkSchema = z.discriminatedUnion("action", [
  bulkDeleteSchema,
  bulkIdsSchema.extend({
    action: z.literal("updateStatus"),
    status: z.enum(DRIVER_STATUSES),
  }),
])

export const fleetBulkSchema = z.discriminatedUnion("action", [
  bulkDeleteSchema,
  bulkIdsSchema.extend({
    action: z.literal("updateStatus"),
    status: z.enum(FLEET_STATUSES),
  }),
])

export const waitlistBulkSchema = bulkDeleteSchema

export const mediaKitBulkSchema = bulkDeleteSchema

/** Partial by design — the profile-setup stepper autosaves one step's fields
 * at a time via PATCH, not one final submit. See driverProfileSubmitSchema. */
export const driverProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  national_id_number: z.string().trim().min(1).optional(),
  kra_pin: z.string().trim().min(1).optional(),
  payout_method: z.enum(DRIVER_PAYOUT_METHODS).optional(),
  payout_mpesa_msisdn: z.string().trim().min(1).optional(),
  payout_bank_name: z.string().trim().min(1).optional(),
  payout_bank_account: z.string().trim().min(1).optional(),
})

export const driverDocumentTypeSchema = z.enum(DRIVER_DOCUMENT_TYPES)

export const driverProfileReviewSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  reason: z.string().trim().min(1).max(2000).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
})

export const statsRangeSchema = z.object({
  range: z.enum(DATE_RANGE_KEYS).default("30d"),
})

export const supportCaseCreateSchema = z.object({
  contact_name: z.string().trim().min(1),
  contact_email: z.string().trim().email(),
  contact_phone: z.string().trim().optional(),
  anonymous_device_id: z.string().trim().optional(),
  channel: z.enum(SUPPORT_CHANNELS),
  category: z.enum(SUPPORT_CATEGORIES).default("general"),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
})

export const supportMessageCreateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  internal_note: z.boolean().optional(),
})

export const supportCaseUpdateSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  assigned_to_clerk_id: z.string().nullable().optional(),
  assigned_to_email: z.string().nullable().optional(),
})

export const broadcastCreateSchema = z.object({
  title: z.string().trim().min(1).max(65),
  body: z.string().trim().min(1).max(178),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  image_url: z.string().url().nullable().optional(),
  target_apps: z
    .array(z.enum(ANNOUNCEMENT_TARGET_APPS))
    .min(1, "Select at least one app.")
    .default(["customer-mobile"]),
})

export type LeadCreateInput = z.infer<typeof leadCreateSchema>
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>
export type FleetCreateInput = z.infer<typeof fleetCreateSchema>
export type FleetUpdateInput = z.infer<typeof fleetUpdateSchema>
export type DriverCreateInput = z.infer<typeof driverCreateSchema>
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>
export type WaitlistCreateInput = z.infer<typeof waitlistCreateSchema>
export type WaitlistUpdateInput = z.infer<typeof waitlistUpdateSchema>
export type MediaKitCreateInput = z.infer<typeof mediaKitCreateSchema>
export type MediaKitUpdateInput = z.infer<typeof mediaKitUpdateSchema>
export type PlatformFlagUpdateInput = z.infer<typeof platformFlagUpdateSchema>
export type DriverProfileUpdateInput = z.infer<typeof driverProfileUpdateSchema>
export type DriverProfileReviewInput = z.infer<typeof driverProfileReviewSchema>
export type PaginationParams = z.infer<typeof paginationSchema>
export type LeadBulkInput = z.infer<typeof leadBulkSchema>
export type DriverBulkInput = z.infer<typeof driverBulkSchema>
export type FleetBulkInput = z.infer<typeof fleetBulkSchema>
export type WaitlistBulkInput = z.infer<typeof waitlistBulkSchema>
export type MediaKitBulkInput = z.infer<typeof mediaKitBulkSchema>
export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>
export type SupportCaseCreateInput = z.infer<typeof supportCaseCreateSchema>
export type SupportMessageCreateInput = z.infer<typeof supportMessageCreateSchema>
export type SupportCaseUpdateInput = z.infer<typeof supportCaseUpdateSchema>
