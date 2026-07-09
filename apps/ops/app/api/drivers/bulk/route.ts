import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { driverBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(req, driverBulkSchema, {
    delete: async (ids) => {
      const result = await prisma.driver.deleteMany({ where: { id: { in: ids } } })
      return result.count
    },
    updateStatus: async (ids, status) => {
      const result = await prisma.driver.updateMany({
        where: { id: { in: ids } },
        data: { status },
      })
      return result.count
    },
  })
}
