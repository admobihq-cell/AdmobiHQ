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

/** Dark palette — mirrors packages/ui globals.css .dark */
export const darkColors = {
  background: "#1E1D24",
  foreground: "#F7F5F2",
  card: "#27262E",
  cardForeground: "#F7F5F2",
  primary: "#D4845C",
  primaryForeground: "#1E1D24",
  secondary: "#3A3844",
  secondaryForeground: "#F7F5F2",
  muted: "#32313A",
  mutedForeground: "#A8A4A0",
  accent: "#3A3844",
  accentForeground: "#F7F5F2",
  destructive: "#E06B52",
  destructiveMuted: "rgba(224, 107, 82, 0.12)",
  border: "rgba(247, 245, 242, 0.12)",
  input: "rgba(247, 245, 242, 0.14)",
  ring: "#D4845C",
  success: "#3D9A66",
  bg: "#1E1D24",
  surface: "#27262E",
  text: "#F7F5F2",
  mutedSurface: "#32313A",
  mutedText: "#A8A4A0",
  accentSurface: "#3A3844",
  danger: "#E06B52",
} as const satisfies ThemeColors

export type ThemeColorKey = keyof ThemeColors
export type ResolvedTheme = "light" | "dark"
export type ThemeOption = ResolvedTheme | "system"

export const THEME_STORAGE_KEY = "theme"

export function getColorsForTheme(resolved: ResolvedTheme): ThemeColors {
  return resolved === "dark" ? darkColors : lightColors
}
