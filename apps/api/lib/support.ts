import type { SupportCase, SupportMessage } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { hashAccessToken } from "@/lib/support-token"

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token || null
}

/** Anonymous-access check: the token proves the caller owns this case, nothing more. */
export async function loadCaseByToken(
  id: number,
  token: string,
): Promise<SupportCase | null> {
  const supportCase = await prisma.supportCase.findUnique({ where: { id } })
  if (!supportCase) return null
  if (supportCase.access_token_hash !== hashAccessToken(token)) return null
  return supportCase
}

export function toPublicCase(c: SupportCase) {
  return {
    id: c.id,
    subject: c.subject,
    category: c.category,
    status: c.status,
    priority: c.priority,
    channel: c.channel,
    contact_name: c.contact_name,
    contact_email: c.contact_email,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }
}

export function toPublicMessage(m: SupportMessage) {
  return {
    id: m.id,
    author_type: m.author_type,
    body: m.body,
    created_at: m.created_at.toISOString(),
  }
}

export function toOpsCase(c: SupportCase) {
  return {
    id: c.id,
    customer_id: c.customer_id,
    subject: c.subject,
    category: c.category,
    status: c.status,
    priority: c.priority,
    channel: c.channel,
    contact_name: c.contact_name,
    contact_email: c.contact_email,
    contact_phone: c.contact_phone,
    assigned_to_clerk_id: c.assigned_to_clerk_id,
    assigned_to_email: c.assigned_to_email,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }
}

export function toOpsMessage(m: SupportMessage) {
  return {
    id: m.id,
    author_type: m.author_type,
    author_email: m.author_email,
    author_clerk_id: m.author_clerk_id,
    body: m.body,
    internal_note: m.internal_note,
    created_at: m.created_at.toISOString(),
  }
}
