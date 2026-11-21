import { NextResponse } from "next/server"

import type { BillingDocumentOptionsDto } from "@workspace/ops-contracts"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { ADMOBI_COMPANY } from "@/lib/billing/company"
import { prisma } from "@/lib/prisma"

/** What the editor's pickers need: every org with its campaigns, and Admobi's default copy. Needs `finances`. */
export async function GET() {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const orgs = await prisma.advertiserOrg.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      billing_email: true,
      tax_pin: true,
      campaigns: { orderBy: { created_at: "desc" }, select: { id: true, name: true } },
    },
  })

  const body: BillingDocumentOptionsDto = {
    orgs: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      billingEmail: org.billing_email,
      taxPin: org.tax_pin,
      campaigns: org.campaigns,
    })),
    defaults: { ...ADMOBI_COMPANY.defaults },
  }
  return NextResponse.json(body)
}
