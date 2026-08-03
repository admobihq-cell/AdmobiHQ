import { NextResponse } from "next/server"

import { supportCaseCreateSchema } from "@workspace/ops-contracts"

import { auditPublic } from "@/lib/audit"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { AdminAlert } from "@/lib/email/templates/AdminAlert"
import { SupportCaseConfirmation } from "@/lib/email/templates/SupportCaseConfirmation"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { getBearerToken, mintIdentityTokenIfAbsent, toPublicCase, verifyIdentityToken } from "@/lib/support"
import { generateAccessToken, hashAccessToken } from "@/lib/support-token"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "support-create", { limit: 5, windowSeconds: 60 })
  if (limited) return limited

  const parsed = await parseJsonBody(req, supportCaseCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = parsed.data
  const accessToken = generateAccessToken()

  try {
    const supportCase = await prisma.supportCase.create({
      data: {
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        anonymous_device_id: data.anonymous_device_id ?? null,
        access_token_hash: hashAccessToken(accessToken),
        channel: data.channel,
        category: data.category,
        subject: data.subject,
        messages: {
          create: {
            author_type: "customer",
            author_email: data.contact_email,
            body: data.message,
          },
        },
      },
    })

    const identityToken = await mintIdentityTokenIfAbsent(
      data.contact_email,
      data.anonymous_device_id ?? null,
    )

    void notifyOpsStaffAlert({
      type: "support",
      entityId: supportCase.id,
      submitterName: data.contact_name,
    })

    await auditPublic({
      app: data.channel,
      actor_email: data.contact_email,
      action: "create",
      entity_type: "support_case",
      entity_id: supportCase.id,
      summary: `Opened support case #${supportCase.id} (${data.subject})`,
    })

    try {
      const confirmationHtml = await renderTemplate(SupportCaseConfirmation, {
        name: data.contact_name,
        caseId: supportCase.id,
        subject: data.subject,
      })
      const adminHtml = await renderTemplate(AdminAlert, {
        type: "support",
        submitterName: data.contact_name,
        submitterEmail: data.contact_email,
        submitterPhone: data.contact_phone,
        additionalInfo: data.message,
      })

      await sendEmail(
        data.contact_email,
        `We've received your request — case #${supportCase.id}`,
        confirmationHtml,
      )
      await sendAdminEmail(`New support case #${supportCase.id}: ${data.subject}`, adminHtml)
    } catch (emailError) {
      console.error("[support] Failed to queue emails:", emailError)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...toPublicCase(supportCase),
          accessToken,
          ...(identityToken ? { identityToken } : {}),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[support] Failed to create case:", error)
    return jsonError("Failed to create support case", 500)
  }
}

/**
 * "My cases" lookup, gated by the email-level identity token minted on first
 * case creation (see mintIdentityTokenIfAbsent) — email alone is guessable
 * and is no longer trusted on its own.
 */
export async function GET(req: Request) {
  const limited = await checkRateLimit(req, "support-list", { limit: 20, windowSeconds: 60 })
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")?.trim()
  if (!email) return jsonError("email is required", 400)

  const token = getBearerToken(req)
  if (!token) return jsonError("Unauthorized", 401)

  const verified = await verifyIdentityToken(email, token)
  if (!verified) return jsonError("Unauthorized", 401)

  const cases = await prisma.supportCase.findMany({
    where: { contact_email: email },
    orderBy: { created_at: "desc" },
    take: 50,
  })

  return NextResponse.json({ items: cases.map(toPublicCase) })
}
