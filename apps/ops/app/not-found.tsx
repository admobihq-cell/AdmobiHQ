import type { Metadata } from "next"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function OpsNotFound() {
  return (
    <NotFoundPage
      title="Page not found"
      description="This ops route doesn't exist. Return to the console home to continue."
      homeHref="/home"
      homeLabel="Back to console"
    />
  )
}
