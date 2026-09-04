import { z } from "zod"

export const waitlistSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Use a valid email address."),
})

export const campaignLeadSchema = z.object({
  audience: z.literal("campaign"),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  cities: z
    .array(z.enum(["Nairobi", "Mombasa", "Kisumu", "All"]))
    .min(1, "Pick at least one city"),
  adFormats: z
    .array(z.enum(["taxi_top", "delivery_bike"]))
    .min(1, "Pick at least one format"),
  duration: z.enum(["1_day", "1_week", "2_weeks", "1_month", "ongoing"]),
  budget: z.enum(["under_50k", "50k_150k", "150k_500k", "500k_plus", "not_sure"]),
  brief: z.string().trim().optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, "You must agree to the privacy policy."),
})

export const fleetLeadSchema = z.object({
  audience: z.literal("fleet"),
  fleetOrCompanyName: z.string().trim().min(1),
  primaryContactName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  fleetTypes: z
    .array(z.enum(["taxi", "delivery_bike"]))
    .min(1, "Pick at least one fleet type"),
  vehicleCount: z.coerce.number().int().min(1),
  vehiclesActive: z.enum(["yes", "no", "some"]),
  taxiCount: z.coerce.number().int().min(0).optional(),
  bikeCount: z.coerce.number().int().min(0).optional(),
  operatingCities: z.array(z.enum(["Nairobi", "Mombasa", "Kisumu"])).optional(),
  evStatus: z.enum(["none", "some", "mostly", "all"]).optional(),
  notes: z.string().trim().optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, "You must agree to the privacy policy."),
})

export const leadBodySchema = z.discriminatedUnion("audience", [
  campaignLeadSchema,
  fleetLeadSchema,
])

export const driverJoinSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z
    .union([z.literal(""), z.string().email()])
    .optional()
    .transform((v) => (!v || v === "" ? undefined : v)),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  vehicleType: z.enum(["taxi", "delivery_bike", "three_wheeler", "other"]),
  daysPerWeek: z.enum(["1_2", "3_4", "5_6", "daily"]),
  heardAbout: z.enum(["whatsapp", "facebook", "friend", "roadside", "other"]),
  vehicleMakeModel: z.string().trim().max(120).optional(),
  vehicleYear: z.string().trim().max(20).optional(),
  vehicleOwnership: z.enum(["owned", "rented", "financed"]).optional(),
  routesAreas: z.string().trim().max(500).optional(),
  hoursPerDay: z.enum(["under_4", "4_8", "8_12", "over_12"]).optional(),
  platforms: z
    .array(z.enum(["uber", "bolt", "little", "faras", "independent"]))
    .optional(),
  applicantMessage: z.string().trim().max(2000).optional(),
  consent: z
    .boolean()
    .refine(
      (val) => val === true,
      "You must agree to the privacy policy and working terms.",
    ),
})

export const mediaKitSchema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: z.string().trim().email("Use a valid email address."),
})

export const supportContactSchema = z.object({
  contact_name: z.string().trim().min(1, "Enter your name"),
  contact_email: z.string().trim().email("Use a valid email address."),
  category: z.enum(["general", "billing", "campaign", "technical", "driver"]),
  subject: z.string().trim().min(1, "Add a subject").max(200),
  message: z.string().trim().min(1, "Tell us what's going on").max(5000),
})

export type CampaignLeadInput = z.infer<typeof campaignLeadSchema>
export type FleetLeadInput = z.infer<typeof fleetLeadSchema>
export type LeadBodyInput = z.infer<typeof leadBodySchema>
export type DriverJoinInput = z.infer<typeof driverJoinSchema>
export type MediaKitInput = z.infer<typeof mediaKitSchema>
export type SupportContactInput = z.infer<typeof supportContactSchema>
