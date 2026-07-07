import { THEME_STORAGE_KEY, type ThemeOption } from "@workspace/ui/lib/theme/config"

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Resolved light/dark class for SSR when the user picked an explicit theme (not system). */
export function getServerThemeClass(
  cookieValue: string | undefined,
): "light" | "dark" | undefined {
  if (cookieValue === "dark" || cookieValue === "light") {
    return cookieValue
  }
  return undefined
}

export function persistThemePreference(theme: ThemeOption) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }

  try {
    document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`
  } catch {
    // ignore
  }
}
