import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { useFocusEffect } from "@react-navigation/native"

type PageHeaderState = {
  title: string
  showBack: boolean
  /** Where the back button should land when there's no reliable push history to pop (e.g. deep link, reload, or a route resolved from an absolute path). Takes priority over router.back() guesswork. */
  backHref: string | null
}

type PageHeaderContextValue = {
  state: PageHeaderState
  setState: (next: PageHeaderState) => void
}

const DEFAULT_STATE: PageHeaderState = {
  title: "Admobi Ops",
  showBack: false,
  backHref: null,
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderState>(DEFAULT_STATE)
  return (
    <PageHeaderContext.Provider value={{ state, setState }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

/** Read by the persistent app bar to render the current section/record name. */
export function usePageHeaderState(): PageHeaderState {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) {
    throw new Error("usePageHeaderState must be used within PageHeaderProvider")
  }
  return ctx.state
}

/**
 * Call from a screen to claim the app bar's title while that screen is focused.
 * Deliberately doesn't restore the previous title on blur — the next-focused
 * screen sets its own, which avoids a flash of stale/default text mid-transition.
 *
 * Pass `backHref` whenever this screen was reached via an absolute-path push
 * (e.g. from a list row) — `router.canGoBack()` isn't reliable for those, so
 * the back button falls back to a known destination instead of guessing.
 */
export function usePageHeader(
  title: string,
  options?: { showBack?: boolean; backHref?: string }
) {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) {
    throw new Error("usePageHeader must be used within PageHeaderProvider")
  }
  const { setState } = ctx
  const showBack = options?.showBack ?? false
  const backHref = options?.backHref ?? null

  useFocusEffect(
    useCallback(() => {
      setState({ title, showBack, backHref })
    }, [title, showBack, backHref, setState])
  )
}
