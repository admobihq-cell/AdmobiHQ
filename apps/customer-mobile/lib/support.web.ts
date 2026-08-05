import AsyncStorage from "@react-native-async-storage/async-storage"

const IDENTITY_KEY = "admobi.customer.supportIdentity"
const CASES_KEY = "admobi.demo.supportCases"
const NEXT_ID_KEY = "admobi.demo.supportNextId"

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

type StoredCase = SupportCase & { messages: SupportMessage[] }

const AUTO_REPLY =
  "Thanks for reaching out — you're using the live demo, so this reply is simulated. In the real app, our support team replies here within one business day."

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readCases(): Promise<StoredCase[]> {
  const raw = await AsyncStorage.getItem(CASES_KEY)
  return raw ? (JSON.parse(raw) as StoredCase[]) : []
}

async function writeCases(cases: StoredCase[]) {
  await AsyncStorage.setItem(CASES_KEY, JSON.stringify(cases))
}

async function nextCaseId(): Promise<number> {
  const raw = await AsyncStorage.getItem(NEXT_ID_KEY)
  const id = raw ? Number(raw) + 1 : 9000
  await AsyncStorage.setItem(NEXT_ID_KEY, String(id))
  return id
}

let messageSeq = 1
function nextMessageId() {
  return messageSeq++
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
  await delay(400)

  const id = await nextCaseId()
  const now = new Date().toISOString()
  const created: StoredCase = {
    id,
    subject: input.subject,
    category: input.category,
    status: "open",
    priority: "normal",
    channel: "customer-mobile",
    contact_name: input.contact_name,
    contact_email: input.contact_email,
    created_at: now,
    updated_at: now,
    messages: [{ id: nextMessageId(), author_type: "customer", body: input.message, created_at: now }],
  }

  const cases = await readCases()
  cases.unshift(created)
  await writeCases(cases)
  await saveIdentity({ name: input.contact_name, email: input.contact_email })

  // Land a simulated ops reply a few seconds later so the case thread (which
  // polls every 15s) doesn't stay one-sided during the demo.
  setTimeout(() => {
    void (async () => {
      const latest = await readCases()
      const target = latest.find((c) => c.id === id)
      if (!target) return
      target.messages.push({
        id: nextMessageId(),
        author_type: "ops",
        body: AUTO_REPLY,
        created_at: new Date().toISOString(),
      })
      target.status = "pending"
      target.updated_at = new Date().toISOString()
      await writeCases(latest)
    })()
  }, 4000)

  return { ...created, accessToken: "demo-token" }
}

export async function getSupportCase(
  caseId: number,
): Promise<(SupportCase & { messages: SupportMessage[] }) | null> {
  await delay(150)
  const cases = await readCases()
  return cases.find((c) => c.id === caseId) ?? null
}

export async function replyToSupportCase(caseId: number, body: string): Promise<SupportMessage> {
  await delay(250)
  const cases = await readCases()
  const target = cases.find((c) => c.id === caseId)
  if (!target) throw new Error("This request isn't available on this device.")

  const message: SupportMessage = {
    id: nextMessageId(),
    author_type: "customer",
    body,
    created_at: new Date().toISOString(),
  }
  target.messages.push(message)
  target.updated_at = new Date().toISOString()
  await writeCases(cases)
  return message
}

export async function listMySupportCases(): Promise<SupportCase[]> {
  await delay(150)
  const cases = await readCases()
  return cases.map((storedCase) => {
    const { id, subject, category, status, priority, channel, contact_name, contact_email, created_at, updated_at } =
      storedCase
    return { id, subject, category, status, priority, channel, contact_name, contact_email, created_at, updated_at }
  })
}
