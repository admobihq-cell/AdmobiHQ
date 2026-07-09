import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { leadBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(req, leadBulkSchema, {
    delete: async (ids) => {
      const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } })
      return result.count
    },
    updateStatus: async (ids, status) => {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { status },
      })
      return result.count
    },
  })
}
