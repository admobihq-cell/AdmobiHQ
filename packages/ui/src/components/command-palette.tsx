"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Dialog as DialogPrimitive } from "radix-ui"
import { ArrowRight, Clock, CornerDownLeft, Hash, Loader2, Search, type LucideIcon } from "lucide-react"

import { shouldSearch, type SearchGroup } from "@workspace/ops-contracts"
import { cn } from "@workspace/ui/lib/utils"

export type PaletteItem = {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  href?: string
  onRun?: () => void
  keywords?: string[]
  shortcut?: string
}

type Recent = { id: string; label: string; description?: string; href: string }
type RemoteState = { status: "idle" | "loading" | "error" | "done"; groups: SearchGroup[] }

const RECENT_LIMIT = 8
const DEBOUNCE_MS = 200

function readRecents(key: string): Recent[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Recent[]).slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

function writeRecents(key: string, recents: Recent[]) {
  try {
    localStorage.setItem(key, JSON.stringify(recents.slice(0, RECENT_LIMIT)))
  } catch {
    // private mode / blocked storage: recents just won't persist
  }
}

const noopSubscribe = () => () => {}

function isMac() {
  return typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  )
}

const itemClass =
  "group/item flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"

function Row({
  icon: Icon,
  label,
  description,
  trailing,
}: {
  icon: LucideIcon
  label: string
  description?: string
  trailing?: React.ReactNode
}) {
  return (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-data-[selected=true]/item:bg-background group-data-[selected=true]/item:text-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{label}</span>
        {description ? <span className="truncate text-xs text-muted-foreground">{description}</span> : null}
      </span>
      {trailing}
      <ArrowRight
        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]/item:opacity-100"
        aria-hidden
      />
    </>
  )
}

/**
 * ⌘K palette: a header trigger plus a dialog that filters the app's pages and actions locally and
 * asks the app's `search` for records (debounced, previous request aborted, so a slow older answer
 * never replaces a newer one). Requests fire only while typing — nothing is fetched on open.
 */
