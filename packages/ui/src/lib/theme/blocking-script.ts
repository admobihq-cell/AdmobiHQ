import { themeConfig } from "@workspace/ui/lib/theme/config"

/**
 * Inline script that runs before paint to apply the stored theme (same contract as next-themes).
 * Rendered from the root layout <head>, not from a client component.
 */
export function getThemeBlockingScript(): string {
  const {
    attribute,
    storageKey,
    defaultTheme,
    enableSystem,
    enableColorScheme,
    themes,
  } = themeConfig

  const args = [
    attribute,
    storageKey,
    defaultTheme,
    null,
    [...themes],
    null,
    enableSystem,
    enableColorScheme,
  ]
    .map((value) => JSON.stringify(value))
    .join(",")

  return `(${applyThemeBeforeHydration.toString()})(${args})`
}

function applyThemeBeforeHydration(
  attribute: string | string[],
  storageKey: string,
  defaultTheme: string,
  forcedTheme: string | null,
  themeNames: string[],
  value: Record<string, string> | null,
  enableSystem: boolean,
  enableColorScheme: boolean,
) {
  const root = document.documentElement
  const colorSchemes = ["light", "dark"]

  function apply(theme: string) {
    const attributes = Array.isArray(attribute) ? attribute : [attribute]

    for (const attr of attributes) {
      const isClass = attr === "class"
      const classList = isClass && value ? themeNames.map((name) => value[name] || name) : themeNames

      if (isClass) {
        root.classList.remove(...classList)
        root.classList.add(value && value[theme] ? value[theme] : theme)
      } else if (attr.startsWith("data-")) {
        const next = value && value[theme] ? value[theme] : theme
        if (next) {
          root.setAttribute(attr, next)
        } else {
          root.removeAttribute(attr)
        }
      }
    }

    if (enableColorScheme && colorSchemes.includes(theme)) {
      root.style.colorScheme = theme
    }
  }

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  if (forcedTheme) {
    apply(forcedTheme)
    return
  }

  try {
    const stored = localStorage.getItem(storageKey) || defaultTheme
    const resolved = enableSystem && stored === "system" ? systemTheme() : stored
    apply(resolved)
  } catch {
    apply(defaultTheme)
  }
}
