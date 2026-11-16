"use client"

import { useState } from "react"

import { renderAnnouncementTemplate, type AnnouncementTemplateVars } from "@workspace/ops-contracts"
import { cn } from "@workspace/ui/lib/utils"

type Audience = "customer" | "driver"

const AUDIENCES: Record<Audience, { label: string; appName: string; vars: AnnouncementTemplateVars }> = {
  customer: { label: "Customer", appName: "Admobi", vars: { firstName: "Jordan", orgName: "Acme Ads" } },
  // Drivers have no organisation, so {{org_name}} renders empty for them.
  driver: { label: "Driver", appName: "Admobi Driver", vars: { firstName: "Jordan" } },
}

const TOKEN_PATTERN = /\{\{\s*(first_name|org_name)\s*\}\}/

export function hasTemplateTokens(...texts: string[]) {
  return texts.some((text) => TOKEN_PATTERN.test(text))
}

type AnnouncementPreviewProps = {
  title: string
  body: string
  imageUrl?: string | null
  targetApps: string[]
  /** Shown where the OS prints the arrival time. */
  timestamp?: string
}

/** The announcement as a recipient's phone shows it, with sample values in
 * place of personal fields. Shared by the composer and the detail view. */
export function AnnouncementPreview({
  title,
  body,
  imageUrl,
  targetApps,
  timestamp = "now",
}: AnnouncementPreviewProps) {
  const audiences = (Object.keys(AUDIENCES) as Audience[]).filter((audience) =>
    targetApps.some((app) => app.startsWith(audience)),
  )
  const [picked, setPicked] = useState<Audience>("customer")
  const audience = audiences.includes(picked) ? picked : (audiences[0] ?? "customer")
  const { appName, vars } = AUDIENCES[audience]

  const renderedTitle = renderAnnouncementTemplate(title, vars)
  const renderedBody = renderAnnouncementTemplate(body, vars)
  const personalised = hasTemplateTokens(title, body)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <p className="text-sm font-medium">Preview</p>
        {audiences.length > 1 ? (
          <div role="group" aria-label="Preview as" className="flex rounded-md bg-muted p-0.5">
            {audiences.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={audience === option}
                onClick={() => setPicked(option)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  audience === option && "bg-background text-foreground shadow-xs",
                )}
              >
                {AUDIENCES[option].label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-muted/70 p-3">
        <div className="overflow-hidden rounded-xl bg-background shadow-[0_1px_2px_oklch(0_0_0/0.06),0_4px_12px_-4px_oklch(0_0_0/0.08)]">
          <div className="flex gap-2.5 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src="/brand/logo-mark.png" alt="" className="size-8 shrink-0 rounded-lg border object-contain p-1" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate font-medium">{appName}</span>
                <span className="shrink-0 tabular-nums">{timestamp}</span>
              </div>
              <p className="text-sm leading-snug font-semibold break-words">
                {renderedTitle || <span className="font-normal text-muted-foreground">Title</span>}
              </p>
              <p className="line-clamp-4 text-sm leading-snug break-words text-foreground/80">
                {renderedBody || <span className="text-muted-foreground">Your message</span>}
              </p>
            </div>
          </div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob preview or remote Cloudinary URL
            <img src={imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
          ) : null}
        </div>
      </div>

      {personalised ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sample values shown: first name &ldquo;Jordan&rdquo;
          {audience === "customer"
            ? ", organisation “Acme Ads”."
            : ". Drivers have no organisation, so that field is left out."}
        </p>
      ) : null}
    </div>
  )
}
