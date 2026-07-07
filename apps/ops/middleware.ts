import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"])
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return
  }

  if (isApiRoute(request)) {
    await auth.protect()
    return
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
