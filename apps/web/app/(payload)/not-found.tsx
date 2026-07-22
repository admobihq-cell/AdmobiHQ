import type { Metadata } from "next"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function PayloadNotFound() {
  return (
    <NotFoundPage
      compact
      title="Page not found"
      description="This admin route doesn't exist."
      homeHref="/admin"
      homeLabel="Back to admin"
    />
  )
}
