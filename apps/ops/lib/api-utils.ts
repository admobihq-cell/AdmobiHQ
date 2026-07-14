import { NextResponse } from "next/server"
import { z } from "zod"

import {
  paginatedResponse,
  paginationSchema,
  parseId,
  type PaginationParams,
} from "@workspace/ops-contracts"

export { paginatedResponse, paginationSchema, parseId }
export type { PaginationParams }

export function jsonError(message: string, status: number, issues?: unknown) {
  return NextResponse.json({ error: message, issues }, { status })
}

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
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
