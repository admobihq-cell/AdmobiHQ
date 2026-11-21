import type { NamedValue } from "./analytics"

/**
 * Flow graphs for the cash-flow Sankeys. A Sankey can't draw a negative or zero link, and both
 * sides of a hub must add up, so the builders balance explicitly: a loss becomes a "Shortfall"
 * source, mismatched totals an "Unallocated" node, and zero-value parts are left out.
 */
export type FlowGraph = {
  nodes: { name: string; column: number }[]
  links: { source: number; target: number; value: number }[]
}

const round = (value: number) => Math.round(value * 100) / 100
const positive = (rows: NamedValue[]) => rows.filter((row) => row.value > 0)

function graph() {
  const nodes: FlowGraph["nodes"] = []
  const links: FlowGraph["links"] = []
  const node = (name: string, column: number) => {
    nodes.push({ name, column })
    return nodes.length - 1
  }
  // Round first, then test: float noise (100.00000000001 vs 100) must not become a 0 link.
  const link = (source: number, target: number, value: number) => {
    const rounded = round(value)
    if (rounded > 0) links.push({ source, target, value: rounded })
  }
  /** A node that exists only if its one link is real, so there's never an orphan "KES 0" node. */
  const linkedNode = (name: string, column: number, value: number, attach: (id: number) => void) => {
    if (round(value) > 0) attach(node(name, column))
  }
  return { nodes, links, node, link, linkedNode }
}

/** Ops: revenue by category → Revenue → driver payouts, Paystack fees, tool costs, net margin. */
export function financeFlow(input: {
  revenueByCategory: NamedValue[]
  payoutsKes: number
  feesKes: number
  toolCostsKes: number
}): FlowGraph {
  const sources = positive(input.revenueByCategory)
  const gross = sources.reduce((sum, row) => sum + row.value, 0)
  // A category that is net negative in the period (refunding earlier spend) reduces revenue: it
  // leaves the hub as "Refunds", so the hub and margin match the headline net revenue.
  const refunds = input.revenueByCategory.filter((row) => row.value < 0).reduce((sum, row) => sum - row.value, 0)
  const revenue = gross - refunds
  const costs = positive([
    { name: "Driver payouts", value: input.payoutsKes },
    { name: "Paystack fees", value: input.feesKes },
    { name: "Tool costs", value: input.toolCostsKes },
  ])
  const costTotal = costs.reduce((sum, row) => sum + row.value, 0)
  if (gross <= 0 && costTotal <= 0) return { nodes: [], links: [] }

  const g = graph()
  const hub = (() => {
    const sourceIds = sources.map((row) => g.node(row.name, 0))
    const id = g.node("Revenue", 1)
    sources.forEach((row, i) => g.link(sourceIds[i]!, id, row.value))
    return id
  })()
  g.linkedNode("Shortfall", 0, costTotal - revenue, (id) => g.link(id, hub, costTotal - revenue))
  g.linkedNode("Refunds", 2, refunds, (id) => g.link(hub, id, refunds))
  for (const cost of costs) g.link(hub, g.node(cost.name, 2), cost.value)
  g.linkedNode("Net margin", 2, revenue - costTotal, (id) => g.link(hub, id, revenue - costTotal))
  return { nodes: g.nodes, links: g.links }
}

/** Advertiser: spend by campaign → Spend → spend by category. */
export function spendFlow(input: { byCampaign: NamedValue[]; byCategory: NamedValue[] }): FlowGraph {
  const campaigns = positive(input.byCampaign)
  const categories = positive(input.byCategory)
  const left = campaigns.reduce((sum, row) => sum + row.value, 0)
  const right = categories.reduce((sum, row) => sum + row.value, 0)
  if (left <= 0 && right <= 0) return { nodes: [], links: [] }

  const g = graph()
  const campaignIds = campaigns.map((row) => g.node(row.name, 0))
  if (right - left > 0.01) campaignIds.push(g.node("Unallocated", 0))
  const hub = g.node("Spend", 1)
  campaigns.forEach((row, i) => g.link(campaignIds[i]!, hub, row.value))
  if (right - left > 0.01) g.link(campaignIds[campaignIds.length - 1]!, hub, right - left)
  for (const row of categories) g.link(hub, g.node(row.name, 2), row.value)
  if (left - right > 0.01) g.link(hub, g.node("Unallocated", 2), left - right)
  return { nodes: g.nodes, links: g.links }
}
