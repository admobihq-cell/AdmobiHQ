import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Platform, useColorScheme as useSystemColorScheme } from "react-native"

import {
  getColorsForTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeColors,
  type ThemeOption,
} from "@/lib/theme/palettes"

type ThemeContextValue = {
  theme: ThemeOption
  resolvedTheme: ResolvedTheme
  colors: ThemeColors
  setTheme: (theme: ThemeOption) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function parseStoredTheme(value: string | null): ThemeOption {
  if (value === "light" || value === "dark" || value === "system") {
    return value
  }
  return "system"
}

function resolveTheme(
  theme: ThemeOption,
  systemScheme: ResolvedTheme | null | undefined,
): ResolvedTheme {
  if (theme === "system") {
    return systemScheme === "dark" ? "dark" : "light"
  }
  return theme
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme()
  const [theme, setThemeState] = useState<ThemeOption>("system")
  const [ready, setReady] = useState(false)

  const resolvedTheme = resolveTheme(theme, systemScheme)
  const colors = useMemo(
    () => getColorsForTheme(resolvedTheme),
    [resolvedTheme],
  )

  useEffect(() => {
    let cancelled = false
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (cancelled) return
      setThemeState(parseStoredTheme(stored))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback((next: ThemeOption) => {
    setThemeState(next)
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
    root.style.backgroundColor =
      resolvedTheme === "dark" ? "#1E1D24" : "#FAF9F7"
    if (document.body) {
      document.body.style.backgroundColor =
        resolvedTheme === "dark" ? "#1E1D24" : "#FAF9F7"
    }
  }, [resolvedTheme])

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (event.key?.toLowerCase() !== "d") return
      toggleTheme()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleTheme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      colors,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, colors, setTheme, toggleTheme],
  )

  if (!ready) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "system",
          resolvedTheme: resolveTheme("system", systemScheme),
          colors: getColorsForTheme(resolveTheme("system", systemScheme)),
          setTheme,
          toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    )
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors
}

export function useResolvedTheme(): ResolvedTheme {
  return useTheme().resolvedTheme
}

export function useNavigationTheme() {
  const { colors, resolvedTheme } = useTheme()
  return {
    colors,
    resolvedTheme,
    statusBarStyle: resolvedTheme === "dark" ? ("light" as const) : ("dark" as const),
    screenOptions: {
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.primary,
      headerTitleStyle: { color: colors.text, fontWeight: "600" as const },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.bg },
    },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
  }
}
