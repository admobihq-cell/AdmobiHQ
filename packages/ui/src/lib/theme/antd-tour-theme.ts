import { theme as antdTheme, type ThemeConfig } from "antd"

/** Only used for the instant before the first effect resolves real values
 * from globals.css — the Tour never actually paints before that happens. */
const FALLBACK_TOKENS = {
  colorPrimary: "#96431f",
  colorBgContainer: "#fefdfb",
  colorText: "#292a33",
  colorBorderSecondary: "#dedad2",
}

/** Round-trips a CSS color (including oklch()) through canvas's fillStyle
 * parser, which normalizes it to an rgb()/hex string antd's token engine
 * (TinyColor) can actually read — TinyColor doesn't understand oklch(). */
function resolveCssColor(raw: string): string | null {
  if (typeof document === "undefined" || !raw) return null
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = raw
    return ctx.fillStyle
  } catch {
    return null
  }
}

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

/** Mirrors the brand tokens in packages/ui/src/styles/globals.css (--primary,
 * --popover, etc.) into an antd ThemeConfig, so Tour always matches whatever
 * the current app's palette is — light/dark included — without a second,
 * hand-maintained set of hex constants that can drift out of sync. */
export function buildAdmobiAntdTheme(
  resolvedTheme: "light" | "dark" | undefined
): ThemeConfig {
  const isDark = resolvedTheme === "dark"
  const algorithm = isDark
    ? antdTheme.darkAlgorithm
    : antdTheme.defaultAlgorithm

  if (typeof document === "undefined") {
    return {
      algorithm,
      token: {
        ...FALLBACK_TOKENS,
        borderRadius: 10,
        fontFamily: "var(--font-sans)",
      },
    }
  }

  const colorPrimary =
    resolveCssColor(readCssVar("--primary")) ?? FALLBACK_TOKENS.colorPrimary
  const colorBgContainer =
    resolveCssColor(readCssVar("--popover")) ?? FALLBACK_TOKENS.colorBgContainer
  const colorText =
    resolveCssColor(readCssVar("--popover-foreground")) ??
    FALLBACK_TOKENS.colorText
  const colorBorderSecondary =
    resolveCssColor(readCssVar("--border")) ??
    FALLBACK_TOKENS.colorBorderSecondary

  return {
    algorithm,
    token: {
      colorPrimary,
      colorBgContainer,
      colorText,
      colorBorderSecondary,
      borderRadius: 10,
      fontFamily: "var(--font-sans)",
    },
  }
}
