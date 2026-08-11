import { NextResponse } from "next/server"
import type { NextMiddleware, NextRequest, NextFetchEvent } from "next/server"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

let cachedMiddleware: NextMiddleware | null = null

function isPublicRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/") || pathname === "/api/health" || pathname.startsWith("/api/health/")
}

async function getAuthMiddleware(): Promise<NextMiddleware> {
  if (cachedMiddleware) return cachedMiddleware

  const { clerkMiddleware } = await import("@clerk/nextjs/server")

  cachedMiddleware = clerkMiddleware(
    async (auth, request) => {
      // Unlike ops (whose "/" is a stub — the real dashboard is at /home), "/"
      // here IS the protected dashboard, so it must NOT be treated as public.
      if (isPublicRoute(request.nextUrl.pathname)) {
        return
      }

      const { userId } = await auth()
      if (!userId) {
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }
    },
    {
      // Without these, clerkMiddleware() falls back to the unprefixed
      // CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY env vars —
      // which belong to the ops Clerk instance in this repo's shared
      // Infisical pool, not the driver instance ClerkProvider actually
      // signs sessions with (see app/layout.tsx). That mismatch is what
      // produces "jwk-kid-mismatch": the client mints a driver-instance
      // session cookie, but the server tried to verify it against ops's JWKS.
      publishableKey: process.env.NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.DRIVER_CLERK_SECRET_KEY,
    },
  )

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
