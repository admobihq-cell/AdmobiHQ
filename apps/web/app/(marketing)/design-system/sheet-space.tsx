import { Sheet, Block } from "./sheet-shell"
import { Spec } from "./spec"

const SPACING = [
  { token: "1", px: 4 },
  { token: "2", px: 8 },
  { token: "3", px: 12 },
  { token: "4", px: 16 },
  { token: "5", px: 20 },
  { token: "6", px: 24 },
  { token: "8", px: 32 },
  { token: "10", px: 40 },
  { token: "12", px: 48 },
  { token: "16", px: 64 },
  { token: "20", px: 80 },
  { token: "24", px: 96 },
] as const

const RADIUS = [
  { cls: "rounded-sm", token: "--radius-sm", px: "6px" },
  { cls: "rounded-md", token: "--radius-md", px: "8px" },
  { cls: "rounded-lg", token: "--radius-lg", px: "10px" },
  { cls: "rounded-xl", token: "--radius-xl", px: "14px" },
  { cls: "rounded-2xl", token: "--radius-2xl", px: "18px" },
  { cls: "rounded-3xl", token: "--radius-3xl", px: "22px" },
  { cls: "rounded-4xl", token: "--radius-4xl", px: "26px" },
] as const

export function SheetSpace() {
  return (
    <Sheet
      id="sheet-space"
      index="03"
      title="Space & radius"
      meta="Tailwind spacing · --radius: 0.625rem base"
      lead="Spacing runs on Tailwind's 4px unit, unmodified. Radius is one base value — --radius, 10px — scaled up and down for every rounded corner in the system. Bars below are drawn at true 1:1 pixel scale."
    >
      <div className="flex flex-col gap-10">
        <Block label="Spacing — 1:1 scale">
          <div className="flex flex-col gap-2.5">
            {SPACING.map((s) => (
              <div key={s.token} className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                  {s.token}
                </span>
                <span
                  aria-hidden
                  className="h-2 shrink-0 rounded-full bg-primary/70"
                  style={{ width: `${s.px}px` }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {s.px}px
                </span>
              </div>
            ))}
          </div>
        </Block>

        <Block label="Radius">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RADIUS.map((r) => (
              <div
                key={r.cls}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className={`size-12 shrink-0 border-2 border-primary/60 bg-primary/10 ${r.cls}`} />
                <div className="min-w-0 flex-1">
                  <Spec name={r.cls} value={r.px} />
                  <Spec name={r.token} />
                </div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Sheet>
  )
}
