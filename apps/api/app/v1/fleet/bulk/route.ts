import { handleBulkRequest } from "@/lib/bulk-route"
import { prisma } from "@/lib/prisma"
import { fleetBulkSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  return handleBulkRequest(
    req,
    fleetBulkSchema,
    {
      delete: async (ids) => {
        const result = await prisma.fleetPartner.updateMany({
          where: { id: { in: ids }, deleted_at: null },
          data: { deleted_at: new Date() },
        })
        return result.count
      },
      updateStatus: async (ids, status) => {
        const result = await prisma.fleetPartner.updateMany({
          where: { id: { in: ids } },
          data: { status },
        })
        return result.count
      },
    },
    "fleet",
  )
}
