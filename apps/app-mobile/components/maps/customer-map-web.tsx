import { useMemo, useState } from "react"
import { StyleSheet, View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

import {
  CustomerMapHeader,
  type MapLayerKey,
} from "@/components/maps/customer-map-header"
import { buildMapHtml, getCustomerMapData } from "@/components/maps/customer-map-html"
import { spacing, useThemedStyles } from "@/lib/theme"

/** MapLibre GL JS in a WebView — works in Expo Go without native MapLibre. */
export function CustomerMapWeb() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const { corridorGeo, plays, coverage } = useMemo(() => getCustomerMapData(), [])
  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>({
    corridors: true,
    coverage: true,
    plays: true,
  })
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    mapWrap: {
      flex: 1,
      overflow: "hidden" as const,
    },
  }))

  const html = useMemo(
    () =>
      buildMapHtml({
        dark: scheme === "dark",
        layers,
        corridors: corridorGeo,
        coverage,
        plays,
      }),
    [scheme, layers, corridorGeo, coverage, plays],
  )

  function toggle(key: MapLayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <View style={styles.root}>
      <CustomerMapHeader
        paddingTop={insets.top + spacing.sm}
        layers={layers}
        onToggle={toggle}
      />
      <View style={styles.mapWrap}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={StyleSheet.absoluteFillObject}
          allowFileAccess
          setSupportMultipleWindows={false}
        />
      </View>
    </View>
  )
}
