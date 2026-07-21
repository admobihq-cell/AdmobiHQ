import Constants, { ExecutionEnvironment } from "expo-constants"
import { ComponentType, useMemo } from "react"

import { CustomerMapWeb } from "@/components/maps/customer-map-web"

/**
 * Expo Go cannot load @maplibre/maplibre-react-native (no native module).
 * Use a WebView MapLibre GL map there; native MapLibre only in a dev build.
 *
 * Important: do not statically import the native map — Expo Router eagerly
 * evaluates every route module and would crash the whole app in Expo Go.
 */
export function CustomerMap() {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient

  const NativeMap = useMemo(() => {
    if (isExpoGo) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/components/maps/customer-map-native")
        .CustomerMapNative as ComponentType
    } catch {
      return null
    }
  }, [isExpoGo])

  if (NativeMap) {
    return <NativeMap />
  }

  return <CustomerMapWeb />
}
