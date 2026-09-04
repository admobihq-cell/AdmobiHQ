import {
  AD_FORMATS,
  BUDGET_RANGES,
  CAMPAIGN_OBJECTIVES,
  CITIES,
  DAYS_PER_WEEK,
  DRIVER_STATUSES,
  FLEET_EV_STATUS,
  FLEET_STATUSES,
  FLEET_TYPES,
  HEARD_ABOUT,
  LEAD_CITIES,
  LEAD_STATUSES,
  RIDEHAIL_PLATFORMS,
  VEHICLE_TYPES,
  VEHICLES_ACTIVE,
} from "./enums"
import { formatLabel } from "./format"
import type {
  DriverDto,
  FleetPartnerDto,
  LeadDto,
  MediaKitRequestDto,
  WaitlistEntryDto,
} from "./types"
import type {
  DriverCreateInput,
  DriverUpdateInput,
  FleetCreateInput,
  FleetUpdateInput,
  LeadCreateInput,
  LeadUpdateInput,
  MediaKitCreateInput,
  MediaKitUpdateInput,
  WaitlistCreateInput,
  WaitlistUpdateInput,
} from "./schemas"

export type FormFieldOption = { value: string; label: string }

export type FormFieldDef = {
  name: string
  label: string
  type?: "text" | "email" | "multiline"
  required?: boolean
  options?: FormFieldOption[]
  /** When true, the field stores a comma-separated list of `options` values and the picker allows multiple selections. */
  multi?: boolean
  placeholder?: string
  /**
   * Optional group title for mobile (and future web) forms.
   * Consecutive fields with the same section render as one grouped block.
   */
  section?: string
}

function enumOptions(values: readonly string[]): FormFieldOption[] {
  return values.map((value) => ({ value, label: formatLabel(value) }))
}

export function splitCsv(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

export const LEAD_FORM_FIELDS: FormFieldDef[] = [
  { name: "contact_name", label: "Contact name", required: true, section: "Contact" },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact" },
  { name: "company_name", label: "Company", required: true, section: "Contact" },
  { name: "phone", label: "Phone", section: "Contact" },
  {
    name: "cities",
    label: "Cities",
    multi: true,
    options: enumOptions(LEAD_CITIES),
    section: "Campaign",
  },
  {
    name: "ad_formats",
    label: "Ad formats",
    multi: true,
    options: [
      { value: "taxi_top", label: "Taxi-top screens" },
      { value: "delivery_bike", label: "Delivery bike boxes" },
    ],
    section: "Campaign",
  },
  {
    name: "duration",
    label: "Duration",
    options: [
      { value: "1_day", label: "1 day" },
      { value: "1_week", label: "1 week" },
      { value: "2_weeks", label: "2 weeks" },
      { value: "1_month", label: "1 month" },
      { value: "ongoing", label: "Ongoing" },
    ],
    section: "Campaign",
  },
  {
    name: "budget_range",
    label: "Budget",
    options: enumOptions(BUDGET_RANGES),
    section: "Campaign",
  },
  {
    name: "objective",
    label: "Objective",
    options: enumOptions(CAMPAIGN_OBJECTIVES),
    section: "Campaign",
  },
  { name: "industry", label: "Industry", section: "Campaign" },
  {
    name: "creative_status",
    label: "Creative status",
    options: [
      { value: "ready", label: "Artwork ready" },
      { value: "needs_design", label: "Needs design help" },
      { value: "not_sure", label: "Not sure yet" },
    ],
    section: "Campaign",
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(LEAD_STATUSES),
    section: "Campaign",
  },
  {
    name: "target_audience",
    label: "Target audience",
    type: "multiline",
    section: "Notes",
  },
  {
    name: "additional_info",
    label: "Brief / notes",
    type: "multiline",
    section: "Notes",
  },
]

export const DRIVER_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true, section: "Contact" },
  { name: "phone", label: "Phone", required: true, section: "Contact" },
  { name: "email", label: "Email", type: "email", section: "Contact" },
  {
    name: "city",
    label: "City",
    required: true,
    options: enumOptions(CITIES),
    section: "Details",
  },
  {
    name: "vehicle_type",
    label: "Vehicle type",
    options: enumOptions(VEHICLE_TYPES),
    section: "Details",
  },
  {
    name: "days_per_week",
    label: "Days per week",
    options: enumOptions(DAYS_PER_WEEK),
    section: "Details",
  },
  {
    name: "heard_about",
    label: "Heard about",
    options: enumOptions(HEARD_ABOUT),
    section: "Details",
  },
  {
    name: "vehicle_make_model",
    label: "Vehicle make & model",
    section: "Vehicle",
  },
  { name: "vehicle_year", label: "Vehicle year", section: "Vehicle" },
  {
    name: "vehicle_ownership",
    label: "Ownership",
    options: [
      { value: "owned", label: "Owned" },
      { value: "rented", label: "Rented" },
      { value: "financed", label: "Financed" },
    ],
    section: "Vehicle",
  },
  { name: "routes_areas", label: "Routes / areas", section: "Driving" },
  {
    name: "hours_per_day",
    label: "Hours per day",
    options: [
      { value: "under_4", label: "Under 4" },
      { value: "4_8", label: "4–8" },
      { value: "8_12", label: "8–12" },
      { value: "over_12", label: "Over 12" },
    ],
    section: "Driving",
  },
  {
    name: "platforms",
    label: "Platforms",
    multi: true,
    options: enumOptions(RIDEHAIL_PLATFORMS),
    section: "Driving",
  },
  {
    name: "applicant_message",
    label: "Applicant message",
    type: "multiline",
    section: "Driving",
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(DRIVER_STATUSES),
    section: "Details",
  },
  { name: "notes", label: "Internal notes", type: "multiline", section: "Notes" },
]

