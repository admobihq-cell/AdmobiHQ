const rows = [
  {
    format: "Admobi taxi-top LED",
    mobility: "Moves with traffic across corridors",
    targeting: "Geo + time windows; corridor books",
    proof: "GPS-verified proof-of-play",
    minFlight: "From 1 day (inventory permitting)",
  },
  {
    format: "Static billboard",
    mobility: "Fixed roadside location",
    targeting: "Board location only",
    proof: "Installation photos; traffic estimates",
    minFlight: "Often multi-week minimums",
  },
  {
    format: "Admobi delivery bike enclosure",
    mobility: "Last-mile estates and lunch corridors",
    targeting: "Estate clusters and dispatch routes",
    proof: "GPS-verified proof-of-play",
    minFlight: "Typically weekly books",
  },
] as const

const columns = [
  { key: "format", label: "Format" },
  { key: "mobility", label: "Mobility" },
  { key: "targeting", label: "Targeting" },
  { key: "proof", label: "Measurement" },
  { key: "minFlight", label: "Typical minimum flight" },
] as const

export function OohComparisonTable() {
  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Comparison of moving taxi-top LED, static billboards, and delivery bike OOH in Nairobi
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 font-medium text-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.format} className="border-b border-border last:border-b-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="text-muted-foreground px-4 py-3 align-top leading-relaxed"
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
