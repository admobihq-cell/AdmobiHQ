"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireOpsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BILLING_CYCLES, CURRENCIES, SEED_INTEGRATIONS, STATUSES, CATEGORIES } from "@/lib/integration-costs"

const ROUTE = "/settings/integrations"

const integrationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  purpose: z.string().trim().max(300).default(""),
  url: z.union([z.string().trim().url(), z.literal("")]).default(""),
  plan: z.string().trim().max(120).default(""),
  cost: z.coerce.number().min(0).max(1_000_000).default(0),
  currency: z.enum(CURRENCIES),
  billing_cycle: z.enum(BILLING_CYCLES),
  status: z.enum(STATUSES),
  owner: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default(""),
})

export type IntegrationInput = {
  id?: number
  name: string
  category: string
  purpose: string
  url: string
  plan: string
  cost: string | number
  currency: string
  billing_cycle: string
  status: string
  owner: string
  notes: string
}
type ActionResult = { ok: true } | { ok: false; error: string }

async function assertAdmin(): Promise<{ email: string } | null> {
  try {
    const access = await requireOpsAdmin()
    return { email: access.email }
  } catch {
    return null
  }
}

export async function saveIntegration(input: IntegrationInput): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, error: "Admin access required." }

  const parsed = integrationSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." }
  }

  const data = { ...parsed.data, updated_by_email: admin.email }

  if (input.id) {
    await prisma.integration.update({ where: { id: input.id }, data })
  } else {
    await prisma.integration.create({ data })
  }

  revalidatePath(ROUTE)
  return { ok: true }
}

export async function deleteIntegration(id: number): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, error: "Admin access required." }

  await prisma.integration.delete({ where: { id } })
  revalidatePath(ROUTE)
  return { ok: true }
}

export async function seedIntegrations(): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, error: "Admin access required." }

  const existing = await prisma.integration.count()
  if (existing > 0) return { ok: false, error: "Integrations already exist — nothing to seed." }

  await prisma.integration.createMany({
    data: SEED_INTEGRATIONS.map((i) => ({ ...i, updated_by_email: admin.email })),
  })

  revalidatePath(ROUTE)
  return { ok: true }
}
