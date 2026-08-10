import { NextResponse } from "next/server"
import type { NextMiddleware, NextRequest, NextFetchEvent } from "next/server"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

let cachedMiddleware: NextMiddleware | null = null

async function getAuthMiddleware(): Promise<NextMiddleware> {
  if (cachedMiddleware) return cachedMiddleware

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server")
  // Unlike ops (whose "/" is a stub — the real dashboard is at /home), "/"
  // here IS the protected dashboard, so it must NOT be in this list.
  const isPublicRoute = createRouteMatcher(["/auth/(.*)", "/api/health(.*)"])

  cachedMiddleware = clerkMiddleware(async (auth, request) => {
    if (isPublicRoute(request)) {
      return
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  })

  return cachedMiddleware
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isAuthEnabled()) {
    return NextResponse.next()
  }

  const authMiddleware = await getAuthMiddleware()
  return authMiddleware(request, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
  ],
}
