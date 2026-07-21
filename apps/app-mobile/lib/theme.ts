import { Platform } from "react-native"

/**
 * Admobi brand tokens — mirrors packages/ui light theme.
 */
export const colors = {
  background: "#FAF9F7",
  foreground: "#3A3834",
  card: "#FDFCFB",
  primary: "#9B4525",
  primaryForeground: "#FAF9F7",
  secondary: "#EDE9E4",
  muted: "#F0EDE8",
  mutedForeground: "#6B6760",
  border: "#E0DBD4",
  bg: "#FAF9F7",
  surface: "#FDFCFB",
  text: "#3A3834",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const typography = {
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  section: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
} as const

export const fonts = {
  regular: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
} as const
