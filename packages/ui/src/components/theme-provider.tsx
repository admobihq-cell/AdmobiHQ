"use client"

import * as React from "react"

import {
  THEME_STORAGE_KEY,
  type ThemeOption,
  themeConfig,
} from "@workspace/ui/lib/theme/config"
import { persistThemePreference } from "@workspace/ui/lib/theme/persist"

type ThemeContextValue = {
  theme: ThemeOption | undefined
  resolvedTheme: "light" | "dark" | undefined
  setTheme: React.Dispatch<React.SetStateAction<ThemeOption>>
  themes: ThemeOption[]
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredTheme(): ThemeOption {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
  } catch {
    // ignore
  }
  return themeConfig.defaultTheme
}

function resolveTheme(
  theme: ThemeOption,
  systemTheme: "light" | "dark" | undefined,
): "light" | "dark" {
  if (theme === "system" && themeConfig.enableSystem) {
    return systemTheme ?? themeConfig.defaultTheme
  }
  return theme === "dark" ? "dark" : "light"
}

// Every themed element that transitions color/border on hover or focus
// (table rows, buttons, inputs, badges, ...) also picks up that transition
// when the CSS variables it reads flip via the root class swap below, so
// without this guard the page repaints as an uneven, staggered fade instead
// of a single instant switch. Suspending transitions for one frame makes
// the swap atomic across every component at once.
function suspendTransitions() {
  const style = document.createElement("style")
  style.textContent = "*, *::before, *::after { transition: none !important; }"
  document.head.appendChild(style)
  // Force a layout flush so the override is active before the class swap.
  window.getComputedStyle(style).opacity
  return () => {
    // Wait a frame so the new colors paint before transitions resume.
    requestAnimationFrame(() => {
      style.remove()
    })
  }
}

function applyThemeToDocument(resolved: "light" | "dark") {
  const resumeTransitions = suspendTransitions()
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  if (themeConfig.enableColorScheme) {
    root.style.colorScheme = resolved
  }
  resumeTransitions()
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeOption | undefined>(() => {
    if (typeof window === "undefined") return undefined
    return readStoredTheme()
  })
  // Tracked separately from `theme` so "system" resolves as derived state
  // rather than something each call site has to recompute and re-store.
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark" | undefined>(() => {
    if (typeof window === "undefined") return undefined
    return getSystemTheme()
  })

  const resolvedTheme = theme === undefined ? undefined : resolveTheme(theme, systemTheme)

  const themes = React.useMemo<ThemeOption[]>(
    () =>
      themeConfig.enableSystem
        ? [...themeConfig.themes, "system"]
        : [...themeConfig.themes],
    [],
  )

  // Pure: React re-invokes state updaters (twice under StrictMode, and again on
  // concurrent re-renders), so persisting and repainting from inside one made a
  // single toggle write storage and swap the root class more than once — two
  // overlapping transition-suspend styles, each removed a frame apart.
  const setTheme = React.useCallback<React.Dispatch<React.SetStateAction<ThemeOption>>>(
    (value) => {
      setThemeState((current) =>
        typeof value === "function" ? value(current ?? themeConfig.defaultTheme) : value,
      )
    },
    [],
  )

  // The single owner of the document and of storage. Running on mount as well
  // as on change means the provider can never disagree with whatever the
  // blocking script painted before hydration.
  React.useEffect(() => {
    if (theme === undefined || resolvedTheme === undefined) {
      return
    }
    persistThemePreference(theme)
    applyThemeToDocument(resolvedTheme)
  }, [theme, resolvedTheme])

  // Subscribed unconditionally: keeping systemTheme fresh even while an
  // explicit theme is active means switching back to "system" is already
  // correct instead of resolving off a stale value.
  React.useEffect(() => {
    if (!themeConfig.enableSystem) {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light")

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  // Another tab changed the preference. Setting state is enough — the effect
  // above repaints and re-persists.
  React.useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }
      setThemeState(readStoredTheme())
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themes,
    }),
    [theme, resolvedTheme, setTheme, themes],
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
