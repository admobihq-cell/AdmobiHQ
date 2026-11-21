import { describe, expect, it } from "vitest"

import { financeFlow, spendFlow, type FlowGraph } from "./flows"

const named = (graph: FlowGraph) =>
  graph.links.map((l) => [graph.nodes[l.source]!.name, graph.nodes[l.target]!.name, l.value] as const)
const into = (graph: FlowGraph, name: string) =>
  graph.links.filter((l) => graph.nodes[l.target]!.name === name).reduce((s, l) => s + l.value, 0)
const outOf = (graph: FlowGraph, name: string) =>
  graph.links.filter((l) => graph.nodes[l.source]!.name === name).reduce((s, l) => s + l.value, 0)

describe("financeFlow", () => {
  it("splits revenue into costs and margin, balanced on both sides", () => {
    const graph = financeFlow({
      revenueByCategory: [
        { name: "Screen time", value: 60 },
        { name: "Production", value: 40 },
      ],
      payoutsKes: 30,
      feesKes: 5,
      toolCostsKes: 10,
    })
    expect(into(graph, "Revenue")).toBe(100)
    expect(outOf(graph, "Revenue")).toBe(100)
    expect(named(graph)).toContainEqual(["Revenue", "Net margin", 55])
    expect(graph.links.every((l) => l.value > 0)).toBe(true)
  })

  it("balances a loss with a shortfall source and never draws a margin", () => {
    const graph = financeFlow({
      revenueByCategory: [{ name: "Screen time", value: 100 }],
      payoutsKes: 90,
      feesKes: 20,
      toolCostsKes: 10,
    })
    expect(named(graph)).toContainEqual(["Shortfall", "Revenue", 20])
    expect(graph.nodes.map((n) => n.name)).not.toContain("Net margin")
    expect(into(graph, "Revenue")).toBe(outOf(graph, "Revenue"))
    expect(graph.links.every((l) => l.value > 0)).toBe(true)
  })

  it("is empty with no money at all", () => {
    expect(financeFlow({ revenueByCategory: [], payoutsKes: 0, feesKes: 0, toolCostsKes: 0 })).toEqual({ nodes: [], links: [] })
  })

  it("drops zero-value costs instead of drawing empty links", () => {
    const graph = financeFlow({ revenueByCategory: [{ name: "Screen time", value: 50 }], payoutsKes: 20, feesKes: 0, toolCostsKes: 0 })
    expect(graph.nodes.map((n) => n.name)).not.toContain("Paystack fees")
  })

  it("never draws a zero link or an orphan node when revenue and costs only differ by float noise", () => {
    const graph = financeFlow({
      revenueByCategory: [
        { name: "Screen time", value: 70.1 },
        { name: "Production", value: 29.9 + 1e-9 },
      ],
      payoutsKes: 100,
      feesKes: 0,
      toolCostsKes: 0,
    })
    expect(graph.links.every((l) => l.value > 0)).toBe(true)
    const linked = new Set(graph.links.flatMap((l) => [l.source, l.target]))
    expect(graph.nodes.every((_, i) => linked.has(i))).toBe(true)
    expect(graph.nodes.map((n) => n.name)).not.toContain("Net margin")
    expect(graph.nodes.map((n) => n.name)).not.toContain("Shortfall")
  })

  it("shows a net-negative (refund) category as a Refunds output so the hub matches net revenue", () => {
    const graph = financeFlow({
      revenueByCategory: [
        { name: "Screen time", value: 100 },
        { name: "Production", value: -10 },
      ],
      payoutsKes: 30,
      feesKes: 0,
      toolCostsKes: 0,
    })
    expect(named(graph)).toContainEqual(["Revenue", "Refunds", 10])
    // Net revenue is 90: costs 30, margin 60, matching the headline figures.
    expect(named(graph)).toContainEqual(["Revenue", "Net margin", 60])
    expect(into(graph, "Revenue")).toBe(outOf(graph, "Revenue"))
  })
})

describe("spendFlow", () => {
  it("adds an unallocated node on the short side so both sides balance", () => {
    const graph = spendFlow({
      byCampaign: [
        { name: "Launch", value: 70 },
        { name: "Promo", value: 30 },
      ],
      byCategory: [
        { name: "Screen time", value: 60 },
        { name: "Production", value: 35 },
      ],
    })
    expect(named(graph)).toContainEqual(["Spend", "Unallocated", 5])
    expect(into(graph, "Spend")).toBe(outOf(graph, "Spend"))
  })

  it("is empty when nothing was spent", () => {
    expect(spendFlow({ byCampaign: [], byCategory: [] })).toEqual({ nodes: [], links: [] })
  })
})
