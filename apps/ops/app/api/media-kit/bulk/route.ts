import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { mediaKitBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(req, mediaKitBulkSchema, {
    delete: async (ids) => {
      const result = await prisma.mediaKitRequest.deleteMany({ where: { id: { in: ids } } })
      return result.count
    },
  })
}
