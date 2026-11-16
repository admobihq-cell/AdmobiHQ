import type { DriverPayoutDto, DriverPayoutsDto, DriverProfileDto } from "@workspace/ops-contracts"

import type { AnnouncementDeliveryDto } from "@/lib/notifications-data"

/**
 * Design preview: realistic fake data for looking at screens when the API or database is down, or before
 * real payouts exist. Dev builds only (`__DEV__`), and only when `EXPO_PUBLIC_DESIGN_PREVIEW` is set to one of
 * the variants below, so it can never reach a production bundle's behaviour.
 *
 *   sending (default)  the newest payout is on its way
 *   paid               the newest payout has just landed
 *   problem            the newest payout failed
 *   empty              no payouts yet
 */
const raw = process.env.EXPO_PUBLIC_DESIGN_PREVIEW?.trim()
export const DESIGN_PREVIEW = __DEV__ && raw ? ((["sending", "paid", "problem", "empty"].includes(raw) ? raw : "sending") as Variant) : null
type Variant = "sending" | "paid" | "problem" | "empty"

const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString()
const month = (monthsAgo: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const row = (id: number, monthsAgo: number, amountKes: number, status: string, paidDaysAgo: number | null): DriverPayoutDto => ({
  id,
  periodMonth: month(monthsAgo),
  amountKes,
  status,
  paidAt: paidDaysAgo === null ? null : day(paidDaysAgo),
})

export function previewPayouts(variant: Variant): DriverPayoutsDto {
  const history = [
    row(7, 1, 21_750, "settled", 8),
    row(6, 2, 19_200, "settled", 38),
    row(5, 3, 17_300, "settled", 69),
    row(4, 4, 20_100, "settled", 99),
    row(3, 5, 16_800, "settled", 130),
    row(2, 6, 14_900, "settled", 160),
    row(1, 7, 13_200, "settled", 191),
  ]
  const newest: Record<Variant, DriverPayoutDto | null> = {
    sending: row(8, 0, 18_400, "processing", null),
    paid: row(8, 0, 18_400, "settled", 1),
    problem: row(8, 0, 18_400, "failed", null),
    empty: null,
  }
  const items = variant === "empty" ? [] : [newest[variant]!, ...history]
  const thisYear = String(new Date().getFullYear())
  const settled = items.filter((i) => i.status === "settled")
  const inFlight = items.filter((i) => i.status === "pending" || i.status === "processing")
  const last = settled.find((i) => i.paidAt)
  return {
    items,
    summary: {
      lastPayout: last?.paidAt ? { amountKes: last.amountKes, paidAt: last.paidAt } : null,
      paidThisYearKes: settled.filter((i) => i.periodMonth.startsWith(thisYear)).reduce((sum, i) => sum + i.amountKes, 0),
      pendingKes: inFlight.reduce((sum, i) => sum + i.amountKes, 0),
    },
  }
}

export const PREVIEW_PROFILE: DriverProfileDto = {
  id: 1,
  full_name: "Wanjiru Kamau",
  phone: "+254712345678",
  city: "Nairobi",
  national_id_number: "12345678",
  kra_pin: "A001234567Z",
  payout_method: "mpesa",
  payout_mpesa_msisdn: "+254712344521",
  payout_bank_name: null,
  payout_bank_code: null,
  payout_bank_account: null,
  status: "approved",
  submitted_at: day(60),
  reviewed_at: day(55),
  rejection_reason: null,
  created_at: day(70),
  updated_at: day(55),
  documents: [],
}

export const PREVIEW_ANNOUNCEMENTS: AnnouncementDeliveryDto[] = [
  { id: 3, title: "Your October payout has been sent", body: "KES 21,750 is on its way to your M-Pesa.", category: "announcement", read_at: null, created_at: day(0.2) },
  { id: 2, title: "New Westlands route opens Monday", body: "More screen time on Waiyaki Way.", category: "announcement", read_at: null, created_at: day(2) },
  { id: 1, title: "Keep your screen clean", body: "A quick wipe before each shift keeps ads bright.", category: "announcement", read_at: day(1), created_at: day(5) },
]

export const PREVIEW_FLAGS: Record<string, boolean> = { deliveries: true }
