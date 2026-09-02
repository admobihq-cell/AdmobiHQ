import type { IntegrationDto } from "@/lib/queries/integrations"

/**
 * Exchange rates for rolling every subscription up to a single monthly figure.
 * These drift — bump them (and the date) when the rate moves materially.
 */
export const USD_KES = 129
export const EUR_USD = 1.08
export const RATES_AS_OF = "September 2026"

export type IntegrationCategory =
  | "infrastructure"
  | "email"
  | "search-analytics"
  | "monitoring"
  | "automation"
  | "payments"
  | "developer"
  | "ai"

export const CATEGORIES: Array<{
  value: IntegrationCategory
  label: string
  color: string
}> = [
  { value: "infrastructure", label: "Infrastructure", color: "#b45f3f" },
  { value: "email", label: "Email", color: "#3f7fb4" },
  { value: "search-analytics", label: "Search & Analytics", color: "#b49a3f" },
  { value: "monitoring", label: "Monitoring", color: "#b43f4a" },
  { value: "automation", label: "Automation", color: "#3fb47a" },
  { value: "payments", label: "Payments", color: "#7a3fb4" },
  { value: "developer", label: "Developer", color: "#5a6472" },
  { value: "ai", label: "AI", color: "#4a5fb4" },
]

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
)
export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.color]),
)

export const CURRENCIES = ["USD", "EUR", "KES"] as const
export const BILLING_CYCLES = ["monthly", "annual", "usage", "free"] as const
export const STATUSES = ["active", "trial", "review", "canceled"] as const

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  review: "In review",
  canceled: "Canceled",
}

export function toUsd(cost: number, currency: string): number {
  if (currency === "EUR") return cost * EUR_USD
  if (currency === "KES") return cost / USD_KES
  return cost
}

/** Monthly USD run-rate for one integration. Free, usage-based and canceled
 * lines contribute nothing to the fixed monthly total. */
export function monthlyUsd(i: {
  cost: number
  currency: string
  billing_cycle: string
  status: string
}): number {
  if (i.status === "canceled" || i.billing_cycle === "free" || i.billing_cycle === "usage") {
    return 0
  }
  const usd = toUsd(Number(i.cost) || 0, i.currency)
  return i.billing_cycle === "annual" ? usd / 12 : usd
}

export function formatUsd(value: number, cents = false): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`
}

export function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`
}

export function totals(integrations: IntegrationDto[]) {
  const live = integrations.filter((i) => i.status !== "canceled")
  const monthly = live.reduce((sum, i) => sum + monthlyUsd(i), 0)
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    monthly: live
      .filter((i) => i.category === c.value)
      .reduce((sum, i) => sum + monthlyUsd(i), 0),
    count: live.filter((i) => i.category === c.value).length,
  })).filter((c) => c.count > 0)

  return {
    monthlyUsd: monthly,
    monthlyKes: monthly * USD_KES,
    annualUsd: monthly * 12,
    activeCount: integrations.filter((i) => i.status === "active").length,
    freeCount: live.filter((i) => i.billing_cycle === "free").length,
    usageNames: live.filter((i) => i.billing_cycle === "usage").map((i) => i.name),
    byCategory,
  }
}

/** Starter list — best-guess public list prices, Sept 2026. Loaded once from
 * the empty state, then edited in place. */
export const SEED_INTEGRATIONS: Array<Omit<IntegrationDto, "id" | "updated_at" | "updated_by_email">> = [
  { name: "Vercel", category: "infrastructure", purpose: "Hosting for the marketing site and API", url: "https://vercel.com", plan: "Pro", cost: 20, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "$20 per member / month" },
  { name: "Neon", category: "infrastructure", purpose: "Serverless Postgres (app + n8n share this instance)", url: "https://neon.tech", plan: "Launch", cost: 19, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "Self-hosted n8n is the main compute driver" },
  { name: "Cloudflare", category: "infrastructure", purpose: "DNS, CDN, WAF and DDoS protection", url: "https://cloudflare.com", plan: "Free", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "" },
  { name: "Contabo VPS", category: "infrastructure", purpose: "VPS that runs the self-hosted n8n instance", url: "https://contabo.com", plan: "Cloud VPS 10", cost: 6, currency: "EUR", billing_cycle: "monthly", status: "active", owner: "", notes: "" },
  { name: "Domain registrar", category: "infrastructure", purpose: "Domain registration and renewals", url: "", plan: "Standard", cost: 15, currency: "USD", billing_cycle: "annual", status: "active", owner: "", notes: "Estimate across all domains" },
  { name: "Google Workspace", category: "email", purpose: "Business email, Docs and Drive for the team", url: "https://workspace.google.com", plan: "Business Starter", cost: 6, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "$6 per user / month" },
  { name: "Resend", category: "email", purpose: "Transactional and campaign email delivery", url: "https://resend.com", plan: "Pro", cost: 20, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "" },
  { name: "Google Postmaster Tools", category: "email", purpose: "Gmail deliverability and domain reputation", url: "https://postmaster.google.com", plan: "Free", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "" },
  { name: "Google Search Console", category: "search-analytics", purpose: "Search indexing, coverage and query performance", url: "https://search.google.com/search-console", plan: "Free", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "" },
  { name: "Google Analytics 4", category: "search-analytics", purpose: "Web traffic and conversion analytics", url: "https://analytics.google.com", plan: "Free", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "" },
  { name: "Sentry", category: "monitoring", purpose: "Error tracking and performance monitoring", url: "https://sentry.io", plan: "Team", cost: 26, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "" },
  { name: "n8n", category: "automation", purpose: "Self-hosted workflow automation (runs on Contabo)", url: "https://n8n.io", plan: "Community (self-hosted)", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "License $0; drives Neon compute cost" },
  { name: "ClickUp", category: "automation", purpose: "Project and task management", url: "https://clickup.com", plan: "Unlimited", cost: 7, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "$7 per user / month" },
  { name: "Pesapal", category: "payments", purpose: "Payment collection (API v3)", url: "https://pesapal.com", plan: "Pay-as-you-go", cost: 0, currency: "USD", billing_cycle: "usage", status: "active", owner: "", notes: "~3.5% + fees per transaction" },
  { name: "GitHub", category: "developer", purpose: "Source control and CI for the AdmobiHQ monorepo", url: "https://github.com", plan: "Team", cost: 4, currency: "USD", billing_cycle: "monthly", status: "active", owner: "", notes: "$4 per user / month" },
  { name: "Better Auth", category: "developer", purpose: "Authentication (self-hosted, migration in progress)", url: "https://better-auth.com", plan: "Open source", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "" },
  { name: "Expo EAS", category: "developer", purpose: "Mobile app builds and store submissions", url: "https://expo.dev", plan: "Free", cost: 0, currency: "USD", billing_cycle: "free", status: "active", owner: "", notes: "Production plan is $99/mo if build volume grows" },
  { name: "Anthropic API", category: "ai", purpose: "Claude API for product features and internal tooling", url: "https://console.anthropic.com", plan: "Pay-as-you-go", cost: 0, currency: "USD", billing_cycle: "usage", status: "active", owner: "", notes: "" },
]
