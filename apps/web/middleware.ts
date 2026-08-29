import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isProbePath } from "@/lib/seo/bot-probes"

export function middleware(request: NextRequest) {
  if (isProbePath(request.nextUrl.pathname)) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "cache-control": "public, max-age=86400, immutable",
        "x-robots-tag": "noindex",
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|app-demo/|icon$|apple-icon$|opengraph-image|logo$).*)",
  ],
}
