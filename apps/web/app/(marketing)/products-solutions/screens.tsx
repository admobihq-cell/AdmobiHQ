"use client"

import Image from "next/image"
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"

import { DEMO_ADS, type DemoAd, type DemoAdId } from "@workspace/ops-contracts"
import { cn } from "@workspace/ui/lib/utils"

/** What a screen needs to draw an ad. `src` is the creative video; the visitor's own slot has none. */
type Creative = Pick<DemoAd, "brand" | "tagline" | "cta" | "color" | "ink"> & {
  src?: string
}

/** The ops map's AdScreen dot-matrix, softened: at this size the same grid reads as a mesh over the type. */
const LED_GRID: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, transparent 0 45%, rgb(0 0 0 / 0.26) 80%)",
  backgroundSize: "4px 4px",
}

/**
 * Seen = has come within 200px of the viewport, so videos never load with the page.
 * Still = reduced motion: videos show their first frame and nothing auto-advances.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useScreenState() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [seen, setSeen] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  // Server render assumes motion; the client reads the real setting and follows changes.
  const still = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  )

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const hit = entry?.isIntersecting ?? false
        setOnScreen(hit)
        if (hit) setSeen(true)
      },
      { rootMargin: "200px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, seen, onScreen, still }
}

/** A lit LED face: dark unit, the creative inside, the dot-matrix over the top. */
export function PanelFace({
  children,
  className,
  off = false,
}: {
  children?: ReactNode
  className?: string
  off?: boolean
}) {
  return (
    <div
      className={cn(
        "@container relative overflow-hidden rounded-[3px] bg-[#07080a] transition-[filter,opacity] duration-500 ease-out",
        off && "opacity-55 saturate-0",
        className
      )}
    >
      {children}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          off && "opacity-40"
        )}
        style={LED_GRID}
      />
    </div>
  )
}

/**
 * One ad, laid out like the ops map's AdScreen (apps/ops/components/maps/demo-fleet/ad-screen.tsx):
 * taxi top = brand-colour band on the left over the video on the right, CTA chip bottom right;
 * bike box = video fills the face, band across the bottom.
 */
