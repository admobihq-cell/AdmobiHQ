import { createOpenGraphImageResponse } from "@/lib/brand/opengraph-image"

export const runtime = "nodejs"

/** Stable /opengraph-image URL for og:image metadata and social crawlers. */
export async function GET() {
  return createOpenGraphImageResponse()
}
