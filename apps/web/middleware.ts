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
  // Payload admin, REST (`/api/*`), and server functions must not run through
  // Edge middleware — Next clones the request and Payload auth/cookies break.
  matcher: [
    "/((?!admin(?:/|$)|api(?:/|$)|monitoring(?:/|$)|_next/static|_next/image|favicon.ico|brand/|app-demo/|icon(?:\\.png)?$|apple-icon(?:\\.png)?$|opengraph-image(?:\\.png)?$|logo(?:\\.png)?$).*)",
  ],
}
