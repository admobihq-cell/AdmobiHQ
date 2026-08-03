import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { jsonError, requireOpsAccess } from "@/lib/api-utils"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const form = await req.formData()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return jsonError("Missing file", 400)
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError("Image must be JPEG, PNG, or WebP", 400)
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Image must be under 5MB", 400)
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const key = `announcements/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
  })

  return NextResponse.json({ url: blob.url }, { status: 201 })
}
