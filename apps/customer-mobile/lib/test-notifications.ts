import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

const ANDROID_CHANNEL_ID = "default"
const BRAND_COLOR = "#0B6E4F"

let handlerConfigured = false

/** Notifications are native-only; expo-notifications APIs throw on web. */
export function isNotificationsSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android"
}

/** Ensures a fired notification also shows as an in-app banner while foregrounded. */
export function configureNotificationHandler() {
  if (!isNotificationsSupported() || handlerConfigured) return
  handlerConfigured = true

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Admobi alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_COLOR,
  })
}

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
