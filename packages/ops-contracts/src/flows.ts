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
  const link = (source: number, target: number, value: number) => {
    if (value > 0) links.push({ source, target, value: round(value) })
  }
  return { nodes, links, node, link }
}

/** Ops: revenue by category → Revenue → driver payouts, Paystack fees, tool costs, net margin. */
export function financeFlow(input: {
  revenueByCategory: NamedValue[]
  payoutsKes: number
  feesKes: number
  toolCostsKes: number
}): FlowGraph {
  const sources = positive(input.revenueByCategory)
  const revenue = sources.reduce((sum, row) => sum + row.value, 0)
  const costs = positive([
    { name: "Driver payouts", value: input.payoutsKes },
    { name: "Paystack fees", value: input.feesKes },
    { name: "Tool costs", value: input.toolCostsKes },
  ])
  const costTotal = costs.reduce((sum, row) => sum + row.value, 0)
  if (revenue <= 0 && costTotal <= 0) return { nodes: [], links: [] }

  const g = graph()
  const hub = (() => {
    const sourceIds = sources.map((row) => g.node(row.name, 0))
    const id = g.node("Revenue", 1)
    sources.forEach((row, i) => g.link(sourceIds[i]!, id, row.value))
    return id
  })()
  if (costTotal > revenue) g.link(g.node("Shortfall", 0), hub, costTotal - revenue)
  for (const cost of costs) g.link(hub, g.node(cost.name, 2), cost.value)
  if (revenue > costTotal) g.link(hub, g.node("Net margin", 2), revenue - costTotal)
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
