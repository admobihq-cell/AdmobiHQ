import { describe, expect, it } from "vitest"

import { OpsApiError, createOpsClient } from "./index"

function clientAnswering(status: number, body: unknown) {
  const fetchImpl = (async () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as typeof fetch
  return createOpsClient({ baseUrl: "http://api.test", getToken: async () => "token", fetch: fetchImpl })
}

async function caught(promise: Promise<unknown>): Promise<OpsApiError> {
  try {
    await promise
  } catch (e) {
    return e as OpsApiError
  }
  throw new Error("expected the request to fail")
}

describe("OpsApiError", () => {
  it("keeps the whole error body, so the 402 from Disburse still carries the balance and what was needed", async () => {
    const client = clientAnswering(402, { error: "Paystack balance too low", balanceKes: 1000, requiredKes: 6590 })
    const error = await caught(client.payouts.disburse([1, 2]))
    expect(error).toBeInstanceOf(OpsApiError)
    expect(error.status).toBe(402)
    expect(error.body).toMatchObject({ balanceKes: 1000, requiredKes: 6590 })
  })

  it("still carries validation issues as before", async () => {
    const client = clientAnswering(400, { error: "Validation failed", issues: { fieldErrors: { reason: ["Required"] } } })
    const error = await caught(client.finance.refund({ orgId: 1, amountKes: 10, reason: "" }))
    expect(error.status).toBe(400)
    expect(error.issues).toEqual({ fieldErrors: { reason: ["Required"] } })
  })

  it("has no body when the server sent something that isn't JSON", async () => {
    const fetchImpl = (async () => new Response("<html>bad gateway</html>", { status: 502 })) as typeof fetch
    const client = createOpsClient({ baseUrl: "http://api.test", getToken: async () => null, fetch: fetchImpl })
    const error = await caught(client.finance.paystackBalance())
    expect(error.status).toBe(502)
    expect(error.body).toBeUndefined()
  })
})
