import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import {
  paginatedResponse,
  paginationSchema,
  parseId,
  type OpsPermission,
  type PaginationParams,
} from "@workspace/ops-contracts"

import { requireOpsAdmin, requireOpsPermission, requireOpsUser } from "@/lib/auth"
import { requireDriverUser } from "@/lib/driver-auth"
import { requireCustomerUser } from "@/lib/customer-auth"

export { paginatedResponse, paginationSchema, parseId }
export type { PaginationParams }

export function jsonError(message: string, status: number, issues?: unknown) {
  return NextResponse.json({ error: message, issues }, { status })
}

/** Every ops route repeated this same try/catch around requireOpsUser() —
 * centralized here so each route is just the two lines below instead. */
export async function requireOpsAccess(): Promise<
  | { access: Awaited<ReturnType<typeof requireOpsUser>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireOpsUser()
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}

/** Same as requireOpsAccess, but the caller must also hold the "admin" ops role. */
export async function requireOpsAdminAccess(): Promise<
  | { access: Awaited<ReturnType<typeof requireOpsAdmin>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireOpsAdmin()
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}

/** Same as requireOpsAccess, but the caller must also hold the given section permission. */
export async function requireOpsPermissionAccess(
  permission: OpsPermission,
): Promise<
  | { access: Awaited<ReturnType<typeof requireOpsPermission>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireOpsPermission(permission)
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}

/** Same shape as requireOpsAccess, but for the driver-facing routes under
 * /v1/driver/* — any authenticated driver-Clerk user, no org/role concept. */
export async function requireDriverAccess(): Promise<
  | { access: Awaited<ReturnType<typeof requireDriverUser>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireDriverUser()
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}

/** Same shape as requireDriverAccess, but for the customer-facing routes —
 * any authenticated customer-Clerk user, no org/role concept. */
export async function requireCustomerAccess(): Promise<
  | { access: Awaited<ReturnType<typeof requireCustomerUser>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireCustomerUser()
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}

/** Constant-time string comparison — safe for secrets and hashes of any
 * length. A length mismatch is always a real non-match, so it's safe to
 * short-circuit on before the constant-time comparison of the equal-length
 * remainder. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return nodeTimingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function parseJsonBody<T>(
  req: Request,
  // Input left as `any` (rather than `z.ZodSchema<T>`, which forces Input===Output===T)
  // so schemas with `.default(...)` — where the parsed Output is narrower/required
  // than the raw Input — can still infer T as the Output type.
  schema: z.ZodType<T, z.ZodTypeDef, any>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { error: jsonError("Invalid JSON", 400) }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      error: jsonError("Validation failed", 400, parsed.error.flatten()),
    }
  }

  return { data: parsed.data }
}
