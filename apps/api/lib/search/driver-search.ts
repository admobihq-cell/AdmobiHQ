import { formatKes, formatLabel, type ParsedSearch, type SearchGroup, type SearchHit } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { ci, exactFirst, idOr, join, ranked, take } from "@/lib/search/shared"

type GroupDef = { key: string; label: string; run: (q: ParsedSearch, clerkUserId: string) => Promise<SearchHit[]> }

/** Every query is pinned to the calling driver's Clerk user id. */
const GROUPS: GroupDef[] = [
  {
    key: "payouts",
    label: "Payouts",
    run: async (q, clerkUserId) =>
      exactFirst(
        q.numericId,
        (where, limit) =>
          prisma.payout.findMany({
            where: { driverProfile: { clerk_user_id: clerkUserId }, ...where },
            orderBy: { period_month: "desc" },
            take: limit,
            select: { id: true, status: true, amount_kes: true, period_month: true },
          }),
        [
          ...(q.payoutReference ? [{ reference: q.payoutReference }] : []),
          ...(q.reference ? [{ reference: ci(q.reference) }] : []),
        ],
        (r) => ({
          id: `payouts:${r.id}`,
          title: `Payout #${r.id}`,
          subtitle: join(r.period_month.toISOString().slice(0, 7), formatLabel(r.status), formatKes(Number(r.amount_kes))),
          href: "/payouts",
          badge: `#${r.id}`,
        })
      ),
  },
  {
    key: "support",
    label: "Support cases",
    run: async (q, clerkUserId) => {
      return exactFirst(
        q.numericId,
        (where, limit) =>
          prisma.supportCase.findMany({ where: { driver_clerk_user_id: clerkUserId, ...where }, orderBy: { updated_at: "desc" }, take: limit, select: { id: true, subject: true, status: true } }),
        [{ subject: ci(q.text) }],
        (r) => ({
        id: `support:${r.id}`,
        title: r.subject,
        subtitle: formatLabel(r.status),
        href: `/settings/support/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "sos",
    label: "SOS reports",
    run: async (q, clerkUserId) => {
      return exactFirst(
        q.numericId,
        (where, limit) =>
          prisma.safetyIncident.findMany({ where: { driver_clerk_user_id: clerkUserId, ...where }, orderBy: { created_at: "desc" }, take: limit, select: { id: true, type: true, status: true } }),
        [{ type: ci(q.text) }],
        (r) => ({
        id: `sos:${r.id}`,
        title: `SOS — ${formatLabel(r.type)}`,
        subtitle: formatLabel(r.status),
        href: `/sos/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "documents",
    label: "Documents",
    run: async (q, clerkUserId) => {
      const rows = await prisma.driverDocument.findMany({
        where: { profile: { clerk_user_id: clerkUserId }, OR: [{ type: ci(q.text) }, { original_filename: ci(q.text) }] },
        take,
        select: { id: true, type: true, original_filename: true },
      })
      return rows.map((r) => ({
        id: `documents:${r.id}`,
        title: formatLabel(r.type),
        subtitle: r.original_filename ?? undefined,
        href: "/settings/profile",
      }))
    },
  },
  {
    key: "notifications",
    label: "Notifications",
    run: async (q, clerkUserId) => {
      const rows = await prisma.driverNotification.findMany({
        where: { clerk_user_id: clerkUserId, OR: [{ title: ci(q.text) }, { body: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, title: true, body: true },
      })
      return rows.map((r) => ({ id: `notifications:${r.id}`, title: r.title, subtitle: r.body, href: "/notifications" }))
    },
  },
]

export async function searchDriver(q: ParsedSearch, clerkUserId: string): Promise<SearchGroup[]> {
  const results = await Promise.all(GROUPS.map(async (g) => ({ key: g.key, label: g.label, hits: await g.run(q, clerkUserId) })))
  return results.filter((g) => g.hits.length > 0)
}
