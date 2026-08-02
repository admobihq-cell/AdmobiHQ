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

export type SupportIdentity = { name: string; email: string }

function getCaseTokens(): Record<number, string> {
  const raw = window.localStorage.getItem(CASE_TOKENS_KEY)
  return raw ? (JSON.parse(raw) as Record<number, string>) : {}
}

function saveCaseToken(caseId: number, token: string) {
  const tokens = getCaseTokens()
  tokens[caseId] = token
  window.localStorage.setItem(CASE_TOKENS_KEY, JSON.stringify(tokens))
}

export function getStoredCaseToken(caseId: number): string | null {
  return getCaseTokens()[caseId] ?? null
}

export function getStoredIdentity(): SupportIdentity | null {
  const raw = window.localStorage.getItem(IDENTITY_KEY)
  return raw ? (JSON.parse(raw) as SupportIdentity) : null
}

function saveIdentity(identity: SupportIdentity) {
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export async function createSupportCase(input: {
  contact_name: string
  contact_email: string
  contact_phone?: string
  anonymous_device_id: string
  category: string
  subject: string
  message: string
}): Promise<SupportCase & { accessToken: string }> {
  const res = await publicApiFetch<{ data: SupportCase & { accessToken: string } }>(
    "/support",
    {
      method: "POST",
      body: JSON.stringify({ ...input, channel: "customer-web" }),
    },
  )
  if (!res.ok) throw new Error(res.message)

  saveCaseToken(res.data.data.id, res.data.data.accessToken)
  saveIdentity({ name: input.contact_name, email: input.contact_email })

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

export async function listMySupportCases(email: string, deviceId: string): Promise<SupportCase[]> {
  const res = await publicApiFetch<{ items: SupportCase[] }>(
    `/support?email=${encodeURIComponent(email)}&deviceId=${encodeURIComponent(deviceId)}`,
  )
  if (!res.ok) return []
  return res.data.items
}
