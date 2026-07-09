import type { Prisma } from "@prisma/client"

import {
  paginationSchema,
  type PaginationParams,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type SerializedEntity<T extends { created_at: Date }> = Omit<T, "created_at"> & {
  created_at: string
}

type SerializedPaginatedResult<T extends { created_at: Date }> = PaginatedResult<
  SerializedEntity<T>
>

function serializeEntityDates<T extends { created_at: Date }>(
  items: T[],
): SerializedEntity<T>[] {
  return items.map((item) => ({
    ...item,
    created_at: item.created_at.toISOString(),
  }))
}

function toPaginatedResult<T extends { created_at: Date }>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): SerializedPaginatedResult<T> {
  return {
    items: serializeEntityDates(items),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

function parsePagination(params: Partial<PaginationParams> = {}) {
  return paginationSchema.parse({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    sortBy: params.sortBy,
    sortDir: params.sortDir ?? "desc",
  })
}

export async function listDrivers(
  params: Partial<PaginationParams> & {
    city?: string
    status?: string
    vehicleType?: string
  } = {},
): Promise<SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.driver.findMany>>[number]>> {
  const parsed = parsePagination(params)
  const where: Prisma.DriverWhereInput = {}

  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: "insensitive" } },
      { email: { contains: parsed.search, mode: "insensitive" } },
      { phone: { contains: parsed.search, mode: "insensitive" } },
    ]
  }
  if (params.city) where.city = params.city
  if (params.status) where.status = params.status
  if (params.vehicleType) where.vehicle_type = params.vehicleType

  const [items, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { created_at: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.driver.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}

export async function listFleetPartners(
  params: Partial<PaginationParams> & { city?: string; status?: string } = {},
): Promise<
  SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.fleetPartner.findMany>>[number]>
> {
  const parsed = parsePagination(params)
  const where: Prisma.FleetPartnerWhereInput = {}

  if (parsed.search) {
    where.OR = [
      { company_name: { contains: parsed.search, mode: "insensitive" } },
      { email: { contains: parsed.search, mode: "insensitive" } },
      { primary_contact_name: { contains: parsed.search, mode: "insensitive" } },
    ]
  }
  if (params.city) where.city = params.city
  if (params.status) where.status = params.status

  const [items, total] = await Promise.all([
    prisma.fleetPartner.findMany({
      where,
      orderBy: { created_at: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.fleetPartner.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}

export async function listLeads(
  params: Partial<PaginationParams> & { budget?: string; status?: string } = {},
): Promise<SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.lead.findMany>>[number]>> {
  const parsed = parsePagination({
    ...params,
    sortBy: params.sortBy ?? "created_at",
  })
  const where: Prisma.LeadWhereInput = {}

  if (parsed.search) {
    where.OR = [
      { contact_name: { contains: parsed.search, mode: "insensitive" } },
      { email: { contains: parsed.search, mode: "insensitive" } },
      { company_name: { contains: parsed.search, mode: "insensitive" } },
    ]
  }
  if (params.budget) where.budget_range = params.budget
  if (params.status) where.status = params.status

  const sortField = ["created_at", "contact_name", "company_name", "status"].includes(
    parsed.sortBy ?? "",
  )
    ? parsed.sortBy!
    : "created_at"

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortField]: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.lead.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}

export async function listWaitlist(
  params: Partial<PaginationParams> = {},
): Promise<
  SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.waitlistEntry.findMany>>[number]>
> {
  const parsed = parsePagination(params)
  const where: Prisma.WaitlistEntryWhereInput = {}

  if (parsed.search) {
    where.email = { contains: parsed.search, mode: "insensitive" }
  }

  const [items, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { created_at: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.waitlistEntry.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}

export async function listMediaKitRequests(
  params: Partial<PaginationParams> = {},
): Promise<
  SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.mediaKitRequest.findMany>>[number]>
> {
  const parsed = parsePagination(params)
  const where: Prisma.MediaKitRequestWhereInput = {}

  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: "insensitive" } },
      { email: { contains: parsed.search, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.mediaKitRequest.findMany({
      where,
      orderBy: { created_at: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.mediaKitRequest.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}
