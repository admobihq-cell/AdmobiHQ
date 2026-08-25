import type { AnnouncementTargetApp, BroadcastCreateInput } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { resolveFirstNames } from "@/lib/push/recipient-names"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets, type PushAudience } from "@/lib/push/receipts"

export type BroadcastSender = {
  clerkUserId: string
  email: string
}

const AUDIENCE_BY_APP: Record<AnnouncementTargetApp, PushAudience | null> = {
  "customer-mobile": "customer",
  "driver-mobile": "driver",
  "customer-web": null,
  "driver-web": null,
}

const CLERK_AUDIENCE_BY_APP: Record<AnnouncementTargetApp, "customer" | "driver"> = {
  "customer-mobile": "customer",
  "driver-mobile": "driver",
  "customer-web": "customer",
  "driver-web": "driver",
}

type MobileRecipient = { clerkUserId: string; expoPushTokens: string[] }
type WebRecipient = { clerkUserId: string }

/** Push-token recipients, grouped by clerk_user_id — a recipient with 2
 * devices gets one delivery row but 2 pushes (see Task 11 notes in the plan). */
async function collectMobileRecipients(
  app: "customer-mobile" | "driver-mobile",
): Promise<MobileRecipient[]> {
  const rows =
    app === "customer-mobile"
      ? await prisma.customerPushToken.findMany({
          where: { clerk_user_id: { not: null } },
          select: { clerk_user_id: true, expo_push_token: true },
        })
      : await prisma.driverPushToken.findMany({
          where: { clerk_user_id: { not: null } },
          select: { clerk_user_id: true, expo_push_token: true },
        })

  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.clerk_user_id) continue
    const tokens = grouped.get(row.clerk_user_id) ?? []
    tokens.push(row.expo_push_token)
    grouped.set(row.clerk_user_id, tokens)
  }

  return [...grouped.entries()].map(([clerkUserId, expoPushTokens]) => ({
    clerkUserId,
    expoPushTokens,
  }))
}

/** Every token targeting a mobile app that has no clerk_user_id yet (not
 * migrated, or genuinely anonymous) — still gets the unpersonalized push. */
async function collectAnonymousMobileTokens(
  app: "customer-mobile" | "driver-mobile",
): Promise<string[]> {
  const rows =
    app === "customer-mobile"
      ? await prisma.customerPushToken.findMany({
          where: { clerk_user_id: null },
          select: { expo_push_token: true },
        })
      : await prisma.driverPushToken.findMany({
          where: { clerk_user_id: null },
          select: { expo_push_token: true },
        })
  return rows.map((row) => row.expo_push_token)
}

async function collectWebRecipients(app: "customer-web" | "driver-web"): Promise<WebRecipient[]> {
  if (app === "customer-web") {
    const rows = await prisma.customer.findMany({
      where: { clerk_user_id: { not: null } },
      select: { clerk_user_id: true },
    })
    return rows.map((row) => ({ clerkUserId: row.clerk_user_id! }))
  }

  // DriverProfile.clerk_user_id is String @unique (never null), so no filter is needed.
  const rows = await prisma.driverProfile.findMany({
    select: { clerk_user_id: true },
  })
  return rows.map((row) => ({ clerkUserId: row.clerk_user_id }))
}

function renderTemplate(template: string, firstName: string | undefined): string {
  if (!firstName) {
    // Strip the merge field, then clean up what authoring commonly leaves behind:
    // "Hi {{first_name}}, ..." -> "Hi , ..." -> collapse the stray space before the
    // comma -> "Hi, ...". If the tag opened the string ("{{first_name}}, welcome
    // back"), there's nothing to attach the comma to, so drop the orphaned
    // leading comma too.
    return template
      .replace(/\{\{\s*first_name\s*\}\}/g, "")
      .replace(/ {2,}/g, " ")
      .replace(/ +([,.!?;:])/g, "$1")
      .replace(/^[,;:]\s*/, "")
      .trim()
  }
  return template.replace(/\{\{\s*first_name\s*\}\}/g, firstName)
}

