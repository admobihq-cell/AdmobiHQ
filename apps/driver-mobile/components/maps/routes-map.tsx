import Constants, { ExecutionEnvironment } from "expo-constants"
import { ComponentType, useMemo } from "react"
import { Platform } from "react-native"

import { RoutesMapWeb } from "@/components/maps/routes-map-web"

/**
 * Expo Go cannot load @maplibre/maplibre-react-native (no native module).
 * Use a WebView MapLibre GL map there; native MapLibre only in a dev build.
 *
 * Expo web uses `routes-map.web.tsx` (iframe) — this file is native-only.
 *
 * Important: do not statically import the native map — Expo Router eagerly
 * evaluates every route module and would crash the whole app in Expo Go.
 */
export function RoutesMap() {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient

  const NativeMap = useMemo(() => {
    // Extra guard — web should never reach this module, but keep native-safe.
    if (Platform.OS === "web" || isExpoGo) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/components/maps/routes-map-native")
        .RoutesMapNative as ComponentType
    } catch {
      return null
    }
  }, [isExpoGo])

  if (NativeMap) {
    return <NativeMap />
  }

  return <RoutesMapWeb />
}
