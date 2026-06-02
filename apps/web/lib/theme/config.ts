export const THEME_STORAGE_KEY = "theme"

export const THEME_OPTIONS = ["light", "dark"] as const

export type ThemeOption = (typeof THEME_OPTIONS)[number] | "system"

export const themeConfig = {
  attribute: "class" as const,
  storageKey: THEME_STORAGE_KEY,
  defaultTheme: "light" as const,
  enableSystem: true,
  enableColorScheme: true,
  themes: THEME_OPTIONS,
}
