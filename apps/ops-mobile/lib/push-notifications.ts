import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

import type { OpsClient } from "@workspace/ops-api-client"

const ANDROID_CHANNEL_ID = "default"
/** Must match the channelId the API sends for SOS alerts — see
 *  apps/api/lib/push/ops-alerts.ts. */
const SAFETY_CHANNEL_ID = "safety"
/** Android notification-channel LED/icon color — a fixed OS-level value, not the in-app theme's `primary` (which changes with light/dark mode). Must match the `expo-notifications` plugin `color` in app.json. */
const BRAND_COLOR = "#0B6E4F"
/** Red, matching the `color` the API attaches to safety pushes. */
const SOS_COLOR = "#DC2626"

let handlerConfigured = false

/** Push is native-only; expo-notifications APIs throw on web. */
export function isPushSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android"
}

export function configurePushNotificationHandler() {
  if (!isPushSupported() || handlerConfigured) return
  handlerConfigured = true

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Admobi Ops alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_COLOR,
  })

  // Driver SOS gets its own MAX-importance channel. Without a registered
  // channel Android silently routes the push to the default one and the
  // heads-up banner never appears — the alert looks delivered in the Expo
  // receipt and is invisible on the device.
  //
  // Deliberately no bypassDnd: that needs ACCESS_NOTIFICATION_POLICY in the
  // Android manifest, which this app does not declare, so setting it would
  // force a native rebuild for a flag that ALSO requires the user to grant Do
  // Not Disturb access by hand. MAX importance keeps this OTA-shippable.
  await Notifications.setNotificationChannelAsync(SAFETY_CHANNEL_ID, {
    name: "SOS alerts",
    description: "A driver has reported an accident or safety incident.",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lightColor: SOS_COLOR,
  })
}

export async function requestOpsPushPermissions(): Promise<boolean> {
  if (!isPushSupported()) return false

  configurePushNotificationHandler()
  await ensureAndroidChannel()

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === "granted") {
    return true
  }

  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

export async function getOpsExpoPushToken(): Promise<string | null> {
  // expo-constants' Constants.isDevice is deprecated and comes back
  // `undefined` (not `false`) on real hardware on this SDK — it silently
  // skipped every physical device. expo-device's Device.isDevice is the
  // maintained replacement.
  if (!isPushSupported() || !Device.isDevice) {
    return null
  }

  const projectId = getEasProjectId()
  if (!projectId) {
    console.warn("[push] Missing EAS projectId in app config")
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch (error) {
    console.warn("[push] getExpoPushTokenAsync failed:", error)
    return null
  }
}

export async function registerOpsPushToken(client: OpsClient): Promise<void> {
  if (!isPushSupported()) return

  configurePushNotificationHandler()

  const granted = await requestOpsPushPermissions()
  if (!granted) {
    return
  }

  const expoPushToken = await getOpsExpoPushToken()
  if (!expoPushToken) {
    return
  }

  const platform =
    Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined

  await client.pushTokens.register({ expoPushToken, platform })
}

export async function unregisterOpsPushToken(client: OpsClient): Promise<void> {
  if (!isPushSupported()) return

  const expoPushToken = await getOpsExpoPushToken()
  if (!expoPushToken) {
    return
  }

  try {
    await client.pushTokens.unregister({ expoPushToken })
  } catch {
    // Best-effort on sign-out
  }
}

export type OpsPushDeepLink = {
  href: string
}

export function readPushDeepLink(
  data: Record<string, unknown> | undefined
): OpsPushDeepLink | null {
  if (
    !data ||
    typeof data.href !== "string" ||
    !data.href.startsWith("/(ops)/")
  ) {
    return null
  }
  return { href: data.href }
}

export async function getColdStartPushDeepLink(): Promise<OpsPushDeepLink | null> {
  if (!isPushSupported()) return null

  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return null
  return readPushDeepLink(
    response.notification.request.content.data as Record<string, unknown>
  )
}

export function addPushResponseListener(
  onNavigate: (link: OpsPushDeepLink) => void
) {
  if (!isPushSupported()) {
    return () => {}
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const link = readPushDeepLink(
        response.notification.request.content.data as Record<string, unknown>
      )
      if (link) {
        onNavigate(link)
      }
    }
  )

  return () => subscription.remove()
}
