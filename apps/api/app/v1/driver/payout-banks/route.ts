import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"

import { jsonError, requireDriverAccess } from "@/lib/api-utils"
import { listKesBanks } from "@/lib/payments/paystack"

const cachedBanks = unstable_cache(
  async () => (await listKesBanks()).map((b) => ({ name: b.name, code: b.code })),
  ["paystack-kes-banks"],
  { revalidate: 86_400 },
)

/** Kenyan banks Paystack can pay into, for the driver payout-details picker. */
export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error
  try {
    return NextResponse.json(await cachedBanks())
  } catch (error) {
    console.error("[driver/payout-banks]", error)
    return jsonError("Couldn't load the bank list", 502)
  }
}
