"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { WHATSAPP_NUMBER } from "@/components/landing/whatsapp-fab"
import { trackEvent } from "@/lib/analytics"
import { estimateHref, type Estimate } from "@/lib/estimate-handoff"

/**
 * The simulator's call to action. The brief form is the main path: it lands in
 * the ops leads pipeline with contact details attached. WhatsApp is the
 * fallback for people who'd rather just talk.
 */
export function ConfirmEstimate(estimate: Estimate) {
  const whatsappText = `Hi Admobi, I'd like to confirm this estimate: ${estimate.summary}`

  return (
    <div className="mt-4 space-y-3">
      <Button asChild size="lg" className="w-full">
        <Link href={estimateHref(estimate)} onClick={() => trackEvent("pricing_confirm", { format: estimate.format })}>
          Get this confirmed
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Your estimate is attached to the campaign brief.{" "}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("contact_whatsapp", { source: "pricing" })}
          className="text-foreground font-medium underline underline-offset-4 hover:text-primary"
        >
          Or send it on WhatsApp
        </a>
      </p>
    </div>
  )
}
