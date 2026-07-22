import { useMemo, useState } from "react"
import { View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  CustomerMapHeader,
  type MapLayerKey,
} from "@/components/maps/customer-map-header"
import { buildMapHtml, getCustomerMapData } from "@/components/maps/customer-map-html"
import { spacing, useThemedStyles } from "@/lib/theme"

/**
 * Expo web cannot use react-native-webview or @maplibre/maplibre-react-native.
 * Render MapLibre GL JS in a browser iframe instead.
 */
export function CustomerMap() {
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
        <iframe
          title="Admobi coverage map"
          srcDoc={html}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </View>
    </View>
  )
}
