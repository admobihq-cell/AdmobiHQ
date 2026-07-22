import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { corsHeaders, isAllowedCorsOrigin } from "@/lib/cors"

const isPublicApi = createRouteMatcher(["/v1/public(.*)", "/v1/health(.*)"])
const isAdminApi = createRouteMatcher(["/v1/(.*)"])

function withCors(response: NextResponse, origin: string | null) {
  if (!origin || !isAllowedCorsOrigin(origin)) {
    return response
  }

  const headers = corsHeaders(origin)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export default clerkMiddleware(async (auth, request) => {
  const origin = request.headers.get("origin")
  const isApiRoute = isPublicApi(request) || isAdminApi(request)

  if (request.method === "OPTIONS" && isApiRoute) {
    if (!isAllowedCorsOrigin(origin)) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  if (isPublicApi(request)) {
    return withCors(NextResponse.next(), origin)
  }

  if (isAdminApi(request)) {
    const { userId } = await auth()
    if (!userId) {
      return withCors(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        origin,
      )
    }
    return withCors(NextResponse.next(), origin)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/v1/(.*)", "/__clerk/:path*"],
}
