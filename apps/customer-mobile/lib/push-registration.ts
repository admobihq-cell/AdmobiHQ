import * as Sentry from "@sentry/react-native"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

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
  const supported = isNotificationsSupported()
  if (!supported || !Constants.isDevice) {
    // Temporary diagnostic: 0 customer_push_tokens rows despite permission
    // being granted on a real device — need to see which branch is actually
    // hit at runtime instead of guessing further.
    Sentry.captureMessage(
      `[push] Token generation skipped (supported=${supported}, isDevice=${Constants.isDevice})`,
      "warning",
    )
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

export async function registerCustomerPushToken(): Promise<void> {
  if (!isNotificationsSupported()) return

  configureNotificationHandler()

  const granted = await requestPushPermissions()
  if (!granted) {
    Sentry.captureMessage("[push] Registration aborted — permission not granted", "warning")
    return
  }

  const expoPushToken = await getCustomerExpoPushToken()
  if (!expoPushToken) {
    // Failure already reported inside getCustomerExpoPushToken.
    return
  }

  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined

  try {
    await postJson("/v1/public/push-tokens", { expoPushToken, platform })
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "push-token-post" } })
    throw error
  }
}
