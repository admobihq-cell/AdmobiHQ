import type { ReactNode, SVGProps } from "react"

const stepperNodes = [
  { label: "Plan", x: 240 },
  { label: "Target", x: 320 },
  { label: "Book", x: 400 },
  { label: "Go Live", x: 480 },
  { label: "Report", x: 560 },
] as const

export function RouteSignal(props: SVGProps<SVGSVGElement>) {
  const skylinePath =
    "M 0 380 L 0 360 L 60 360 L 60 322 L 110 322 L 110 358 L 158 358 L 158 302 L 198 290 L 238 302 L 238 348 L 288 348 L 288 312 L 328 312 L 328 280 L 368 280 L 368 340 L 418 340 L 418 296 L 466 296 L 466 358 L 520 358 L 520 320 L 570 320 L 570 348 L 620 348 L 620 306 L 668 306 L 668 360 L 738 360 L 738 332 L 800 332 L 800 380 Z"

  return (
    <svg
      viewBox="0 0 800 450"
      role="img"
      aria-labelledby="route-signal-title route-signal-desc"
      preserveAspectRatio="xMidYMid meet"
      style={{ ["--route-len" as string]: "320" }}
      {...props}
    >
      <title id="route-signal-title">
        Admobi taxi-top LED unit broadcasting in Nairobi
      </title>
      <desc id="route-signal-desc">
        A taxi-top LED display showing the Admobi mark, with a live Nairobi
        indicator, a route reading CBD to Westlands, and a five-step campaign
        flow from Plan, Target, Book, Go Live, to Report.
      </desc>

      {/* Nairobi skyline silhouette (decorative, sets place) */}
      <path
        d={skylinePath}
        className="anim-rise fill-foreground/[0.05]"
        style={{ ["--rise-delay" as string]: `0ms` }}
      />

      {/* Signal arcs above the LED unit (broadcast metaphor) */}
      <g className="text-primary" stroke="currentColor" fill="none" strokeLinecap="round">
        <path
          d="M 260 180 A 140 140 0 0 1 540 180"
          strokeWidth={1.5}
          className="anim-rise opacity-20"
          style={{ ["--rise-delay" as string]: `200ms` }}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 300 180 A 100 100 0 0 1 500 180"
          strokeWidth={1.5}
          className="anim-route opacity-30"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 340 180 A 60 60 0 0 1 460 180"
          strokeWidth={1.5}
          className="anim-rise opacity-40"
          style={{ ["--rise-delay" as string]: `350ms` }}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Centerpiece: stylized taxi-top LED unit */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `100ms` }}
      >
        {/* Unit body */}
        <rect
          x={210}
          y={180}
          width={380}
          height={80}
          rx={6}
          className="fill-foreground/[0.06] stroke-foreground/40"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* Inset LED panel */}
        <rect
          x={224}
          y={194}
          width={352}
          height={52}
          rx={3}
          className="fill-foreground/[0.10]"
        />
        {/* Brand-kit glyph: two terra dots + signal wave */}
        <g className="text-primary" stroke="currentColor" fill="currentColor">
          <path
            d="M 246 220 Q 258 205 270 220 T 294 220"
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={246} cy={220} r={4} />
          <circle cx={294} cy={220} r={4} />
        </g>
        {/* "Admobi" wordmark on the LED face */}
        <text
          x={310}
          y={229}
          className="fill-primary"
          fontSize={26}
          fontWeight={600}
          letterSpacing={-0.4}
        >
          Admobi
        </text>
        {/* Mount bracket + roof stub */}
        <rect
          x={370}
          y={260}
          width={60}
          height={10}
          rx={2}
          className="fill-foreground/30"
        />
        <line
          x1={400}
          y1={270}
          x2={400}
          y2={288}
          className="stroke-foreground/30"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Top-left chip: Live · Nairobi */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `450ms` }}
      >
        <rect
          x={40}
          y={42}
          width={142}
          height={32}
          rx={16}
          className="fill-background stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={58} cy={58} r={5} className="anim-pulse fill-primary opacity-60" />
        <circle cx={58} cy={58} r={4} className="fill-primary" />
        <text x={72} y={62} fontSize={13} fontWeight={600} className="fill-foreground">
          Live
        </text>
        <circle cx={108} cy={58} r={1.5} className="fill-muted-foreground" />
        <text x={118} y={62} fontSize={13} className="fill-muted-foreground">
          Nairobi
        </text>
      </g>

      {/* Top-right chip: Route · CBD → Westlands */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `550ms` }}
      >
        <rect
          x={580}
          y={42}
          width={188}
          height={60}
          rx={8}
          className="fill-background stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={598}
          y={62}
          fontSize={9}
          letterSpacing={1.4}
          className="fill-muted-foreground font-mono"
        >
          ROUTE
        </text>
        <text
          x={598}
          y={87}
          fontSize={15}
          fontWeight={600}
          className="fill-foreground"
        >
          CBD → Westlands
        </text>
      </g>

      {/* Bottom stepper: Plan · Target · Book · Go Live · Report */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `650ms` }}
      >
        <line
          x1={240}
          y1={340}
          x2={560}
          y2={340}
          className="stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {stepperNodes.map((node, i) => {
          const active = i === 0
          return (
            <g key={node.label}>
              <circle
                cx={node.x}
                cy={340}
                r={active ? 7 : 5.5}
                className={
                  active
                    ? "fill-primary"
                    : "fill-background stroke-border"
                }
                strokeWidth={active ? 0 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={node.x}
                y={364}
                textAnchor="middle"
                fontSize={11}
                fontWeight={active ? 600 : 500}
                className={active ? "fill-foreground" : "fill-muted-foreground"}
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

type AnatomyNode = {
  label: string
  glyph: ReactNode
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <g
      className="text-foreground/85"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {children}
    </g>
  )
}

const FleetGlyph = (
  <Glyph>
    <rect x={-18} y={-2} width={36} height={14} rx={3} />
    <rect x={-12} y={-12} width={24} height={6} rx={1.5} className="fill-primary stroke-primary" />
    <circle cx={-12} cy={14} r={3} />
    <circle cx={12} cy={14} r={3} />
  </Glyph>
)

const NetworkGlyph = (
  <Glyph>
    <path d="M -6 14 L 0 -14 L 6 14 Z" />
    <line x1={-4} y1={4} x2={4} y2={4} />
    <path d="M -14 -8 Q -8 -14 0 -14" />
    <path d="M 14 -8 Q 8 -14 0 -14" />
    <path d="M -20 -4 Q -10 -18 0 -18" />
    <path d="M 20 -4 Q 10 -18 0 -18" />
  </Glyph>
)

const ScheduleGlyph = (
  <Glyph>
    <circle cx={0} cy={0} r={16} />
    <path d="M 0 -16 A 16 16 0 0 1 14 8" className="stroke-primary" strokeWidth={2.4} />
    <line x1={0} y1={0} x2={0} y2={-10} />
    <line x1={0} y1={0} x2={8} y2={4} />
  </Glyph>
)

const CreativeQaGlyph = (
  <Glyph>
    <rect x={-16} y={-12} width={32} height={24} rx={2} />
    <path d="M -6 0 L -1 5 L 8 -5" className="stroke-primary" strokeWidth={2.4} />
  </Glyph>
)

const anatomyNodes: AnatomyNode[] = [
  { label: "Fleet", glyph: FleetGlyph },
  { label: "Network", glyph: NetworkGlyph },
  { label: "Schedule", glyph: ScheduleGlyph },
  { label: "Creative QA", glyph: CreativeQaGlyph },
]

export function SystemAnatomy(props: SVGProps<SVGSVGElement>) {
  const positions = [120, 380, 620, 880]
  const cy = 110
  const routeD = `M ${positions[0]} ${cy} C ${positions[0]! + 100} ${cy}, ${positions[1]! - 100} ${cy}, ${positions[1]} ${cy} S ${positions[2]! - 100} ${cy}, ${positions[2]} ${cy} S ${positions[3]! - 100} ${cy}, ${positions[3]} ${cy}`

  return (
    <svg
      viewBox="0 0 1000 220"
      role="img"
      aria-labelledby="system-anatomy-title system-anatomy-desc"
      preserveAspectRatio="xMidYMid meet"
      style={{ ["--route-len" as string]: "900" }}
      {...props}
    >
      <title id="system-anatomy-title">Admobi system flow</title>
      <desc id="system-anatomy-desc">
        Four connected stages from left to right: fleet hardware, network,
        schedule, and creative quality assurance.
      </desc>

      <path
        d={routeD}
        fill="none"
        className="anim-route text-primary"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {positions.map((x, i) => {
        const next = positions[i + 1]
        if (next === undefined) return null
        const midX = (x + next) / 2
        return (
          <path
            key={`chev-${i}`}
            d={`M ${midX - 4} ${cy - 5} L ${midX + 4} ${cy} L ${midX - 4} ${cy + 5}`}
            fill="none"
            className="text-primary anim-rise"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ ["--rise-delay" as string]: `${400 + i * 120}ms` }}
          />
        )
      })}

      {anatomyNodes.map((node, i) => {
        const x = positions[i]!
        return (
          <g
            key={node.label}
            className="anim-rise"
            style={{ ["--rise-delay" as string]: `${i * 120}ms` }}
          >
            <rect
              x={x - 40}
              y={cy - 40}
              width={80}
              height={80}
              rx={20}
              className="fill-background stroke-border"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={x}
              y={cy - 56}
              textAnchor="middle"
              className="fill-primary font-mono"
              fontSize={11}
              letterSpacing={1.4}
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            <g transform={`translate(${x} ${cy})`}>{node.glyph}</g>
            <text
              x={x}
              y={cy + 64}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={14}
              fontWeight={600}
            >
              {node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function StaticVsMoving(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-labelledby="static-vs-moving-title static-vs-moving-desc"
      preserveAspectRatio="xMidYMid meet"
      style={{ ["--route-len" as string]: "500" }}
      {...props}
    >
      <title id="static-vs-moving-title">
        Fixed billboard versus moving screens
      </title>
      <desc id="static-vs-moving-desc">
        Top: a single fixed panel within one bounded zone. Bottom: a smaller
        screen traversing three connected zones along a dashed route.
      </desc>

      {/* Top half: static */}
      <g>
        <path
          d="M 32 24 H 448 V 156 H 32 Z"
          fill="none"
          className="text-border"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={48}
          y={48}
          className="fill-muted-foreground font-mono"
          fontSize={10}
          letterSpacing={1.3}
        >
          STATIC
        </text>
        <rect
          x={196}
          y={70}
          width={88}
          height={52}
          rx={4}
          className="fill-muted stroke-border"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={240}
          y1={122}
          x2={240}
          y2={146}
          className="text-border"
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={240}
          cy={148}
          r={3}
          className="fill-muted-foreground"
        />
        <text
          x={300}
          y={102}
          className="fill-foreground"
          fontSize={13}
          fontWeight={500}
        >
          One face. One window.
        </text>
      </g>

      {/* Bottom half: moving */}
      <g>
        <path
          d="M 32 204 H 448 V 336 H 32 Z"
          fill="none"
          className="text-border"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={48}
          y={228}
          className="fill-primary font-mono"
          fontSize={10}
          letterSpacing={1.3}
        >
          MOVING
        </text>

        {/* Three zone outlines */}
        {[80, 200, 320].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={300}
            r={22}
            fill="none"
            className="text-border"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Moving route */}
        <path
          d="M 60 300 Q 120 250 200 300 T 340 300"
          fill="none"
          className="anim-route text-primary"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Moving frame at the lead */}
        <g transform="translate(340 300)">
          <rect
            x={-22}
            y={-14}
            width={44}
            height={28}
            rx={3}
            className="fill-background stroke-foreground/50"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={-16}
            y={-6}
            width={32}
            height={2}
            rx={1}
            className="fill-primary"
          />
          <circle cx={0} cy={0} r={3.5} className="fill-primary anim-pulse" />
          <circle cx={0} cy={0} r={2.5} className="fill-primary" />
        </g>

        <text
          x={48}
          y={272}
          className="fill-foreground"
          fontSize={13}
          fontWeight={500}
        >
          One screen. Many windows.
        </text>
      </g>
    </svg>
  )
}
