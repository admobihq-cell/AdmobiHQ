import { Sheet, Block } from "./sheet-shell"
import { Spec } from "./spec"

type ColorToken = {
  name: string
  var: string
  light: string
  dark: string
  /** Foreground token to sample on top of this swatch, if it's a surface. */
  on?: string
}

const SURFACE: ColorToken[] = [
  { name: "Background", var: "--background", light: "oklch(0.985 0.008 82)", dark: "oklch(0.195 0.022 268)", on: "--foreground" },
  { name: "Card", var: "--card", light: "oklch(0.993 0.006 82)", dark: "oklch(0.225 0.024 268)", on: "--card-foreground" },
  { name: "Popover", var: "--popover", light: "oklch(0.993 0.006 82)", dark: "oklch(0.235 0.024 268)", on: "--popover-foreground" },
]

const ACTION: ColorToken[] = [
  { name: "Primary", var: "--primary", light: "oklch(0.48 0.14 43)", dark: "oklch(0.7 0.12 52)", on: "--primary-foreground" },
  { name: "Secondary", var: "--secondary", light: "oklch(0.935 0.018 82)", dark: "oklch(0.3 0.028 268)", on: "--secondary-foreground" },
  { name: "Destructive", var: "--destructive", light: "oklch(0.54 0.2 27)", dark: "oklch(0.65 0.18 25)" },
]

const SUPPORTING: ColorToken[] = [
  { name: "Muted", var: "--muted", light: "oklch(0.945 0.014 82)", dark: "oklch(0.28 0.026 268)", on: "--muted-foreground" },
  { name: "Accent", var: "--accent", light: "oklch(0.94 0.02 75)", dark: "oklch(0.3 0.03 268)", on: "--accent-foreground" },
]

const STRUCTURE: ColorToken[] = [
  { name: "Border", var: "--border", light: "oklch(0.88 0.018 82)", dark: "oklch(0.97 0.012 82 / 12%)" },
  { name: "Input", var: "--input", light: "oklch(0.88 0.018 82)", dark: "oklch(0.97 0.012 82 / 14%)" },
  { name: "Ring", var: "--ring", light: "oklch(0.48 0.14 43)", dark: "oklch(0.7 0.12 52)" },
]

const CHART: ColorToken[] = [
  { name: "Chart 1", var: "--chart-1", light: "oklch(0.55 0.14 43)", dark: "oklch(0.7 0.12 52)" },
  { name: "Chart 2", var: "--chart-2", light: "oklch(0.46 0.032 262)", dark: "oklch(0.72 0.028 268)" },
  { name: "Chart 3", var: "--chart-3", light: "oklch(0.65 0.08 230)", dark: "oklch(0.55 0.08 230)" },
  { name: "Chart 4", var: "--chart-4", light: "oklch(0.72 0.12 58)", dark: "oklch(0.72 0.1 58)" },
  { name: "Chart 5", var: "--chart-5", light: "oklch(0.4 0.06 262)", dark: "oklch(0.45 0.05 268)" },
]

function Swatch({ token, tall = true }: { token: ColorToken; tall?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div
        className={tall ? "flex h-20 items-end p-3" : "flex h-10 items-center p-3"}
        style={{ background: `var(${token.var})` }}
      >
        {token.on ? (
          <span
            className="font-heading text-sm font-medium"
            style={{ color: `var(${token.on})` }}
          >
            Aa
          </span>
        ) : null}
      </div>
      <div className="border-t border-border bg-background px-1 py-1">
        <p className="px-1.5 pt-1 pb-0.5 text-sm font-medium text-foreground">
          {token.name}
        </p>
        <Spec name="light" value={token.light} copyValue={token.light} />
        <Spec name="dark" value={token.dark} copyValue={token.dark} />
      </div>
    </div>
  )
}

export function SheetColor() {
  return (
    <Sheet
      id="sheet-color"
      index="01"
      title="Color"
      meta="packages/ui/src/styles/globals.css"
      lead="One committed accent — terra — over warm, low-chroma neutrals. Every role is a semantic CSS variable in OKLCH, remapped wholesale under .dark rather than inverted. Swatches render the live value for whichever theme is active; the two rows underneath are the source for both."
    >
      <div className="flex flex-col gap-10">
        <Block label="Surface">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SURFACE.map((t) => (
              <Swatch key={t.var} token={t} />
            ))}
          </div>
        </Block>

        <Block label="Action">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACTION.map((t) => (
              <Swatch key={t.var} token={t} />
            ))}
          </div>
        </Block>

        <Block label="Supporting">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SUPPORTING.map((t) => (
              <Swatch key={t.var} token={t} />
            ))}
          </div>
        </Block>

        <Block label="Structure — border, input, ring">
          <div className="grid grid-cols-3 gap-3">
            {STRUCTURE.map((t) => (
              <Swatch key={t.var} token={t} tall={false} />
            ))}
          </div>
        </Block>

        <Block label="Chart series">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHART.map((t) => (
              <Swatch key={t.var} token={t} tall={false} />
            ))}
          </div>
        </Block>
      </div>
    </Sheet>
  )
}
