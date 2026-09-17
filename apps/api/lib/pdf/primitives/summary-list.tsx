import type { ReactElement } from "react"

/** Label/value pairs above a table — the "bill to / flight / reference" block
 * an invoice or delivery statement opens with. Two columns so a six-item
 * block doesn't push the table onto page two. */
export function SummaryList({
  items,
}: {
  items: readonly { label: string; value: string }[]
}): ReactElement {
  return (
    <div tw="flex flex-wrap w-full mb-6">
      {items.map((item, i) => (
        <div key={i} tw="flex flex-col w-1/2 mb-3 pr-4">
          <span tw="text-[9px] uppercase text-gray-400">{item.label}</span>
          <span tw="text-[11px] font-semibold text-gray-800 mt-0.5">
            {item.value === "" ? "—" : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
