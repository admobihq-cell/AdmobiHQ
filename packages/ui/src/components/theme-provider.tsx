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

function resolveTheme(theme: ThemeOption): "light" | "dark" {
  if (theme === "system" && themeConfig.enableSystem) {
    return getSystemTheme()
  }
  return theme === "dark" ? "dark" : "light"
}

function applyThemeToDocument(resolved: "light" | "dark") {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  if (themeConfig.enableColorScheme) {
    root.style.colorScheme = resolved
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeOption | undefined>(undefined)
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark" | undefined>(
    undefined,
  )

  const themes = React.useMemo<ThemeOption[]>(
    () =>
      themeConfig.enableSystem
        ? [...themeConfig.themes, "system"]
        : [...themeConfig.themes],
    [],
  )

  const setTheme = React.useCallback<React.Dispatch<React.SetStateAction<ThemeOption>>>(
    (value) => {
      setThemeState((current) => {
        const next = typeof value === "function" ? value(current ?? themeConfig.defaultTheme) : value
        persistThemePreference(next)
        const resolved = resolveTheme(next)
        setResolvedTheme(resolved)
        applyThemeToDocument(resolved)
        return next
      })
    },
    [],
  )

  React.useEffect(() => {
    const stored = readStoredTheme()
    persistThemePreference(stored)
    const resolved = resolveTheme(stored)
    setThemeState(stored)
    setResolvedTheme(resolved)
    applyThemeToDocument(resolved)
  }, [])

  React.useEffect(() => {
    if (!themeConfig.enableSystem || theme !== "system") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function onChange() {
      const resolved = getSystemTheme()
      setResolvedTheme(resolved)
      applyThemeToDocument(resolved)
    }

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  React.useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }
      const stored = readStoredTheme()
      persistThemePreference(stored)
      const resolved = resolveTheme(stored)
      setThemeState(stored)
      setResolvedTheme(resolved)
      applyThemeToDocument(resolved)
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
