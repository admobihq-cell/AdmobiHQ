import type { Metadata } from "next"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function AppNotFound() {
  return (
    <NotFoundPage
      title="Page not found"
      description="This page isn't in your Admobi account yet. Head back to your dashboard."
      homeLabel="Back to dashboard"
    />
  )
}
