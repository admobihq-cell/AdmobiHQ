import type { DateRangeKey, OpsPermission } from "@workspace/ops-contracts"
import { formatKes } from "@workspace/ops-contracts"

import { getDelivery, getPipeline } from "@/lib/queries/campaign-analytics"
import { getFinancePayouts } from "@/lib/queries/finance"
import { getFleet } from "@/lib/queries/fleet-analytics"
import { getSupport } from "@/lib/queries/support-analytics"

export type ActionQueueItem = {
  title: string
  meta: string
  action: string
  tone: "serious" | "warning" | "neutral"
  count: number
  href: string
}

/**
 * Counts that need someone, gathered from the other dashboards, each linking through. A row
 * appears only when the viewer holds the permission to open the dashboard it links to, and only
 * when there is something to do. A query that fails drops its row rather than the whole list.
 * These reuse the dashboards' own cached queries, so the numbers match what the link opens.
 */
export async function getActionQueue(
  has: (permission: OpsPermission) => boolean,
  range: DateRangeKey
): Promise<ActionQueueItem[]> {
  const jobs: Promise<ActionQueueItem[]>[] = []

  if (has("campaigns")) {
    jobs.push(
      getPipeline(range, false).then((p): ActionQueueItem[] => [
        {
          title: "Campaigns waiting for review",
          meta: p.queue[0] ? `Oldest has waited ${Math.floor(p.queue[0].waitingHours / 24)} days` : "Nothing waiting",
          action: "Open the review queue",
          tone: p.queue.some((q) => q.waitingHours >= 48) ? "serious" : "warning",
          count: p.inReview,
          href: "/dashboards/campaigns",
        },
      ])
    )
    jobs.push(
      getDelivery(range).then((d): ActionQueueItem[] => [
        {
          title: "Campaigns at risk",
          meta: "Under-delivering, sent back, or missing creative",
          action: "Open campaign health",
          tone: "serious",
          count: d.rows.filter((r) => r.health.level === "at_risk" || r.health.level === "action_needed").length,
          href: "/dashboards/campaigns?tab=delivery",
        },
      ])
    )
  }
  if (has("drivers")) {
    jobs.push(
      getFleet(range, false).then((f): ActionQueueItem[] => [
        {
          title: "Driver applications waiting",
          meta: f.queue[0] ? `Oldest has waited ${Math.floor(f.queue[0].waitingHours / 24)} days` : "Nothing waiting",
          action: "Open the fleet dashboard",
          tone: "warning",
          count: f.pendingApplications,
          href: "/dashboards/fleet",
        },
      ])
    )
  }
  if (has("support")) {
    jobs.push(
      getSupport(range, false).then((s): ActionQueueItem[] => [
        { title: "Urgent support cases open", meta: "Open or pending, marked urgent", action: "Open support", tone: "serious", count: s.urgentOpen, href: "/dashboards/support" },
      ])
    )
  }
  if (has("support") && has("safety")) {
    jobs.push(
      getSupport(range, true).then((s): ActionQueueItem[] => [
        { title: "Critical safety incidents open", meta: "Driver reports still being handled", action: "Open incidents", tone: "serious", count: s.safety?.criticalIncidents ?? 0, href: "/dashboards/support" },
      ])
    )
  }
  if (has("finances")) {
    jobs.push(
      getFinancePayouts("all").then((p): ActionQueueItem[] => {
        const pending = p.byStatus.find((s) => s.status === "pending")
        const failed = p.byStatus.find((s) => s.status === "failed")
        return [
          { title: "Payouts pending", meta: pending ? formatKes(pending.amountKes) : "Nothing pending", action: "Open payouts", tone: "warning", count: pending?.count ?? 0, href: "/finances?tab=payouts" },
          { title: "Payouts failed", meta: failed ? formatKes(failed.amountKes) : "None failed", action: "Open payouts", tone: "serious", count: failed?.count ?? 0, href: "/finances?tab=payouts" },
        ]
      })
    )
  }

  const settled = await Promise.allSettled(jobs)
  return settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((item) => item.count > 0)
}
