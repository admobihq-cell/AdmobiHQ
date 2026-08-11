import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { corsHeaders, isAllowedCorsOrigin } from "@/lib/cors"

function isPublicApi(request: NextRequest) {
  const { pathname } = request.nextUrl
  return (
    pathname === "/v1/public" ||
    pathname.startsWith("/v1/public/") ||
    pathname === "/v1/health" ||
    pathname.startsWith("/v1/health/")
  )
}

function isAdminApi(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/v1/")
}

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
    // Staff auth is enforced in route handlers via requireOpsUser().
    // Do not call auth.protect() or gate on userId here — Edge middleware
    // rejects valid Expo Bearer tokens; route-level auth() handles them.
    return withCors(NextResponse.next(), origin)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/v1/(.*)", "/__clerk/:path*"],
}
