import {
  formatKes,
  formatLabel,
  type AdvertiserPermission,
  type ParsedSearch,
  type SearchGroup,
  type SearchHit,
} from "@workspace/ops-contracts"

import { customerBillingDocumentWhere } from "@/lib/billing/documents"
import { prisma } from "@/lib/prisma"
import { ci, idOr, join, ranked, take } from "@/lib/search/shared"

type CustomerSearchAccess = { orgId: number; isOwner: boolean; permissions: ReadonlySet<AdvertiserPermission> }

type GroupDef = {
  key: string
  label: string
  permission: AdvertiserPermission
  run: (q: ParsedSearch, orgId: number) => Promise<SearchHit[]>
}

/** Every query is pinned to the caller's org; a group needs the permission its screen needs. */
const GROUPS: GroupDef[] = [
  {
    key: "campaigns",
    label: "Campaigns",
    permission: "campaigns:read",
    run: async (q, orgId) => {
      const rows = await prisma.campaign.findMany({
        where: { org_id: orgId, OR: [...idOr(q.numericId), { name: ci(q.text) }] },
        orderBy: { updated_at: "desc" },
        take: take + 1,
        select: { id: true, name: true, status: true, market: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `campaigns:${r.id}`,
        title: r.name,
        subtitle: join(r.market, formatLabel(r.status)),
        href: `/campaigns/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "documents",
    label: "Invoices & quotes",
    permission: "billing:read",
    run: async (q, orgId) => {
      const rows = await prisma.billingDocument.findMany({
        where: {
          ...customerBillingDocumentWhere(orgId),
          OR: [...(q.documentNumber ? [{ number: q.documentNumber }] : []), { number: ci(q.text) }, { reference: ci(q.text) }],
        },
        orderBy: { created_at: "desc" },
        take: take + 1,
        select: { id: true, number: true, kind: true, status: true, total_kes: true },
      })
      const exact = rows.find((r) => r.number === q.documentNumber)?.id ?? null
      return ranked(rows, exact, (r) => ({
        id: `documents:${r.id}`,
        title: r.number,
        subtitle: join(formatLabel(r.status), formatKes(Number(r.total_kes))),
        href: "/billing?tab=invoices",
        badge: formatLabel(r.kind),
      }))
    },
  },
  {
    key: "invoices",
    label: "Statements",
    permission: "billing:read",
    run: async (q, orgId) => {
      const rows = await prisma.invoice.findMany({
        where: { org_id: orgId, number: ci(q.text) },
        orderBy: { issued_on: "desc" },
        take,
        select: { id: true, number: true, status: true, total_kes: true },
      })
      return rows.map((r) => ({
        id: `invoices:${r.id}`,
        title: r.number,
        subtitle: join(formatLabel(r.status), formatKes(Number(r.total_kes))),
        href: "/billing?tab=invoices",
      }))
    },
  },
  {
    key: "payments",
    label: "Payments",
    permission: "billing:read",
    run: async (q, orgId) => {
      if (!q.reference) return []
      const rows = await prisma.walletTransaction.findMany({
        where: { org_id: orgId, reference: ci(q.reference) },
        orderBy: { occurred_at: "desc" },
        take,
        select: { id: true, reference: true, kind: true, amount_kes: true, description: true },
      })
      return rows.map((r) => ({
        id: `payments:${r.id}`,
        title: r.reference ?? r.description,
        subtitle: join(formatLabel(r.kind), formatKes(Number(r.amount_kes))),
        href: "/billing?tab=transactions",
      }))
    },
  },
  {
    key: "support",
    label: "Support cases",
    permission: "support:read_all",
    run: async (q, orgId) => {
      const rows = await prisma.supportCase.findMany({
        where: { org_id: orgId, OR: [...idOr(q.numericId), { subject: ci(q.text) }] },
        orderBy: { updated_at: "desc" },
        take: take + 1,
        select: { id: true, subject: true, status: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `support:${r.id}`,
        title: r.subject,
        subtitle: formatLabel(r.status),
        href: `/settings/support/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "media",
    label: "Media",
    permission: "media:read",
    run: async (q, orgId) => {
      const rows = await prisma.mediaAsset.findMany({
        where: { org_id: orgId, OR: [{ name: ci(q.text) }, { original_filename: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, name: true, resource_type: true },
      })
      return rows.map((r) => ({ id: `media:${r.id}`, title: r.name, subtitle: formatLabel(r.resource_type), href: "/media" }))
    },
  },
]

export async function searchCustomer(q: ParsedSearch, access: CustomerSearchAccess): Promise<SearchGroup[]> {
  const visible = GROUPS.filter((g) => access.isOwner || access.permissions.has(g.permission))
  const results = await Promise.all(
    visible.map(async (g) => ({ key: g.key, label: g.label, hits: await g.run(q, access.orgId) }))
  )
  return results.filter((g) => g.hits.length > 0)
}
