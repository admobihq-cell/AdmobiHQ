import { liveChannel, publishLive } from "@/lib/realtime"

/** Call after writing a DriverNotification row, so the driver's open web app picks it up. */
export function publishDriverNotice(clerkUserId: string, type: string, actorUserId?: string): Promise<void> {
  return publishLive([liveChannel.user(clerkUserId)], {
    topic: "notification",
    type,
    ...(actorUserId ? { actor: actorUserId } : {}),
  })
}
