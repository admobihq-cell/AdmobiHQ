import * as Sentry from "@sentry/react-native"
import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

import { getOrCreateDeviceId } from "@/lib/auth/use-customer-session"
import { postJson } from "@/lib/api-client"
import {
  configureNotificationHandler,
  ensureAndroidChannel,
  isNotificationsSupported,
} from "@/lib/notifications-core"

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined
}

export async function requestPushPermissions(): Promise<boolean> {
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

export async function getCustomerExpoPushToken(): Promise<string | null> {
  // expo-constants' Constants.isDevice is deprecated and comes back
  // `undefined` (not `false`) on real hardware on this SDK — it silently
  // skipped every physical device. expo-device's Device.isDevice is the
  // maintained replacement.
  if (!isNotificationsSupported() || !Device.isDevice) {
    return null
  }

  const projectId = getEasProjectId()
  if (!projectId) {
    console.warn("[push] Missing EAS projectId in app config")
    Sentry.captureMessage("[push] Missing EAS projectId in app config", "warning")
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch (error) {
    console.warn("[push] getExpoPushTokenAsync failed:", error)
    Sentry.captureException(error, { tags: { flow: "push-token-generation" } })
    return null
  }
}

export async function registerCustomerPushToken(
  getToken?: () => Promise<string | null>,
): Promise<void> {
  if (!isNotificationsSupported()) return

  configureNotificationHandler()

  const granted = await requestPushPermissions()
  if (!granted) {
    Sentry.captureMessage("[push] Registration aborted — permission not granted", "warning")
    return
  }

  const expoPushToken = await getCustomerExpoPushToken()
  if (!expoPushToken) {
    return
  }

  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined
  const anonymousDeviceId = await getOrCreateDeviceId()
  const token = await getToken?.().catch(() => null)

  try {
    await postJson(
      "/v1/public/push-tokens",
      { expoPushToken, platform, anonymousDeviceId },
      token ? { Authorization: `Bearer ${token}` } : undefined,
    )
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "push-token-post" } })
    throw error
  }
}
