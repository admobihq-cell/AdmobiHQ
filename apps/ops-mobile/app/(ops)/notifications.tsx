import { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { Bell, Car, Mail, Megaphone, Send, Warning, type AppIcon } from "@/components/icons"
import {
  getNotificationPermissionStatus,
  NOTIFICATION_STYLES,
  requestTestNotificationPermissions,
  sendTestNotification,
  type NotificationStyle,
} from "@/lib/test-notifications"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STYLE_ICONS: Record<string, AppIcon> = {
  new_lead: Megaphone,
  driver_assigned: Car,
  fleet_alert: Warning,
  waitlist: Mail,
}

export default function NotificationsTestScreen() {
  const colors = useThemeColors()
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  )
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    getNotificationPermissionStatus().then((result) =>
      setPermissionGranted(result === "granted"),
    )
  }, [])

  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    hero: {
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: c.text,
    },
    body: {
      ...typography.body,
      color: c.mutedForeground,
    },
    permissionCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    permissionCopy: {
      flex: 1,
      gap: 2,
    },
    permissionLabel: {
      ...typography.section,
      color: c.text,
    },
    permissionHint: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    grantButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    grantButtonText: {
      ...typography.label,
      color: c.primaryForeground,
      fontWeight: "700" as const,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
      marginLeft: spacing.xs,
    },
    group: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 60,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    rowPressed: {
      opacity: 0.7,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...typography.section,
      color: c.text,
    },
    description: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    sendAll: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      borderRadius: 14,
      paddingVertical: 14,
      backgroundColor: c.primary,
    },
    sendAllPressed: {
      opacity: 0.85,
    },
    sendAllText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
    status: {
      ...typography.caption,
      color: c.primary,
      textAlign: "center" as const,
    },
  }))

  const handleSend = async (style: NotificationStyle) => {
    const sent = await sendTestNotification(style)
    if (sent) {
      setPermissionGranted(true)
      setStatus(`Sent "${style.title}" — check your notification shade.`)
    } else {
      setStatus("Notification permission is required to send a preview.")
    }
  }

  const handleSendAll = async () => {
    for (const [index, style] of NOTIFICATION_STYLES.entries()) {
      setTimeout(() => {
        void sendTestNotification(style)
      }, index * 1200)
    }
    setPermissionGranted(true)
    setStatus("Sending all styles — check your notification shade.")
  }

  const handleGrant = async () => {
    const granted = await requestTestNotificationPermissions()
    setPermissionGranted(granted)
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Preview notifications</Text>
          <Text style={styles.body}>
            Send yourself a sample notification to preview how each style
            looks, including in the system notification panel, before
            shipping this to devices.
          </Text>
        </View>

        {permissionGranted === false ? (
          <View style={styles.permissionCard}>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionLabel}>Notifications disabled</Text>
              <Text style={styles.permissionHint}>
                Grant permission to send yourself a preview.
              </Text>
            </View>
            <Pressable
              style={styles.grantButton}
              onPress={handleGrant}
              accessibilityRole="button"
            >
              <Text style={styles.grantButtonText}>Grant</Text>
            </Pressable>
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionLabel}>Sample styles</Text>
          <View style={[styles.group, { marginTop: spacing.sm }]}>
            {NOTIFICATION_STYLES.map((style, index) => {
              const Icon = STYLE_ICONS[style.key] ?? Bell
              return (
                <View key={style.key}>
                  <Pressable
                    onPress={() => handleSend(style)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={styles.iconWrap}>
                      <Icon color={colors.primary} size={20} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.label}>{style.label}</Text>
                      <Text style={styles.description}>{style.title}</Text>
                    </View>
                  </Pressable>
                  {index < NOTIFICATION_STYLES.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sendAll,
            pressed && styles.sendAllPressed,
          ]}
          onPress={handleSendAll}
          accessibilityRole="button"
        >
          <Send color={colors.primaryForeground} size={18} />
          <Text style={styles.sendAllText}>Send all styles</Text>
        </Pressable>

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>
    </>
  )
}