export const FLEET_FORM_FIELDS: FormFieldDef[] = [
  { name: "company_name", label: "Company", required: true, section: "Contact" },
  {
    name: "primary_contact_name",
    label: "Contact name",
    required: true,
    section: "Contact",
  },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact" },
  { name: "phone", label: "Phone", required: true, section: "Contact" },
  {
    name: "city",
    label: "City",
    required: true,
    options: enumOptions(CITIES),
    section: "Fleet details",
  },
  {
    name: "fleet_types",
    label: "Fleet types",
    required: true,
    multi: true,
    options: [
      { value: "taxi", label: "Taxi" },
      { value: "delivery_bike", label: "Delivery bike" },
    ],
    section: "Fleet details",
  },
  { name: "fleet_size", label: "Fleet size", section: "Fleet details" },
  {
    name: "vehicles_active",
    label: "Vehicles active",
    options: enumOptions(VEHICLES_ACTIVE),
    section: "Fleet details",
  },
  { name: "taxi_count", label: "Number of taxis", section: "Fleet details" },
  { name: "bike_count", label: "Number of bikes", section: "Fleet details" },
  {
    name: "operating_cities",
    label: "Operating cities",
    multi: true,
    options: enumOptions(CITIES),
    section: "Fleet details",
  },
  {
    name: "ev_status",
    label: "Electric vehicles",
    options: enumOptions(FLEET_EV_STATUS),
    section: "Fleet details",
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(FLEET_STATUSES),
    section: "Fleet details",
  },
  { name: "notes", label: "Notes", type: "multiline", section: "Notes" },
]

export const WAITLIST_FORM_FIELDS: FormFieldDef[] = [
  { name: "email", label: "Email", type: "email", required: true, section: "Details" },
  { name: "name", label: "Name", section: "Details" },
  {
    name: "persona",
    label: "They are a",
    options: [
      { value: "advertiser", label: "Advertiser" },
      { value: "driver", label: "Driver" },
      { value: "fleet", label: "Fleet operator" },
      { value: "other", label: "Other" },
    ],
    section: "Details",
  },
  { name: "source", label: "Source", placeholder: "homepage", section: "Details" },
]

export const MEDIA_KIT_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true, section: "Contact" },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact" },
  { name: "company", label: "Company", section: "Details" },
  { name: "role", label: "Role", section: "Details" },
  { name: "use_case", label: "Evaluating for", type: "multiline", section: "Details" },
]

export const ANNOUNCEMENT_FORM_FIELDS: FormFieldDef[] = [
  {
    name: "category",
    label: "Type",
    required: true,
    options: [
      { value: "announcement", label: "Announcements" },
      { value: "campaign", label: "Campaigns" },
      { value: "billing", label: "Billing" },
      { value: "promo", label: "Offers" },
      { value: "system", label: "System" },
    ],
    section: "Type",
  },
  {
    name: "title",
    label: "Title",
    required: true,
    placeholder: "e.g. New payout schedule",
    section: "Message",
  },
  {
    name: "body",
    label: "Message",
    type: "multiline",
    required: true,
    placeholder: "Write the notification customers will see…",
    section: "Message",
  },
]

