import Link from "next/link"

import {
  PRICING_DISCLAIMER,
  deliveryBikeTiers,
  formatKes,
  taxiTopTiers,
} from "@/lib/seo/pricing-data"
import type { PricingTier } from "@/lib/seo/pricing-data"

function TierTable({
  title,
  tiers,
}: {
  title: string
  tiers: readonly PricingTier[]
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                Package
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                Starting from
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                Duration
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                Geography
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{tier.name}</td>
                <td className="px-4 py-3 text-foreground tabular-nums">
                  {formatKes(tier.startingFromKes)}
                </td>
                <td className="text-muted-foreground px-4 py-3">{tier.duration}</td>
                <td className="text-muted-foreground px-4 py-3">{tier.geography}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {tiers.map((tier) => (
          <li key={`${tier.id}-includes`}>
            <span className="text-foreground font-medium">{tier.name} includes:</span>{" "}
            {tier.includes.join("; ")}
            {tier.notes ? ` (${tier.notes})` : ""}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PricingTiersTable() {
  return (
    <div className="space-y-10">
      <p className="text-muted-foreground max-w-[65ch] text-sm leading-relaxed">
        {PRICING_DISCLAIMER}
      </p>
      <TierTable title="Taxi-top LED" tiers={taxiTopTiers} />
      <TierTable title="Delivery bike enclosures" tiers={deliveryBikeTiers} />
      <p className="text-muted-foreground text-sm leading-relaxed">
        Machine-readable pricing for AI systems:{" "}
        <Link href="/pricing.md" className="text-foreground underline underline-offset-[3px]">
          /pricing.md
        </Link>
      </p>
    </div>
  )
}
