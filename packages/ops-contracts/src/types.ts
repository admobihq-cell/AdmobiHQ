import type { DateRangeKey } from "./enums"
import type { PaginationParams } from "./schemas"

export type { DateRangeKey, PaginationParams }

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ApiErrorResponse = {
  error: string
  issues?: unknown
}

export type SuccessResponse = {
  success: true
}

export type BulkResponse = {
  success: true
  count: number
}

export type LeadDto = {
  id: number
  contact_name: string
  email: string
  company_name: string
  phone: string | null
  audience: string
  cities: string[]
  ad_formats: string[]
  duration: string | null
  budget_range: string | null
  campaign_start_date: string | null
  additional_info: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export type FleetPartnerDto = {
  id: number
  email: string
  company_name: string
  primary_contact_name: string
  phone: string
  city: string
  fleet_types: string[]
  fleet_size: string | null
  vehicles_active: string | null
  notes: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export type DriverDto = {
  id: number
  name: string
  phone: string
  email: string | null
  city: string
  vehicle_type: string | null
  days_per_week: string | null
  heard_about: string | null
  status: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type WaitlistEntryDto = {
  id: number
  email: string
  source: string | null
  created_at: string
  updated_at: string
}

export type MediaKitRequestDto = {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

export type NamedCount = {
  name: string
  value: number
}

export type OverviewStatsDto = {
  totals: {
    all: number
    leads: number
    fleet: number
    drivers: number
    waitlist: number
    mediaKit: number
  }
  byType: NamedCount[]
  budgetMix: NamedCount[]
  driversByCity: NamedCount[]
  fleetByCity: NamedCount[]
  driversByHeard: NamedCount[]
}

export type TimelinePointDto = {
  day: string
  count: number
}

export type ContentStatsDto = {
  blog: { total: number; published: number; draft: number }
  help: { total: number; published: number; draft: number }
  media: { total: number; totalSize: number }
  recentDrafts: Array<{
    id: number
    title: string
    type: string
    updatedAt: string
  }>
}

export type StatsResponseDto = {
  overview: OverviewStatsDto
  timeline: TimelinePointDto[]
  content: ContentStatsDto | null
}

export type ListQueryParams = Partial<PaginationParams> & {
  budget?: string
  status?: string
  city?: string
  vehicleType?: string
}
