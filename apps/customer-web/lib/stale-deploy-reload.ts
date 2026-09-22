const RELOAD_FLAG = "admobi:stale-deploy-reloaded"

/**
 * True for a failed request to a Next.js build asset — the content-hashed
 * chunk/CSS files that go stale the moment a new deploy rotates them. A tab
 * left open across a deploy then 404s fetching its own old chunk; Vercel's
 * HTML fallback for that 404 is what trips "non-JavaScript MIME type" on a
 * `<script type="module">`. Scoped to `_next/static` so unrelated resource
 * failures (analytics, ad blockers, images) never trigger a reload.
 */
export function isStaleDeployAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url, "http://localhost").pathname.startsWith("/_next/static/")
  } catch {
    return false
  }
}

const CHUNK_REJECTION_PATTERN = /loading chunk|failed to fetch dynamically imported module/i

/** Next.js/webpack's own wording for a dynamic import() hitting a chunk that
 * no longer exists — the other shape the same staleness takes. */
export function isStaleDeployRejection(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? "")
  return CHUNK_REJECTION_PATTERN.test(message)
}

/** Reloads at most once per tab session. A genuinely broken deployment (not
 * staleness) must surface as an error on the second load, never loop. */
export function reloadOnce(storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage): void {
  if (storage.getItem(RELOAD_FLAG)) return
  storage.setItem(RELOAD_FLAG, "1")
  window.location.reload()
}

/** Wires both shapes a stale build reference takes — a failed <script>/<link>
 * load, and a rejected dynamic import() — to a single reload. Returns an
 * unsubscribe function. */
export function registerStaleDeployReload(): () => void {
  function handleResourceError(event: Event) {
    const target = event.target
    const src =
      target instanceof HTMLScriptElement
        ? target.src
        : target instanceof HTMLLinkElement
          ? target.href
          : null
    if (isStaleDeployAssetUrl(src)) reloadOnce()
  }

  function handleRejection(event: PromiseRejectionEvent) {
    if (isStaleDeployRejection(event.reason)) reloadOnce()
  }

  // Resource load errors don't bubble — capture phase is the only way to
  // observe them at the window level.
  window.addEventListener("error", handleResourceError, true)
  window.addEventListener("unhandledrejection", handleRejection)

  return () => {
    window.removeEventListener("error", handleResourceError, true)
    window.removeEventListener("unhandledrejection", handleRejection)
  }
}
