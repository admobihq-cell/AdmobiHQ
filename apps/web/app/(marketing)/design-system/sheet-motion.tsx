import { InView } from "@/components/landing/in-view"

import { Sheet, Block } from "./sheet-shell"
import { Spec } from "./spec"

const SHADOWS = [
  { cls: "shadow-xs", value: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
  { cls: "shadow-sm", value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
  { cls: "shadow-md", value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
  { cls: "shadow-lg", value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
  { cls: "shadow-xl", value: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
  { cls: "shadow-2xl", value: "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
] as const

/** Same path/nodes as the RouteSignal brand mark (packages/ui/src/brand/geometry.ts), redrawn here so the draw-in animation can target it directly. */
const ROUTE_PATH = "M 6 14 Q 12 -4 19 14 T 34 14"

export function SheetMotion() {
  return (
    <Sheet
      id="sheet-motion"
      index="04"
      title="Elevation & motion"
      meta="Tailwind shadow scale · globals.css keyframes"
      lead="Three keyframes carry every scroll reveal on the site, one easing curve underneath all of them. Scroll this block into view to see the two that only play once."
    >
      <div className="flex flex-col gap-10">
        <Block label="Easing">
          <div className="rounded-xl border border-border p-4">
            <Spec name="--ease-out-strong" value="cubic-bezier(0.16, 1, 0.3, 1)" />
            <p className="mt-2 px-1.5 text-sm text-muted-foreground">
              A strong ease-out — fast start, long settle. Drives fade-rise
              and route-draw below; nothing on the site bounces.
            </p>
          </div>
        </Block>

        <Block label="Keyframes — scroll-gated, prefers-reduced-motion aware">
          <InView
            threshold={0.4}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-6">
              <svg width="72" height="50" viewBox="0 0 40 28" aria-hidden>
                <path
                  d={ROUTE_PATH}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="anim-route"
                  style={{ ["--route-len" as string]: "70" }}
                />
              </svg>
              <span className="font-mono text-xs text-muted-foreground">
                route-draw · 900ms
              </span>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-6">
              <div
                className="anim-rise rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                style={{ ["--rise-delay" as string]: "150ms" }}
              >
                Fleet online
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                fade-rise · 500ms
              </span>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-6">
              <span className="relative flex size-4 items-center justify-center">
                <span className="anim-pulse absolute size-4 rounded-full bg-primary" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                signal-pulse · 1.8s loop
              </span>
            </div>
          </InView>
        </Block>

        <Block label="Shadow scale">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {SHADOWS.map((s) => (
              <div key={s.cls} className="flex flex-col items-center gap-3">
                <div className={`size-14 rounded-xl bg-card ${s.cls}`} />
                <Spec name={s.cls} copyValue={s.value} />
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Sheet>
  )
}
