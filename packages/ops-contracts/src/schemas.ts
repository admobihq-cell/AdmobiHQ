import { z } from "zod"

import {
  AD_FORMATS,
  BUDGET_RANGES,
  CITIES,
  DATE_RANGE_KEYS,
  DAYS_PER_WEEK,
  DRIVER_STATUSES,
  FLEET_STATUSES,
  FLEET_TYPES,
  HEARD_ABOUT,
  LEAD_CITIES,
  LEAD_STATUSES,
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
export type PaginationParams = z.infer<typeof paginationSchema>
export type LeadBulkInput = z.infer<typeof leadBulkSchema>
export type DriverBulkInput = z.infer<typeof driverBulkSchema>
export type FleetBulkInput = z.infer<typeof fleetBulkSchema>
export type WaitlistBulkInput = z.infer<typeof waitlistBulkSchema>
export type MediaKitBulkInput = z.infer<typeof mediaKitBulkSchema>
