import { prisma } from "@/lib/prisma"

export type IntegrationDto = {
  id: number
  name: string
  category: string
  purpose: string
  url: string
  plan: string
  cost: number
  currency: string
  billing_cycle: string
  status: string
  owner: string
  notes: string
  updated_at: string
  updated_by_email: string | null
}

export async function listIntegrations(): Promise<IntegrationDto[]> {
  const rows = await prisma.integration.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    purpose: row.purpose,
    url: row.url,
    plan: row.plan,
    cost: Number(row.cost),
    currency: row.currency,
    billing_cycle: row.billing_cycle,
    status: row.status,
    owner: row.owner,
    notes: row.notes,
    updated_at: row.updated_at.toISOString(),
    updated_by_email: row.updated_by_email,
  }))
}
