/**
 * Colours a chart needs, passed in by the app from its own theme: the package never imports a theme, so
 * dark mode can't be broken by a component that hardcodes a colour.
 */
export type ChartPalette = {
  text: string
  muted: string
  grid: string
  surface: string
  border: string
  /** Categorical series colours, in order. Use `CHART_SERIES[mode]`. */
  series: readonly string[]
  good: string
  bad: string
  warning: string
  neutral: string
  /** The dashed "Sample" mark on figures that are illustrative. */
  sample: string
}

/** The web's `--chart-1…5` (packages/ui globals.css), converted from OKLCH to sRGB. */
export const CHART_SERIES = {
  light: ["#b25023", "#2863ab", "#109d7b", "#aa821e", "#854494"],
  dark: ["#cc763c", "#4c88d3", "#29a987", "#b18827", "#a462b4"],
} as const
