import type { ReactNode, SVGProps } from "react"

import { HeroDuskLayers, HeroForegroundFade } from "./hero-scene-transition"

const stepperNodes = [
  { label: "Plan", x: 240 },
  { label: "Target", x: 320 },
  { label: "Book", x: 400 },
  { label: "Go Live", x: 480 },
  { label: "Report", x: 560 },
] as const

/** Five, to match the 20% slots in globals.css's route-cycle keyframes. Origins stay short so the chip has no hole before them. */
const highValueRoutes = [
  ["CBD", "Westlands"],
  ["JKIA", "Upper Hill"],
  ["Sarit", "Gigiri"],
  ["Yaya", "Karen"],
  ["TRM", "CBD"],
] as const

export function RouteSignal(props: SVGProps<SVGSVGElement>) {
  // A varied Nairobi-inspired skyline: stepped building heights, a pointed spire,
  // and two landmark towers — one echoing KICC (disc + mast), one echoing Britam
  // Tower's tiered, tapering crown — so both halves read as equally defined.
  const skylinePath =
    "M 0 380 L 0 320 L 50 320 L 50 285 L 95 285 L 95 325 L 135 325 L 135 260 L 190 260 L 190 310 L 225 310 L 225 330 L 273 330 L 273 290 L 315 290 L 315 315 L 353 315 L 353 275 L 378 250 L 403 275 L 403 325 L 443 325 L 443 285 L 478 285 L 478 335 L 510 335 L 510 250 L 525 250 L 525 220 L 550 220 L 550 250 L 565 250 L 565 320 L 600 320 L 600 280 L 640 280 L 640 330 L 670 330 L 670 270 L 715 270 L 715 325 L 750 325 L 750 295 L 800 295 L 800 380 Z"

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
        A taxi with a roof-top LED screen driving past the Nairobi skyline, with a live Nairobi
        indicator, high-value routes such as CBD to Westlands, and a five-step campaign
        flow from Plan, Target, Book, Go Live, to Report.
      </desc>

      {/* Nairobi skyline silhouette (decorative, sets place) */}
      <defs>
        {/* Dusk gradient: deep navy dusk sky with a warm horizon, fixed regardless of theme */}
        <linearGradient id="dusk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0c1c" />
          <stop offset="0.55" stopColor="#151130" />
          <stop offset="0.82" stopColor="#2b1d3c" />
          <stop offset="1" stopColor="#462b3b" />
        </linearGradient>
        {/* Elliptical vignette: soft fade on all four edges of the dusk box */}
        <radialGradient
          id="dusk-edge-fade"
          gradientUnits="userSpaceOnUse"
          cx={0}
          cy={0}
          r={1}
          gradientTransform="translate(400 225) scale(380 210)"
        >
          <stop offset="0%" stopColor="white" stopOpacity={1} />
          <stop offset="62%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
        <mask id="dusk-edge-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={800} height={450}>
          <rect x={0} y={0} width={800} height={450} fill="url(#dusk-edge-fade)" />
        </mask>
        {/* Horizontal fade for parallax city at viewport edges */}
        <linearGradient id="city-edge-fade-h" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={800} y2={0}>
          <stop offset="0%" stopColor="white" stopOpacity={0} />
          <stop offset="20%" stopColor="white" stopOpacity={1} />
          <stop offset="80%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id="city-edge-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={800} height={450}>
          <rect x={0} y={0} width={800} height={450} fill="url(#city-edge-fade-h)" />
        </mask>
        <filter id="dusk-glow" x="-50%" y="-200%" width="200%" height="400%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <pattern id="skyline-windows" width={9} height={11} patternUnits="userSpaceOnUse">
          <rect x={1.5} y={1.5} width={2.5} height={3} className="fill-foreground/20" />
          <rect x={5} y={1.5} width={2.5} height={3} className="fill-foreground/20" />
          <rect x={1.5} y={6.5} width={2.5} height={3} className="fill-foreground/20" />
          <rect x={5} y={6.5} width={2.5} height={3} className="fill-foreground/20" />
        </pattern>
        <path id="skyline-silhouette" d={skylinePath} />
        {/* Landmark tower detail: helipad disc + mast (KICC), mast with tiered Britam crown */}
        <g id="skyline-landmarks">
          <g className="fill-foreground/[0.05]">
            <ellipse cx={162.5} cy={258} rx={22} ry={5} />
            <rect x={161} y={230} width={3} height={28} />
          </g>
          <rect x={536} y={200} width={3} height={20} className="fill-foreground/[0.05]" />
        </g>
      </defs>

      <HeroDuskLayers />

      <HeroForegroundFade>
      {/* Parallax city layers — masked at viewport edges so buildings fade in/out smoothly */}
      <g mask="url(#city-edge-mask)" aria-hidden="true">
        {/* Scaled 2x from the ground line (y 380), the same as the car clip grew. Transforms live on
            wrapper groups because the scroll animation's CSS transform replaces the attribute. */}
        <g transform="translate(400 380) scale(2) translate(-400 -380)">
          {/* Far skyline layer: slow parallax, scaled down, faint — distant horizon */}
          <g transform="translate(0 50) scale(0.85)">
            <g className="anim-city-far">
              {[0, 800, 1600].map((offset) => (
                <use
                  key={`far-${offset}`}
                  href="#skyline-silhouette"
                  x={offset}
                  className="fill-foreground/[0.03]"
                />
              ))}
            </g>
          </g>

          {/* Near skyline layer: faster parallax, full-size */}
          <g className="anim-city-near">
            {[0, 800, 1600].map((offset) => (
              <g key={`near-${offset}`} transform={`translate(${offset} 0)`}>
                <use href="#skyline-silhouette" className="fill-foreground/[0.05]" />
                <use href="#skyline-silhouette" fill="url(#skyline-windows)" />
              </g>
            ))}
            {[0, 800, 1600].map((offset) => (
              <use key={`landmark-${offset}`} href="#skyline-landmarks" x={offset} />
            ))}
          </g>
        </g>
      </g>

      {/* Broadcast waves from the car's roof screen (centre 400, 201 and 92 wide, set by
          green-screen-car.tsx), fanned upward so they read as coming off the screen. */}
      <defs>
        <clipPath id="signal-wedge">
          <polygon points="400,201 222,40 578,40" />
        </clipPath>
      </defs>
      <g
        className="text-primary"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        clipPath="url(#signal-wedge)"
      >
        <path
          d="M 334.6 142.1 A 88 88 0 0 1 465.4 142.1"
          strokeWidth={1.5}
          className="anim-rise opacity-20"
          style={{ ["--rise-delay" as string]: `200ms` }}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 351.0 156.8 A 66 66 0 0 1 449.0 156.8"
          strokeWidth={1.5}
          className="anim-route opacity-30"
          style={{ ["--route-len" as string]: "111" }}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 367.3 171.6 A 44 44 0 0 1 432.7 171.6"
          strokeWidth={1.5}
          className="anim-rise opacity-40"
          style={{ ["--rise-delay" as string]: `350ms` }}
          vectorEffect="non-scaling-stroke"
        />
        {/* Broadcast pulse: two staggered rings sweeping out through the static arcs */}
        <circle
          cx={400}
          cy={201}
          r={40}
          strokeWidth={1.5}
          className="anim-pulse opacity-35"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={400}
          cy={201}
          r={40}
          strokeWidth={1.5}
          className="anim-pulse opacity-35"
          vectorEffect="non-scaling-stroke"
          style={{ animationDelay: "900ms" }}
        />
      </g>

      {/* Contact shadow beneath the car */}
      <ellipse cx={350} cy={399} rx={215} ry={10} className="anim-rise fill-foreground/[0.12]" style={{ ["--rise-delay" as string]: `50ms` }} />

      {/* The LED unit itself is the roof screen in the car clip (green-screen-car.tsx). */}

      {/* Top-left chip: LIVE · Nairobi, red like a broadcast tally light */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `450ms` }}
      >
        <rect
          x={40}
          y={42}
          width={150}
          height={32}
          rx={16}
          className="fill-background stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={58} cy={58} r={5} className="anim-pulse fill-destructive opacity-60" />
        <circle cx={58} cy={58} r={4} className="fill-destructive" />
        <text
          x={72}
          y={62}
          fontSize={13}
          fontWeight={700}
          letterSpacing="0.08em"
          className="fill-destructive"
        >
          LIVE
        </text>
        <circle cx={116} cy={58} r={1.5} className="fill-muted-foreground" />
        <text x={126} y={62} fontSize={13} className="fill-muted-foreground">
          Nairobi
        </text>
      </g>

      {/* Top-right chip, read like a departure board: the Admobi mark, then origin and
          destination set either side of a fixed connector (so any route length stays centred
          on it) with a signal dot travelling along it. Same height and baseline as LIVE. */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `550ms` }}
      >
        <rect
          x={562}
          y={42}
          width={206}
          height={32}
          rx={16}
          className="fill-background stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <image href="/brand/logo-mark.png" x={578} y={51} width={25.3} height={14} />
        <line x1={657} y1={58} x2={679} y2={58} className="stroke-border" strokeWidth={1.5} />
        <circle cx={657} cy={58} r={2.25} className="fill-background stroke-border" strokeWidth={1.5} />
        <circle cx={679} cy={58} r={2.25} className="fill-primary" />
        <circle cx={657} cy={58} r={2.25} className="anim-route-dot fill-primary" />
        <g className="anim-route-cycle">
          {highValueRoutes.map(([from, to], i) => (
            <g key={from + to} style={{ ["--i" as string]: i }}>
              <text x={649} y={62} fontSize={13} textAnchor="end" className="fill-muted-foreground">
                {from}
              </text>
              <text x={687} y={62} fontSize={13} fontWeight={600} className="fill-foreground">
                {to}
              </text>
            </g>
          ))}
        </g>
      </g>

      {/* Bottom stepper: Plan · Target · Book · Go Live · Report */}
      <g
        className="anim-rise"
        style={{ ["--rise-delay" as string]: `650ms` }}
      >
        <line
          x1={240}
          y1={418}
          x2={560}
          y2={418}
          className="stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {stepperNodes.map((node, i) => {
          const active = i === 0
          return (
            <g key={node.label}>
              {active ? (
                <circle
                  cx={node.x}
                  cy={418}
                  r={6}
                  className="anim-pulse fill-primary opacity-50"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={418}
                r={active ? 6 : 4.5}
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
                y={439}
                textAnchor="middle"
                fontSize={10}
                fontWeight={active ? 600 : 500}
                className={active ? "fill-foreground" : "fill-muted-foreground"}
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </g>
      </HeroForegroundFade>
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
