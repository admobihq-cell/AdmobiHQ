import Image from "next/image"

import { BRAND_CREAM, BRAND_OG_DARK, BRAND_TERRA } from "@workspace/ui/brand/constants"
import {
  ROUTE_SIGNAL_NODES,
  ROUTE_SIGNAL_PATH,
  ROUTE_SIGNAL_STROKE_WIDTH,
  ROUTE_SIGNAL_VIEWBOX,
} from "@workspace/ui/brand/geometry"

import { Logo } from "@/components/landing/logo"

import { Sheet, Block } from "./sheet-shell"
import { Spec } from "./spec"

const BRAND_COLORS = [
  { name: "Terra", value: BRAND_TERRA },
  { name: "Cream", value: BRAND_CREAM },
  { name: "OG dark", value: BRAND_OG_DARK },
]

export function SheetBrand() {
  return (
    <Sheet
      id="sheet-brand"
      index="06"
      title="Brand mark"
      meta="public/brand — logo-mark.png, logo-typemark.png"
      lead={
        <>
          The RouteSignal mark — a curved path between two nodes, the same
          &ldquo;signal that moves through the city&rdquo; motif that opens
          the homepage. One mark, three crops: the full lockup, the icon
          alone, and the nav wordmark.
        </>
      }
    >
      <div className="flex flex-col gap-10">
        <Block label="Mark & lockup">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-6">
            <div
              className="flex items-center justify-center rounded-lg px-8 py-6"
              style={{ background: BRAND_OG_DARK }}
            >
              <Image
                src="/brand/logo-typemark.png"
                alt="Admobi"
                width={201}
                height={112}
                className="h-16 w-auto"
              />
            </div>
            <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-border">
              <Image
                src="/brand/logo-mark.png"
                alt=""
                width={85}
                height={47}
                className="h-auto w-16"
              />
            </div>
            <div className="rounded-lg border border-border p-3">
              <Logo />
              <span className="mt-2 block font-mono text-[0.65rem] text-muted-foreground">
                nav lockup
              </span>
            </div>
          </div>
        </Block>

        <Block label="Geometry">
          <div className="rounded-xl border border-border p-4">
            <Spec
              name="viewBox"
              value={`0 0 ${ROUTE_SIGNAL_VIEWBOX.width} ${ROUTE_SIGNAL_VIEWBOX.height}`}
            />
            <Spec name="path" value={ROUTE_SIGNAL_PATH} />
            <Spec name="stroke-width" value={String(ROUTE_SIGNAL_STROKE_WIDTH)} />
            <Spec
              name="nodes"
              value={`r ${ROUTE_SIGNAL_NODES[0]?.r} · ${ROUTE_SIGNAL_NODES.length} points`}
            />
          </div>
        </Block>

        <Block label="Brand constants">
          <div className="grid grid-cols-3 gap-3">
            {BRAND_COLORS.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-xl border border-border">
                <div className="h-14" style={{ background: c.value }} />
                <div className="border-t border-border p-1">
                  <p className="px-1.5 pt-1 text-sm font-medium text-foreground">
                    {c.name}
                  </p>
                  <Spec name="hex" value={c.value} />
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="Reference board — public/brand/admobi-brand-kit.png">
          <div className="overflow-hidden rounded-xl border border-border">
            {/* Plain img, not next/image: a flat 3x3 reference board gets nothing from responsive
                srcset generation, and it's simpler to guarantee loads than debug the optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/admobi-brand-kit.png"
              alt="Admobi brand kit: logo, construction, palette, type, and application reference"
              width={1536}
              height={1024}
              loading="eager"
              className="h-auto w-full"
            />
          </div>
        </Block>
      </div>
    </Sheet>
  )
}
