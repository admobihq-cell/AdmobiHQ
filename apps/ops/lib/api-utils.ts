import { NextResponse } from "next/server"
import { z } from "zod"

export function jsonError(message: string, status: number, issues?: unknown) {
  return NextResponse.json({ error: message, issues }, { status })
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
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

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
})

export type PaginationParams = z.infer<typeof paginationSchema>

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
