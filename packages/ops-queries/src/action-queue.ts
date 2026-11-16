import {
  formatKes,
  type ActionQueueItem,
  type DateRangeKey,
  type DeliveryDto,
  type FinancePayoutsDto,
  type FleetDashboardDto,
  type OpsPermission,
  type PipelineDto,
  type SupportDashboardDto,
} from "@workspace/ops-contracts"

/**
 * Where the queue reads its numbers from. Ops web passes its cached dashboard getters, so the counts
 * match what each link opens and a bell load costs nothing extra; the API passes the uncached
 * `query*` functions bound to its database.
 */
export type ActionQueueSources = {
  pipeline(range: DateRangeKey, includeMoney: boolean): Promise<PipelineDto>
  delivery(range: DateRangeKey): Promise<DeliveryDto>
  fleet(range: DateRangeKey, includeMoney: boolean): Promise<FleetDashboardDto>
  support(range: DateRangeKey, includeSafety: boolean): Promise<SupportDashboardDto>
  financePayouts(range: DateRangeKey): Promise<FinancePayoutsDto>
}

/**
 * Counts that need someone, gathered from the other dashboards, each linking through. A row
 * appears only when the viewer holds the permission to open the dashboard it links to, and only
 * when there is something to do. A source that fails drops its row rather than the whole list.
 */
export async function queryActionQueue(
  has: (permission: OpsPermission) => boolean,
  range: DateRangeKey,
  sources: ActionQueueSources,
): Promise<ActionQueueItem[]> {
  const jobs: Promise<ActionQueueItem[]>[] = []

  if (has("campaigns")) {
    jobs.push(
      sources.pipeline(range, false).then((p): ActionQueueItem[] => [
        {
          title: "Campaigns waiting for review",
          meta: p.queue[0] ? `Oldest has waited ${Math.floor(p.queue[0].waitingHours / 24)} days` : "Nothing waiting",
          action: "Open the review queue",
          tone: p.queue.some((q) => q.waitingHours >= 48) ? "serious" : "warning",
          count: p.inReview,
          href: "/dashboards/campaigns",
        },
      ]),
    )
    jobs.push(
      sources.delivery(range).then((d): ActionQueueItem[] => [
        {
          title: "Campaigns at risk",
          meta: "Under-delivering, sent back, or missing creative",
          action: "Open campaign health",
          tone: "serious",
          count: d.rows.filter((r) => r.health.level === "at_risk" || r.health.level === "action_needed").length,
          href: "/dashboards/campaigns?tab=delivery",
        },
      ]),
    )
  }
  if (has("drivers")) {
    jobs.push(
      sources.fleet(range, false).then((f): ActionQueueItem[] => [
        {
          title: "Driver applications waiting",
          meta: f.queue[0] ? `Oldest has waited ${Math.floor(f.queue[0].waitingHours / 24)} days` : "Nothing waiting",
          action: "Open the fleet dashboard",
          tone: "warning",
          count: f.pendingApplications,
          href: "/dashboards/fleet",
        },
      ]),
    )
  }
  if (has("support")) {
    jobs.push(
      sources.support(range, false).then((s): ActionQueueItem[] => [
        { title: "Urgent support cases open", meta: "Open or pending, marked urgent", action: "Open support", tone: "serious", count: s.urgentOpen, href: "/dashboards/support" },
      ]),
    )
  }
  if (has("support") && has("safety")) {
    jobs.push(
      sources.support(range, true).then((s): ActionQueueItem[] => [
        { title: "Critical safety incidents open", meta: "Driver reports still being handled", action: "Open incidents", tone: "serious", count: s.safety?.criticalIncidents ?? 0, href: "/dashboards/support" },
      ]),
    )
  }
  if (has("finances")) {
    jobs.push(
      sources.financePayouts("all").then((p): ActionQueueItem[] => {
        const pending = p.byStatus.find((s) => s.status === "pending")
        const failed = p.byStatus.find((s) => s.status === "failed")
        return [
          { title: "Payouts pending", meta: pending ? formatKes(pending.amountKes) : "Nothing pending", action: "Open payouts", tone: "warning", count: pending?.count ?? 0, href: "/finances?tab=payouts" },
          { title: "Payouts failed", meta: failed ? formatKes(failed.amountKes) : "None failed", action: "Open payouts", tone: "serious", count: failed?.count ?? 0, href: "/finances?tab=payouts" },
        ]
      }),
    )
  }

  const settled = await Promise.allSettled(jobs)
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((item) => item.count > 0)
}
