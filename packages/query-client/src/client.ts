import { QueryClient } from "@tanstack/react-query"

/**
 * `refetchInterval` value that polls every `ms` while the tab is visible, and
 * stops entirely once `isSettled(data)` is true — e.g. a resolved support
 * thread. A backgrounded tab or a settled query then makes zero requests, so
 * nothing holds the scale-to-zero database awake at the poll cadence. Reopening
 * the tab still refetches immediately via the default `refetchOnWindowFocus`.
 */
export function refetchIntervalWhileActive<TData>(
  ms: number,
  isSettled?: (data: TData | undefined) => boolean,
): (query: { state: { data: TData | undefined } }) => number | false {
  return (query) => {
    if (isSettled?.(query.state.data)) return false
    if (typeof document !== "undefined" && document.hidden) return false
    return ms
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
    },
  })
}
