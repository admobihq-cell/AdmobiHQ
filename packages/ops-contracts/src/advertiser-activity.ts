import { z } from "zod"

export const advertiserActivityQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type AdvertiserActivityQuery = z.infer<typeof advertiserActivityQuerySchema>

export type AdvertiserActivityItemDto = {
  id: number
  createdAt: string
  /** Human-readable label derived from action/entity — never the audit summary. */
  label: string
  /** Optional detail (e.g. campaign review_reason). */
  detail: string | null
  actorLabel: string
  entityType: string
  action: string
}

export type AdvertiserActivityPageDto = {
  items: AdvertiserActivityItemDto[]
  nextCursor: string | null
}
