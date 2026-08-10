import {
  AD_FORMATS,
  BUDGET_RANGES,
  CITIES,
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
    name: "status",
    label: "Status",
    options: enumOptions(LEAD_STATUSES),
    section: "Campaign",
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
  { name: "source", label: "Source", placeholder: "homepage", section: "Details" },
]

export const MEDIA_KIT_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true, section: "Contact" },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact" },
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
  { value: "customer-mobile", label: "Customers" },
  { value: "driver-mobile", label: "Drivers" },
]

const ANNOUNCEMENT_TARGET_APP_LABELS: Record<string, string> = Object.fromEntries(
  ANNOUNCEMENT_TARGET_APP_OPTIONS.map((option) => [option.value, option.label]),
)

/** "Customers" / "Drivers" / "Customers & Drivers" — shared copy for both admin surfaces. */
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
  }
}

export function waitlistFormFromRecord(
  record: WaitlistEntryDto,
): Record<string, string> {
  return {
    email: record.email,
    source: record.source ?? "",
  }
}

export function mediaKitFormToPayload(
  values: Record<string, string>,
): MediaKitCreateInput | MediaKitUpdateInput {
  return {
    name: values.name?.trim(),
    email: values.email?.trim(),
  }
}

export function mediaKitFormFromRecord(
  record: MediaKitRequestDto,
): Record<string, string> {
  return {
    name: record.name,
    email: record.email,
  }
}
