import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export const ANDROID_CHANNEL_ID = "default"
export const BRAND_COLOR = "#0B6E4F"

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

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Admobi alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_COLOR,
  })
}
