import * as Haptics from "expo-haptics"
import { Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native"

import { colors, radius, spacing, typography } from "@/lib/theme"

export type FilterChipOption = {
  key: string
  label: string
}

type FilterChipsProps = {
  options: FilterChipOption[]
  selected: string | null
  onSelect: (key: string | null) => void
  showAll?: boolean
  embedded?: boolean
}

export function FilterChips({
  options,
  selected,
  onSelect,
  showAll = true,
  embedded = false,
}: FilterChipsProps) {
  const handleSelect = (key: string | null) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync()
    }
    onSelect(key)
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.scroll,
        embedded && styles.scrollEmbedded,
      ]}
    >
      {showAll ? (
        <Pressable
          onPress={() => handleSelect(null)}
          style={[styles.chip, !selected && styles.chipActive]}
        >
          <Text style={[styles.chipText, !selected && styles.chipTextActive]}>
            All
          </Text>
        </Pressable>
      ) : null}
      {options.map((option) => {
        const active = selected === option.key
        return (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(active ? null : option.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  scrollEmbedded: {
    paddingHorizontal: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  chipTextActive: {
    color: colors.primaryForeground,
  },
})
