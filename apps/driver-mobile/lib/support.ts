import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

// One SecureStore entry per case: Android warns on values over 2 KB.
const CASE_TOKEN_KEY_PREFIX = "admobi.driver.supportCaseToken."
const IDENTITY_KEY = "admobi.driver.supportIdentity"
// Where older builds kept the tokens. AsyncStorage is in Android backups, SecureStore isn't.
const LEGACY_CASE_TOKENS_KEY = "admobi.driver.supportCaseTokens"
const LEGACY_IDENTITY_KEY = IDENTITY_KEY

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

async function postJson<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`)
  return (await res.json()) as T
}

async function getJson<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`)
  return (await res.json()) as T
}

let migration: Promise<void> | null = null

/** Moves tokens saved by older builds from AsyncStorage into SecureStore, once per launch. */
function migrateLegacyTokens(): Promise<void> {
  migration ??= (async () => {
    const [tokens, identity] = await Promise.all([
      AsyncStorage.getItem(LEGACY_CASE_TOKENS_KEY),
      AsyncStorage.getItem(LEGACY_IDENTITY_KEY),
    ])
    if (!tokens && !identity) return
    const legacyTokens = JSON.parse(tokens ?? "{}") as Record<string, string>
    for (const [caseId, token] of Object.entries(legacyTokens)) {
      await SecureStore.setItemAsync(CASE_TOKEN_KEY_PREFIX + caseId, token)
    }
    if (identity && !(await SecureStore.getItemAsync(IDENTITY_KEY))) {
      await SecureStore.setItemAsync(IDENTITY_KEY, identity)
    }
    await AsyncStorage.multiRemove([LEGACY_CASE_TOKENS_KEY, LEGACY_IDENTITY_KEY])
  })().catch((error: unknown) => {
    migration = null
    throw error
  })
  return migration
}

async function saveCaseToken(caseId: number, token: string) {
  await migrateLegacyTokens()
  await SecureStore.setItemAsync(CASE_TOKEN_KEY_PREFIX + caseId, token)
}

export async function getStoredCaseToken(caseId: number): Promise<string | null> {
  await migrateLegacyTokens()
  return SecureStore.getItemAsync(CASE_TOKEN_KEY_PREFIX + caseId)
}

export async function getStoredIdentity(): Promise<SupportIdentity | null> {
  await migrateLegacyTokens()
  const raw = await SecureStore.getItemAsync(IDENTITY_KEY)
  return raw ? (JSON.parse(raw) as SupportIdentity) : null
}

// Merges rather than overwrites: a case created from a device that already
// has a stored identity token won't get a fresh one from the API (see
// mintIdentityTokenIfAbsent), so a naive overwrite here would wipe it out.
async function saveIdentity(identity: SupportIdentity) {
  const existing = await getStoredIdentity()
  const merged: SupportIdentity = { ...identity, token: identity.token ?? existing?.token }
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(merged))
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
  const res = await postJson<{
    success: true
    data: SupportCase & { accessToken: string; identityToken?: string }
  }>(
    "/v1/public/support",
    { ...input, channel: "driver-mobile" },
    token ? { Authorization: `Bearer ${token}` } : undefined,
  )

  await saveCaseToken(res.data.id, res.data.accessToken)
  await saveIdentity({
    name: input.contact_name,
    email: input.contact_email,
    token: res.data.identityToken,
  })

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

export async function listMySupportCases(token?: string | null): Promise<SupportCase[]> {
  if (token) {
    const res = await getJson<{ items: SupportCase[] }>("/v1/public/support", {
      Authorization: `Bearer ${token}`,
    })
    return res.items
  }

  const identity = await getStoredIdentity()
  if (!identity?.token) return []

  const res = await getJson<{ items: SupportCase[] }>(
    `/v1/public/support?email=${encodeURIComponent(identity.email)}`,
    { Authorization: `Bearer ${identity.token}` },
  )
  return res.items
}
