import { NextResponse } from "next/server"

import { requireOpsAccess } from "@/lib/api-utils"

export async function GET() {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error
  const { access } = auth

  return NextResponse.json({
    role: access.role,
    permissions: access.permissions,
  })
}
