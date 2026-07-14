import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { corsHeaders, isAllowedCorsOrigin } from "@/lib/cors"

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"])
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"])

export default clerkMiddleware(async (auth, request) => {
  const origin = request.headers.get("origin")

  if (request.method === "OPTIONS" && isApiRoute(request)) {
    if (!isAllowedCorsOrigin(origin)) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  if (isPublicRoute(request)) {
    return
  }

  if (isApiRoute(request)) {
    await auth.protect()
    const response = NextResponse.next()
    const headers = corsHeaders(origin)
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
    return response
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url))
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
