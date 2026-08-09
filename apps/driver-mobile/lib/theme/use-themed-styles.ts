import { useMemo } from "react"
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native"

import { type ThemeColors } from "@/lib/theme/palettes"
import { useThemeColors } from "@/lib/theme/provider"

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

/**
 * Build StyleSheet styles from the active theme. Recreates when colors change.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useThemeColors()
  // factory is intentionally omitted from deps — callers pass an inline
  // function that only closes over stable values besides `colors`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)) as T, [colors])
}
