import { QueryClient } from "@tanstack/react-query"

/** Poll only while the tab is visible so background tabs don't keep Neon awake. */
export function refetchIntervalWhenVisible(ms: number): () => number | false {
  return () => {
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
