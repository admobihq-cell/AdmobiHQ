import type { Prisma } from "@prisma/client"
import type {
  AuditAction,
  AuditActorType,
  AuditApp,
  AuditEntityType,
} from "@workspace/ops-contracts"

import type { OpsAccess } from "@/lib/auth"
import { getDriverEmail } from "@/lib/driver-clerk"
import { prisma } from "@/lib/prisma"

export type RecordAuditEventInput = {
  app: AuditApp | string
  actor_type: AuditActorType | string
  actor_user_id?: string | null
  actor_email?: string | null
  action: AuditAction | string
  entity_type: AuditEntityType | string
  entity_id?: string | number | null
  summary: string
  metadata?: Record<string, unknown> | null
}

/** Persist an audit row. Never throws — failures are logged only. */
export async function recordAuditEvent(
  input: RecordAuditEventInput,
): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        app: input.app,
        actor_type: input.actor_type,
        actor_user_id: input.actor_user_id ?? null,
        actor_email: input.actor_email ?? null,
        action: input.action,
        entity_type: input.entity_type,
        entity_id:
          input.entity_id == null || input.entity_id === ""
            ? null
            : String(input.entity_id),
        summary: input.summary,
        metadata:
          input.metadata == null
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
      },
    })
  } catch (error) {
    console.error("[audit] failed to record event:", error)
  }
}

type OpsAuthorized = Extract<OpsAccess, { status: "authorized" }>

export function auditFromOpsUser(
  access: OpsAuthorized,
  input: Omit<
    RecordAuditEventInput,
    "app" | "actor_type" | "actor_user_id" | "actor_email"
  > & { app?: AuditApp | string },
): Promise<void> {
  return recordAuditEvent({
    app: input.app ?? "api",
    actor_type: "ops_user",
    actor_user_id: access.userId,
    actor_email: access.email,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    summary: input.summary,
    metadata: input.metadata,
  })
}

export async function auditFromDriverUser(
  userId: string,
  input: Omit<RecordAuditEventInput, "app" | "actor_type" | "actor_user_id" | "actor_email">,
): Promise<void> {
  const actorEmail = await getDriverEmail(userId)
  return recordAuditEvent({
    app: "api",
    actor_type: "driver_user",
    actor_user_id: userId,
    actor_email: actorEmail,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    summary: input.summary,
    metadata: input.metadata,
  })
}

export function auditPublic(
  input: Omit<
    RecordAuditEventInput,
    "actor_type" | "actor_user_id"
  > & { actor_email?: string | null },
): Promise<void> {
  return recordAuditEvent({
    app: input.app,
    actor_type: "public",
    actor_user_id: null,
    actor_email: input.actor_email ?? null,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    summary: input.summary,
    metadata: input.metadata,
  })
}

export function toAuditEventDto(row: {
  id: number
  app: string
  actor_type: string
  actor_user_id: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  metadata: Prisma.JsonValue
  created_at: Date
}) {
  return {
    id: row.id,
    app: row.app,
    actor_type: row.actor_type,
    actor_user_id: row.actor_user_id,
    actor_email: row.actor_email,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    summary: row.summary,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    created_at: row.created_at.toISOString(),
  }
}
