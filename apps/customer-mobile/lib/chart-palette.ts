import { useMemo } from "react"
import { CHART_SERIES, type ChartPalette } from "@workspace/mobile-charts"

import { useResolvedTheme, useThemeColors } from "@/lib/theme"

/**
 * This app's theme as the colours `@workspace/mobile-charts` draws with. Series colours come from the
 * package (the web's chart-1..5 for light or dark); everything else follows the theme, so charts
 * switch with dark mode. Amber for warnings is the fourth chart colour.
 */
export function useChartPalette(): ChartPalette {
  const colors = useThemeColors()
  const mode = useResolvedTheme()
  return useMemo(
    () => ({
      text: colors.text,
      muted: colors.mutedForeground,
      grid: colors.border,
      surface: colors.surface,
      border: colors.border,
      series: CHART_SERIES[mode],
      good: colors.success,
      bad: colors.destructive,
      warning: CHART_SERIES[mode][3],
      neutral: colors.mutedForeground,
      sample: colors.mutedForeground,
    }),
    [colors, mode],
  )
}
