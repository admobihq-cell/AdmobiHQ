const RELOAD_FLAG = "admobi:stale-deploy-reloaded"
const STATIC_ASSET_PREFIX = "/_next/static/"

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
    return new URL(url, "http://localhost").pathname.startsWith(STATIC_ASSET_PREFIX)
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

/**
 * The pre-hydration half of stale-deploy recovery. registerStaleDeployReload
 * above only starts listening once React has hydrated and mounted
 * <StaleDeployReload> — but if the very first script the browser tries to
 * load is itself the stale one, the app never boots that far, so nothing
 * ever registers and the tab is stuck. This runs as a plain (non-module)
 * inline <script> in <head>, before any module script can fail, so it
 * catches that case too.
 *
 * Self-contained on purpose: serialized via `.toString()` into a literal
 * script tag (see getStaleDeployBlockingScript), so it can't close over
 * anything outside its own body — config comes in as arguments instead.
 * Keep its matching behavior in sync with isStaleDeployAssetUrl /
 * isStaleDeployRejection above; it can't share their code, only their logic.
 */
function detectStaleDeployBeforeHydration(
  flagKey: string,
  staticPrefix: string,
  chunkPatternSource: string,
) {
  function isStaleAssetUrl(url: unknown): boolean {
    if (typeof url !== "string" || !url) return false
    try {
      return new URL(url, window.location.href).pathname.indexOf(staticPrefix) === 0
    } catch {
      return false
    }
  }

  function reloadOnce() {
    try {
      if (sessionStorage.getItem(flagKey)) return
      sessionStorage.setItem(flagKey, "1")
    } catch {
      // sessionStorage unavailable (private mode, etc.) — reload anyway,
      // just without the once-per-session guard.
    }
    window.location.reload()
  }

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as { src?: string; href?: string } | null
      if (isStaleAssetUrl(target?.src ?? target?.href)) reloadOnce()
    },
    true,
  )

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason
    const message = reason instanceof Error ? reason.message : String(reason ?? "")
    if (new RegExp(chunkPatternSource, "i").test(message)) reloadOnce()
  })
}

/** Builds the literal inline script — see detectStaleDeployBeforeHydration's
 * doc comment. Render via <script dangerouslySetInnerHTML>, the same way
 * ThemeScript works: next/script lands after first paint, which is too late
 * for either of these. */
export function getStaleDeployBlockingScript(): string {
  const args = [RELOAD_FLAG, STATIC_ASSET_PREFIX, CHUNK_REJECTION_PATTERN.source]
    .map((value) => JSON.stringify(value))
    .join(",")
  return `(${detectStaleDeployBeforeHydration.toString()})(${args})`
}
