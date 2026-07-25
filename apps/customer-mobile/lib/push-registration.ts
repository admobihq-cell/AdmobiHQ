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
  if (!isNotificationsSupported() || !Constants.isDevice) {
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

export async function registerCustomerPushToken(): Promise<void> {
  if (!isNotificationsSupported()) return

  configureNotificationHandler()

  const granted = await requestPushPermissions()
  if (!granted) {
    return
  }

  const expoPushToken = await getCustomerExpoPushToken()
  if (!expoPushToken) {
    return
  }

  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined

  await postJson("/v1/public/push-tokens", { expoPushToken, platform })
}
