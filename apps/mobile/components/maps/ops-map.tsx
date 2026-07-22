import Constants, { ExecutionEnvironment } from "expo-constants"
import { ComponentType, useMemo } from "react"
import { Platform } from "react-native"

import { OpsMapWeb } from "@/components/maps/ops-map-web"

/**
 * Expo Go cannot load @maplibre/maplibre-react-native (no native module).
 * Use a WebView MapLibre GL map there; native MapLibre only in a dev build.
 *
 * Expo web uses `ops-map.web.tsx` (iframe) — this file is native-only.
 */
export function OpsMap() {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient

  const NativeMap = useMemo(() => {
    if (Platform.OS === "web" || isExpoGo) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/components/maps/ops-map-native")
        .OpsMapNative as ComponentType
    } catch {
      return null
    }
  }, [isExpoGo])

  if (NativeMap) {
    return <NativeMap />
  }

  return <OpsMapWeb />
}
