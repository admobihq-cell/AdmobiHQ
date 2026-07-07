import { z } from "zod"

export const leadCreateSchema = z.object({
  contact_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  cities: z.array(z.string()).default([]),
  ad_formats: z.array(z.string()).default([]),
  duration: z.string().optional(),
  budget_range: z
    .enum(["under_50k", "50k_150k", "150k_500k", "500k_plus", "not_sure"])
    .optional(),
  additional_info: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
})

export const leadUpdateSchema = leadCreateSchema.partial()

export const fleetCreateSchema = z.object({
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  primary_contact_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  fleet_types: z.array(z.enum(["taxi", "delivery_bike"])).min(1),
  fleet_size: z.string().optional(),
  vehicles_active: z.enum(["yes", "no", "some"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "verified", "active"]).optional(),
})

export const fleetUpdateSchema = fleetCreateSchema.partial()

export const driverCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  vehicle_type: z
    .enum(["taxi", "delivery_bike", "three_wheeler", "other"])
    .optional(),
  days_per_week: z.enum(["1_2", "3_4", "5_6", "daily"]).optional(),
  heard_about: z
    .enum(["whatsapp", "facebook", "friend", "roadside", "other"])
    .optional(),
  status: z.enum(["pending", "verified", "active"]).optional(),
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
