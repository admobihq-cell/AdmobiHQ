import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryClient } from "@tanstack/react-query"
import { createMMKV } from "react-native-mmkv"

/**
 * Bump this whenever a cached query's data shape changes in a way that would
 * break old cached entries (e.g. a field is renamed or removed). Changing it
 * invalidates all persisted cache on next launch.
 */
export const QUERY_CACHE_BUSTER = "v1"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must be >= the persister's maxAge (24h) so TanStack Query doesn't
      // garbage-collect cached data in memory before it can be persisted
      // or reused on the next cold start.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
})

const storage = createMMKV({ id: "query-cache" })

export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.remove(key),
  },
})
