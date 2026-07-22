import { Platform } from "react-native"

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
  eyebrow: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    fontFamily: fonts.semibold,
  },
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
    fontFamily: fonts.bold,
  },
} as const
