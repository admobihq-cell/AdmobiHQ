import { Platform } from "react-native"

/**
 * Admobi brand tokens — mirrors packages/ui/src/styles/globals.css (:root light).
 * Warm neutrals + terra primary (Committed strategy).
 */
export const colors = {
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
  // Aliases used across mobile screens
  bg: "#FAF9F7",
  surface: "#FDFCFB",
  text: "#3A3834",
  mutedSurface: "#F0EDE8",
  mutedText: "#6B6760",
  accentSurface: "#EDE4D8",
  danger: "#C04A2F",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const

export const fonts = {
  regular: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  medium: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  semibold: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  bold: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
} as const

export const typography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    fontFamily: fonts.bold,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    fontFamily: fonts.bold,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
    fontFamily: fonts.semibold,
  },
  section: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: fonts.semibold,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    fontFamily: fonts.medium,
  },
  /** @deprecated Use section headers instead */
  eyebrow: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    fontFamily: fonts.semibold,
  },
  /** @deprecated Use largeTitle for root screens */
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
    fontFamily: fonts.bold,
  },
} as const
