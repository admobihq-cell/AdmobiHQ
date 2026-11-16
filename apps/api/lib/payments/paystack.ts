import { createHmac, timingSafeEqual } from "node:crypto"

const BASE = "https://api.paystack.co"

export const toSubunit = (kes: number) => Math.round(kes * 100)
export const fromSubunit = (cents: number) => cents / 100

/** `status` is the HTTP status (even when a 200 body says status:false). Network failures are NOT wrapped: fetch's own error propagates, so `instanceof PaystackError` means Paystack actually answered. */
export class PaystackError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message)
    this.name = "PaystackError"
  }
}

export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean {
  // Strict format check first: Buffer.from(.., "hex") truncates at the first bad pair and drops a trailing odd nibble,
  // so a valid signature plus junk would otherwise decode to the same bytes and pass.
  if (!header || !/^[0-9a-f]{128}$/i.test(header)) return false
  const given = Buffer.from(header, "hex")
  const expected = createHmac("sha512", secret).update(rawBody).digest()
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * Local 0XXXXXXXXX form for M-Pesa transfer recipients. Accepts 07/01, 2547/2541, +2547/+2541 (spaces and dashes ignored).
 */
// ponytail: Paystack's expected M-Pesa recipient format is unconfirmed until the Task 0 spike; change it here only.
export function toPaystackMpesaNumber(phone: string): string {
  const m = /^(?:\+?254|0)([71]\d{8})$/.exec(phone.replace(/[\s-]/g, ""))
  if (!m) throw new Error("Invalid Kenyan M-Pesa number")
  return `0${m[1]}`
}

/**
 * The secret key, or null when it isn't a real one. Infisical holds a
 * REPLACE_ME placeholder until the owner pastes the key, and a known
 * placeholder must never sign or verify anything.
 */
export function paystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  return key && /^sk_(test|live)_/.test(key) ? key : null
}

async function paystack<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = paystackSecretKey()
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set")
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null
  if (!res.ok || !json || json.status === false) {
    throw new PaystackError(json?.message ?? `Paystack ${method} ${path} failed (${res.status})`, res.status, json)
  }
  return json.data as T
}

export type PaystackTx = {
  id: number
  status: string
  reference: string
  amount: number
  currency: string
  channel: string | null
  fees: number | null
  paid_at: string | null
  gateway_response: string | null
}

export async function initializeTransaction(input: {
  email: string
  amountKes: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
  channels?: string[]
}) {
  const d = await paystack<{ authorization_url: string; access_code: string }>("POST", "/transaction/initialize", {
    email: input.email,
    amount: toSubunit(input.amountKes),
    currency: "KES",
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: JSON.stringify(input.metadata), // Paystack wants a JSON string here
    channels: input.channels,
  })
  return { authorizationUrl: d.authorization_url, accessCode: d.access_code }
}

export const verifyTransaction = (reference: string) =>
  paystack<PaystackTx>("GET", `/transaction/verify/${encodeURIComponent(reference)}`)

/** Paystack takes no client refund reference, so ours rides in merchant_note as "<reference>: <note>" (List Refunds echoes it; the webhook does not). */
export async function createRefund(input: {
  transactionReference: string
  amountKes: number
  reference: string
  merchantNote: string
}) {
  const d = await paystack<{ id: number; status: string }>("POST", "/refund", {
    transaction: input.transactionReference,
    amount: toSubunit(input.amountKes),
    currency: "KES",
    merchant_note: `${input.reference}: ${input.merchantNote}`,
  })
  return { id: d.id, status: d.status }
}

/** A refund as Paystack lists it. `transaction` is the numeric transaction id; `amount` is in cents. */
export type PaystackRefund = {
  id: number
  transaction: number
  amount: number
  currency: string
  status: string
  merchant_note: string | null
  refunded_by: string | null
}

/** Refunds for one transaction, or every refund since `from` (ISO), newest first. */
export async function listRefunds(filter: { transactionId: bigint | number } | { from: string }): Promise<PaystackRefund[]> {
  const all: PaystackRefund[] = []
  for (let page = 1; page <= 20; page++) {
    const q = "transactionId" in filter ? `transaction=${filter.transactionId}` : `from=${encodeURIComponent(filter.from)}`
    const d = await paystack<PaystackRefund[]>("GET", `/refund?${q}&perPage=100&page=${page}`)
    all.push(...d)
    if (d.length < 100) break
  }
  return all.filter((r) => r.currency === "KES")
}

export async function createTransferRecipient(input: {
  type: "mobile_money" | "kepss"
  name: string
  accountNumber: string
  bankCode: string
}) {
  const d = await paystack<{ recipient_code: string }>("POST", "/transferrecipient", {
    type: input.type,
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: "KES",
  })
  return { recipientCode: d.recipient_code }
}

export const listKesBanks = () => paystack<{ name: string; code: string }[]>("GET", "/bank?currency=KES")

export async function bulkTransfer(transfers: { amountKes: number; recipient: string; reference: string; reason: string }[]) {
  if (transfers.length > 100) throw new Error("Paystack bulk transfer is limited to 100 items")
  const d = await paystack<{ reference: string; transfer_code: string; status: string }[]>("POST", "/transfer/bulk", {
    currency: "KES",
    source: "balance",
    transfers: transfers.map((t) => ({
      amount: toSubunit(t.amountKes),
      recipient: t.recipient,
      reference: t.reference,
      reason: t.reason,
    })),
  })
  return d.map((t) => ({ reference: t.reference, transferCode: t.transfer_code, status: t.status }))
}

export const verifyTransfer = (reference: string) =>
  paystack<{ status: string; fee_charged: number | null; reason: string | null }>(
    "GET",
    `/transfer/verify/${encodeURIComponent(reference)}`,
  )

export async function getKesBalance() {
  const d = await paystack<{ currency: string; balance: number }[]>("GET", "/balance")
  return fromSubunit(d.find((b) => b.currency === "KES")?.balance ?? 0)
}
