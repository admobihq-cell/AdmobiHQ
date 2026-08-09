import { Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { useTheme } from "@/lib/theme/provider"
import { type ThemeOption } from "@/lib/theme/palettes"
import { radius, spacing, typography } from "@/lib/theme/tokens"

const OPTIONS: Array<{ key: ThemeOption; label: string; hint: string }> = [
  { key: "light", label: "Light", hint: "Warm cream interface" },
  { key: "dark", label: "Dark", hint: "Low-light friendly" },
  { key: "system", label: "System", hint: "Match device setting" },
]

export function ThemeSettingsSection() {
  const { colors, theme, setTheme } = useTheme()

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        Appearance
      </Text>
      <View
        style={[
          styles.group,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        {OPTIONS.map((option, index) => {
          const selected = theme === option.key
          return (
            <View key={option.key}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
              <Pressable
                onPress={() => setTheme(option.key)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.copy}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    {option.hint}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? colors.primary : colors.border },
                    selected && { backgroundColor: colors.primary },
                  ]}
                />
              </Pressable>
            </View>
          )
        })}
      </View>
      {Platform.OS === "web" ? (
        <Text style={[styles.hotkeyHint, { color: colors.mutedForeground }]}>
          On web, press D to toggle light and dark.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginLeft: spacing.xs,
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.section,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  hotkeyHint: {
    ...typography.caption,
    marginLeft: spacing.xs,
    lineHeight: 18,
  },
})
