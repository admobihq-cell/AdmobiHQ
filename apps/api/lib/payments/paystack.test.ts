import { createHmac } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  PaystackError,
  bulkTransfer,
  createRefund,
  getKesBalance,
  initializeTransaction,
  toPaystackMpesaNumber,
  toSubunit,
  verifyWebhookSignature,
} from "@/lib/payments/paystack"

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fn)
  return fn
}

beforeEach(() => vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x"))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("verifyWebhookSignature", () => {
  const body = '{"event":"charge.success"}'
  const sig = createHmac("sha512", "sk_test_x").update(body).digest("hex")

  it("accepts the correct signature", () => {
    expect(verifyWebhookSignature(body, sig, "sk_test_x")).toBe(true)
  })
  it("rejects a one-character change, null, wrong length and non-hex without throwing", () => {
    const bad = (sig[0] === "a" ? "b" : "a") + sig.slice(1)
    expect(verifyWebhookSignature(body, bad, "sk_test_x")).toBe(false)
    expect(verifyWebhookSignature(body, null, "sk_test_x")).toBe(false)
    expect(verifyWebhookSignature(body, sig.slice(2), "sk_test_x")).toBe(false)
    expect(verifyWebhookSignature(body, "zz-not-hex", "sk_test_x")).toBe(false)
  })
})

describe("toSubunit", () => {
  it("rounds KES to integer cents", () => {
    expect(toSubunit(1234.565)).toBe(123457)
    expect(toSubunit(50000)).toBe(5000000)
  })
})

describe("toPaystackMpesaNumber", () => {
  it("normalises every Kenyan format to local 0XXXXXXXXX", () => {
    for (const p of ["0712345678", "254712345678", "+254712345678", "+254 712-345 678", "0112345678", "+254112345678"]) {
      expect(toPaystackMpesaNumber(p)).toBe(p.includes("11") ? "0112345678" : "0712345678")
    }
  })
  it("throws on anything else", () => {
    for (const p of ["", "12345", "0812345678", "+255712345678", "07123456789"]) {
      expect(() => toPaystackMpesaNumber(p)).toThrow()
    }
  })
})

describe("initializeTransaction", () => {
  it("POSTs cents, KES, stringified metadata and bearer auth", async () => {
    const fetchMock = mockFetch({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com/abc", access_code: "abc" },
    })
    const out = await initializeTransaction({
      email: "a@b.co",
      amountKes: 50000,
      reference: "adm-pay-000000000001",
      callbackUrl: "https://app/cb",
      metadata: { payment_id: 1 },
      channels: ["mobile_money", "card"],
    })
    expect(out).toEqual({ authorizationUrl: "https://checkout.paystack.com/abc", accessCode: "abc" })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.paystack.co/transaction/initialize")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk_test_x")
    const sent = JSON.parse(init.body as string)
    expect(sent).toMatchObject({ amount: 5000000, currency: "KES", callback_url: "https://app/cb", channels: ["mobile_money", "card"] })
    expect(sent.metadata).toBe('{"payment_id":1}')
  })

  it("throws PaystackError with the HTTP status on non-2xx", async () => {
    mockFetch({ status: false, message: "Invalid key" }, 401)
    await expect(
      initializeTransaction({ email: "a@b.co", amountKes: 1, reference: "r", callbackUrl: "u", metadata: {} }),
    ).rejects.toMatchObject({ name: "PaystackError", status: 401, body: { message: "Invalid key" } })
  })

  it("throws PaystackError on status:false even with HTTP 200", async () => {
    mockFetch({ status: false, message: "nope" }, 200)
    const err = await initializeTransaction({ email: "a@b.co", amountKes: 1, reference: "r", callbackUrl: "u", metadata: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(PaystackError)
    expect(err.status).toBe(200)
  })

  it("lets a network failure propagate as-is (not a PaystackError)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed") }))
    const err = await initializeTransaction({ email: "a@b.co", amountKes: 1, reference: "r", callbackUrl: "u", metadata: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(TypeError)
    expect(err).not.toBeInstanceOf(PaystackError)
  })

  it("throws when the secret key is missing", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "")
    mockFetch({ status: true, data: {} })
    await expect(
      initializeTransaction({ email: "a@b.co", amountKes: 1, reference: "r", callbackUrl: "u", metadata: {} }),
    ).rejects.toThrow(/PAYSTACK_SECRET_KEY/)
  })
})

describe("createRefund", () => {
  it("sends cents and carries our reference in merchant_note", async () => {
    const fetchMock = mockFetch({ status: true, data: { id: 9, status: "pending" } })
    const out = await createRefund({ transactionReference: "adm-pay-1", amountKes: 100.5, reference: "adm-refund-7", merchantNote: "dup charge" })
    expect(out).toEqual({ id: 9, status: "pending" })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.paystack.co/refund")
    expect(JSON.parse(init.body as string)).toEqual({
      transaction: "adm-pay-1",
      amount: 10050,
      currency: "KES",
      merchant_note: "adm-refund-7: dup charge",
    })
  })
})

describe("bulkTransfer", () => {
  const t = (i: number) => ({ amountKes: 10, recipient: `RCP_${i}`, reference: `adm-payout-${i}-202611`, reason: "payout" })

  it("throws for more than 100 items", async () => {
    mockFetch({ status: true, data: [] })
    await expect(bulkTransfer(Array.from({ length: 101 }, (_, i) => t(i)))).rejects.toThrow(/100/)
  })

  it("sends subunit amounts from balance and maps the response", async () => {
    const fetchMock = mockFetch({ status: true, data: [{ reference: "adm-payout-1-202611", transfer_code: "TRF_1", status: "success" }] })
    const out = await bulkTransfer([t(1)])
    expect(out).toEqual([{ reference: "adm-payout-1-202611", transferCode: "TRF_1", status: "success" }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.paystack.co/transfer/bulk")
    expect(JSON.parse(init.body as string)).toEqual({
      currency: "KES",
      source: "balance",
      transfers: [{ amount: 1000, recipient: "RCP_1", reference: "adm-payout-1-202611", reason: "payout" }],
    })
  })
})

describe("getKesBalance", () => {
  it("returns the KES entry in KES, or 0 when absent", async () => {
    mockFetch({ status: true, data: [{ currency: "NGN", balance: 1 }, { currency: "KES", balance: 123456 }] })
    expect(await getKesBalance()).toBe(1234.56)
    mockFetch({ status: true, data: [{ currency: "NGN", balance: 1 }] })
    expect(await getKesBalance()).toBe(0)
  })
})
