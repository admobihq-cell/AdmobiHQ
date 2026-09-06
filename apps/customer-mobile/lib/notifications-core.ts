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

/**
 * Where a tapped notification should land. `href` is set by the API
 * (`notifyUserPush`) so the push and the inbox row for the same event agree —
 * it is never rebuilt from the payload here.
 *
 * Only in-app paths are accepted: a push payload is attacker-influencable in
 * principle, and `router.push` would happily follow anything.
 */
export type PushDeepLink = { href: string }

export function readPushDeepLink(data: Record<string, unknown> | undefined): PushDeepLink | null {
  if (!data || typeof data.href !== "string") return null
  if (!data.href.startsWith("/") || data.href.startsWith("//")) return null
  return { href: data.href }
}

/** The notification that launched the app from a cold start, if any. */
export async function getColdStartPushDeepLink(): Promise<PushDeepLink | null> {
  if (!isNotificationsSupported()) return null

  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return null
  return readPushDeepLink(
    response.notification.request.content.data as Record<string, unknown>,
  )
}

/** Taps while the app is running — foreground or background. */
export function addPushResponseListener(onNavigate: (link: PushDeepLink) => void) {
  if (!isNotificationsSupported()) return () => {}

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = readPushDeepLink(
      response.notification.request.content.data as Record<string, unknown>,
    )
    if (link) onNavigate(link)
  })

  return () => subscription.remove()
}

/** Pushes that arrive while the app is open, so the bell badge and the inbox
 * don't wait for the next refetch to notice. */
export function addPushReceivedListener(onReceived: () => void) {
  if (!isNotificationsSupported()) return () => {}

  const subscription = Notifications.addNotificationReceivedListener(() => onReceived())
  return () => subscription.remove()
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
