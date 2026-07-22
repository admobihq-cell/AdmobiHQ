import type { Metadata } from "next"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"

import { Container } from "@/components/landing/container"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function MarketingNotFound() {
  return (
    <Container>
      <NotFoundPage
        title="This page isn't on the map"
        description="The URL may be wrong, or the page may have moved. Head back to the homepage to explore Admobi."
        homeLabel="Back to Admobi"
      />
    </Container>
  )
}
