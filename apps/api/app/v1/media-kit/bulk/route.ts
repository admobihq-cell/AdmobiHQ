import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { mediaKitBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(
    req,
    mediaKitBulkSchema,
    {
      delete: async (ids) => {
        const result = await prisma.mediaKitRequest.updateMany({
          where: { id: { in: ids }, deleted_at: null },
          data: { deleted_at: new Date() },
        })
        return result.count
      },
    },
    "media_kit",
    "media_kit",
  )
}
