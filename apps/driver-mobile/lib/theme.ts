/** @deprecated Import from `@/lib/theme/palettes` or use `useThemeColors()` for dynamic theming. */
export { lightColors as colors } from "@/lib/theme/palettes"

export {
  darkColors,
  getColorsForTheme,
  lightColors,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeColors,
  type ThemeOption,
} from "@/lib/theme/palettes"

export { fonts, radius, spacing, typography } from "@/lib/theme/tokens"

export {
  ThemeProvider,
  useNavigationTheme,
  useResolvedTheme,
  useTheme,
  useThemeColors,
} from "@/lib/theme/provider"

export { useThemedStyles } from "@/lib/theme/use-themed-styles"
