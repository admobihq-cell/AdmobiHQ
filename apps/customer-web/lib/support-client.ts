"use client"

import { publicApiFetch } from "@workspace/ops-api-client"

const CASE_TOKENS_KEY = "admobi.customer.supportCaseTokens"
const IDENTITY_KEY = "admobi.customer.supportIdentity"

export type SupportCase = {
  id: number
  subject: string
  category: string
  status: string
  priority: string
  channel: string
  contact_name: string
  contact_email: string
  created_at: string
  updated_at: string
}

export type SupportMessage = {
  id: number
  author_type: "customer" | "ops"
  body: string
  created_at: string
}

export type SupportIdentity = { name: string; email: string; token?: string }

// Every localStorage access below is guarded: Safari private-browsing mode
// (and full/blocked storage generally) throws synchronously on read or
// write, and an uncaught throw here would take down whatever screen called
// it. Degrading to "nothing stored" is the safe fallback — worst case, the
// customer re-enters their info.

function getCaseTokens(): Record<number, string> {
  try {
    const raw = window.localStorage.getItem(CASE_TOKENS_KEY)
    return raw ? (JSON.parse(raw) as Record<number, string>) : {}
  } catch {
    return {}
  }
}

function saveCaseToken(caseId: number, token: string) {
  try {
    const tokens = getCaseTokens()
    tokens[caseId] = token
    window.localStorage.setItem(CASE_TOKENS_KEY, JSON.stringify(tokens))
  } catch {
    // Token still works for this session via the value already in hand
    // upstream — it just won't persist across reloads.
  }
}

export function getStoredCaseToken(caseId: number): string | null {
  return getCaseTokens()[caseId] ?? null
}

export function getStoredIdentity(): SupportIdentity | null {
  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY)
    return raw ? (JSON.parse(raw) as SupportIdentity) : null
  } catch {
    return null
  }
}

// Merges rather than overwrites: a case created from a device that already
// has a stored identity token won't get a fresh one from the API (see
// mintIdentityTokenIfAbsent), so a naive overwrite here would wipe it out.
function saveIdentity(identity: SupportIdentity) {
  try {
    const existing = getStoredIdentity()
    const merged: SupportIdentity = { ...identity, token: identity.token ?? existing?.token }
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(merged))
  } catch {
    // Same tradeoff as saveCaseToken above.
  }
}

export async function createSupportCase(
  input: {
    contact_name: string
    contact_email: string
    contact_phone?: string
    anonymous_device_id: string
    category: string
    subject: string
    message: string
  },
  token?: string | null,
): Promise<SupportCase & { accessToken: string }> {
  const res = await publicApiFetch<{
    data: SupportCase & { accessToken: string; identityToken?: string }
  }>("/support", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify({ ...input, channel: "customer-web" }),
  })
  if (!res.ok) throw new Error(res.message)

  saveCaseToken(res.data.data.id, res.data.data.accessToken)
  saveIdentity({
    name: input.contact_name,
    email: input.contact_email,
    token: res.data.data.identityToken,
  })

  return res.data.data
}

export async function getSupportCase(
  caseId: number,
): Promise<(SupportCase & { messages: SupportMessage[] }) | null> {
  const token = getStoredCaseToken(caseId)
  if (!token) return null

  const res = await publicApiFetch<SupportCase & { messages: SupportMessage[] }>(
    `/support/${caseId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null
  return res.data
}

export async function replyToSupportCase(caseId: number, body: string): Promise<SupportMessage> {
  const token = getStoredCaseToken(caseId)
  if (!token) throw new Error("Missing access token for this case")

  const res = await publicApiFetch<{ data: SupportMessage }>(`/support/${caseId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(res.message)
  return res.data.data
}

export async function listMySupportCases(): Promise<SupportCase[]> {
  const identity = getStoredIdentity()
  if (!identity?.token) return []

  const res = await publicApiFetch<{ items: SupportCase[] }>(
    `/support?email=${encodeURIComponent(identity.email)}`,
    { headers: { Authorization: `Bearer ${identity.token}` } },
  )
  if (!res.ok) return []
  return res.data.items
}

export async function listMySupportCasesForAccount(token: string): Promise<SupportCase[]> {
  const res = await publicApiFetch<{ items: SupportCase[] }>("/support", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.data.items
}
