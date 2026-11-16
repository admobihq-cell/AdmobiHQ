import type { IntegrationDto } from "@workspace/ops-contracts"

import type { Db } from "./db"

type IntegrationRow = Omit<IntegrationDto, "cost" | "updated_at"> & { cost: string | number; updated_at: Date | string }

/** Every tool and subscription, ordered as the Integrations page shows them. */
export async function queryIntegrations(db: Db): Promise<IntegrationDto[]> {
  const { rows } = await db.query<IntegrationRow>(
    `SELECT id, name, category, purpose, url, plan, cost, currency, billing_cycle, status, owner, notes, updated_at, updated_by_email
       FROM integrations ORDER BY category ASC, name ASC`,
    [],
  )
  return rows.map((row) => ({
    ...row,
    cost: Number(row.cost),
    updated_at: new Date(row.updated_at).toISOString(),
  }))
}
