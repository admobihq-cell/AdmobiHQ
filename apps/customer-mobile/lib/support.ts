import AsyncStorage from "@react-native-async-storage/async-storage"

import { getJson, postJson } from "@/lib/api-client"

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

async function getCaseTokens(): Promise<Record<number, string>> {
  const raw = await AsyncStorage.getItem(CASE_TOKENS_KEY)
  return raw ? (JSON.parse(raw) as Record<number, string>) : {}
}

async function saveCaseToken(caseId: number, token: string) {
  const tokens = await getCaseTokens()
  tokens[caseId] = token
  await AsyncStorage.setItem(CASE_TOKENS_KEY, JSON.stringify(tokens))
}

export async function getStoredCaseToken(caseId: number): Promise<string | null> {
  const tokens = await getCaseTokens()
  return tokens[caseId] ?? null
}

export async function getStoredIdentity(): Promise<SupportIdentity | null> {
  const raw = await AsyncStorage.getItem(IDENTITY_KEY)
  return raw ? (JSON.parse(raw) as SupportIdentity) : null
}

async function saveIdentity(identity: SupportIdentity) {
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
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
  const res = await postJson<{
    success: true
    data: SupportCase & { accessToken: string }
  }>("/v1/public/support", { ...input, channel: "customer-mobile" })

  await saveCaseToken(res.data.id, res.data.accessToken)
  await saveIdentity({ name: input.contact_name, email: input.contact_email })

  return res.data
}

export async function getSupportCase(
  caseId: number,
): Promise<(SupportCase & { messages: SupportMessage[] }) | null> {
  const token = await getStoredCaseToken(caseId)
  if (!token) return null
  return getJson(`/v1/public/support/${caseId}`, { Authorization: `Bearer ${token}` })
}

export async function replyToSupportCase(caseId: number, body: string): Promise<SupportMessage> {
  const token = await getStoredCaseToken(caseId)
  if (!token) throw new Error("Missing access token for this case")

  const res = await postJson<{ success: true; data: SupportMessage }>(
    `/v1/public/support/${caseId}/messages`,
    { body },
    { Authorization: `Bearer ${token}` },
  )
  return res.data
}

export async function listMySupportCases(email: string, deviceId: string): Promise<SupportCase[]> {
  const res = await getJson<{ items: SupportCase[] }>(
    `/v1/public/support?email=${encodeURIComponent(email)}&deviceId=${encodeURIComponent(deviceId)}`,
  )
  return res.items
}
