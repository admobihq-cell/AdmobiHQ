import { useMemo, useState } from "react"
import { Platform, StyleSheet, View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

import { DEFAULT_BASEMAP, type BasemapId } from "@workspace/geo"
import { OpsMapHeader } from "@/components/maps/ops-map-header"
import { buildOpsMapHtml } from "@/components/maps/ops-map-html"
import { spacing, useThemedStyles } from "@/lib/theme"

export function OpsMapWeb() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    mapWrap: {
      flex: 1,
      minHeight: 280,
      overflow: "hidden" as const,
      backgroundColor: c.muted,
    },
  }))

  const html = useMemo(
    () =>
      buildOpsMapHtml({
        dark: scheme === "dark",
        basemap,
      }),
    [scheme, basemap],
  )

  return (
    <View style={styles.root}>
      <OpsMapHeader
        paddingTop={insets.top + spacing.sm}
        basemap={basemap}
        onBasemapChange={setBasemap}
      />
      <View style={styles.mapWrap}>
        <WebView
          key={`${basemap}-${scheme}`}
          originWhitelist={["*"]}
          source={{
            html,
            baseUrl: "https://basemaps.cartocdn.com/",
          }}
          style={StyleSheet.absoluteFillObject}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
        />
      </View>
    </View>
  )
}
