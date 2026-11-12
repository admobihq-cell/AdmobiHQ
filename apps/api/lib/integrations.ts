import type { Integration } from "@prisma/client"
import type { IntegrationDto } from "@workspace/ops-contracts"

/** A Prisma row as the API and the ops console show it: money as a plain number, the timestamp as ISO. */
export const toIntegrationDto = (row: Integration): IntegrationDto => ({
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
})
