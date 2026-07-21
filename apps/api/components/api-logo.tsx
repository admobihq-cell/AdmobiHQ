const ROUTE_SIGNAL_PATH = "M 6 14 Q 12 -4 19 14 T 34 14"
const ROUTE_SIGNAL_NODES = [
  { cx: 6, cy: 14, r: 3.4 },
  { cx: 34, cy: 14, r: 3.4 },
] as const

export function ApiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 28"
      width="36"
      height="25"
      aria-hidden
      className={className}
    >
      <path
        d={ROUTE_SIGNAL_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {ROUTE_SIGNAL_NODES.map((node) => (
        <circle
          key={`${node.cx}-${node.cy}`}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}
