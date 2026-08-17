import { deliveryBikeTiers, formatKes } from "@/lib/seo/pricing-data"

export function BikeTiersTable() {
  return (
    <div className="space-y-4">
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
            {deliveryBikeTiers.map((tier) => (
              <tr key={tier.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{tier.name}</td>
                <td className="px-4 py-3 text-foreground tabular-nums">{formatKes(tier.startingFromKes)}</td>
                <td className="text-muted-foreground px-4 py-3">{tier.duration}</td>
                <td className="text-muted-foreground px-4 py-3">{tier.geography}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {deliveryBikeTiers.map((tier) => (
          <li key={`${tier.id}-includes`}>
            <span className="text-foreground font-medium">{tier.name} includes:</span>{" "}
            {tier.includes.join("; ")}
          </li>
        ))}
      </ul>
    </div>
  )
}