export async function broadcastAnnouncement(
  input: BroadcastCreateInput,
  sender: BroadcastSender,
) {
  const targetApps = input.target_apps

  const mobileApps = targetApps.filter(
    (app): app is "customer-mobile" | "driver-mobile" => AUDIENCE_BY_APP[app] !== null,
  )
  const webApps = targetApps.filter(
    (app): app is "customer-web" | "driver-web" => AUDIENCE_BY_APP[app] === null,
  )

  const mobileRecipientsByApp = new Map<string, MobileRecipient[]>()
  const anonymousTokensByApp = new Map<string, string[]>()
  for (const app of mobileApps) {
    mobileRecipientsByApp.set(app, await collectMobileRecipients(app))
    anonymousTokensByApp.set(app, await collectAnonymousMobileTokens(app))
  }

  const webRecipientsByApp = new Map<string, WebRecipient[]>()
  for (const app of webApps) {
    webRecipientsByApp.set(app, await collectWebRecipients(app))
  }

  const totalRecipients =
    [...mobileRecipientsByApp.values()].reduce((n, rows) => n + rows.length, 0) +
    [...anonymousTokensByApp.values()].reduce((n, tokens) => n + tokens.length, 0) +
    [...webRecipientsByApp.values()].reduce((n, rows) => n + rows.length, 0)

  const broadcast = await prisma.announcementBroadcast.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      image_url: input.image_url ?? null,
      sent_by_clerk_id: sender.clerkUserId,
      sent_by_email: sender.email,
      target_apps: targetApps,
      target_count: totalRecipients,
      status: totalRecipients === 0 ? "sent" : "sending",
    },
  })

  if (totalRecipients === 0) {
    return broadcast
  }

  // One batched Clerk lookup per audience covers every app sharing that
  // audience (e.g. customer-mobile + customer-web both resolve against the
  // customer Clerk instance).
  const customerIds = [
    ...(mobileRecipientsByApp.get("customer-mobile") ?? []).map((r) => r.clerkUserId),
    ...(webRecipientsByApp.get("customer-web") ?? []).map((r) => r.clerkUserId),
  ]
  const driverIds = [
    ...(mobileRecipientsByApp.get("driver-mobile") ?? []).map((r) => r.clerkUserId),
    ...(webRecipientsByApp.get("driver-web") ?? []).map((r) => r.clerkUserId),
  ]
  const [customerNames, driverNames] = await Promise.all([
    resolveFirstNames("customer", customerIds),
    resolveFirstNames("driver", driverIds),
  ])
  const namesByAudience: Record<"customer" | "driver", Map<string, string>> = {
    customer: customerNames,
    driver: driverNames,
  }

  const deliveryRows: {
    broadcast_id: number
    clerk_user_id: string
    app: string
    title: string
    body: string
    image_url: string | null
    category: string
  }[] = []

  let queuedPush = 0
  let totalPushAttempts = 0
  const invalidTokensByApp = new Map<"customer-mobile" | "driver-mobile", string[]>()

  for (const app of mobileApps) {
    const audience = CLERK_AUDIENCE_BY_APP[app]
    const names = namesByAudience[audience]
    const pushAudience = AUDIENCE_BY_APP[app] as PushAudience

    const recipients = mobileRecipientsByApp.get(app) ?? []
    const payloads: { to: string; title: string; body: string; clerkUserId: string }[] = []

    for (const recipient of recipients) {
      const name = names.get(recipient.clerkUserId)
      const title = renderTemplate(input.title, name)
      const body = renderTemplate(input.body, name)

      deliveryRows.push({
        broadcast_id: broadcast.id,
        clerk_user_id: recipient.clerkUserId,
        app,
        title,
        body,
        image_url: input.image_url ?? null,
        category: input.category,
      })

      for (const token of recipient.expoPushTokens) {
        payloads.push({ to: token, title, body, clerkUserId: recipient.clerkUserId })
      }
    }

    const unpersonalizedTitle = renderTemplate(input.title, undefined)
    const unpersonalizedBody = renderTemplate(input.body, undefined)
    for (const token of anonymousTokensByApp.get(app) ?? []) {
      payloads.push({
        to: token,
        title: unpersonalizedTitle,
        body: unpersonalizedBody,
        clerkUserId: "",
      })
    }

    if (payloads.length === 0) continue
    totalPushAttempts += payloads.length

    try {
      const result = await sendExpoPushMessages(
        payloads.map((p) => ({
          to: p.to,
          title: p.title,
          body: p.body,
          sound: "default" as const,
          channelId: "default",
          color: "#0b6e4f",
          priority: "high" as const,
          data: { type: "announcement", category: input.category },
          ...(input.image_url ? { richContent: { image: input.image_url } } : {}),
        })),
      )
      queuedPush += result.outcomes.filter((o) => o.status === "queued").length

      try {
        await recordPushTickets({ audience: pushAudience, broadcastId: broadcast.id, outcomes: result.outcomes })
      } catch (error) {
        console.error("[push] Failed to record push tickets:", error)
      }

      if (result.invalidTokens.length > 0) {
        invalidTokensByApp.set(app, result.invalidTokens)
      }
    } catch (error) {
      console.error(`[push] Failed to send announcement broadcast to ${app}:`, error)
    }
  }

  for (const app of webApps) {
    const audience = CLERK_AUDIENCE_BY_APP[app]
    const names = namesByAudience[audience]
    const recipients = webRecipientsByApp.get(app) ?? []

    for (const recipient of recipients) {
      const name = names.get(recipient.clerkUserId)
      deliveryRows.push({
        broadcast_id: broadcast.id,
        clerk_user_id: recipient.clerkUserId,
        app,
        title: renderTemplate(input.title, name),
        body: renderTemplate(input.body, name),
        image_url: input.image_url ?? null,
        category: input.category,
      })
    }
  }

  let webDeliveredCount = 0
  if (deliveryRows.length > 0) {
    try {
      await prisma.announcementDelivery.createMany({ data: deliveryRows })
      webDeliveredCount = deliveryRows.filter((row) =>
        webApps.includes(row.app as "customer-web" | "driver-web"),
      ).length
    } catch (error) {
      console.error("[push] Failed to write announcement delivery rows:", error)
    }
  }

  for (const [app, tokens] of invalidTokensByApp) {
    try {
      if (app === "driver-mobile") {
        await prisma.driverPushToken.deleteMany({ where: { expo_push_token: { in: tokens } } })
      } else {
        await prisma.customerPushToken.deleteMany({ where: { expo_push_token: { in: tokens } } })
      }
    } catch (error) {
      console.error("[push] Failed to clean up invalid tokens:", error)
    }
  }

  const status = totalPushAttempts > 0 ? (queuedPush === 0 ? "failed" : "sending") : "sent"

  return prisma.announcementBroadcast.update({
    where: { id: broadcast.id },
    data: {
      // This only reflects web deliveries as of broadcast creation. If any
      // mobile app is also targeted, refreshBroadcastCounts() (apps/api/lib/push/receipts.ts)
      // later overwrites delivered_count with a mobile-push-receipt-only count
      // once a receipt is polled, excluding the web portion again. Known,
      // accepted limitation — not something to fix here.
      delivered_count: webDeliveredCount,
      invalid_count: totalPushAttempts - queuedPush,
      status,
    },
  })
}
