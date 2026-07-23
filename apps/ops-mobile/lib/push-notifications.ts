import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

import type { OpsClient } from "@workspace/ops-api-client"

const ANDROID_CHANNEL_ID = "default"
const BRAND_COLOR = "#0B6E4F"

let handlerConfigured = false

export function configurePushNotificationHandler() {
  if (handlerConfigured) return
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
}

export async function requestOpsPushPermissions(): Promise<boolean> {
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
  if (!Constants.isDevice) {
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
    Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web"
      ? Platform.OS
      : undefined

  await client.pushTokens.register({ expoPushToken, platform })
}

export async function unregisterOpsPushToken(client: OpsClient): Promise<void> {
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
  data: Record<string, unknown> | undefined,
): OpsPushDeepLink | null {
  if (!data || typeof data.href !== "string" || !data.href.startsWith("/(ops)/")) {
    return null
  }
  return { href: data.href }
}

export async function getColdStartPushDeepLink(): Promise<OpsPushDeepLink | null> {
  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return null
  return readPushDeepLink(
    response.notification.request.content.data as Record<string, unknown>,
  )
}

export function addPushResponseListener(
  onNavigate: (link: OpsPushDeepLink) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const link = readPushDeepLink(
        response.notification.request.content.data as Record<string, unknown>,
      )
      if (link) {
        onNavigate(link)
      }
    },
  )

  return () => subscription.remove()
}
