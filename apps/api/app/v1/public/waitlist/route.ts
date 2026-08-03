import { NextResponse } from "next/server"

import { auditPublic } from "@/lib/audit"
import { getPgPool } from "@/lib/pg"
import { waitlistSchema } from "@/lib/validation/lead-schemas"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { checkRateLimit } from "@/lib/rate-limit"

type WaitlistUpsertRow = {
  id: number
  email: string
  source: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  deleted_by_email: string | null
  inserted: boolean
}

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "waitlist", { limit: 5, windowSeconds: 60 })
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const pool = getPgPool()
    // `xmax = 0` is Postgres's own signal that this row was just inserted
    // rather than matched by ON CONFLICT — deterministic, unlike comparing
    // created_at/updated_at timestamps (two near-simultaneous duplicate
    // requests can compute an identical millisecond Date in Node, making
    // that comparison race under concurrency).
    const result = await pool.query<WaitlistUpsertRow>(
      `
      INSERT INTO waitlist_entries (email, source, created_at, updated_at)
      VALUES ($1, 'homepage', now(), now())
      ON CONFLICT (email) DO UPDATE
        SET deleted_at = NULL, deleted_by_email = NULL, updated_at = now()
      RETURNING id, email, source, created_at, updated_at, deleted_at, deleted_by_email,
        (xmax = 0) AS inserted
      `,
      [parsed.data.email],
    )
    const row = result.rows[0]!

    console.log("[Admobi API waitlist] Saved:", row.email)

    if (row.inserted) {
      void notifyOpsStaffAlert({
        type: "waitlist",
        entityId: row.id,
        submitterName: row.email,
      })

      await auditPublic({
        app: "web",
        actor_email: row.email,
        action: "create",
        entity_type: "waitlist",
        entity_id: row.id,
        summary: `Created waitlist #${row.id} (${row.email})`,
      })
    }

    const data = {
      id: row.id,
      email: row.email,
      source: row.source,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      deleted_by_email: row.deleted_by_email,
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error("[Admobi API waitlist] Database error:", error)
    return NextResponse.json({ error: "Failed to save waitlist entry" }, { status: 500 })
  }
}
