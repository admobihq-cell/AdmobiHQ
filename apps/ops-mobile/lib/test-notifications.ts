import * as Notifications from "expo-notifications"

import {
  isPushSupported,
  requestOpsPushPermissions,
} from "@/lib/push-notifications"

export type NotificationStyleKey =
  | "new_lead"
  | "driver_assigned"
  | "fleet_alert"
  | "waitlist"

export type NotificationStyle = {
  key: NotificationStyleKey
  label: string
  title: string
  body: string
}

export const NOTIFICATION_STYLES: NotificationStyle[] = [
  {
    key: "new_lead",
    label: "New lead",
    title: "New lead captured",
    body: "Jane Doe just requested a quote for Nairobi CBD.",
  },
  {
    key: "driver_assigned",
    label: "Driver assigned",
    title: "Driver assigned",
    body: "Peter Mwangi was assigned to vehicle KDA 245B.",
  },
  {
    key: "fleet_alert",
    label: "Fleet alert",
    title: "Maintenance due",
    body: "KDA 118C is due for a maintenance check.",
  },
  {
    key: "waitlist",
    label: "Waitlist",
    title: "New waitlist signup",
    body: "A new advertiser joined the waitlist.",
  },
]

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus | null> {
  if (!isPushSupported()) return null

  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export async function requestTestNotificationPermissions(): Promise<boolean> {
  return requestOpsPushPermissions()
}

export async function sendTestNotification(
  style: NotificationStyle,
): Promise<boolean> {
  if (!isPushSupported()) return false

  const granted = await requestOpsPushPermissions()
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