export function AdCreative({
  ad,
  shape,
  play,
  still,
}: {
  ad: Creative
  shape: "taxi" | "bike"
  /** Mount the video (only once the screen is near view). */
  play: boolean
  still: boolean
}) {
  const taxi = shape === "taxi"
  const video = ad.src && play

  return (
    <div className="absolute inset-0">
      {video ? (
        <video
          key={ad.src}
          src={ad.src}
          muted
          loop
          playsInline
          autoPlay={!still}
          preload={still ? "metadata" : "auto"}
          aria-hidden
          className={cn(
            "absolute object-cover",
            taxi ? "inset-y-0 right-0 h-full w-[72%]" : "inset-0 size-full"
          )}
        />
      ) : null}
      <div
        className={cn(
          "absolute flex flex-col justify-center",
          taxi
            ? cn(
                "inset-y-0 left-0 gap-[1.2cqw] py-[3cqw] pl-[3.2cqw]",
                ad.src ? "w-[42%] pr-[7cqw]" : "w-full pr-[3.2cqw]"
              )
            : cn(
                "inset-x-0 bottom-0 gap-[2cqw] px-[6cqw] pb-[6cqw]",
                ad.src ? "pt-[12cqw]" : "top-0"
              )
        )}
        style={{
          backgroundColor: ad.color,
          color: ad.ink,
          clipPath: !ad.src
            ? undefined
            : taxi
              ? "polygon(0 0, 100% 0, 84% 100%, 0 100%)"
              : "polygon(0 9cqw, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        <p
          className={cn(
            "leading-[0.88] font-black tracking-[-0.03em] uppercase",
            taxi ? "text-[5.4cqw]" : "text-[10cqw]"
          )}
        >
          {ad.brand}
        </p>
        <p
          className={cn(
            "leading-tight font-medium opacity-90",
            taxi ? "text-[2.6cqw]" : "text-[6cqw]"
          )}
        >
          {ad.tagline}
        </p>
      </div>
      {taxi ? (
        <p
          className="absolute right-[2cqw] bottom-[2.4cqw] rounded-[0.6cqw] px-[1.2cqw] py-[0.5cqw] text-[2.4cqw] font-semibold"
          style={{
            backgroundColor: ad.src ? ad.color : ad.ink,
            color: ad.src ? ad.ink : ad.color,
          }}
        >
          {ad.cta}
        </p>
      ) : null}
    </div>
  )
}

const ad = (id: DemoAdId) => DEMO_ADS.find((a) => a.id === id)!

/** The visitor's slot: their own brand and offer in the same shape. Admobi's terracotta, since nobody owns it yet. */
const YOURS: Creative = {
  brand: "Your brand",
  tagline: "Your offer, on every taxi in the areas you pick",
  cta: "12 to 2pm today",
  color: "#a1431c",
  ink: "#fff7ef",
}

/**
 * One taxi-top loop: the visitor's slot, then the ops map's Westlands rotation (fleet.ts ZONE_ROTATION).
 * Each video must also exist in apps/web/public/demo-fleet/ads (copied from the ops app).
 */
const LOOP: readonly Creative[] = [
  YOURS,
  ad("nairobi-nights"),
  ad("fit254"),
  ad("kahawa-house"),
  ad("savanna-air"),
  ad("mtaa-kicks"),
  ad("chakula-express"),
]

const SLOT_MS = 5000

/**
 * The roof screen's face inside /products/taxi-top-unit.png (876 x 428, a keyed frame of
 * public/videos/car-hero-screen-greenscreen.mp4). A 3:1 panel at this box sits inside the real bezel.
 */
const ROOF_SCREEN = { left: "49.09%", top: "3.5%", width: "23.06%" }

export function TaxiLoop() {
  const { ref, seen, onScreen, still } = useScreenState()
  const [i, setI] = useState(0)
  const [restart, setRestart] = useState(0)

  // Advances only while on screen and never under reduced motion; a click restarts the clock.
  useEffect(() => {
    if (!onScreen || still) return
    const id = window.setInterval(
      () => setI((n) => (n + 1) % LOOP.length),
      SLOT_MS
    )
    return () => window.clearInterval(id)
  }, [onScreen, still, restart])

  const go = (n: number) => {
    setI(n)
    setRestart((r) => r + 1)
  }

  const current = LOOP[i]!

  return (
    <div ref={ref}>
      <p className="sr-only">
        A partner taxi with an Admobi LED screen on its roof. The screen cycles
        through {LOOP.length} advertisers; yours is the first slot. Use the
        buttons to preview each slot.
      </p>

      <div aria-hidden className="relative aspect-[876/428]">
        <span className="absolute inset-x-[3%] bottom-[-1.5%] h-[8%] rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.2_0.02_262/0.32),transparent)]" />
        <Image
          src="/products/taxi-top-unit.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 56vw, 100vw"
          className="object-contain"
        />
        <div className="absolute" style={ROOF_SCREEN}>
          <PanelFace className="aspect-[3/1] rounded-[2px]">
            <div key={i} className="led-swap absolute inset-0">
              <AdCreative ad={current} shape="taxi" play={seen} still={still} />
            </div>
          </PanelFace>
        </div>
      </div>

      <div className="mt-8 flex items-baseline justify-between gap-4 text-sm">
        <p className="text-muted-foreground">
          Now playing:{" "}
          <span
            className={cn(
              "font-medium",
              i === 0 ? "text-primary" : "text-foreground"
            )}
          >
            {i === 0 ? "Your ad" : current.brand}
          </span>
        </p>
        <p className="text-muted-foreground tabular-nums">
          Slot {i + 1} of {LOOP.length}
        </p>
      </div>

      <ol
        className="mt-2 grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${LOOP.length}, minmax(0, 1fr))`,
        }}
      >
        {LOOP.map((slot, n) => (
          <li key={slot.brand}>
            <button
              type="button"
              onClick={() => go(n)}
              aria-label={
                n === 0 ? "Preview your ad slot" : `Preview ${slot.brand}`
              }
              aria-pressed={n === i}
              className="group block w-full rounded-sm py-2.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  "relative block h-1.5 overflow-hidden rounded-full transition-colors duration-200",
                  n === 0
                    ? "bg-primary/25"
                    : "bg-foreground/12 group-hover:bg-foreground/25"
                )}
              >
                {n === i ? (
                  <span
                    key={`${i}-${restart}`}
                    className={cn(
                      "loop-fill absolute inset-0 rounded-full",
                      n === 0 ? "bg-primary" : "bg-foreground/45"
                    )}
                    style={{ "--slot-ms": `${SLOT_MS}ms` } as CSSProperties}
                  />
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Which faces a booking lights, by number of sides: the rear first, then the pair of sides. */
const BOOKED: Record<number, readonly string[]> = {
  1: ["Rear"],
  2: ["Left", "Right"],
  3: ["Left", "Rear", "Right"],
}

/** A delivery brand on a delivery bike. */
const BIKE_AD = ad("chakula-express")

export function BikeSides({
  options,
  onDark = false,
}: {
  options: readonly { sides: number; label: string }[]
  /** The section behind is a fixed dark band, so the controls can't use theme tokens. */
  onDark?: boolean
}) {
  const { ref, seen, still } = useScreenState()
  const [sides, setSides] = useState(options.at(-1)?.sides ?? 3)
  const lit = BOOKED[sides] ?? BOOKED[3]!

  return (
    <div ref={ref}>
      <fieldset>
        <legend
          className={cn(
            "text-sm font-medium",
            onDark ? "text-[oklch(0.985_0.008_82)]" : "text-foreground"
          )}
        >
          Sides you book
        </legend>
        <div
          className={cn(
            "mt-2 inline-flex rounded-full border p-1",
            onDark
              ? "border-[oklch(0.985_0.008_82/0.3)]"
              : "border-border bg-background"
          )}
        >
          {options.map((option) => (
            <label
              key={option.sides}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                sides === option.sides
                  ? onDark
                    ? "bg-[oklch(0.985_0.008_82)] text-[oklch(0.26_0.024_262)]"
                    : "bg-foreground text-background"
                  : onDark
                    ? "text-[oklch(0.985_0.008_82/0.72)] hover:text-[oklch(0.985_0.008_82)]"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name="bike-sides"
                value={option.sides}
                checked={sides === option.sides}
                onChange={() => setSides(option.sides)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="mt-5 grid grid-cols-3 gap-1" aria-label="Bike box sides">
        {["Left", "Rear", "Right"].map((face) => {
          const on = lit.includes(face)
          return (
            <li key={face}>
              <PanelFace
                off={!on}
                className={cn(
                  "aspect-square",
                  onDark && "ring-1 ring-[oklch(1_0_0/0.14)]"
                )}
              >
                {on ? (
                  <AdCreative
                    ad={BIKE_AD}
                    shape="bike"
                    play={seen}
                    still={still}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-[10cqw] font-medium text-[oklch(0.7_0.02_262)]">
                      Not booked
                    </span>
                  </div>
                )}
              </PanelFace>
              <span
                className={cn(
                  "mt-2 block text-xs font-medium",
                  onDark
                    ? "text-[oklch(0.985_0.008_82/0.72)]"
                    : "text-muted-foreground"
                )}
              >
                {face}
                <span className="sr-only">
                  : {on ? "your ad" : "not booked"}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The creative-services example: one made-up demo brand delivered in both screen shapes, at true relative size. */
export function CreativeExample() {
  const { ref, seen, still } = useScreenState()
  const example = ad("kahawa-house")

  return (
    <div
      ref={ref}
      aria-hidden
      className="grid grid-cols-[3fr_1fr] gap-3 sm:gap-4"
    >
      <PanelFace className="aspect-[3/1] shadow-[0_18px_40px_-18px_oklch(0.2_0.02_262/0.55)]">
        <AdCreative ad={example} shape="taxi" play={seen} still={still} />
      </PanelFace>
      <PanelFace className="aspect-square shadow-[0_18px_40px_-18px_oklch(0.2_0.02_262/0.55)]">
        <AdCreative ad={example} shape="bike" play={seen} still={still} />
      </PanelFace>
    </div>
  )
}

/** Bezel colour of the small taxi-top units: a hardware frame, not a theme surface. */
const UNIT = "oklch(0.24 0.01 262)"

/**
 * A row of small taxi-top units, each playing one demo ad whose own copy shows a kind of
 * targeting (place, time of day, dates). Only targeting Admobi actually sells belongs here.
 */
export function TargetingScreens({
  items,
}: {
  items: readonly { adId: DemoAdId; title: string; body: string }[]
}) {
  const { ref, seen, still } = useScreenState()

  return (
    <div ref={ref}>
      <ul className="grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-10">
        {items.map((item) => (
          <li key={item.adId}>
            <div aria-hidden>
              <PanelFace className="aspect-[3/1] rounded-[5px] shadow-[0_14px_30px_-16px_oklch(0.2_0.02_262/0.5)]">
                <AdCreative
                  ad={ad(item.adId)}
                  shape="taxi"
                  play={seen}
                  still={still}
                />
              </PanelFace>
              {/* Roof-rack feet, so the panel reads as a taxi-top unit */}
              <div className="mx-[14%] flex justify-between">
                <span
                  className="h-2 w-[13%] rounded-b-md"
                  style={{ backgroundColor: UNIT }}
                />
                <span
                  className="h-2 w-[13%] rounded-b-md"
                  style={{ backgroundColor: UNIT }}
                />
              </div>
            </div>
            <h4 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
              {item.title}
            </h4>
            <p className="mt-2 max-w-[38ch] leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
