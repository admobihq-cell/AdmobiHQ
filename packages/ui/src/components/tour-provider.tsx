"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { ConfigProvider, Tour, type TourProps } from "antd"

import { useTheme } from "@workspace/ui/components/theme-provider"
import { buildAdmobiAntdTheme } from "@workspace/ui/lib/theme/antd-tour-theme"
import {
  readTourCompleted,
  writeTourCompleted,
} from "@workspace/ui/lib/tour-storage"

export type TourChapter = {
  key: string
  title: string
  description: string
  /** CSS selector for the target element. Chapters whose target isn't in the
   * DOM (a flag-gated or permission-gated nav item, say) are skipped rather
   * than breaking the tour — no per-chapter visibility config needed. */
  selector: string
  placement?: NonNullable<TourProps["steps"]>[number]["placement"]
}

type TourContextValue = {
  chapters: TourChapter[]
  /** Replay a single chapter. Never touches "has this user seen the tour". */
  replay: (key: string) => void
  /** Replay every chapter currently present in the DOM, from the top. */
  replayAll: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTourReplay(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error("useTourReplay must be used within a TourProvider")
  return ctx
}

function resolveChapterTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector<HTMLElement>(selector)
}

function availableChapterKeys(chapters: TourChapter[]): string[] {
  return chapters
    .filter((chapter) => resolveChapterTarget(chapter.selector))
    .map((c) => c.key)
}

/**
 * Mounts once per authenticated app shell. Auto-opens the full tour the
 * first time a given userId has no completion record, then marks it done on
 * close. `useTourReplay()` (consumed by TourSettingsSection) lets Settings
 * trigger the same Tour instance for a single chapter or the whole thing
 * again later, without ever re-touching that completion record.
 */
export function TourProvider({
  app,
  userId,
  chapters,
  children,
}: {
  /** Storage namespace — one per web app, e.g. "driver", "customer", "ops". */
  app: string
  /** Clerk user id, or null while unauthenticated/unloaded/auth-disabled. */
  userId: string | null
  chapters: TourChapter[]
  children: ReactNode
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"auto" | "replay" | null>(null)
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !userId || readTourCompleted(app, userId)) return

    const keys = availableChapterKeys(chapters)
    if (keys.length === 0) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveKeys(keys)
    setMode("auto")
    setOpen(true)
    // Only ever auto-run once per mount, when userId first resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, userId])

  function handleClose() {
    setOpen(false)
    if (mode === "auto" && userId) writeTourCompleted(app, userId)
    setMode(null)
  }

  const contextValue = useMemo<TourContextValue>(
    () => ({
      chapters,
      replay(key) {
        setActiveKeys([key])
        setMode("replay")
        setOpen(true)
      },
      replayAll() {
        const keys = availableChapterKeys(chapters)
        if (keys.length === 0) return
        setActiveKeys(keys)
        setMode("replay")
        setOpen(true)
      },
    }),
    [chapters]
  )

  const steps: TourProps["steps"] = useMemo(
    () =>
      activeKeys
        .map((key) => chapters.find((chapter) => chapter.key === key))
        .filter((chapter): chapter is TourChapter => Boolean(chapter))
        .map((chapter) => ({
          title: chapter.title,
          description: chapter.description,
          placement: chapter.placement ?? "right",
          target: () => resolveChapterTarget(chapter.selector) ?? document.body,
        })),
    [activeKeys, chapters]
  )

  const theme = useMemo(
    () => buildAdmobiAntdTheme(mounted ? resolvedTheme : undefined),
    [mounted, resolvedTheme]
  )

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <ConfigProvider theme={theme}>
        <Tour open={mounted && open} onClose={handleClose} steps={steps} />
      </ConfigProvider>
    </TourContext.Provider>
  )
}
