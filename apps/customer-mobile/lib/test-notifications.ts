import * as Notifications from "expo-notifications"

import {
  configureNotificationHandler,
  ensureAndroidChannel,
  isNotificationsSupported,
} from "@/lib/notifications-core"

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus | null> {
  if (!isNotificationsSupported()) return null

  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export async function requestTestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsSupported()) return false

  configureNotificationHandler()
  await ensureAndroidChannel()

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === "granted") {
    return true
  }

  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

export type NotificationStyleKey = "campaign_update" | "billing" | "system" | "promo"

export type NotificationStyle = {
  key: NotificationStyleKey
  label: string
  title: string
  body: string
}

export const NOTIFICATION_STYLES: NotificationStyle[] = [
  {
    key: "campaign_update",
    label: "Campaign update",
    title: "Campaign live",
    body: "Nairobi CBD Summer just went live.",
  },
  {
    key: "billing",
    label: "Billing",
    title: "Payment received",
    body: "Invoice #1042 has been paid.",
  },
  {
    key: "system",
    label: "System notice",
    title: "Maintenance notice",
    body: "Admobi will undergo maintenance tonight at 11pm.",
  },
  {
    key: "promo",
    label: "New feature",
    title: "New feature",
    body: "Try the new campaign scheduler.",
  },
]

export async function sendTestNotification(
  style: NotificationStyle,
): Promise<boolean> {
  if (!isNotificationsSupported()) return false

  const granted = await requestTestNotificationPermissions()
  if (!granted) return false

  await Notifications.scheduleNotificationAsync({
    content: {
      title: style.title,
      body: style.body,
      sound: true,
      data: { key: style.key },
    },
    trigger: null,
  })

  return true
}
