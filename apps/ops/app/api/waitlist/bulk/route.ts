import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { waitlistBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(req, waitlistBulkSchema, {
    delete: async (ids) => {
      const result = await prisma.waitlistEntry.deleteMany({ where: { id: { in: ids } } })
      return result.count
    },
  })
}
