import { Sheet, Block } from "./sheet-shell"
import { Spec } from "./spec"

const SCALE = [
  { cls: "text-xs", label: "xs", size: "0.75rem / 12px", leading: "1rem / 16px" },
  { cls: "text-sm", label: "sm", size: "0.875rem / 14px", leading: "1.25rem / 20px" },
  { cls: "text-base", label: "base", size: "1rem / 16px", leading: "1.5rem / 24px" },
  { cls: "text-lg", label: "lg", size: "1.125rem / 18px", leading: "1.75rem / 28px" },
  { cls: "text-xl", label: "xl", size: "1.25rem / 20px", leading: "1.75rem / 28px" },
  { cls: "text-2xl", label: "2xl", size: "1.5rem / 24px", leading: "2rem / 32px" },
  { cls: "text-3xl", label: "3xl", size: "1.875rem / 30px", leading: "2.25rem / 36px" },
  { cls: "text-4xl", label: "4xl", size: "2.25rem / 36px", leading: "2.5rem / 40px" },
] as const

const WEIGHTS = [
  { cls: "font-normal", label: "Normal", value: "400" },
  { cls: "font-medium", label: "Medium", value: "500" },
  { cls: "font-semibold", label: "Semibold", value: "600" },
  { cls: "font-bold", label: "Bold", value: "700" },
] as const

export function SheetType() {
  return (
    <Sheet
      id="sheet-type"
      index="02"
      title="Type"
      meta="next/font — Geist, Geist Mono"
      lead="Geist carries every heading and UI label; there's no separate display face — font-heading resolves to the same family. Geist Mono is reserved for exactly this kind of thing: labels, values, measurements."
    >
      <div className="flex flex-col gap-10">
        <Block label="Families">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-5">
              <p className="font-sans text-3xl text-foreground">Aa Bb Cc</p>
              <p className="mt-2 font-sans text-sm text-muted-foreground">
                Nairobi moves at street level.
              </p>
              <div className="mt-4 border-t border-border pt-2">
                <Spec name="--font-sans" value="Geist" />
              </div>
            </div>
            <div className="rounded-xl border border-border p-5">
              <p className="font-mono text-3xl text-foreground">Aa Bb Cc</p>
              <p className="mt-2 font-mono text-sm text-muted-foreground">
                --primary: oklch(0.48 0.14 43)
              </p>
              <div className="mt-4 border-t border-border pt-2">
                <Spec name="--font-mono" value="Geist Mono" />
              </div>
            </div>
          </div>
        </Block>

        <Block label="Weight">
          <div className="divide-y divide-border rounded-xl border border-border">
            {WEIGHTS.map((w) => (
              <div key={w.cls} className="flex items-center justify-between gap-4 px-4 py-3">
                <p className={`${w.cls} text-lg text-foreground`}>{w.label} — taxi-top LED</p>
                <span className="font-mono text-xs text-muted-foreground">{w.cls} · {w.value}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block label="Scale">
          <div className="divide-y divide-border rounded-xl border border-border">
            {SCALE.map((s) => (
              <div
                key={s.cls}
                className="grid grid-cols-1 items-baseline gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:gap-6"
              >
                <p className={`${s.cls} truncate font-medium text-foreground`}>
                  Corridor is live
                </p>
                <div className="flex shrink-0 gap-4 font-mono text-[0.7rem] text-muted-foreground sm:justify-end">
                  <span>{s.cls}</span>
                  <span>{s.size}</span>
                  <span>{s.leading}</span>
                </div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Sheet>
  )
}
