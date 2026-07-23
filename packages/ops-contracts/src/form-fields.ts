import {
  BUDGET_RANGES,
  CITIES,
  DAYS_PER_WEEK,
  DRIVER_STATUSES,
  FLEET_STATUSES,
  FLEET_TYPES,
  HEARD_ABOUT,
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
  placeholder?: string
}

function enumOptions(values: readonly string[]): FormFieldOption[] {
  return values.map((value) => ({ value, label: formatLabel(value) }))
}

function splitCsv(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

export const LEAD_FORM_FIELDS: FormFieldDef[] = [
  { name: "contact_name", label: "Contact name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "company_name", label: "Company", required: true },
  { name: "phone", label: "Phone" },
  {
    name: "cities",
    label: "Cities (comma-separated)",
    placeholder: "Nairobi, Mombasa",
  },
  {
    name: "ad_formats",
    label: "Ad formats (comma-separated)",
    placeholder: "wrap, digital",
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
  },
  {
    name: "budget_range",
    label: "Budget",
    options: enumOptions(BUDGET_RANGES),
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(LEAD_STATUSES),
  },
  { name: "additional_info", label: "Brief / notes", type: "multiline" },
]

export const DRIVER_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "phone", label: "Phone", required: true },
  { name: "email", label: "Email", type: "email" },
  {
    name: "city",
    label: "City",
    required: true,
    options: enumOptions(CITIES),
  },
  {
    name: "vehicle_type",
    label: "Vehicle type",
    options: enumOptions(VEHICLE_TYPES),
  },
  {
    name: "days_per_week",
    label: "Days per week",
    options: enumOptions(DAYS_PER_WEEK),
  },
  {
    name: "heard_about",
    label: "Heard about",
    options: enumOptions(HEARD_ABOUT),
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(DRIVER_STATUSES),
  },
  { name: "notes", label: "Internal notes", type: "multiline" },
]

export const FLEET_FORM_FIELDS: FormFieldDef[] = [
  { name: "company_name", label: "Company", required: true },
  { name: "primary_contact_name", label: "Contact name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", required: true },
  {
    name: "city",
    label: "City",
    required: true,
    options: enumOptions(CITIES),
  },
  {
    name: "fleet_types",
    label: "Fleet types (comma-separated)",
    placeholder: "taxi, delivery_bike",
  },
  { name: "fleet_size", label: "Fleet size" },
  {
    name: "vehicles_active",
    label: "Vehicles active",
    options: enumOptions(VEHICLES_ACTIVE),
  },
  {
    name: "status",
    label: "Status",
    options: enumOptions(FLEET_STATUSES),
  },
  { name: "notes", label: "Notes", type: "multiline" },
]

export const WAITLIST_FORM_FIELDS: FormFieldDef[] = [
  { name: "email", label: "Email", type: "email", required: true },
  { name: "source", label: "Source", placeholder: "homepage" },
]

export const MEDIA_KIT_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
]

export const LEAD_STATUS_OPTIONS = enumOptions(LEAD_STATUSES)
export const DRIVER_STATUS_OPTIONS = enumOptions(DRIVER_STATUSES)
export const FLEET_STATUS_OPTIONS = enumOptions(FLEET_STATUSES)

export function leadFormToPayload(
  values: Record<string, string>,
): LeadCreateInput | LeadUpdateInput {
  return {
    contact_name: values.contact_name?.trim(),
    email: values.email?.trim(),
    company_name: values.company_name?.trim(),
    phone: values.phone?.trim() || undefined,
    cities: splitCsv(values.cities),
    ad_formats: splitCsv(values.ad_formats),
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
