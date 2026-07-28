import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type View as RNView,
} from "react-native"

import { Bell } from "@/components/icons"
import {
  ACTIVITY_CATEGORY_ICONS,
  auditEventToActivityItem,
  type ActivityItem,
} from "@/lib/activity-feed"
import { useOpsClient } from "@/lib/ops-client"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const MAX_PREVIEW_ITEMS = 3

type Anchor = { x: number; y: number; width: number; height: number }

function PreviewRow({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const colors = useThemeColors()
  const Icon = ACTIVITY_CATEGORY_ICONS[item.category]
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    rowPressed: {
      opacity: 0.7,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: item.read ? c.muted : c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: {
      ...typography.bodySm,
      color: c.text,
      fontWeight: item.read ? ("500" as const) : ("700" as const),
      flex: 1,
    },
    time: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
  }))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.iconWrap}>
        <Icon color={item.read ? colors.mutedForeground : colors.primary} size={14} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      {item.read ? null : <View style={styles.unreadDot} />}
      <Text style={styles.time}>{item.time}</Text>
    </Pressable>
  )
}

/** Bell button that opens a compact preview popover instead of jumping straight to the full activity screen. */
export function ActivityBellButton() {
  const router = useRouter()
  const client = useOpsClient()
  const colors = useThemeColors()
  const { width: screenWidth } = useWindowDimensions()
  const triggerRef = useRef<RNView>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [preview, setPreview] = useState<ActivityItem[]>([])

  const loadPreview = useCallback(async () => {
    try {
      const result = await client.audit.list({ page: 1, pageSize: MAX_PREVIEW_ITEMS })
      setPreview(result.items.map(auditEventToActivityItem))
    } catch {
      setPreview([])
    }
  }, [client])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  const styles = useThemedStyles((c) => ({
    button: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pressed: {
      opacity: 0.75,
    },
    backdrop: {
      flex: 1,
    },
    panel: {
      position: "absolute" as const,
      width: 268,
      maxWidth: "88%" as const,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      ...typography.label,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
      fontWeight: "700" as const,
    },
    empty: {
      paddingVertical: spacing.lg,
      alignItems: "center" as const,
    },
    emptyText: {
      ...typography.bodySm,
      color: c.mutedForeground,
    },
    footer: {
      paddingVertical: spacing.sm,
      alignItems: "center" as const,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    footerText: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.primary,
    },
  }))

  function openMenu() {
    void loadPreview()
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
      setOpen(true)
    })
  }

  function goToActivity() {
    setOpen(false)
    router.push("/(ops)/activity")
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Activity"
        hitSlop={10}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Bell size={18} color={colors.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        {anchor ? (
          <View
            style={[
              styles.panel,
              {
                top: anchor.y + anchor.height + 8,
                right: Math.max(spacing.lg, screenWidth - (anchor.x + anchor.width)),
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Activity</Text>
            </View>

            {preview.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            ) : (
              preview.map((item) => (
                <PreviewRow key={item.id} item={item} onPress={goToActivity} />
              ))
            )}

            <Pressable
              onPress={goToActivity}
              style={({ pressed }) => [styles.footer, pressed && styles.pressed]}
            >
              <Text style={styles.footerText}>See all activity</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </>
  )
}
