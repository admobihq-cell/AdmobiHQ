import type { Metadata } from "next"

import { Container } from "@/components/landing/container"
import { pageMetadata } from "@/lib/seo/site"

import { CoverSheet } from "./cover-sheet"
import { RailNavDesktop, RailNavMobile } from "./rail-nav"
import { SheetBrand } from "./sheet-brand"
import { SheetColor } from "./sheet-color"
import { SheetComponents } from "./sheet-components"
import { SheetMotion } from "./sheet-motion"
import { SheetSpace } from "./sheet-space"
import { SheetType } from "./sheet-type"

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Design system | Admobi",
    description:
      "Color, type, spacing, radius, elevation, motion, and component specifications for the Admobi product and marketing surfaces.",
    path: "/design-system",
  }),
  robots: { index: false, follow: false },
}

export default function DesignSystemPage() {
  return (
    <div className="relative">
      {/*
        IMPECCABLE-CONTRACT
        THESIS: Tokens and components as engineering specifications, not a component gallery — a numbered set of spec sheets (title blocks, dimension callouts) replaces the generic sidebar-docs template.
        OWN-WORLD: Admobi's committed terra/warm-neutral OKLCH palette and Geist Sans/Mono stay fixed; Geist Mono carries measurement callouts, terra marks the active sheet and leader ticks.
        STORY: A developer finds and copies an exact token value or sees a component's real variants within seconds.
        FIRST VIEWPORT: Cover title block, then a sticky sheet-index rail beside Sheet 01 — Color, its title block followed by live OKLCH swatches with copyable dimension callouts.
        FORM: Spec-sheet / drawing-set structure — candidate 6 of a 7-item ordered list — seed key 7467ea05.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />

      <Container>
        <CoverSheet />
      </Container>

      <RailNavMobile />

      <Container className="flex items-start gap-8 lg:gap-12">
        <RailNavDesktop />
        <div className="min-w-0 flex-1 divide-y divide-border">
          <SheetColor />
          <SheetType />
          <SheetSpace />
          <SheetMotion />
          <SheetComponents />
          <SheetBrand />
        </div>
      </Container>
    </div>
  )
}
