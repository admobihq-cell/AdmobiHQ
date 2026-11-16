import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Link, type Href } from "expo-router"

import { ChevronRight } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** A section title in sentence case, with an optional link on the right (the shape Home and Earnings share). */
export function SectionHeader({ title, link }: { title: string; link?: { label: string; href: Href } }) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, minHeight: 32 },
    title: { ...typography.headline, fontSize: 18, color: c.text },
    link: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2, minHeight: 44 },
    linkText: { ...typography.section, color: c.primary },
  }))
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {link ? (
        <Link href={link.href} asChild>
          <Pressable accessibilityRole="link" style={styles.link} hitSlop={8}>
            <Text style={styles.linkText}>{link.label}</Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  )
}

/**
 * Marks a figure that is illustrative, not recorded. Dashed, so it never reads as a status. Every number
 * that comes from `lib/placeholder-data.ts` carries one, as on driver-web.
 */
export function SampleTag() {
  const colors = useThemeColors()
  return (
    <View style={[tagStyles.tag, { borderColor: colors.mutedForeground }]} accessibilityLabel="Sample figure, not your real data">
      <Text style={[tagStyles.text, { color: colors.mutedForeground }]}>Sample</Text>
    </View>
  )
}

export type PillTone = "good" | "warning" | "serious" | "neutral"

/** Status in words, never colour alone: a soft tinted fill with the label in the same hue. */
export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const c = useThemeColors()
  const ink = tone === "good" ? c.success : tone === "serious" ? c.destructive : tone === "warning" ? c.primary : c.mutedForeground
  const fill = tone === "good" ? `${c.success}1F` : tone === "serious" ? c.destructiveMuted : tone === "warning" ? c.accentSurface : c.muted
  return (
    <View style={[tagStyles.pill, { backgroundColor: fill }]}>
      <Text style={[tagStyles.pillText, { color: ink }]}>{label}</Text>
    </View>
  )
}

/** A card: one surface, one border, no nesting. */
export function Card({ children, gap = spacing.md }: { children: ReactNode; gap?: number }) {
  const styles = useThemedStyles((c) => ({
    card: { padding: spacing.md, borderRadius: radius["2xl"], borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
  }))
  return <View style={[styles.card, { gap }]}>{children}</View>
}

const tagStyles = StyleSheet.create({
  tag: { alignSelf: "flex-start", borderWidth: 1, borderStyle: "dashed", borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
  pill: { alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
})
