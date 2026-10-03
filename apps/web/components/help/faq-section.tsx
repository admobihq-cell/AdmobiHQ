"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Container } from "@/components/landing/container"
import { HELP_AUDIENCES, type HelpGroup } from "@/components/help/help-shared"
import type { HelpCategory } from "@/payload-types"

type Audience = HelpCategory["audience"]

// Per audience on the hub; the rest are on /help/faq.
const PREVIEW_COUNT = 6

/**
 * The FAQ preview on the help hub: a few questions for one audience at a time,
 * with the full list on /help/faq.
 */
export function FaqSection({ groups }: { groups: HelpGroup[] }) {
  const tabs = HELP_AUDIENCES.filter((tab) =>
    groups.some((group) => group.category.audience === tab.value),
  )
  const [audience, setAudience] = useState<Audience | undefined>(tabs[0]?.value)

  if (tabs.length === 0) {
    return null
  }

  const total = groups.reduce((count, group) => count + group.articles.length, 0)
  const questions = groups
    .filter((group) => group.category.audience === audience)
    .flatMap((group) => group.articles)
    .slice(0, PREVIEW_COUNT)

  return (
    <section className="pt-14 pb-8 sm:pt-20 sm:pb-10">
      <Container>
        <div className="bg-muted/70 rounded-3xl px-5 py-8 sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 className="text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
                Frequently asked questions
              </h2>
              <div
                role="group"
                aria-label="Show questions for"
                className="mt-6 flex flex-wrap gap-2 lg:flex-col lg:items-start"
              >
                {tabs.map((tab) => {
                  const selected = tab.value === audience
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAudience(tab.value)}
                      className={cn(
                        "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        selected
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-background",
                      )}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <ul className="divide-border border-border divide-y border-y">
                {questions.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/help/${article.slug}`}
                      className="group focus-visible:ring-ring flex items-center justify-between gap-4 rounded-sm py-4 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="text-foreground group-hover:text-primary text-base font-medium tracking-tight transition-colors sm:text-[1.0625rem]">
                        {article.title}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transform-none"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/help/faq"
                className="text-primary focus-visible:ring-ring mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                See all {total} questions
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