export const ANNOUNCEMENT_TARGET_APP_OPTIONS: FormFieldOption[] = [
  { value: "customer-mobile", label: "Customer mobile" },
  { value: "driver-mobile", label: "Driver mobile" },
  { value: "customer-web", label: "Customer web" },
  { value: "driver-web", label: "Driver web" },
]

const ANNOUNCEMENT_TARGET_APP_LABELS: Record<string, string> = Object.fromEntries(
  ANNOUNCEMENT_TARGET_APP_OPTIONS.map((option) => [option.value, option.label]),
)

/** Generates human-readable descriptions of announcement targets (e.g., "Customer mobile & Driver web") — shared copy for both admin surfaces. */
export function describeAnnouncementTargets(apps: string[]): string {
  const labels = apps.map((app) => ANNOUNCEMENT_TARGET_APP_LABELS[app] ?? app)
  if (labels.length <= 1) return labels[0] ?? "no apps"
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`
}

/** Group consecutive fields that share a section title (for sectioned mobile forms). */
export function groupFormFieldsBySection(
  fields: FormFieldDef[],
): Array<{ title: string | null; fields: FormFieldDef[] }> {
  const groups: Array<{ title: string | null; fields: FormFieldDef[] }> = []
  for (const field of fields) {
    const title = field.section ?? null
    const last = groups[groups.length - 1]
    if (last && last.title === title) {
      last.fields.push(field)
    } else {
      groups.push({ title, fields: [field] })
    }
  }
  return groups
}

export const LEAD_STATUS_OPTIONS = enumOptions(LEAD_STATUSES)
export const DRIVER_STATUS_OPTIONS = enumOptions(DRIVER_STATUSES)
export const FLEET_STATUS_OPTIONS = enumOptions(FLEET_STATUSES)

export function leadFormToPayload(
  values: Record<string, string>,
): LeadCreateInput | LeadUpdateInput {
  const cities = splitCsv(values.cities).filter((city) =>
    (LEAD_CITIES as readonly string[]).includes(city),
  )
  const adFormats = splitCsv(values.ad_formats).filter((format) =>
    (AD_FORMATS as readonly string[]).includes(format),
  )

  return {
    contact_name: values.contact_name?.trim(),
    email: values.email?.trim(),
    company_name: values.company_name?.trim(),
    phone: values.phone?.trim() || undefined,
    cities: cities as LeadCreateInput["cities"],
    ad_formats: adFormats as LeadCreateInput["ad_formats"],
    duration: values.duration?.trim() || undefined,
    budget_range: (values.budget_range?.trim() || undefined) as LeadCreateInput["budget_range"],
    additional_info: values.additional_info?.trim() || undefined,
    objective: (values.objective?.trim() || undefined) as LeadCreateInput["objective"],
    industry: values.industry?.trim() || undefined,
    creative_status: (values.creative_status?.trim() || undefined) as LeadCreateInput["creative_status"],
    target_audience: values.target_audience?.trim() || undefined,
    status: (values.status?.trim() || undefined) as LeadCreateInput["status"],
  }
}

export function leadFormFromRecord(record: LeadDto): Record<string, string> {
  return {
    contact_name: record.contact_name,
    email: record.email,
    company_name: record.company_name,
    phone: record.phone ?? "",
    cities: record.cities.join(", "),
    ad_formats: record.ad_formats.join(", "),
    duration: record.duration ?? "",
    budget_range: record.budget_range ?? "",
    status: record.status ?? "new",
    additional_info: record.additional_info ?? "",
    objective: record.objective ?? "",
    industry: record.industry ?? "",
    creative_status: record.creative_status ?? "",
    target_audience: record.target_audience ?? "",
  }
}

export function driverFormToPayload(
  values: Record<string, string>,
): DriverCreateInput | DriverUpdateInput {
  return {
    name: values.name?.trim(),
    phone: values.phone?.trim(),
    email: values.email?.trim() || undefined,
    city: values.city?.trim() as DriverCreateInput["city"],
    vehicle_type: (values.vehicle_type?.trim() || undefined) as DriverCreateInput["vehicle_type"],
    days_per_week: (values.days_per_week?.trim() || undefined) as DriverCreateInput["days_per_week"],
    heard_about: (values.heard_about?.trim() || undefined) as DriverCreateInput["heard_about"],
    vehicle_make_model: values.vehicle_make_model?.trim() || undefined,
    vehicle_year: values.vehicle_year?.trim() || undefined,
    vehicle_ownership: (values.vehicle_ownership?.trim() || undefined) as DriverCreateInput["vehicle_ownership"],
    routes_areas: values.routes_areas?.trim() || undefined,
    hours_per_day: (values.hours_per_day?.trim() || undefined) as DriverCreateInput["hours_per_day"],
    platforms: splitCsv(values.platforms).filter((p) =>
      (RIDEHAIL_PLATFORMS as readonly string[]).includes(p),
    ) as DriverCreateInput["platforms"],
    applicant_message: values.applicant_message?.trim() || undefined,
    status: (values.status?.trim() || undefined) as DriverCreateInput["status"],
    notes: values.notes?.trim() || undefined,
  }
}

export function driverFormFromRecord(record: DriverDto): Record<string, string> {
  return {
    name: record.name,
    phone: record.phone,
    email: record.email ?? "",
    city: record.city,
    vehicle_type: record.vehicle_type ?? "",
    days_per_week: record.days_per_week ?? "",
    heard_about: record.heard_about ?? "",
    vehicle_make_model: record.vehicle_make_model ?? "",
    vehicle_year: record.vehicle_year ?? "",
    vehicle_ownership: record.vehicle_ownership ?? "",
    routes_areas: record.routes_areas ?? "",
    hours_per_day: record.hours_per_day ?? "",
    platforms: record.platforms.join(", "),
    applicant_message: record.applicant_message ?? "",
    status: record.status ?? "pending",
    notes: record.notes ?? "",
  }
}

export function fleetFormToPayload(
  values: Record<string, string>,
): FleetCreateInput | FleetUpdateInput {
  const fleetTypes = splitCsv(values.fleet_types).filter((type) =>
    (FLEET_TYPES as readonly string[]).includes(type),
  )

  return {
    company_name: values.company_name?.trim(),
    primary_contact_name: values.primary_contact_name?.trim(),
    email: values.email?.trim(),
    phone: values.phone?.trim(),
    city: values.city?.trim() as FleetCreateInput["city"],
    fleet_types: fleetTypes as FleetCreateInput["fleet_types"],
    fleet_size: values.fleet_size?.trim() || undefined,
    vehicles_active: (values.vehicles_active?.trim() || undefined) as FleetCreateInput["vehicles_active"],
    taxi_count: values.taxi_count?.trim() || undefined,
    bike_count: values.bike_count?.trim() || undefined,
    operating_cities: splitCsv(values.operating_cities).filter((c) =>
      (CITIES as readonly string[]).includes(c),
    ) as FleetCreateInput["operating_cities"],
    ev_status: (values.ev_status?.trim() || undefined) as FleetCreateInput["ev_status"],
    status: (values.status?.trim() || undefined) as FleetCreateInput["status"],
    notes: values.notes?.trim() || undefined,
  }
}

export function fleetFormFromRecord(record: FleetPartnerDto): Record<string, string> {
  return {
    company_name: record.company_name,
    primary_contact_name: record.primary_contact_name,
    email: record.email,
    phone: record.phone,
    city: record.city,
    fleet_types: record.fleet_types.join(", "),
    fleet_size: record.fleet_size ?? "",
    vehicles_active: record.vehicles_active ?? "",
    taxi_count: record.taxi_count ?? "",
    bike_count: record.bike_count ?? "",
    operating_cities: record.operating_cities.join(", "),
    ev_status: record.ev_status ?? "",
    status: record.status ?? "pending",
    notes: record.notes ?? "",
  }
}

export function waitlistFormToPayload(
  values: Record<string, string>,
): WaitlistCreateInput | WaitlistUpdateInput {
  return {
    email: values.email?.trim(),
    source: values.source?.trim() || undefined,
    name: values.name?.trim() || undefined,
    persona: (values.persona?.trim() || undefined) as WaitlistCreateInput["persona"],
  }
}

export function waitlistFormFromRecord(
  record: WaitlistEntryDto,
): Record<string, string> {
  return {
    email: record.email,
    source: record.source ?? "",
    name: record.name ?? "",
    persona: record.persona ?? "",
  }
}

export function mediaKitFormToPayload(
  values: Record<string, string>,
): MediaKitCreateInput | MediaKitUpdateInput {
  return {
    name: values.name?.trim(),
    email: values.email?.trim(),
    company: values.company?.trim() || undefined,
    role: values.role?.trim() || undefined,
    use_case: values.use_case?.trim() || undefined,
  }
}

export function mediaKitFormFromRecord(
  record: MediaKitRequestDto,
): Record<string, string> {
  return {
    name: record.name,
    email: record.email,
    company: record.company ?? "",
    role: record.role ?? "",
    use_case: record.use_case ?? "",
  }
}
