import {
  formatKes,
  formatLabel,
  type OpsPermission,
  type ParsedSearch,
  type SearchGroup,
  type SearchHit,
} from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { ci, idOr, join, ranked, take } from "@/lib/search/shared"

type GroupDef = {
  key: string
  label: string
  /** Any one of these grants the group; admins see every group. */
  permissions: OpsPermission[]
  run: (q: ParsedSearch) => Promise<SearchHit[]>
}

const GROUPS: GroupDef[] = [
  {
    key: "sos",
    label: "SOS incidents",
    permissions: ["safety"],
    run: async (q) => {
      const rows = await prisma.safetyIncident.findMany({
        where: { OR: [...idOr(q.numericId), { driver_name: ci(q.text) }, { driver_phone: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take: take + 1,
        select: { id: true, type: true, status: true, driver_name: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `sos:${r.id}`,
        title: `SOS — ${formatLabel(r.type)}`,
        subtitle: join(r.driver_name, formatLabel(r.status)),
        href: `/sos/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "support",
    label: "Support cases",
    permissions: ["support"],
    run: async (q) => {
      const rows = await prisma.supportCase.findMany({
        where: { OR: [...idOr(q.numericId), { subject: ci(q.text) }, { contact_name: ci(q.text) }, { contact_email: ci(q.text) }] },
        orderBy: { updated_at: "desc" },
        take: take + 1,
        select: { id: true, subject: true, status: true, contact_name: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `support:${r.id}`,
        title: r.subject,
        subtitle: join(r.contact_name, formatLabel(r.status)),
        href: `/support/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "campaigns",
    label: "Campaigns",
    permissions: ["campaigns"],
    run: async (q) => {
      const rows = await prisma.campaign.findMany({
        where: { OR: [...idOr(q.numericId), { name: ci(q.text) }, { org: { name: ci(q.text) } }] },
        orderBy: { updated_at: "desc" },
        take: take + 1,
        select: { id: true, name: true, status: true, org: { select: { name: true } } },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `campaigns:${r.id}`,
        title: r.name,
        subtitle: join(r.org?.name, formatLabel(r.status)),
        href: `/campaigns/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "documents",
    label: "Invoices & quotes",
    permissions: ["finances"],
    run: async (q) => {
      const rows = await prisma.billingDocument.findMany({
        where: {
          OR: [
            ...(q.documentNumber ? [{ number: q.documentNumber }] : []),
            { number: ci(q.text) },
            { reference: ci(q.text) },
            { org: { name: ci(q.text) } },
          ],
        },
        orderBy: { created_at: "desc" },
        take: take + 1,
        select: { id: true, number: true, kind: true, status: true, total_kes: true, org: { select: { name: true } } },
      })
      const exact = rows.find((r) => r.number === q.documentNumber)?.id ?? null
      return ranked(rows, exact, (r) => ({
        id: `documents:${r.id}`,
        title: r.number,
        subtitle: join(r.org?.name, formatLabel(r.status), formatKes(Number(r.total_kes))),
        href: `/finances/documents/${r.id}`,
        badge: formatLabel(r.kind),
      }))
    },
  },
  {
    key: "invoices",
    label: "Statements",
    permissions: ["finances"],
    run: async (q) => {
      const rows = await prisma.invoice.findMany({
        where: { number: ci(q.text) },
        orderBy: { issued_on: "desc" },
        take,
        select: { id: true, number: true, status: true, total_kes: true, org: { select: { name: true } } },
      })
      return rows.map((r) => ({
        id: `invoices:${r.id}`,
        title: r.number,
        subtitle: join(r.org?.name, formatLabel(r.status), formatKes(Number(r.total_kes))),
        href: "/finances?tab=ledger",
      }))
    },
  },
  {
    key: "payments",
    label: "Payments",
    permissions: ["finances"],
    run: async (q) => {
      if (!q.reference) return []
      const [payments, refunds] = await Promise.all([
        prisma.payment.findMany({
          where: { reference: ci(q.reference) },
          take,
          select: { id: true, reference: true, status: true, amount_kes: true, org: { select: { name: true } } },
        }),
        prisma.refund.findMany({
          where: { reference: ci(q.reference) },
          take,
          select: { id: true, reference: true, status: true, amount_kes: true },
        }),
      ])
      return [
        ...payments.map((r) => ({
          id: `payments:payment-${r.id}`,
          title: r.reference,
          subtitle: join("Payment", r.org.name, formatLabel(r.status), formatKes(Number(r.amount_kes))),
          href: "/finances?tab=ledger",
        })),
        ...refunds.map((r) => ({
          id: `payments:refund-${r.id}`,
          title: r.reference,
          subtitle: join("Refund", formatLabel(r.status), formatKes(Number(r.amount_kes))),
          href: "/finances?tab=ledger",
        })),
      ].slice(0, take)
    },
  },
  {
    key: "payouts",
    label: "Payouts",
    permissions: ["finances", "payouts"],
    run: async (q) => {
      const rows = await prisma.payout.findMany({
        where: {
          OR: [
            ...idOr(q.numericId),
            ...(q.payoutReference ? [{ reference: q.payoutReference }] : []),
            { reference: ci(q.text) },
            { driverProfile: { full_name: ci(q.text) } },
            { driver: { name: ci(q.text) } },
          ],
        },
        orderBy: { created_at: "desc" },
        take: take + 1,
        select: {
          id: true,
          status: true,
          amount_kes: true,
          period_month: true,
          driverProfile: { select: { full_name: true } },
          driver: { select: { name: true } },
        },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `payouts:${r.id}`,
        title: `Payout #${r.id}`,
        subtitle: join(
          r.driverProfile?.full_name ?? r.driver?.name,
          r.period_month.toISOString().slice(0, 7),
          formatLabel(r.status),
          formatKes(Number(r.amount_kes))
        ),
        href: "/finances?tab=payouts",
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "orgs",
    label: "Advertiser orgs",
    permissions: ["campaigns"],
    run: async (q) => {
      const rows = await prisma.advertiserOrg.findMany({
        where: { OR: [...idOr(q.numericId), { name: ci(q.text) }, { billing_email: ci(q.text) }] },
        orderBy: { updated_at: "desc" },
        take: take + 1,
        select: { id: true, name: true, billing_email: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `orgs:${r.id}`,
        title: r.name,
        subtitle: r.billing_email ?? undefined,
        href: `/advertiser-orgs/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "applications",
    label: "Driver applications",
    permissions: ["driver_applications"],
    run: async (q) => {
      const rows = await prisma.driverProfile.findMany({
        where: { OR: [...idOr(q.numericId), { full_name: ci(q.text) }, { phone: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take: take + 1,
        select: { id: true, full_name: true, city: true, status: true },
      })
      return ranked(rows, q.numericId, (r) => ({
        id: `applications:${r.id}`,
        title: r.full_name ?? "Driver application",
        subtitle: join(r.city, formatLabel(r.status)),
        href: `/driver-applications/${r.id}`,
        badge: `#${r.id}`,
      }))
    },
  },
  {
    key: "drivers",
    label: "Drivers",
    permissions: ["drivers"],
    run: async (q) => {
      const rows = await prisma.driver.findMany({
        where: { deleted_at: null, OR: [{ name: ci(q.text) }, { phone: ci(q.text) }, { email: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, name: true, city: true, status: true },
      })
      return rows.map((r) => ({ id: `drivers:${r.id}`, title: r.name, subtitle: join(r.city, formatLabel(r.status ?? "")), href: "/drivers" }))
    },
  },
  {
    key: "fleet",
    label: "Fleet partners",
    permissions: ["fleet"],
    run: async (q) => {
      const rows = await prisma.fleetPartner.findMany({
        where: { deleted_at: null, OR: [{ company_name: ci(q.text) }, { primary_contact_name: ci(q.text) }, { email: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, company_name: true, primary_contact_name: true, city: true },
      })
      return rows.map((r) => ({ id: `fleet:${r.id}`, title: r.company_name, subtitle: join(r.primary_contact_name, r.city), href: "/fleet" }))
    },
  },
  {
    key: "leads",
    label: "Campaign leads",
    permissions: ["leads"],
    run: async (q) => {
      const rows = await prisma.lead.findMany({
        where: { deleted_at: null, OR: [{ company_name: ci(q.text) }, { contact_name: ci(q.text) }, { email: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, company_name: true, contact_name: true, status: true },
      })
      return rows.map((r) => ({ id: `leads:${r.id}`, title: r.company_name, subtitle: join(r.contact_name, formatLabel(r.status ?? "")), href: "/leads" }))
    },
  },
  {
    key: "waitlist",
    label: "Waitlist",
    permissions: ["waitlist"],
    run: async (q) => {
      const rows = await prisma.waitlistEntry.findMany({
        where: { deleted_at: null, OR: [{ email: ci(q.text) }, { name: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, email: true, name: true },
      })
      return rows.map((r) => ({ id: `waitlist:${r.id}`, title: r.email, subtitle: r.name ?? undefined, href: "/waitlist" }))
    },
  },
  {
    key: "mediaKit",
    label: "Media kit",
    permissions: ["media_kit"],
    run: async (q) => {
      const rows = await prisma.mediaKitRequest.findMany({
        where: { deleted_at: null, OR: [{ name: ci(q.text) }, { email: ci(q.text) }, { company: ci(q.text) }] },
        orderBy: { created_at: "desc" },
        take,
        select: { id: true, name: true, email: true, company: true },
      })
      return rows.map((r) => ({ id: `mediaKit:${r.id}`, title: r.name, subtitle: join(r.company, r.email), href: "/media-kit" }))
    },
  },
]

export async function searchOps(
  q: ParsedSearch,
  access: { role: string; permissions: readonly OpsPermission[] }
): Promise<SearchGroup[]> {
  const visible = GROUPS.filter(
    (g) => access.role === "admin" || g.permissions.some((p) => access.permissions.includes(p))
  )
  const results = await Promise.all(visible.map(async (g) => ({ key: g.key, label: g.label, hits: await g.run(q) })))
  return results.filter((g) => g.hits.length > 0)
}
