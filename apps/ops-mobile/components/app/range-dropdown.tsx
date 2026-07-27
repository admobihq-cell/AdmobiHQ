import { useRef, useState } from "react"
import * as Haptics from "expo-haptics"
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type View as RNView,
} from "react-native"

import { Check, ChevronDown } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export type RangeDropdownOption<T extends string> = {
  key: T
  label: string
}

type Anchor = { x: number; y: number; width: number; height: number }

type RangeDropdownProps<T extends string> = {
  options: RangeDropdownOption<T>[]
  selected: T
  onSelect: (key: T) => void
}

/** A single trigger that opens a menu — the collapsed form of what used to be a row of pills. */
export function RangeDropdown<T extends string>({
  options,
  selected,
  onSelect,
}: RangeDropdownProps<T>) {
  const colors = useThemeColors()
  const { width: screenWidth } = useWindowDimensions()
  const triggerRef = useRef<RNView>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  const selectedLabel = options.find((o) => o.key === selected)?.label ?? ""

  const styles = useThemedStyles((c) => ({
    trigger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    triggerText: {
      ...typography.caption,
      fontWeight: "600" as const,
      color: c.text,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute" as const,
      minWidth: 148,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    menuItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    menuItemText: {
      ...typography.bodySm,
      color: c.text,
    },
    menuItemTextActive: {
      color: c.primary,
      fontWeight: "600" as const,
    },
  }))

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
      setOpen(true)
    })
  }

  function handleSelect(key: T) {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync()
    }
    onSelect(key)
    setOpen(false)
  }

  return (
    <>
      <Pressable ref={triggerRef} onPress={openMenu} style={styles.trigger}>
        <Text style={styles.triggerText}>{selectedLabel}</Text>
        <ChevronDown color={colors.mutedForeground} size={14} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        {anchor ? (
          <View
            style={[
              styles.menu,
              {
                top: anchor.y + anchor.height + 6,
                right: Math.max(spacing.lg, screenWidth - (anchor.x + anchor.width)),
              },
            ]}
          >
            {options.map((option) => {
              const active = option.key === selected
              return (
                <Pressable
                  key={option.key}
                  onPress={() => handleSelect(option.key)}
                  style={styles.menuItem}
                >
                  <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                    {option.label}
                  </Text>
                  {active ? <Check color={colors.primary} size={16} /> : null}
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </Modal>
    </>
  )
}

