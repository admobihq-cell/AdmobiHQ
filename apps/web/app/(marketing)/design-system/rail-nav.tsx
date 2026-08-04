"use client"

import { useEffect, useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

export const SHEETS = [
  { id: "sheet-color", index: "01", label: "Color" },
  { id: "sheet-type", index: "02", label: "Type" },
  { id: "sheet-space", index: "03", label: "Space & radius" },
  { id: "sheet-motion", index: "04", label: "Elevation & motion" },
  { id: "sheet-components", index: "05", label: "Components" },
  { id: "sheet-brand", index: "06", label: "Brand mark" },
] as const

/**
 * Which sheet is "active" — the last one whose top has crossed the reading
 * line near the top of the viewport. Recomputed from actual positions on
 * every scroll/resize rather than trusted from IntersectionObserver's
 * isIntersecting (which, for tall sections and fast/scripted scrolling, can
 * report multiple sections intersecting in one batch with no ordering
 * guarantee — that let a stale section win and stick).
 */
function useActiveSheet() {
  const [activeId, setActiveId] = useState<string>(SHEETS[0].id)

  useEffect(() => {
    const elements = SHEETS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (elements.length === 0) return

    const readingLine = 140
    let ticking = false

    function updateActive() {
      ticking = false
      let current = elements[0] as HTMLElement
      for (const el of elements) {
        if (el.getBoundingClientRect().top - readingLine <= 0) current = el
      }
      setActiveId(current.id)
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(updateActive)
    }

    updateActive()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return activeId
}

/** Sticky sheet index rail — desktop only. A standalone flex item in the two-column layout. */
export function RailNavDesktop() {
  const activeId = useActiveSheet()

  return (
    <nav
      aria-label="Specification sheets"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-44 shrink-0 self-start xl:block"
    >
      <ol className="relative flex flex-col gap-0.5">
        <span
          aria-hidden
          className="absolute top-[13px] bottom-[13px] left-[13px] w-px bg-border"
        />
        {SHEETS.map((sheet) => {
          const active = sheet.id === activeId
          return (
            <li key={sheet.id}>
              <a
                href={`#${sheet.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md py-1.5 pr-2 pl-0.5 text-sm transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-border transition-colors",
                      active
                        ? "bg-primary"
                        : "group-hover:bg-muted-foreground",
                    )}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[0.62rem] tracking-wide text-muted-foreground/70">
                    {sheet.index}
                  </span>
                  <span className={cn("block", active && "font-medium")}>
                    {sheet.label}
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Sticky sheet index strip — mobile only. Full width, so it renders outside the two-column flex row. */
export function RailNavMobile() {
  const activeId = useActiveSheet()

  return (
    <nav
      aria-label="Specification sheets"
      className="no-scrollbar scroll-fade-e sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:top-16 sm:px-6 lg:px-8 xl:hidden"
    >
      {SHEETS.map((sheet) => {
        const active = sheet.id === activeId
        return (
          <a
            key={sheet.id}
            href={`#${sheet.id}`}
            aria-current={active ? "location" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs whitespace-nowrap transition-colors",
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="opacity-70">{sheet.index}</span>
            {sheet.label}
          </a>
        )
      })}
    </nav>
  )
}