export function CommandPalette({
  pages,
  actions,
  search,
  storageKey,
  placeholder = "Search pages, records and actions…",
}: {
  pages: PaletteItem[]
  actions: PaletteItem[]
  search?: (q: string, signal: AbortSignal) => Promise<SearchGroup[]>
  storageKey: string
  placeholder?: string
}) {
  const router = useRouter()
  const [open, setOpenState] = React.useState(false)
  const [query, setQuery] = React.useState("")
  // The answer for `answered.query`; while it differs from the live query, a request is in flight.
  const [answered, setAnswered] = React.useState<{ query: string; failed: boolean; groups: SearchGroup[] }>({
    query: "",
    failed: false,
    groups: [],
  })
  const [recents, setRecents] = React.useState<Recent[]>([])
  const mac = React.useSyncExternalStore(noopSubscribe, isMac, () => false)

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (next) setRecents(readRecents(storageKey))
      else setQuery("")
      setOpenState(next)
    },
    [storageKey]
  )

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return
      if ((event.target as HTMLElement | null)?.isContentEditable) return
      event.preventDefault()
      setOpen(!open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, setOpen])

  const active = !!search && shouldSearch(query)
  React.useEffect(() => {
    if (!search || !shouldSearch(query)) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      search(query, controller.signal)
        .then((groups) => {
          if (!controller.signal.aborted) setAnswered({ query, failed: false, groups })
        })
        .catch(() => {
          if (!controller.signal.aborted) setAnswered({ query, failed: true, groups: [] })
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, search])

  // Keep the last answer on screen while the next one loads, so the list doesn't flash empty.
  const remote: RemoteState = !active
    ? { status: "idle", groups: [] }
    : answered.query !== query
      ? { status: "loading", groups: answered.groups }
      : { status: answered.failed ? "error" : "done", groups: answered.groups }

  function run(item: { id: string; label: string; description?: string; href?: string; onRun?: () => void }) {
    if (item.href) {
      const next = [
        { id: item.id, label: item.label, description: item.description, href: item.href },
        ...recents.filter((r) => r.id !== item.id),
      ]
      setRecents(next)
      writeRecents(storageKey, next)
    }
    setOpen(false)
    if (item.onRun) item.onRun()
    else if (item.href) router.push(item.href)
  }

  const showRecents = query.trim() === "" && recents.length > 0
  const remoteHits = remote.groups.reduce((n, g) => n + g.hits.length, 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56 sm:px-2.5"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{mac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-label="Search"
            className={cn(
              "fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-2xl outline-none",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 data-[state=open]:blur-in-sm data-[state=open]:duration-150",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 data-[state=closed]:duration-100",
              "motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=open]:blur-in-0 motion-reduce:data-[state=closed]:zoom-out-100"
            )}
          >
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Search pages, actions and records. Use the arrow keys to move and Enter to open.
            </DialogPrimitive.Description>
            <Command loop className="flex max-h-[min(32rem,70vh)] flex-col">
              <div className="flex items-center gap-2 border-b border-border/70 px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={placeholder}
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {remote.status === "loading" ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Searching" />
                ) : null}
              </div>

              <Command.List className="flex-1 overflow-y-auto overscroll-contain p-2 pb-3">
                {remote.status !== "loading" && remoteHits === 0 ? (
                  <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No matches for &ldquo;{query.trim()}&rdquo;
                  </Command.Empty>
                ) : null}

                {showRecents ? (
                  <Command.Group heading="Recent" className={groupClass}>
                    {recents.map((r) => (
                      <Command.Item key={`recent-${r.id}`} value={`recent ${r.id} ${r.label}`} onSelect={() => run(r)} className={itemClass}>
                        <Row icon={Clock} label={r.label} description={r.description} />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {pages.length > 0 ? (
                  <Command.Group heading="Pages" className={groupClass}>
                    {pages.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`page ${item.id} ${item.label}`}
                        keywords={[item.label, ...(item.keywords ?? [])]}
                        onSelect={() => run(item)}
                        className={itemClass}
                      >
                        <Row icon={item.icon ?? ArrowRight} label={item.label} description={item.description} />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {actions.length > 0 ? (
                  <Command.Group heading="Actions" className={groupClass}>
                    {actions.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`action ${item.id} ${item.label}`}
                        keywords={[item.label, ...(item.keywords ?? [])]}
                        onSelect={() => run(item)}
                        className={itemClass}
                      >
                        <Row
                          icon={item.icon ?? CornerDownLeft}
                          label={item.label}
                          description={item.description}
                          trailing={item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                        />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {remote.status === "error" ? (
                  <Command.Group heading="Records" forceMount className={groupClass}>
                    <Command.Item forceMount disabled value="search-error" className={cn(itemClass, "cursor-default text-muted-foreground")}>
                      Search is unavailable right now
                    </Command.Item>
                  </Command.Group>
                ) : null}

                {/* Server groups are already matched; forceMount keeps cmdk's local filter from hiding them. */}
                {remote.groups.map((group) => (
                  <Command.Group key={group.key} heading={group.label} forceMount className={groupClass}>
                    {group.hits.map((hit) => (
                      <Command.Item
                        key={hit.id}
                        forceMount
                        value={`record ${hit.id} ${hit.title}`}
                        onSelect={() => run({ id: hit.id, label: hit.title, description: hit.subtitle, href: hit.href })}
                        className={itemClass}
                      >
                        <Row
                          icon={Hash}
                          label={hit.title}
                          description={hit.subtitle}
                          trailing={
                            hit.badge ? (
                              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                                {hit.badge}
                              </span>
                            ) : null
                          }
                        />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center gap-4 border-t border-border/70 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> to navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd> to open
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>esc</Kbd> to close
                </span>
              </div>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
