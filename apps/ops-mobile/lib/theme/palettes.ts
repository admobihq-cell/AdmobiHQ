/** Light palette — mirrors packages/ui globals.css :root */
export type ThemeColors = {
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveMuted: string
  border: string
  input: string
  ring: string
  success: string
  bg: string
  surface: string
  text: string
  mutedSurface: string
  mutedText: string
  accentSurface: string
  danger: string
}

export const lightColors = {
  background: "#FAF9F7",
  foreground: "#3A3834",
  card: "#FDFCFB",
  cardForeground: "#3A3834",
  primary: "#9B4525",
  primaryForeground: "#FAF9F7",
  secondary: "#EDE9E4",
  secondaryForeground: "#3A3834",
  muted: "#F0EDE8",
  mutedForeground: "#6B6760",
  accent: "#EDE4D8",
  accentForeground: "#3A3834",
  destructive: "#C04A2F",
  destructiveMuted: "rgba(192, 74, 47, 0.1)",
  border: "#E0DBD4",
  input: "#E0DBD4",
  ring: "#9B4525",
  success: "#2D7A4F",
  bg: "#FAF9F7",
  surface: "#FDFCFB",
  text: "#3A3834",
  mutedSurface: "#F0EDE8",
  mutedText: "#6B6760",
  accentSurface: "#EDE4D8",
  danger: "#C04A2F",
} as const satisfies ThemeColors

/**
 * Dark palette — computed by converting packages/ui globals.css .dark's
 * OKLCH values to sRGB (Björn Ottosson's OKLab matrices), not hand-picked.
 * Matches customer-mobile/driver-mobile's corrected values — the previous
 * hex values here were eyeballed and drifted noticeably lighter/warmer than
 * the web dark theme (e.g. background #1E1D24 vs the web-equivalent
 * #11151F), which is why ops-mobile's dark mode and auth screens looked
 * visibly different in color from the other two apps.
 */
export const darkColors = {
  background: "#11151F",
  foreground: "#F9F5EC",
  card: "#171B27",
  cardForeground: "#F9F5EC",
  primary: "#D98854",
  primaryForeground: "#11151F",
  secondary: "#282D3C",
  secondaryForeground: "#F9F5EC",
  muted: "#232936",
  mutedForeground: "#9DA4B7",
  accent: "#272D3D",
  accentForeground: "#F9F5EC",
  destructive: "#E85854",
  destructiveMuted: "rgba(232, 88, 84, 0.12)",
  border: "rgba(249, 245, 236, 0.12)",
  input: "rgba(249, 245, 236, 0.14)",
  ring: "#D98854",
  success: "#3D9A66",
  bg: "#11151F",
  surface: "#171B27",
  text: "#F9F5EC",
  mutedSurface: "#232936",
  mutedText: "#9DA4B7",
  accentSurface: "#272D3D",
  danger: "#E85854",
} as const satisfies ThemeColors

export type ThemeColorKey = keyof ThemeColors
export type ResolvedTheme = "light" | "dark"
export type ThemeOption = ResolvedTheme | "system"

export const THEME_STORAGE_KEY = "theme"

export function getColorsForTheme(resolved: ResolvedTheme): ThemeColors {
  return resolved === "dark" ? darkColors : lightColors
}
